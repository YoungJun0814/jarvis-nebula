import { describe, expect, it } from 'vitest';

import { generateDemoGraph } from './generateDemoGraph.js';

describe('generateDemoGraph', () => {
  it('creates a stable hierarchical demo graph by default', () => {
    const graph = generateDemoGraph();

    expect(graph.nodes.length).toBeGreaterThan(200);
    expect(graph.links.length).toBeGreaterThan(graph.stats.rootCount);
    expect(graph.stats.nodeCount).toBe(graph.nodes.length);
    expect(graph.stats.linkCount).toBe(graph.links.length);
    expect(graph.stats.rootCount).toBeGreaterThan(0);

    const roots = graph.nodes.filter((node) => node.depth === 0);
    expect(roots.length).toBe(graph.stats.rootCount);
    expect(roots.every((node) => node.parentId === null)).toBe(true);
    expect(graph.nodes.every((node) => Array.isArray(node.childIds))).toBe(true);
  });
});
