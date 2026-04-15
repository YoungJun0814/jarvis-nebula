import { createLayerCard } from './createLayerCard.js';

const DEFAULT_CARD_WIDTH = 1320;
const DEFAULT_CARD_HEIGHT = 820;
const LAYER_Z_STEP = 420;
// Each deeper layer shifts right + up in card-space. These numbers are big
// on purpose — with the card taking up most of the stage, smaller offsets
// get swallowed entirely by the foreground card's footprint.
const LAYER_OFFSET_X = 90;
const LAYER_OFFSET_Y = -260;
const FAR_ENTER_Z = 340;
const DEFAULT_TRANSITION_MS = 720;
const DRAG_ROT_SENSITIVITY = 0.32; // degrees per pixel
const WHEEL_ZOOM_STEP = 0.0009;
const MIN_ZOOM = 0.55;
const MAX_ZOOM = 1.8;
const MIN_PITCH = -60;
const MAX_PITCH = 35;
// Default camera tilt — pitched forward a bit so we look "over" the stack
// and the tops of background layers peek above the foreground.
const DEFAULT_ROT_X = -18;
const DEFAULT_ROT_Y = 4;

export function createLayerStage({
  container,
  getSelectionState,
  onNodeHover,
  onNodeClick,
  onBackgroundClick,
  hasChildren,
  cardWidth = DEFAULT_CARD_WIDTH,
  cardHeight = DEFAULT_CARD_HEIGHT,
}) {
  const stage = document.createElement('div');
  stage.className = 'layer-stage';
  container.append(stage);

  const scene = document.createElement('div');
  scene.className = 'layer-stage__scene';
  stage.append(scene);

  const starfield = document.createElement('canvas');
  starfield.className = 'layer-stage__starfield';
  stage.append(starfield);
  const starCtx = starfield.getContext ? starfield.getContext('2d') : null;
  const stars = [];
  const dpr = typeof window !== 'undefined' && window.devicePixelRatio ? window.devicePixelRatio : 1;

  function sizeStarfield() {
    const rect = stage.getBoundingClientRect();
    starfield.width = Math.max(Math.floor(rect.width * dpr), 1);
    starfield.height = Math.max(Math.floor(rect.height * dpr), 1);
    starfield.style.width = `${rect.width}px`;
    starfield.style.height = `${rect.height}px`;
  }
  function seedStars() {
    stars.length = 0;
    const count = 240;
    for (let i = 0; i < count; i += 1) {
      stars.push({
        x: Math.random(),
        y: Math.random(),
        r: 0.4 + Math.random() * 1.8,
        hue: 190 + Math.random() * 80,
        twinkle: Math.random() * Math.PI * 2,
      });
    }
  }
  sizeStarfield();
  seedStars();

  let starRafId = null;
  function drawStars(t) {
    if (!starCtx) return;
    const w = starfield.width;
    const h = starfield.height;
    starCtx.clearRect(0, 0, w, h);
    for (const s of stars) {
      const alpha = 0.35 + 0.45 * Math.sin(t * 0.0006 + s.twinkle);
      starCtx.fillStyle = `hsla(${s.hue}, 90%, 78%, ${alpha.toFixed(3)})`;
      starCtx.beginPath();
      starCtx.arc(s.x * w, s.y * h, s.r * dpr, 0, Math.PI * 2);
      starCtx.fill();
    }
    starRafId = window.requestAnimationFrame(drawStars);
  }
  if (starCtx && typeof window !== 'undefined' && window.requestAnimationFrame) {
    starRafId = window.requestAnimationFrame(drawStars);
  }

  function handleResize() {
    sizeStarfield();
  }
  window.addEventListener('resize', handleResize);

  const layers = [];
  // Camera state — user-controlled via drag + wheel (no auto parallax).
  const camera = { rotX: DEFAULT_ROT_X, rotY: DEFAULT_ROT_Y, zoom: 1 };
  applyCameraTransform();

  // Drag-to-rotate. We only start a drag if the pointerdown landed on the
  // stage background (not on a node). Nodes handle their own clicks.
  let dragState = null;

  stage.addEventListener('pointerdown', (event) => {
    if (event.button !== 0) return;
    if (event.target.closest('.layer-card__node')) return;
    dragState = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      startRotX: camera.rotX,
      startRotY: camera.rotY,
      moved: false,
    };
    stage.setPointerCapture?.(event.pointerId);
    stage.style.cursor = 'grabbing';
  });

  stage.addEventListener('pointermove', (event) => {
    if (!dragState || event.pointerId !== dragState.pointerId) return;
    const dx = event.clientX - dragState.startX;
    const dy = event.clientY - dragState.startY;
    if (Math.hypot(dx, dy) > 3) dragState.moved = true;
    camera.rotY = dragState.startRotY + dx * DRAG_ROT_SENSITIVITY;
    camera.rotX = clamp(dragState.startRotX - dy * DRAG_ROT_SENSITIVITY, MIN_PITCH, MAX_PITCH);
    applyCameraTransform();
  });

  function endDrag(event) {
    if (!dragState || event.pointerId !== dragState.pointerId) return;
    const wasMoved = dragState.moved;
    stage.releasePointerCapture?.(event.pointerId);
    dragState = null;
    stage.style.cursor = '';
    // Swallow the click that would otherwise fire after a real drag so it
    // doesn't clear selection when the user just meant to orbit.
    if (wasMoved) {
      const swallow = (ev) => {
        ev.stopPropagation();
        ev.preventDefault();
        stage.removeEventListener('click', swallow, true);
      };
      stage.addEventListener('click', swallow, true);
    }
  }
  stage.addEventListener('pointerup', endDrag);
  stage.addEventListener('pointercancel', endDrag);

  // Wheel zoom. Positive deltaY (scroll down) pulls out, negative zooms in.
  stage.addEventListener(
    'wheel',
    (event) => {
      event.preventDefault();
      const next = camera.zoom * (1 - event.deltaY * WHEEL_ZOOM_STEP);
      camera.zoom = clamp(next, MIN_ZOOM, MAX_ZOOM);
      applyCameraTransform();
    },
    { passive: false },
  );

  stage.addEventListener('click', (event) => {
    if (event.target === stage || event.target === scene || event.target === starfield) {
      onBackgroundClick?.('mouse');
    }
  });

  function applyCameraTransform() {
    scene.style.transform = `scale(${camera.zoom.toFixed(3)}) rotateX(${camera.rotX.toFixed(2)}deg) rotateY(${camera.rotY.toFixed(2)}deg)`;
  }

  function buildTabLabel(layerView, depth) {
    const count = layerView?.stats?.nodeCount ?? 0;
    if (depth === 0) return `Root · ${count} items`;
    const parentName = layerView?.parentName ?? 'Layer';
    return `L${depth} · ${parentName} · ${count} items`;
  }

  function addLayer(layerView, { animate = true } = {}) {
    const depth = layers.length;
    const card = createLayerCard({
      container: scene,
      graphData: layerView,
      width: cardWidth,
      height: cardHeight,
      getSelectionState,
      onNodeHover,
      onNodeClick,
      onBackgroundClick,
      hasChildren,
      tabLabel: buildTabLabel(layerView, depth),
    });

    const record = { card, parentId: layerView.parentId, positionZ: 0, layerView };
    layers.push(record);

    if (animate) {
      card.rootEl.style.setProperty('--layer-z', `${FAR_ENTER_Z}px`);
      card.rootEl.style.setProperty('--layer-opacity', '0');
      card.rootEl.getBoundingClientRect();
    }
    applyLayerTransforms();
    if (animate) {
      window.setTimeout(() => {
        applyLayerTransforms();
      }, 16);
    }
    return record;
  }

  function applyLayerTransforms() {
    layers.forEach((layer, index) => {
      const depthFromTop = layers.length - 1 - index;
      const z = -depthFromTop * LAYER_Z_STEP;
      const offsetX = depthFromTop * LAYER_OFFSET_X;
      const offsetY = depthFromTop * LAYER_OFFSET_Y;
      layer.positionZ = z;
      layer.card.rootEl.style.setProperty('--layer-z', `${z}px`);
      layer.card.rootEl.style.setProperty('--layer-depth', String(depthFromTop));
      layer.card.rootEl.style.setProperty('--layer-offset-x', `${offsetX}px`);
      layer.card.rootEl.style.setProperty('--layer-offset-y', `${offsetY}px`);
      layer.card.rootEl.style.setProperty('--layer-opacity', '1');
      layer.card.rootEl.classList.toggle('layer-card--foreground', depthFromTop === 0);
      layer.card.rootEl.classList.toggle('layer-card--background', depthFromTop !== 0);
      layer.card.rootEl.style.pointerEvents = depthFromTop === 0 ? 'auto' : 'none';
      // Refresh the tab label since the stack depth may have shifted.
      layer.card.setTabLabel?.(buildTabLabel(layer.layerView, index));
    });
  }

  async function pushLayer(layerView, { duration = DEFAULT_TRANSITION_MS } = {}) {
    const record = addLayer(layerView, { animate: true });
    await delay(duration);
    applyLayerTransforms();
    return record;
  }

  async function popLayer({ duration = DEFAULT_TRANSITION_MS } = {}) {
    if (layers.length <= 1) return false;
    const top = layers[layers.length - 1];
    top.card.rootEl.style.setProperty('--layer-z', `${FAR_ENTER_Z}px`);
    top.card.rootEl.style.setProperty('--layer-opacity', '0');
    await delay(duration);
    top.card.destroy();
    layers.pop();
    applyLayerTransforms();
    return true;
  }

  function reset(layerView) {
    while (layers.length) {
      const layer = layers.pop();
      layer.card.destroy();
    }
    addLayer(layerView, { animate: false });
    applyLayerTransforms();
  }

  function currentCard() {
    return layers[layers.length - 1]?.card ?? null;
  }

  function refreshVisuals() {
    layers.forEach((layer) => layer.card.refreshVisuals());
  }

  function orbitBy(dx, dy, strength = 1) {
    camera.rotY += dx * 80 * strength;
    camera.rotX = clamp(camera.rotX + dy * 60 * strength, MIN_PITCH, MAX_PITCH);
    applyCameraTransform();
  }

  function zoomBy(delta) {
    const next = camera.zoom * (1 + delta * 8);
    camera.zoom = clamp(next, MIN_ZOOM, MAX_ZOOM);
    applyCameraTransform();
  }

  function resetCamera() {
    camera.rotX = DEFAULT_ROT_X;
    camera.rotY = DEFAULT_ROT_Y;
    camera.zoom = 1;
    applyCameraTransform();
  }

  function destroy() {
    if (starRafId) window.cancelAnimationFrame(starRafId);
    window.removeEventListener('resize', handleResize);
    layers.forEach((layer) => layer.card.destroy());
    layers.length = 0;
    stage.remove();
  }

  return {
    addLayer,
    pushLayer,
    popLayer,
    reset,
    refreshVisuals,
    currentCard,
    orbitBy,
    zoomBy,
    resetCamera,
    getLayerCount() {
      return layers.length;
    },
    destroy,
  };
}

function delay(ms) {
  return new Promise((resolve) => window.setTimeout(resolve, ms));
}

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}
