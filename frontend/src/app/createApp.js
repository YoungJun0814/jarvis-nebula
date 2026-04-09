import { generateDemoGraph } from '../graph/generateDemoGraph.js';
import { createNebulaScene } from '../render/createNebulaScene.js';
import { GraphApiError, fetchGraphSnapshot, queryGraph } from '../services/graphApi.js';
import {
  formatConnectionLabel,
  formatPercent,
  formatTypeLabel,
} from '../ui/formatters.js';

const EMPTY_SET = new Set();

export function createApp(rootElement, options = {}) {
  if (!rootElement) {
    throw new Error('Expected #app root element to exist.');
  }

  const graphFactory = options.graphFactory ?? createNebulaScene;
  const fallbackGraphData = options.graphData ?? generateDemoGraph(500);
  const graphApi = options.graphApi ?? {
    fetchGraphSnapshot,
    queryGraph,
  };
  const remoteGraphEnabled =
    options.remoteGraphEnabled ?? (!options.graphData || Boolean(options.graphApi));

  rootElement.innerHTML = `
    <main class="nebula-app">
      <section class="nebula-stage">
        <div class="hud hud-brand">
          <span class="eyebrow">Phase 2 Live Graph</span>
          <h1>Jarvis Nebula</h1>
          <p>
            A live 3D knowledge sphere backed by Neo4j, with mouse-first navigation,
            node inspection, and a read-only graph command bar.
          </p>
        </div>

        <section class="hud status-panel" data-status-panel>
          <div class="panel-header">
            <span class="eyebrow">Graph Status</span>
            <button type="button" class="ghost-button" data-reset-view>Reset View</button>
          </div>
          <div data-status-content></div>
        </section>

        <aside class="hud node-panel" data-node-panel></aside>

        <div class="hud shortcut-strip">
          <span><kbd>Drag</kbd> orbit</span>
          <span><kbd>Wheel</kbd> zoom</span>
          <span><kbd>Space</kbd> freeze</span>
          <span><kbd>Esc</kbd> reset</span>
        </div>

        <div class="nebula-canvas" data-graph-root></div>
        <div class="nebula-tooltip" data-tooltip hidden></div>
      </section>

      <form class="command-bar" data-command-form>
        <label class="command-label" for="command-input">Graph Command</label>
        <input
          id="command-input"
          name="command"
          type="text"
          autocomplete="off"
          placeholder="Try: show projects, show archive, show connected nodes, atlas launch"
        />
        <button type="submit">Run Query</button>
      </form>
    </main>
  `;

  const refs = {
    graphRoot: rootElement.querySelector('[data-graph-root]'),
    tooltip: rootElement.querySelector('[data-tooltip]'),
    nodePanel: rootElement.querySelector('[data-node-panel]'),
    statusContent: rootElement.querySelector('[data-status-content]'),
    commandForm: rootElement.querySelector('[data-command-form]'),
    commandInput: rootElement.querySelector('#command-input'),
    resetButton: rootElement.querySelector('[data-reset-view]'),
  };

  let selectionIndex = createSelectionIndex(fallbackGraphData.links);
  let scene = null;
  let pointerFrameId = null;

  const state = {
    graphData: fallbackGraphData,
    hoveredNode: null,
    selectedNode: null,
    selectedNeighborIds: EMPTY_SET,
    selectedLinkIds: EMPTY_SET,
    secondDegreeNeighborIds: EMPTY_SET,
    secondDegreeLinkIds: EMPTY_SET,
    paused: false,
    pointer: { x: 0, y: 0 },
    isSyncing: remoteGraphEnabled && !options.graphData,
    dataSourceLabel: options.graphData ? 'Injected graph data' : 'Connecting to Neo4j',
    lastAction: options.graphData
      ? 'Booted with injected graph data.'
      : 'Booted the local shell. Syncing the live Neo4j graph in the background.',
    queuedCommand: 'No graph query executed yet.',
    querySummary: 'The fallback nebula is active until the backend snapshot loads.',
    activeCypher: 'Not executed yet.',
    warnings: [],
  };

  mountScene(state.graphData);
  renderNodePanel(refs, state);
  renderStatusPanel(refs, state);
  renderTooltip(refs, state);

  refs.graphRoot.addEventListener('pointermove', (event) => {
    state.pointer = {
      x: event.clientX,
      y: event.clientY,
    };

    if (pointerFrameId) {
      return;
    }

    pointerFrameId = requestAnimationFrame(() => {
      renderTooltip(refs, state);
      pointerFrameId = null;
    });
  });

  refs.commandForm.addEventListener('submit', async (event) => {
    event.preventDefault();
    const formData = new FormData(refs.commandForm);
    const command = String(formData.get('command') ?? '').trim();

    if (!command) {
      return;
    }

    state.queuedCommand = command;

    if (!remoteGraphEnabled || !graphApi?.queryGraph) {
      state.lastAction =
        'Queued a local command only. Remote graph querying is disabled for this app instance.';
      renderStatusPanel(refs, state);
      return;
    }

    state.isSyncing = true;
    state.lastAction = `Running read-only graph query: ${command}`;
    state.warnings = [];
    renderStatusPanel(refs, state);

    try {
      const response = await graphApi.queryGraph({
        command,
        visible_node_ids: state.graphData.nodes.map((node) => node.id),
        selected_node_ids: state.selectedNode ? [state.selectedNode.id] : [],
      });

      refs.commandInput.value = '';

      if (response.graph.stats.nodeCount === 0) {
        state.querySummary = response.query.summary;
        state.activeCypher = response.query.cypher;
        state.warnings = response.warnings.length
          ? response.warnings
          : ['No graph nodes matched the current query.'];
        state.lastAction = 'The query returned no matches, so the previous graph view was kept.';
        renderStatusPanel(refs, state);
        return;
      }

      applyGraphResponse(response, {
        action: `Applied query result for "${command}".`,
      });
    } catch (error) {
      const message = formatGraphError(error);
      state.warnings = [message];
      state.lastAction = message;
      renderStatusPanel(refs, state);
    } finally {
      state.isSyncing = false;
      renderStatusPanel(refs, state);
    }
  });

  refs.resetButton.addEventListener('click', () => {
    handleReset();
  });

  window.addEventListener('keydown', handleKeydown);

  if (remoteGraphEnabled && graphApi?.fetchGraphSnapshot) {
    void syncLiveSnapshot();
  }

  return {
    destroy() {
      if (pointerFrameId) {
        cancelAnimationFrame(pointerFrameId);
      }

      window.removeEventListener('keydown', handleKeydown);
      scene?.destroy?.();
    },
  };

  function mountScene(nextGraphData) {
    state.graphData = nextGraphData;
    selectionIndex = createSelectionIndex(nextGraphData.links);

    const nextSelectedNode = state.selectedNode
      ? nextGraphData.nodes.find((node) => node.id === state.selectedNode.id) ?? null
      : null;
    syncSelection(nextSelectedNode);
    state.hoveredNode = null;

    scene?.destroy?.();
    refs.graphRoot.replaceChildren();

    const sceneMount = document.createElement('div');
    sceneMount.className = 'nebula-graph-mount';
    refs.graphRoot.append(sceneMount);

    scene = graphFactory({
      container: sceneMount,
      graphData: nextGraphData,
      getSelectionState: () => {
        let hoveredConnectedNodeIds = EMPTY_SET;
        let hoveredConnectedLinkIds = EMPTY_SET;

        if (state.hoveredNode) {
          hoveredConnectedNodeIds =
            selectionIndex.neighborIdsByNode.get(state.hoveredNode.id) ?? EMPTY_SET;
          hoveredConnectedLinkIds =
            selectionIndex.linkIdsByNode.get(state.hoveredNode.id) ?? EMPTY_SET;
        }

        return {
          selectedNodeId: state.selectedNode?.id ?? null,
          hoveredNodeId: state.hoveredNode?.id ?? null,
          connectedNodeIds: state.selectedNeighborIds,
          connectedLinkIds: state.selectedLinkIds,
          secondDegreeNodeIds: state.secondDegreeNeighborIds,
          secondDegreeLinkIds: state.secondDegreeLinkIds,
          hoveredConnectedNodeIds,
          hoveredConnectedLinkIds,
        };
      },
      onNodeHover(node) {
        const nextNodeId = node?.id ?? null;
        const currentNodeId = state.hoveredNode?.id ?? null;
        if (nextNodeId === currentNodeId) {
          return;
        }

        state.hoveredNode = node ?? null;
        refs.graphRoot.style.cursor = node ? 'pointer' : 'grab';
        scene.refreshVisuals();
        renderTooltip(refs, state);
        renderStatusPanel(refs, state);
      },
      onNodeClick(node) {
        syncSelection(node);
        state.lastAction = node
          ? `Selected ${node.name}. The side panel and graph focus are synced to the active node.`
          : 'Selection cleared.';
        renderNodePanel(refs, state);
        renderStatusPanel(refs, state);
        scene.refreshVisuals();

        if (node) {
          scene.focusNode(node);
        }
      },
      onBackgroundClick() {
        syncSelection(null);
        state.lastAction = 'Selection cleared. Camera remains in its current orbit.';
        renderNodePanel(refs, state);
        renderStatusPanel(refs, state);
        scene.refreshVisuals();
      },
    });

    refs.graphRoot.style.cursor = 'grab';
    renderTooltip(refs, state);
    renderNodePanel(refs, state);
    renderStatusPanel(refs, state);
  }

  async function syncLiveSnapshot() {
    try {
      const response = await graphApi.fetchGraphSnapshot();
      applyGraphResponse(response, {
        action: 'Loaded the default graph snapshot from Neo4j.',
      });
    } catch (error) {
      const message = formatGraphError(error);
      state.dataSourceLabel = 'Local demo fallback';
      state.warnings = [message, 'The local demo graph remains active until the backend becomes available.'];
      state.lastAction = 'Failed to load the live Neo4j graph. The fallback demo graph is still active.';
      renderStatusPanel(refs, state);
    } finally {
      state.isSyncing = false;
      renderStatusPanel(refs, state);
    }
  }

  function applyGraphResponse(response, { action }) {
    state.dataSourceLabel = response.source === 'neo4j' ? 'Neo4j live graph' : 'Local fallback graph';
    state.querySummary = response.query.summary;
    state.activeCypher = response.query.cypher;
    state.warnings = response.warnings ?? [];
    state.lastAction = action;
    mountScene(response.graph);
  }

  function handleKeydown(event) {
    const isTextInput =
      event.target instanceof HTMLElement && event.target.closest('input, textarea');

    if (event.code === 'Space' && !isTextInput) {
      event.preventDefault();
      state.paused = !state.paused;
      scene.setPaused(state.paused);
      state.lastAction = state.paused
        ? 'Layout frozen. Press Space again to resume the nebula drift.'
        : 'Layout resumed. Force simulation is live again.';
      renderStatusPanel(refs, state);
      return;
    }

    if (event.key === 'Escape') {
      event.preventDefault();
      handleReset();
    }
  }

  function handleReset() {
    state.paused = false;
    state.hoveredNode = null;
    syncSelection(null);
    refs.commandInput.blur();
    refs.graphRoot.style.cursor = 'grab';
    scene.setPaused(false);
    scene.resetCamera();
    scene.refreshVisuals();
    state.lastAction = 'Camera reset to the default orbit and temporary selection cleared.';
    renderTooltip(refs, state);
    renderNodePanel(refs, state);
    renderStatusPanel(refs, state);
  }

  function syncSelection(node) {
    state.selectedNode = node ?? null;

    if (!state.selectedNode) {
      state.selectedNeighborIds = EMPTY_SET;
      state.selectedLinkIds = EMPTY_SET;
      state.secondDegreeNeighborIds = EMPTY_SET;
      state.secondDegreeLinkIds = EMPTY_SET;
      return;
    }

    const firstDegreeNodes = selectionIndex.neighborIdsByNode.get(state.selectedNode.id) ?? EMPTY_SET;
    const firstDegreeLinks = selectionIndex.linkIdsByNode.get(state.selectedNode.id) ?? EMPTY_SET;

    const secondDegreeNodes = new Set(firstDegreeNodes);
    const secondDegreeLinks = new Set(firstDegreeLinks);

    firstDegreeNodes.forEach((neighborId) => {
      const neighborsOfNeighbor = selectionIndex.neighborIdsByNode.get(neighborId) ?? EMPTY_SET;
      neighborsOfNeighbor.forEach((id) => secondDegreeNodes.add(id));

      const linksOfNeighbor = selectionIndex.linkIdsByNode.get(neighborId) ?? EMPTY_SET;
      linksOfNeighbor.forEach((id) => secondDegreeLinks.add(id));
    });

    state.selectedNeighborIds = firstDegreeNodes;
    state.selectedLinkIds = firstDegreeLinks;
    state.secondDegreeNeighborIds = secondDegreeNodes;
    state.secondDegreeLinkIds = secondDegreeLinks;
  }
}

function renderStatusPanel(refs, state) {
  refs.statusContent.innerHTML = `
    <dl class="status-grid">
      <div>
        <dt>Dataset</dt>
        <dd>${state.graphData.stats.nodeCount} nodes / ${state.graphData.stats.linkCount} links</dd>
      </div>
      <div>
        <dt>Layout</dt>
        <dd>${state.paused ? 'Frozen' : state.isSyncing ? 'Syncing' : 'Live'}</dd>
      </div>
      <div>
        <dt>Selection</dt>
        <dd>${state.selectedNode ? state.selectedNode.name : 'None'}</dd>
      </div>
      <div>
        <dt>Source</dt>
        <dd>${state.dataSourceLabel}</dd>
      </div>
    </dl>
    <section class="status-block">
      <span class="status-label">Last action</span>
      <p>${state.lastAction}</p>
    </section>
    <section class="status-block">
      <span class="status-label">Last query</span>
      <p>${state.queuedCommand}</p>
    </section>
    <section class="status-block">
      <span class="status-label">Query summary</span>
      <p>${state.querySummary}</p>
    </section>
    <section class="status-block">
      <span class="status-label">Cypher</span>
      <code class="status-code">${escapeHtml(state.activeCypher)}</code>
    </section>
    ${
      state.warnings.length
        ? `
          <section class="status-block">
            <span class="status-label">Warnings</span>
            <ul class="status-list">
              ${state.warnings.map((warning) => `<li>${escapeHtml(warning)}</li>`).join('')}
            </ul>
          </section>
        `
        : ''
    }
    <section class="status-block">
      <span class="status-label">Category mix</span>
      <div class="type-pills">
        ${Object.entries(state.graphData.stats.typeCounts)
          .map(
            ([type, count]) => `
              <span class="type-pill">${formatTypeLabel(type)} ${count}</span>
            `,
          )
          .join('')}
      </div>
    </section>
  `;
}

function renderNodePanel(refs, state) {
  if (!state.selectedNode) {
    refs.nodePanel.innerHTML = `
      <span class="eyebrow">Node Inspector</span>
      <h2>No node selected</h2>
      <p>
        Hover a node to inspect its label, then click it to lock details here. The graph query
        bar now updates the visualized Neo4j subgraph without leaving this screen.
      </p>
    `;
    return;
  }

  const node = state.selectedNode;

  refs.nodePanel.innerHTML = `
    <span class="eyebrow">${formatTypeLabel(node.type)}</span>
    <h2>${node.name}</h2>
    <p>${node.summary}</p>
    <dl class="node-metadata">
      <div>
        <dt>Cluster</dt>
        <dd>${node.cluster}</dd>
      </div>
      <div>
        <dt>Connections</dt>
        <dd>${formatConnectionLabel(node.connections)}</dd>
      </div>
      <div>
        <dt>Signal</dt>
        <dd>${formatPercent(node.signalStrength)}</dd>
      </div>
      <div>
        <dt>Updated</dt>
        <dd>${node.updatedAt}</dd>
      </div>
    </dl>
  `;
}

function renderTooltip(refs, state) {
  if (!state.hoveredNode) {
    refs.tooltip.hidden = true;
    return;
  }

  refs.tooltip.hidden = false;
  refs.tooltip.innerHTML = `
    <strong>${state.hoveredNode.name}</strong>
    <span>${formatTypeLabel(state.hoveredNode.type)} - ${formatConnectionLabel(
      state.hoveredNode.connections,
    )}</span>
  `;
  refs.tooltip.style.transform = `translate(${state.pointer.x + 18}px, ${state.pointer.y - 18}px)`;
}

function createSelectionIndex(links) {
  const neighborIdsByNode = new Map();
  const linkIdsByNode = new Map();

  links.forEach((link) => {
    const sourceId = resolveNodeId(link.source);
    const targetId = resolveNodeId(link.target);

    if (!sourceId || !targetId) {
      return;
    }

    registerSelectionLink(neighborIdsByNode, sourceId, targetId);
    registerSelectionLink(neighborIdsByNode, targetId, sourceId);
    registerSelectionLink(linkIdsByNode, sourceId, link.id);
    registerSelectionLink(linkIdsByNode, targetId, link.id);
  });

  return { neighborIdsByNode, linkIdsByNode };
}

function registerSelectionLink(index, sourceId, value) {
  if (!index.has(sourceId)) {
    index.set(sourceId, new Set());
  }

  index.get(sourceId)?.add(value);
}

function resolveNodeId(nodeRef) {
  if (nodeRef && typeof nodeRef === 'object') {
    return nodeRef.id ?? null;
  }

  return nodeRef ?? null;
}

function formatGraphError(error) {
  if (error instanceof GraphApiError) {
    return error.message;
  }

  return 'The graph backend could not be reached.';
}

function escapeHtml(text) {
  return String(text)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;');
}
