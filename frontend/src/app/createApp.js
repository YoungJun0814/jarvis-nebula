import { generateDemoGraph } from '../graph/generateDemoGraph.js';
import { createHandTrackingController } from '../input/createHandTrackingController.js';
import { createHandOverlayRenderer } from '../input/createHandOverlayRenderer.js';
import { createInputMerger } from '../input/createInputMerger.js';
import { createNebulaScene } from '../render/createNebulaScene.js';
import { GraphApiError, fetchGraphSnapshot, queryGraph } from '../services/graphApi.js';
import { createVoiceController } from '../voice/createVoiceController.js';
import { routeVoiceCommand } from '../voice/routeVoiceCommand.js';
import { playRecognitionCue, speakFeedback } from '../voice/voiceFeedback.js';
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
  const handTrackingFactory = options.handTrackingFactory ?? createHandTrackingController;
  const voiceControllerFactory = options.voiceControllerFactory ?? createVoiceController;
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
          <span class="eyebrow">Phase 7 Interaction Polish</span>
          <h1>Jarvis Nebula</h1>
          <p>
            A live 3D knowledge sphere with Neo4j-backed graph queries, mouse-first navigation,
            node inspection, adaptive tracking, voice command routing, and polished multimodal help.
          </p>
        </div>

        <section class="hud status-panel" data-status-panel>
          <div class="panel-header">
            <span class="eyebrow">Graph Status</span>
            <div class="panel-actions">
              <button type="button" class="ghost-button" data-hand-toggle>Enable Tracking</button>
              <button type="button" class="ghost-button" data-reset-view>Reset View</button>
            </div>
          </div>
          <div data-status-content></div>
        </section>

        <aside class="hud node-panel" data-node-panel></aside>
        <aside class="help-overlay" data-help-overlay hidden>
          <div class="help-card">
            <div class="panel-header">
              <span class="eyebrow">Phase 7 Help</span>
              <button type="button" class="ghost-button" data-help-close>Close</button>
            </div>
            <h2>Shortcut Guide</h2>
            <p>Mouse, text, gesture, and voice can all stay live at the same time.</p>
            <ul class="help-list">
              <li><kbd>Drag</kbd> orbit the sphere</li>
              <li><kbd>Wheel</kbd> zoom the camera</li>
              <li><kbd>Space</kbd> freeze or resume layout</li>
              <li><kbd>Esc</kbd> reset the current view</li>
              <li><kbd>V</kbd> hold to talk</li>
              <li><kbd>?</kbd> toggle this help overlay</li>
              <li>Point + voice targets the hovered node when one is active</li>
            </ul>
          </div>
        </aside>

        <div class="hud shortcut-strip">
          <span><kbd>Drag</kbd> orbit</span>
          <span><kbd>Wheel</kbd> zoom</span>
          <span><kbd>Space</kbd> freeze</span>
          <span><kbd>Esc</kbd> reset</span>
          <span><kbd>?</kbd> help</span>
        </div>

        <div class="nebula-canvas" data-graph-root></div>
        <canvas class="hand-overlay-canvas" data-hand-overlay></canvas>
        <div class="nebula-tooltip" data-tooltip hidden></div>
        <video class="hand-video-feed" data-hand-video autoplay muted playsinline></video>
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
        <button type="button" class="voice-button" data-voice-toggle>Mic</button>
        <button type="submit" data-command-submit>Run Query</button>
      </form>
    </main>
  `;

  const refs = {
    graphRoot: rootElement.querySelector('[data-graph-root]'),
    tooltip: rootElement.querySelector('[data-tooltip]'),
    handOverlay: rootElement.querySelector('[data-hand-overlay]'),
    helpOverlay: rootElement.querySelector('[data-help-overlay]'),
    helpCloseButton: rootElement.querySelector('[data-help-close]'),
    helpCard: rootElement.querySelector('.help-card'),
    nodePanel: rootElement.querySelector('[data-node-panel]'),
    statusContent: rootElement.querySelector('[data-status-content]'),
    commandForm: rootElement.querySelector('[data-command-form]'),
    commandInput: rootElement.querySelector('#command-input'),
    commandSubmitButton: rootElement.querySelector('[data-command-submit]'),
    voiceToggleButton: rootElement.querySelector('[data-voice-toggle]'),
    handToggleButton: rootElement.querySelector('[data-hand-toggle]'),
    handVideo: rootElement.querySelector('[data-hand-video]'),
    resetButton: rootElement.querySelector('[data-reset-view]'),
  };

  let selectionIndex = createSelectionIndex(fallbackGraphData.links);
  let scene = null;
  let pointerFrameId = null;
  const inputMerger = createInputMerger();

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
    handTracking: {
      enabled: false,
      status: 'idle',
      gesture: 'none',
      phase: 'IDLE',
      confidence: 0,
      handCount: 0,
      message: 'Hand tracking is off. Mouse and keyboard are still fully active.',
      lastAppliedGesture: 'none',
      poseEnabled: false,
      poseFallback: false,
      poseZone: 'fixed',
      poseMultiplier: 1,
      poseDistance: 1,
      poseVisible: false,
      trackingBudgetMs: 0,
      trackingFps: 0,
      gestureIdle: false,
    },
    voice: {
      enabled: true,
      recording: false,
      loading: false,
      source: 'manual',
      message: 'Voice commands are idle.',
      lastTranscript: 'No voice command captured yet.',
    },
    graphHistory: [],
    helpOpen: false,
    activeInput: 'mouse',
  };
  const handOverlayRenderer = createHandOverlayRenderer({
    canvasElement: refs.handOverlay,
  });

  const handTrackingController = handTrackingFactory({
    videoElement: refs.handVideo,
    onStatusChange(nextStatus) {
      state.handTracking = {
        ...state.handTracking,
        ...nextStatus,
        lastAppliedGesture:
          nextStatus.gesture === 'none' ? 'none' : state.handTracking.lastAppliedGesture,
      };
      refs.handToggleButton.textContent = state.handTracking.enabled
        ? 'Disable Tracking'
        : 'Enable Tracking';
      if (!state.handTracking.enabled) {
        handOverlayRenderer.clear();
        scene?.clearGestureLaser?.();
      }
      renderStatusPanel(refs, state);
    },
    onFrame(frame) {
      applyHandFrame(frame);
    },
  });
  const voiceController = voiceControllerFactory({
    onStatusChange(nextStatus) {
      state.voice = {
        ...state.voice,
        ...nextStatus,
      };
      refs.voiceToggleButton.textContent = state.voice.loading
        ? 'Wait'
        : state.voice.recording
          ? 'Stop'
          : 'Mic';
      renderStatusPanel(refs, state);
    },
    onTranscript(payload) {
      void handleVoiceTranscript(payload);
    },
  });

  mountScene(state.graphData);
  renderNodePanel(refs, state);
  renderStatusPanel(refs, state);
  renderTooltip(refs, state);

  refs.graphRoot.addEventListener('pointermove', (event) => {
    markInputActivity('mouse');
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
  refs.commandInput.addEventListener('input', () => {
    markInputActivity('text');
  });

  refs.commandForm.addEventListener('submit', async (event) => {
    event.preventDefault();
    markInputActivity('text');
    const formData = new FormData(refs.commandForm);
    const command = String(formData.get('command') ?? '').trim();

    if (!command) {
      return;
    }

    await runGraphCommand(command, 'text');
  });

  refs.resetButton.addEventListener('click', () => {
    markInputActivity('mouse');
    handleReset();
  });
  refs.handToggleButton.addEventListener('click', () => {
    void handleHandToggle();
  });
  refs.helpCloseButton.addEventListener('pointerdown', closeHelpOverlay);
  refs.helpCloseButton.addEventListener('click', closeHelpOverlay);
  refs.helpOverlay.addEventListener('pointerdown', (event) => {
    if (event.target === refs.helpOverlay) {
      closeHelpOverlay(event);
    }
  });
  refs.helpCard.addEventListener('pointerdown', (event) => {
    event.stopPropagation();
  });
  refs.voiceToggleButton.addEventListener('click', () => {
    markInputActivity('voice');
    voiceController.toggle('manual');
  });

  window.addEventListener('keydown', handleKeydown);
  window.addEventListener('keyup', handleKeyup);

  if (remoteGraphEnabled && graphApi?.fetchGraphSnapshot) {
    void syncLiveSnapshot();
  }

  return {
    destroy() {
      if (pointerFrameId) {
        cancelAnimationFrame(pointerFrameId);
      }

      window.removeEventListener('keydown', handleKeydown);
      window.removeEventListener('keyup', handleKeyup);
      handTrackingController.destroy();
      voiceController.destroy();
      handOverlayRenderer.destroy();
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
          activeInput: state.activeInput,
        };
      },
      onNodeHover(node, source = 'mouse') {
        markInputActivity(source);
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
      onNodeClick(node, source = 'mouse') {
        markInputActivity(source);
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
      onBackgroundClick(source = 'mouse') {
        markInputActivity(source);
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
        rememberPrevious: false,
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

  async function runGraphCommand(command, source = 'text') {
    const targetNode =
      source === 'voice' && state.handTracking.gesture === 'point'
        ? state.hoveredNode ?? state.selectedNode
        : state.selectedNode;
    state.queuedCommand = command;

    if (!remoteGraphEnabled || !graphApi?.queryGraph) {
      state.lastAction =
        'Queued a local command only. Remote graph querying is disabled for this app instance.';
      renderStatusPanel(refs, state);
      return;
    }

    state.isSyncing = true;
    state.lastAction = `Running read-only graph query from ${source}: ${command}`;
    state.warnings = [];
    renderStatusPanel(refs, state);

    try {
      const response = await graphApi.queryGraph({
        command,
        visible_node_ids: state.graphData.nodes.map((node) => node.id),
        selected_node_ids: targetNode ? [targetNode.id] : [],
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
        action: targetNode
          ? `Applied ${source} query result for "${command}" with ${targetNode.name} as the active target.`
          : `Applied ${source} query result for "${command}".`,
        rememberPrevious: true,
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
  }

  function applyGraphResponse(response, { action, rememberPrevious = false }) {
    if (rememberPrevious) {
      state.graphHistory.push({
        graphData: state.graphData,
        dataSourceLabel: state.dataSourceLabel,
        querySummary: state.querySummary,
        activeCypher: state.activeCypher,
        warnings: [...state.warnings],
      });
    }

    state.dataSourceLabel = response.source === 'neo4j' ? 'Neo4j live graph' : 'Local fallback graph';
    state.querySummary = response.query.summary;
    state.activeCypher = response.query.cypher;
    state.warnings = response.warnings ?? [];
    state.lastAction = action;
    mountScene(response.graph);
  }

  async function handleVoiceTranscript(payload) {
    const transcript = payload.transcript?.trim();
    markInputActivity('voice');
    state.voice.lastTranscript = transcript || 'No voice command captured yet.';
    renderStatusPanel(refs, state);

    if (!transcript) {
      state.lastAction = 'Voice capture completed, but no speech was recognized.';
      renderStatusPanel(refs, state);
      return;
    }

    playRecognitionCue();
    const route = routeVoiceCommand(transcript);

    if (route.kind === 'ui') {
      handleVoiceUiCommand(route.command);
      speakFeedback(`Applied ${route.command.replaceAll('_', ' ')}.`);
      return;
    }

    if (route.kind === 'agent') {
      await queueAgentVoiceTask(route.command);
      return;
    }

    await runGraphCommand(route.command, 'voice');
  }

  function handleVoiceUiCommand(command) {
    switch (command) {
      case 'reset':
        handleReset();
        break;
      case 'zoom_in':
        scene?.zoomBy?.(0.02);
        state.lastAction = 'Voice command zoomed the camera closer.';
        renderStatusPanel(refs, state);
        break;
      case 'zoom_out':
        scene?.zoomBy?.(-0.02);
        state.lastAction = 'Voice command moved the camera farther away.';
        renderStatusPanel(refs, state);
        break;
      case 'undo':
        restorePreviousGraph();
        break;
      case 'stop':
        voiceController.stop();
        scene?.clearGestureLaser?.();
        scene?.clearGesturePreview?.();
        state.lastAction = 'Stopped the current live input actions.';
        renderStatusPanel(refs, state);
        break;
      case 'confirm':
        state.lastAction = state.selectedNode
          ? `Voice confirm acknowledged ${state.selectedNode.name}.`
          : 'Voice confirm detected, but no node is selected.';
        renderStatusPanel(refs, state);
        break;
      case 'reject':
        syncSelection(null);
        renderNodePanel(refs, state);
        scene?.refreshVisuals?.();
        state.lastAction = 'Voice reject cleared the current selection.';
        renderStatusPanel(refs, state);
        break;
      default:
        break;
    }
  }

  async function queueAgentVoiceTask(command) {
    const targetNode =
      state.handTracking.gesture === 'point'
        ? state.hoveredNode ?? state.selectedNode
        : state.selectedNode;
    state.lastAction = targetNode
      ? `Voice routed "${command}" with ${targetNode.name} as context to the Phase 8 agent placeholder.`
      : `Voice routed "${command}" to the Phase 8 agent placeholder.`;
    renderStatusPanel(refs, state);
    console.warn('[Jarvis Nebula][voice-agent-placeholder]', {
      command,
      selectedNodeId: targetNode?.id ?? null,
    });

    try {
      await fetch('/api/agent/command', {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
        },
        body: JSON.stringify({
          command,
          selected_node_ids: targetNode ? [targetNode.id] : [],
        }),
      });
      speakFeedback('Agent placeholder queued.');
    } catch {
      state.warnings = ['The agent placeholder endpoint could not be reached.'];
      renderStatusPanel(refs, state);
    }
  }

  function restorePreviousGraph() {
    const previousView = state.graphHistory.pop();
    if (!previousView) {
      state.lastAction = 'There is no previous graph view to restore.';
      renderStatusPanel(refs, state);
      return;
    }

    state.dataSourceLabel = previousView.dataSourceLabel;
    state.querySummary = previousView.querySummary;
    state.activeCypher = previousView.activeCypher;
    state.warnings = previousView.warnings;
    mountScene(previousView.graphData);
    state.lastAction = 'Restored the previous graph view from local history.';
    renderStatusPanel(refs, state);
  }

  async function handleHandToggle() {
    if (state.handTracking.enabled) {
      handTrackingController.stop();
      state.lastAction = 'Hand tracking disabled. Mouse and keyboard remain active.';
      renderStatusPanel(refs, state);
      return;
    }

    await handTrackingController.start();
    renderStatusPanel(refs, state);
  }

  function markInputActivity(source) {
    inputMerger.markActive(source);
    state.activeInput = inputMerger.getActiveSource();
  }

  function applyHandFrame(frame) {
    if (state.voice.recording && state.voice.source === 'gesture' && frame.gesture !== 'pinch') {
      voiceController.stop();
    }

    if (frame.gesture !== 'none' || frame.gesturePhase === 'RELEASING') {
      markInputActivity('gesture');
    }

    state.handTracking = {
      ...state.handTracking,
      gesture: frame.gesture,
      phase: frame.gesturePhase,
      confidence: frame.confidence,
      handCount: frame.handCount,
    };

    if (!scene) {
      handOverlayRenderer.render(frame);
      return;
    }

    handOverlayRenderer.render(frame);

    if (frame.gesture !== state.handTracking.lastAppliedGesture && frame.gesture !== 'none') {
      state.lastAction = `Gesture active: ${formatGestureLabel(frame.gesture)}.`;
      state.handTracking.lastAppliedGesture = frame.gesture;
      renderStatusPanel(refs, state);
    }

    if (frame.gesture === 'none') {
      state.handTracking.lastAppliedGesture = 'none';
      if (frame.gesturePhase === 'IDLE') {
        scene.clearGesturePreview?.();
      }
      scene.clearGestureLaser?.();
      return;
    }

    switch (frame.gesture) {
      case 'open_palm':
      case 'fist': {
        const sensitivity = frame.sensitivityMultiplier ?? 1;
        const strength = (frame.gesture === 'fist' ? 1.35 : 0.95) * sensitivity;
        if (Math.hypot(frame.deltaNormalized.x, frame.deltaNormalized.y) > 0.003) {
          scene.orbitBy?.(frame.deltaNormalized.x, frame.deltaNormalized.y, strength);
        }
        break;
      }
      case 'point': {
        if (frame.pointerNormalized) {
          scene.previewNodeAtNormalized?.(frame.pointerNormalized.x, frame.pointerNormalized.y);
          scene.setGestureLaser?.(
            frame.pointerNormalized.x,
            frame.pointerNormalized.y,
            frame.confidence,
          );
        }

        if (frame.stable && frame.holdFrames === 6 && frame.pointerNormalized) {
          const selectedNode = scene.selectNodeAtNormalized?.(
            frame.pointerNormalized.x,
            frame.pointerNormalized.y,
          );
          if (selectedNode) {
            state.lastAction = `Gesture point selected ${selectedNode.name}.`;
            renderStatusPanel(refs, state);
          }
        }
        break;
      }
      case 'pinch': {
        scene.clearGestureLaser?.();
        if (hasLeftHand(frame.hands) && frame.holdFrames === 6 && !state.voice.recording) {
          markInputActivity('voice');
          voiceController.start('gesture');
          state.lastAction = 'Left-hand pinch started push-to-talk voice capture.';
          renderStatusPanel(refs, state);
          break;
        }

        if (frame.stable && frame.holdFrames === 6) {
          state.lastAction = state.selectedNode
            ? `Gesture confirm on ${state.selectedNode.name}.`
            : 'Gesture confirm detected. Select a node to apply it to.';
          renderStatusPanel(refs, state);
        }
        break;
      }
      case 'zoom': {
        scene.clearGestureLaser?.();
        if (frame.stable && Math.abs(frame.zoomDelta) > 0.0025) {
          scene.zoomBy?.(frame.zoomDelta * (frame.sensitivityMultiplier ?? 1));
        }
        break;
      }
      case 'swipe': {
        scene.clearGestureLaser?.();
        if (frame.holdFrames === 2) {
          syncSelection(null);
          scene.clearGesturePreview?.();
          state.warnings = [];
          state.lastAction = `Gesture swipe ${frame.swipeDirection ?? ''} dismissed the active focus.`
            .trim();
          renderNodePanel(refs, state);
          renderStatusPanel(refs, state);
          scene.refreshVisuals?.();
        }
        break;
      }
      default:
        scene.clearGestureLaser?.();
        break;
    }
  }

  function handleKeydown(event) {
    const isTextInput =
      event.target instanceof HTMLElement && event.target.closest('input, textarea');

    if (event.key === 'Escape' && state.helpOpen) {
      markInputActivity('keyboard');
      event.preventDefault();
      toggleHelp(false);
      return;
    }

    if (event.key === '?' && !isTextInput) {
      markInputActivity('keyboard');
      event.preventDefault();
      toggleHelp();
      return;
    }

    if (event.code === 'Space' && !isTextInput) {
      markInputActivity('keyboard');
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
      markInputActivity('keyboard');
      event.preventDefault();
      handleReset();
    }

    if ((event.key === 'v' || event.key === 'V') && !event.repeat && !isTextInput) {
      markInputActivity('voice');
      event.preventDefault();
      void voiceController.start('keyboard');
    }
  }

  function handleKeyup(event) {
    if ((event.key === 'v' || event.key === 'V') && state.voice.recording && state.voice.source === 'keyboard') {
      event.preventDefault();
      voiceController.stop();
    }
  }

  function toggleHelp(forceValue) {
    state.helpOpen = typeof forceValue === 'boolean' ? forceValue : !state.helpOpen;
    refs.helpOverlay.hidden = !state.helpOpen;
    refs.helpOverlay.setAttribute('aria-hidden', String(!state.helpOpen));
  }

  function closeHelpOverlay(event) {
    event?.preventDefault?.();
    event?.stopPropagation?.();
    toggleHelp(false);
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
  refs.commandSubmitButton.textContent = state.isSyncing ? 'Working...' : 'Run Query';
  refs.commandSubmitButton.disabled = state.isSyncing;

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
        <dd>${state.selectedNode ? escapeHtml(state.selectedNode.name) : 'None'}</dd>
      </div>
      <div>
        <dt>Source</dt>
        <dd>${escapeHtml(state.dataSourceLabel)}</dd>
      </div>
      <div>
        <dt>Hands</dt>
        <dd>${formatTrackingStatus(state.handTracking)}</dd>
      </div>
      <div>
        <dt>Gesture</dt>
        <dd>${formatGestureState(state.handTracking)}</dd>
      </div>
      <div>
        <dt>Input</dt>
        <dd>${formatInputSource(state.activeInput)}</dd>
      </div>
      <div>
        <dt>Pose</dt>
        <dd>${formatPoseStatus(state.handTracking)}</dd>
      </div>
      <div>
        <dt>Sensitivity</dt>
        <dd>${formatPoseZone(state.handTracking)}</dd>
      </div>
      <div>
        <dt>Voice</dt>
        <dd>${formatVoiceState(state.voice)}</dd>
      </div>
    </dl>
    <section class="status-block">
      <span class="status-label">Last action</span>
      <p>${escapeHtml(state.lastAction)}</p>
    </section>
    <section class="status-block">
      <span class="status-label">Last query</span>
      <p>${escapeHtml(state.queuedCommand)}</p>
    </section>
    <section class="status-block">
      <span class="status-label">Query summary</span>
      <p>${escapeHtml(state.querySummary)}</p>
    </section>
    <section class="status-block">
      <span class="status-label">Hand Tracking</span>
      <p>${escapeHtml(state.handTracking.message)}</p>
    </section>
    <section class="status-block">
      <span class="status-label">Tracking Performance</span>
      <p>${escapeHtml(formatTrackingBudget(state.handTracking))}</p>
    </section>
    <section class="status-block">
      <span class="status-label">Voice</span>
      <p>${escapeHtml(state.voice.message)}</p>
    </section>
    <section class="status-block">
      <span class="status-label">Last Transcript</span>
      <p>${escapeHtml(state.voice.lastTranscript)}</p>
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
    <span class="eyebrow">${escapeHtml(formatTypeLabel(node.type))}</span>
    <h2>${escapeHtml(node.name)}</h2>
    <p>${escapeHtml(node.summary)}</p>
    <dl class="node-metadata">
      <div>
        <dt>Cluster</dt>
        <dd>${escapeHtml(node.cluster)}</dd>
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
        <dd>${escapeHtml(node.updatedAt)}</dd>
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
    <strong>${escapeHtml(state.hoveredNode.name)}</strong>
    <span>${escapeHtml(formatTypeLabel(state.hoveredNode.type))} - ${escapeHtml(formatConnectionLabel(
      state.hoveredNode.connections,
    ))}</span>
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

function formatTrackingStatus(handTracking) {
  if (!handTracking.enabled) {
    return handTracking.status === 'starting' ? 'Starting' : 'Off';
  }

  return `${handTracking.handCount || 0} hand${handTracking.handCount === 1 ? '' : 's'} live`;
}

function formatGestureState(handTracking) {
  if (!handTracking.enabled || handTracking.gesture === 'none') {
    return handTracking.phase === 'RELEASING' ? 'Releasing' : 'Waiting';
  }

  return `${formatGestureLabel(handTracking.gesture)} ${handTracking.phase.toLowerCase()} ${Math.round(
    handTracking.confidence * 100,
  )}%`;
}

function formatGestureLabel(gesture) {
  return gesture
    .replaceAll('_', ' ')
    .replace(/\b\w/g, (match) => match.toUpperCase());
}

function formatInputSource(source) {
  return source
    .replace(/\b\w/g, (match) => match.toUpperCase());
}

function formatPoseStatus(handTracking) {
  if (!handTracking.enabled) {
    return 'Off';
  }

  if (handTracking.poseFallback) {
    return 'Fallback';
  }

  return handTracking.poseVisible ? 'Live' : 'Searching';
}

function formatPoseZone(handTracking) {
  if (!handTracking.enabled) {
    return 'Fixed';
  }

  return `${handTracking.poseZone.replace(/\b\w/g, (match) => match.toUpperCase())} x${handTracking.poseMultiplier.toFixed(2)}`;
}

function formatTrackingBudget(handTracking) {
  if (!handTracking.enabled) {
    return 'Tracking is currently off.';
  }

  const budget = `${handTracking.trackingBudgetMs.toFixed(1)}ms avg / ${Math.round(handTracking.trackingFps)} fps`;
  if (handTracking.poseFallback) {
    return `${budget}. Pose fallback is active to protect frame rate.`;
  }

  return handTracking.gestureIdle
    ? `${budget}. Gesture idle detected, so mouse and keyboard remain primary.`
    : `${budget}. Combined tracking is running within the live session.`;
}

function formatVoiceState(voice) {
  if (voice.loading) {
    return 'Transcribing';
  }

  if (voice.recording) {
    return `Recording (${voice.source})`;
  }

  return 'Ready';
}

function hasLeftHand(hands = []) {
  return hands.some((hand) => hand.handedness?.toLowerCase() === 'left');
}
