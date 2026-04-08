import { generateDemoGraph } from '../graph/generateDemoGraph.js';
import { createNebulaScene } from '../render/createNebulaScene.js';
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

  const graphData = options.graphData ?? generateDemoGraph(500);
  const graphFactory = options.graphFactory ?? createNebulaScene;
  const selectionIndex = createSelectionIndex(graphData.links);

  rootElement.innerHTML = `
    <main class="nebula-app">
      <section class="nebula-stage">
        <div class="hud hud-brand">
          <span class="eyebrow">Phase 1 MVP Build</span>
          <h1>Jarvis Nebula</h1>
          <p>
            A live 3D knowledge sphere with mouse-first navigation, instant node inspection,
            and an always-ready command bar.
          </p>
        </div>

        <section class="hud status-panel" data-status-panel>
          <div class="panel-header">
            <span class="eyebrow">Agent Status</span>
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
        <label class="command-label" for="command-input">Command Bar</label>
        <input
          id="command-input"
          name="command"
          type="text"
          autocomplete="off"
          placeholder="Type a command. Phase 1 stores it locally and previews the agent handoff."
        />
        <button type="submit">Queue Command</button>
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

  const state = {
    hoveredNode: null,
    selectedNode: null,
    selectedNeighborIds: EMPTY_SET,
    selectedLinkIds: EMPTY_SET,
    secondDegreeNeighborIds: EMPTY_SET,
    secondDegreeLinkIds: EMPTY_SET,
    paused: false,
    pointer: { x: 0, y: 0 },
    lastAction: 'Nebula ready. Explore with the mouse or submit a command below.',
    queuedCommand: 'No local command queued.',
  };

  const scene = graphFactory({
    container: refs.graphRoot,
    graphData,
    getSelectionState: () => {
      let hoveredConnectedNodeIds = EMPTY_SET;
      let hoveredConnectedLinkIds = EMPTY_SET;
      
      if (state.hoveredNode) {
        hoveredConnectedNodeIds = selectionIndex.neighborIdsByNode.get(state.hoveredNode.id) ?? EMPTY_SET;
        hoveredConnectedLinkIds = selectionIndex.linkIdsByNode.get(state.hoveredNode.id) ?? EMPTY_SET;
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
      renderStatusPanel(refs, state, graphData);
    },
    onNodeClick(node) {
      syncSelection(node);
      state.lastAction = node
        ? `Selected ${node.name}. Side panel synced to the active node.`
        : 'Selection cleared.';
      renderNodePanel(refs, state);
      renderStatusPanel(refs, state, graphData);
      scene.refreshVisuals();

      if (node) {
        scene.focusNode(node);
      }
    },
    onBackgroundClick() {
      syncSelection(null);
      state.lastAction = 'Selection cleared. Camera remains in its current orbit.';
      renderNodePanel(refs, state);
      renderStatusPanel(refs, state, graphData);
      scene.refreshVisuals();
    },
  });

  let pointerFrameId = null;
  refs.graphRoot.addEventListener('pointermove', (event) => {
    state.pointer = {
      x: event.clientX,
      y: event.clientY,
    };

    if (pointerFrameId) return;

    pointerFrameId = requestAnimationFrame(() => {
      renderTooltip(refs, state);
      pointerFrameId = null;
    });
  });

  refs.commandForm.addEventListener('submit', (event) => {
    event.preventDefault();
    const formData = new FormData(refs.commandForm);
    const command = String(formData.get('command') ?? '').trim();

    if (!command) {
      return;
    }

    state.queuedCommand = command;
    state.lastAction = 'Queued a local demo command. Backend routing begins in Phase 2 and Phase 8.';
    refs.commandInput.value = '';
    renderStatusPanel(refs, state, graphData);
  });

  refs.resetButton.addEventListener('click', () => {
    handleReset();
  });

  window.addEventListener('keydown', handleKeydown);

  renderNodePanel(refs, state);
  renderStatusPanel(refs, state, graphData);
  renderTooltip(refs, state);

  return {
    destroy() {
      window.removeEventListener('keydown', handleKeydown);
      scene.destroy?.();
    },
  };

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
      renderStatusPanel(refs, state, graphData);
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
    renderStatusPanel(refs, state, graphData);
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

function renderStatusPanel(refs, state, graphData) {
  refs.statusContent.innerHTML = `
    <dl class="status-grid">
      <div>
        <dt>Dataset</dt>
        <dd>${graphData.stats.nodeCount} nodes / ${graphData.stats.linkCount} links</dd>
      </div>
      <div>
        <dt>Layout</dt>
        <dd>${state.paused ? 'Frozen' : 'Live'}</dd>
      </div>
      <div>
        <dt>Selection</dt>
        <dd>${state.selectedNode ? state.selectedNode.name : 'None'}</dd>
      </div>
      <div>
        <dt>Agent Panel</dt>
        <dd>Placeholder only. Real task execution starts in Phase 8.</dd>
      </div>
    </dl>
    <section class="status-block">
      <span class="status-label">Last action</span>
      <p>${state.lastAction}</p>
    </section>
    <section class="status-block">
      <span class="status-label">Queued command</span>
      <p>${state.queuedCommand}</p>
    </section>
    <section class="status-block">
      <span class="status-label">Category mix</span>
      <div class="type-pills">
        ${Object.entries(graphData.stats.typeCounts)
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
        Hover a node to inspect its label, then click it to lock details here. The nebula
        remains fully mouse-driven while the status panel stays visible.
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
    <span>${formatTypeLabel(state.hoveredNode.type)} · ${formatConnectionLabel(
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
