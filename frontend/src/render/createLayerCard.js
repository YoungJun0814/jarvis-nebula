import { layoutLayerNodes } from './layoutLayerNodes.js';

const SVG_NS = 'http://www.w3.org/2000/svg';

// File-type visual vocabulary. Colors echo what editors show in their sidebars
// so users can read structure at a glance. Glyphs are single ASCII characters
// because SVG <text> handles them well at any zoom.
const TYPE_STYLE = {
  folder: { color: '#f5c14b', glyph: '/' },
  javascript: { color: '#f7df1e', glyph: 'JS' },
  typescript: { color: '#3178c6', glyph: 'TS' },
  markdown: { color: '#e5e7eb', glyph: 'MD' },
  json: { color: '#f97316', glyph: '{}' },
  css: { color: '#38bdf8', glyph: '#' },
  html: { color: '#fb7185', glyph: '<>' },
  python: { color: '#4ade80', glyph: 'PY' },
  image: { color: '#ec4899', glyph: '@' },
  config: { color: '#94a3b8', glyph: '*' },
  // legacy categories kept as fallbacks
  person: { color: '#00ccff', glyph: '*' },
  project: { color: '#ff00aa', glyph: '*' },
  concept: { color: '#9b5de5', glyph: '*' },
  document: { color: '#ff66ff', glyph: '*' },
  default: { color: '#d5d9ff', glyph: '*' },
};

const LINK_COLOR = 'rgba(170, 210, 255, 0.42)';

const NODE_BASE_RADIUS = 16;
const NODE_SELECTED_SCALE = 1.45;

export function createLayerCard({
  container,
  graphData,
  width = 1320,
  height = 820,
  seed,
  getSelectionState,
  onNodeHover,
  onNodeClick,
  onBackgroundClick,
  hasChildren,
  tabLabel,
}) {
  const card = document.createElement('div');
  card.className = 'layer-card';
  container.append(card);

  const surface = document.createElement('div');
  surface.className = 'layer-card__surface';
  card.append(surface);

  // Tab strip — Format B+C: "L{depth} · {name} · {count} nodes"
  const tab = document.createElement('div');
  tab.className = 'layer-card__tab';
  tab.textContent = tabLabel ?? '';
  surface.append(tab);

  const svg = document.createElementNS(SVG_NS, 'svg');
  svg.setAttribute('viewBox', `0 0 ${width} ${height}`);
  svg.setAttribute('preserveAspectRatio', 'xMidYMid meet');
  svg.setAttribute('class', 'layer-card__svg');
  surface.append(svg);

  const linkLayer = document.createElementNS(SVG_NS, 'g');
  linkLayer.setAttribute('class', 'layer-card__links');
  svg.append(linkLayer);

  const nodeLayer = document.createElementNS(SVG_NS, 'g');
  nodeLayer.setAttribute('class', 'layer-card__nodes');
  svg.append(nodeLayer);

  const seedValue = seed ?? hashString(graphData.parentId ?? 'root');
  const layoutNodes = layoutLayerNodes({
    nodes: graphData.nodes,
    links: graphData.links,
    width,
    height,
    seed: seedValue,
  });
  const nodeById = new Map(layoutNodes.map((node) => [node.id, node]));
  const linkElements = new Map();
  const nodeElements = new Map();

  graphData.links.forEach((link) => {
    const source = nodeById.get(resolveId(link.source));
    const target = nodeById.get(resolveId(link.target));
    if (!source || !target) {
      return;
    }
    const line = document.createElementNS(SVG_NS, 'line');
    line.setAttribute('x1', source.x);
    line.setAttribute('y1', source.y);
    line.setAttribute('x2', target.x);
    line.setAttribute('y2', target.y);
    line.setAttribute('stroke', LINK_COLOR);
    line.setAttribute('stroke-width', 1.2 + (Number(link.weight) || 0.4) * 1.6);
    line.setAttribute('stroke-linecap', 'round');
    line.setAttribute('data-link-id', link.id);
    linkLayer.append(line);
    linkElements.set(link.id, { el: line, link, source, target });
  });

  layoutNodes.forEach((node) => {
    const style = TYPE_STYLE[node.type] ?? TYPE_STYLE.default;
    const group = document.createElementNS(SVG_NS, 'g');
    group.setAttribute('class', 'layer-card__node');
    group.setAttribute('transform', `translate(${node.x} ${node.y})`);
    group.dataset.nodeId = node.id;
    group.dataset.nodeType = node.type;

    const halo = document.createElementNS(SVG_NS, 'circle');
    halo.setAttribute('class', 'layer-card__node-halo');
    halo.setAttribute('r', NODE_BASE_RADIUS * 2.1);
    halo.setAttribute('fill', style.color);
    halo.setAttribute('opacity', '0');
    group.append(halo);

    const body = document.createElementNS(SVG_NS, 'circle');
    body.setAttribute('class', 'layer-card__node-body');
    body.setAttribute('r', NODE_BASE_RADIUS);
    body.setAttribute('fill', style.color);
    body.setAttribute('stroke', 'rgba(255,255,255,0.55)');
    body.setAttribute('stroke-width', '1.25');
    group.append(body);

    // Type glyph sits inside the node body as the "icon". Folders show a slash,
    // files show a short extension tag (JS, TS, PY, MD, etc.).
    const glyph = document.createElementNS(SVG_NS, 'text');
    glyph.setAttribute('class', 'layer-card__node-glyph');
    glyph.setAttribute('x', 0);
    glyph.setAttribute('y', 0);
    glyph.setAttribute('text-anchor', 'middle');
    glyph.setAttribute('dominant-baseline', 'central');
    glyph.setAttribute('fill', 'rgba(10, 15, 30, 0.88)');
    glyph.textContent = style.glyph;
    group.append(glyph);

    if (hasChildren && hasChildren(node.id)) {
      const ring = document.createElementNS(SVG_NS, 'circle');
      ring.setAttribute('class', 'layer-card__node-ring');
      ring.setAttribute('r', NODE_BASE_RADIUS + 6);
      ring.setAttribute('fill', 'none');
      ring.setAttribute('stroke', 'rgba(112, 214, 255, 0.55)');
      ring.setAttribute('stroke-dasharray', '3 4');
      ring.setAttribute('stroke-width', '1.1');
      group.append(ring);
    }

    const label = document.createElementNS(SVG_NS, 'text');
    label.setAttribute('class', 'layer-card__node-label');
    label.setAttribute('x', 0);
    label.setAttribute('y', NODE_BASE_RADIUS + 18);
    label.setAttribute('text-anchor', 'middle');
    label.textContent = node.name;
    group.append(label);

    group.addEventListener('pointerenter', () => {
      onNodeHover?.(getRawNode(node.id), 'mouse');
    });
    group.addEventListener('pointerleave', () => {
      onNodeHover?.(null, 'mouse');
    });
    let lastClickAt = 0;
    group.addEventListener('click', (event) => {
      event.stopPropagation();
      const now = performance.now();
      const double = now - lastClickAt < 340;
      lastClickAt = now;
      onNodeClick?.(getRawNode(node.id), 'mouse', { double });
    });

    nodeLayer.append(group);
    nodeElements.set(node.id, { el: group, halo, body, node });
  });

  surface.addEventListener('click', (event) => {
    if (event.target === surface || event.target === svg) {
      onBackgroundClick?.('mouse');
      return;
    }
    if (event.target === tab) {
      onBackgroundClick?.('mouse');
    }
  });

  function getRawNode(id) {
    return graphData.nodes.find((n) => n.id === id) ?? null;
  }

  function resolveId(ref) {
    if (ref && typeof ref === 'object') return ref.id ?? null;
    return ref ?? null;
  }

  function refreshVisuals() {
    const selection = getSelectionState?.() ?? {};
    const selectedId = selection.selectedNodeId ?? null;
    const hoveredId = selection.hoveredNodeId ?? null;
    const connected = selection.connectedNodeIds ?? new Set();
    const connectedLinks = selection.connectedLinkIds ?? new Set();
    const secondary = selection.secondDegreeNodeIds ?? new Set();

    nodeElements.forEach(({ el, halo, body, node }) => {
      let haloOpacity = 0;
      let scale = 1;
      let bodyStroke = 'rgba(255,255,255,0.55)';
      if (node.id === selectedId) {
        haloOpacity = 0.45;
        scale = NODE_SELECTED_SCALE;
        bodyStroke = '#ffffff';
      } else if (node.id === hoveredId) {
        haloOpacity = 0.32;
        scale = 1.2;
        bodyStroke = 'rgba(255,255,255,0.85)';
      } else if (connected.has(node.id)) {
        haloOpacity = 0.22;
        scale = 1.12;
      } else if (secondary.has(node.id)) {
        haloOpacity = 0.1;
      } else if (selectedId || hoveredId) {
        haloOpacity = 0;
        el.style.opacity = '0.55';
      }

      if (!selectedId && !hoveredId) {
        el.style.opacity = '1';
      } else if (node.id === selectedId || node.id === hoveredId || connected.has(node.id)) {
        el.style.opacity = '1';
      }

      halo.setAttribute('opacity', String(haloOpacity));
      body.setAttribute('stroke', bodyStroke);
      el.setAttribute(
        'transform',
        `translate(${node.x} ${node.y}) scale(${scale.toFixed(3)})`,
      );
    });

    linkElements.forEach(({ el, link }) => {
      const isConnected = connectedLinks.has(link.id);
      el.setAttribute('stroke', isConnected ? 'rgba(255, 234, 0, 0.9)' : LINK_COLOR);
      el.setAttribute('opacity', isConnected ? '0.95' : selectedId ? '0.25' : '0.72');
    });
  }

  function findNodeAtNormalized(nx, ny) {
    // Normalized coords (0..1) are relative to the card surface.
    const localX = nx * width;
    const localY = ny * height;
    let best = null;
    let bestDist = Infinity;
    layoutNodes.forEach((node) => {
      const dx = node.x - localX;
      const dy = node.y - localY;
      const dist = Math.hypot(dx, dy);
      if (dist < bestDist && dist < NODE_BASE_RADIUS * 2.8) {
        best = node;
        bestDist = dist;
      }
    });
    return best ? getRawNode(best.id) : null;
  }

  function setTabLabel(label) {
    tab.textContent = label ?? '';
  }

  refreshVisuals();

  return {
    rootEl: card,
    getWidth() {
      return width;
    },
    getHeight() {
      return height;
    },
    refreshVisuals,
    setTabLabel,
    focusNode() {
      /* 2D layer does not reposition nodes on focus */
    },
    resetCamera() {
      /* handled by the stage */
    },
    setPaused() {
      /* no animation loop inside the card */
    },
    zoomBy() {
      /* handled by the stage */
    },
    clearGestureLaser() {},
    clearGesturePreview() {},
    findNodeAtNormalized,
    destroy() {
      card.remove();
    },
  };
}

function hashString(value) {
  const str = String(value);
  let h = 0x811c9dc5;
  for (let i = 0; i < str.length; i += 1) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}
