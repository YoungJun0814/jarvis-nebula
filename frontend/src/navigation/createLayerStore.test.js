import { describe, expect, it } from 'vitest';

import { createLayerStore } from './createLayerStore.js';

function buildFixture() {
  return {
    nodes: [
      { id: 'root-a', name: 'Root A', type: 'project', parentId: null, depth: 0, childIds: ['child-a1', 'child-a2'] },
      { id: 'root-b', name: 'Root B', type: 'concept', parentId: null, depth: 0, childIds: [] },
      { id: 'child-a1', name: 'Child A1', type: 'person', parentId: 'root-a', depth: 1, childIds: ['leaf-a1a'] },
      { id: 'child-a2', name: 'Child A2', type: 'document', parentId: 'root-a', depth: 1, childIds: [] },
      { id: 'leaf-a1a', name: 'Leaf A1A', type: 'document', parentId: 'child-a1', depth: 2, childIds: [] },
    ],
    links: [
      { id: 'link-root-ab', source: 'root-a', target: 'root-b', weight: 0.5, kind: 'semantic' },
      { id: 'link-child-a1a2', source: 'child-a1', target: 'child-a2', weight: 0.8, kind: 'reference' },
      { id: 'link-cross', source: 'leaf-a1a', target: 'root-b', weight: 0.4, kind: 'reference' },
    ],
    stats: { nodeCount: 5, linkCount: 3, typeCounts: { person: 1, project: 1, concept: 1, document: 2 } },
  };
}

describe('createLayerStore', () => {
  it('exposes the root layer when parentId is null', () => {
    const store = createLayerStore(buildFixture());
    const layer = store.getLayer(null);

    expect(layer.parentId).toBe(null);
    expect(layer.nodes.map((node) => node.id)).toEqual(['root-a', 'root-b']);
    expect(layer.links.map((link) => link.id)).toEqual(['link-root-ab']);
    expect(layer.stats.nodeCount).toBe(2);
    expect(layer.stats.depth).toBe(0);
  });

  it('returns only intra-layer links for nested layers', () => {
    const store = createLayerStore(buildFixture());
    const childLayer = store.getLayer('root-a');

    expect(childLayer.nodes.map((node) => node.id)).toEqual(['child-a1', 'child-a2']);
    expect(childLayer.links.map((link) => link.id)).toEqual(['link-child-a1a2']);
    expect(childLayer.stats.depth).toBe(1);
  });

  it('collapses cross-layer links out of the requested layer view', () => {
    const store = createLayerStore(buildFixture());
    const leafLayer = store.getLayer('child-a1');

    expect(leafLayer.nodes.map((node) => node.id)).toEqual(['leaf-a1a']);
    expect(leafLayer.links).toEqual([]);
  });

  it('reports ancestors and children', () => {
    const store = createLayerStore(buildFixture());

    expect(store.getAncestors('leaf-a1a').map((node) => node.id)).toEqual(['root-a', 'child-a1']);
    expect(store.getChildIds('root-a')).toEqual(['child-a1', 'child-a2']);
    expect(store.hasChildren('root-a')).toBe(true);
    expect(store.hasChildren('root-b')).toBe(false);
    expect(store.getRootIds()).toEqual(['root-a', 'root-b']);
  });
});
