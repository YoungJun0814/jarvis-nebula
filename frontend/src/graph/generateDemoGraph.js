const CATEGORY_LIBRARY = {
  person: {
    names: ['Avery', 'Jordan', 'Taylor', 'Morgan', 'Riley', 'Quinn', 'Harper', 'Rowan'],
    clusters: ['Operations', 'Research', 'Design', 'Platform'],
    descriptors: ['owner', 'reviewer', 'specialist', 'lead'],
  },
  project: {
    names: ['Helios', 'Orion', 'Beacon', 'Atlas', 'Pulse', 'Axiom', 'Vertex', 'Summit'],
    clusters: ['Launch', 'Roadmap', 'Infrastructure', 'Client'],
    descriptors: ['initiative', 'stream', 'milestone', 'program'],
  },
  concept: {
    names: ['Latency', 'Trust', 'Inference', 'Context', 'Workflow', 'Insight', 'Signal', 'Memory'],
    clusters: ['System', 'Behavior', 'Planning', 'Knowledge'],
    descriptors: ['model', 'pattern', 'theme', 'framework'],
  },
  document: {
    names: ['Spec', 'Brief', 'Outline', 'Journal', 'Decision Log', 'Incident Note', 'Guide', 'Memo'],
    clusters: ['Archive', 'Planning', 'Operations', 'Review'],
    descriptors: ['artifact', 'record', 'summary', 'reference'],
  },
};

const CATEGORY_DISTRIBUTION = [
  ['project', 0.24],
  ['person', 0.2],
  ['concept', 0.28],
  ['document', 0.28],
];

export function generateDemoGraph(nodeCount = 500, seed = 20260408) {
  const random = createMulberry32(seed);
  const nodes = Array.from({ length: nodeCount }, (_, index) => createNode(index, random));
  const links = [];
  const adjacency = new Map(nodes.map((node) => [node.id, new Set()]));

  for (let sourceIndex = 0; sourceIndex < nodes.length; sourceIndex += 1) {
    for (let targetIndex = sourceIndex + 1; targetIndex < nodes.length; targetIndex += 1) {
      const source = nodes[sourceIndex];
      const target = nodes[targetIndex];

      const sameTypeBoost = source.type === target.type ? 0.012 : 0;
      const sameClusterBoost = source.cluster === target.cluster ? 0.008 : 0;
      const priorityBoost = (source.priority + target.priority) / 300;
      const probability = 0.002 + sameTypeBoost + sameClusterBoost + priorityBoost;

      if (random() >= probability) {
        continue;
      }

      const weight = Number((0.25 + random() * 0.75).toFixed(2));

      links.push({
        id: `link-${links.length}`,
        source: source.id,
        target: target.id,
        weight,
        kind: source.type === target.type ? 'semantic' : 'reference',
      });

      adjacency.get(source.id)?.add(target.id);
      adjacency.get(target.id)?.add(source.id);
    }
  }

  ensureEveryNodeHasConnection(nodes, links, adjacency, random);

  const typeCounts = { person: 0, project: 0, concept: 0, document: 0 };

  nodes.forEach((node) => {
    node.connections = adjacency.get(node.id)?.size ?? 0;
    node.importance = Number((1 + Math.log(node.connections + 1) * 0.85).toFixed(2));
    typeCounts[node.type] += 1;
  });

  return {
    nodes,
    links,
    stats: {
      nodeCount: nodes.length,
      linkCount: links.length,
      typeCounts,
      seed,
    },
  };
}

function createNode(index, random) {
  const type = chooseWeightedType(random);
  const library = CATEGORY_LIBRARY[type];
  const nameSeed = pick(library.names, random);
  const cluster = pick(library.clusters, random);
  const descriptor = pick(library.descriptors, random);
  const radius = 72 + random() * 54;
  const theta = random() * Math.PI * 2;
  const phi = Math.acos(2 * random() - 1);

  return {
    id: `${type}-${index + 1}`,
    name: `${nameSeed} ${descriptor} ${Math.floor(index / 8) + 1}`,
    type,
    cluster,
    priority: Number((0.2 + random() * 0.8).toFixed(2)),
    signalStrength: Number((0.35 + random() * 0.65).toFixed(2)),
    summary: buildSummary(type, cluster),
    updatedAt: buildRelativeDate(index),
    connections: 0,
    x: radius * Math.sin(phi) * Math.cos(theta),
    y: radius * Math.sin(phi) * Math.sin(theta),
    z: radius * Math.cos(phi),
  };
}

function ensureEveryNodeHasConnection(nodes, links, adjacency, random) {
  nodes.forEach((node) => {
    if ((adjacency.get(node.id)?.size ?? 0) > 0) {
      return;
    }

    const compatibleNodes = nodes.filter(
      (candidate) => candidate.id !== node.id && candidate.type === node.type,
    );
    const fallbackPool =
      compatibleNodes.length > 0
        ? compatibleNodes
        : nodes.filter((candidate) => candidate.id !== node.id);
    const target = fallbackPool[Math.floor(random() * fallbackPool.length)];
    const weight = Number((0.35 + random() * 0.4).toFixed(2));

    links.push({
      id: `link-${links.length}`,
      source: node.id,
      target: target.id,
      weight,
      kind: 'stabilizer',
    });

    adjacency.get(node.id)?.add(target.id);
    adjacency.get(target.id)?.add(node.id);
  });
}

function chooseWeightedType(random) {
  const roll = random();
  let cumulative = 0;

  for (const [type, weight] of CATEGORY_DISTRIBUTION) {
    cumulative += weight;
    if (roll <= cumulative) {
      return type;
    }
  }

  return 'concept';
}

function buildSummary(type, cluster) {
  const templates = {
    person: `Coordinates decisions in the ${cluster} cluster and bridges active tasks.`,
    project: `Tracks delivery momentum for the ${cluster} stream and anchors related work.`,
    concept: `Captures a reusable ${cluster.toLowerCase()} idea that influences nearby nodes.`,
    document: `Stores a ${cluster.toLowerCase()} reference that grounds context for the graph.`,
  };

  return templates[type];
}

function buildRelativeDate(index) {
  const month = (index % 12) + 1;
  const day = (index % 27) + 1;
  return `2026-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

function pick(items, random) {
  return items[Math.floor(random() * items.length)];
}

function createMulberry32(seed) {
  let state = seed >>> 0;

  return function next() {
    state += 0x6d2b79f5;
    let result = state;
    result = Math.imul(result ^ (result >>> 15), result | 1);
    result ^= result + Math.imul(result ^ (result >>> 7), result | 61);
    return ((result ^ (result >>> 14)) >>> 0) / 4294967296;
  };
}
