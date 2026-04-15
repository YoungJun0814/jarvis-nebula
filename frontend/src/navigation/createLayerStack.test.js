import { describe, expect, it } from 'vitest';

import { createLayerStack } from './createLayerStack.js';
import { createLayerStore } from './createLayerStore.js';

function buildStore() {
  return createLayerStore({
    nodes: [
      { id: 'root-a', name: 'Root A', type: 'project', parentId: null, depth: 0, childIds: ['child-a1'] },
      { id: 'root-b', name: 'Root B', type: 'concept', parentId: null, depth: 0, childIds: [] },
      { id: 'child-a1', name: 'Child A1', type: 'person', parentId: 'root-a', depth: 1, childIds: ['leaf-a1a'] },
      { id: 'leaf-a1a', name: 'Leaf A1A', type: 'document', parentId: 'child-a1', depth: 2, childIds: [] },
    ],
    links: [],
    stats: {},
  });
}

describe('createLayerStack', () => {
  it('starts at the root layer', () => {
    const stack = createLayerStack(buildStore());
    expect(stack.getCurrentParentId()).toBe(null);
    expect(stack.getDepth()).toBe(0);
  });

  it('refuses to dive into a leaf node', () => {
    const stack = createLayerStack(buildStore());
    expect(stack.push('root-b')).toBe(false);
    expect(stack.getDepth()).toBe(0);
  });

  it('pushes and pops through a hierarchy', () => {
    const stack = createLayerStack(buildStore());
    expect(stack.push('root-a')).toBe(true);
    expect(stack.push('child-a1')).toBe(true);
    expect(stack.getDepth()).toBe(2);

    const crumbs = stack.getBreadcrumb();
    expect(crumbs.map((entry) => entry.name)).toEqual(['Root', 'Root A', 'Child A1']);
    expect(crumbs[crumbs.length - 1].isCurrent).toBe(true);

    expect(stack.pop()).toBe(true);
    expect(stack.getCurrentParentId()).toBe('root-a');
    expect(stack.pop()).toBe(true);
    expect(stack.getCurrentParentId()).toBe(null);
    expect(stack.pop()).toBe(false);
  });

  it('pops to a specific ancestor via popTo', () => {
    const stack = createLayerStack(buildStore());
    stack.push('root-a');
    stack.push('child-a1');

    expect(stack.popTo(null)).toBe(true);
    expect(stack.getDepth()).toBe(0);
  });
});
