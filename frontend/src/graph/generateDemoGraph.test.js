import { describe, expect, it } from 'vitest';

import { generateDemoGraph } from './generateDemoGraph.js';

describe('generateDemoGraph', () => {
  it('creates a stable 500-node demo graph by default', () => {
    const graph = generateDemoGraph();

    expect(graph.nodes).toHaveLength(500);
    expect(graph.links.length).toBeGreaterThan(500);
    expect(graph.stats.nodeCount).toBe(500);
    expect(graph.stats.linkCount).toBe(graph.links.length);
  });
});
