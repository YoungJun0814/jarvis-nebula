const DEFAULT_ITERATIONS = 260;
const REPULSION = 5200;
const SPRING = 0.022;
const CENTER_PULL = 0.012;
const DAMPING = 0.72;
const LINK_REST = 150;
const BOUNDARY_PADDING = 96;

export function layoutLayerNodes({
  nodes,
  links,
  width,
  height,
  seed = 0x9e3779b1,
  iterations = DEFAULT_ITERATIONS,
}) {
  const rng = mulberry32(seed);
  const cx = width / 2;
  const cy = height / 2;
  const radius = Math.min(width, height) * 0.28;

  const positioned = nodes.map((node, index) => {
    const theta = (index / Math.max(nodes.length, 1)) * Math.PI * 2 + rng() * 0.6;
    const r = radius * (0.4 + rng() * 0.6);
    return {
      ...node,
      x: cx + Math.cos(theta) * r,
      y: cy + Math.sin(theta) * r,
      vx: 0,
      vy: 0,
    };
  });

  const nodeById = new Map(positioned.map((node) => [node.id, node]));
  const springs = links
    .map((link) => {
      const source = nodeById.get(resolveId(link.source));
      const target = nodeById.get(resolveId(link.target));
      if (!source || !target) {
        return null;
      }
      return { source, target, weight: Number(link.weight) || 0.5 };
    })
    .filter(Boolean);

  const minX = BOUNDARY_PADDING;
  const maxX = width - BOUNDARY_PADDING;
  const minY = BOUNDARY_PADDING;
  const maxY = height - BOUNDARY_PADDING;

  for (let step = 0; step < iterations; step += 1) {
    for (let i = 0; i < positioned.length; i += 1) {
      const a = positioned[i];
      for (let j = i + 1; j < positioned.length; j += 1) {
        const b = positioned[j];
        const dx = a.x - b.x;
        const dy = a.y - b.y;
        const distSq = dx * dx + dy * dy + 0.01;
        const force = REPULSION / distSq;
        const dist = Math.sqrt(distSq);
        const fx = (dx / dist) * force;
        const fy = (dy / dist) * force;
        a.vx += fx;
        a.vy += fy;
        b.vx -= fx;
        b.vy -= fy;
      }
    }

    for (const spring of springs) {
      const dx = spring.target.x - spring.source.x;
      const dy = spring.target.y - spring.source.y;
      const dist = Math.sqrt(dx * dx + dy * dy) + 0.001;
      const rest = LINK_REST * (1.25 - spring.weight * 0.5);
      const force = (dist - rest) * SPRING;
      const fx = (dx / dist) * force;
      const fy = (dy / dist) * force;
      spring.source.vx += fx;
      spring.source.vy += fy;
      spring.target.vx -= fx;
      spring.target.vy -= fy;
    }

    for (const node of positioned) {
      node.vx += (cx - node.x) * CENTER_PULL;
      node.vy += (cy - node.y) * CENTER_PULL;
      node.vx *= DAMPING;
      node.vy *= DAMPING;
      node.x += node.vx;
      node.y += node.vy;
      if (node.x < minX) node.x = minX;
      if (node.x > maxX) node.x = maxX;
      if (node.y < minY) node.y = minY;
      if (node.y > maxY) node.y = maxY;
    }
  }

  return positioned.map((node) => ({
    ...node,
    x: round(node.x),
    y: round(node.y),
    vx: undefined,
    vy: undefined,
  }));
}

function mulberry32(seed) {
  let a = seed >>> 0;
  return function rng() {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function resolveId(ref) {
  if (ref && typeof ref === 'object') {
    return ref.id ?? null;
  }
  return ref ?? null;
}

function round(value) {
  return Math.round(value * 100) / 100;
}
