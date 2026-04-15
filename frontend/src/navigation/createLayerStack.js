export function createLayerStack(store) {
  const stack = [];

  function getCurrent() {
    return stack[stack.length - 1] ?? null;
  }

  function getCurrentParentId() {
    return getCurrent()?.parentId ?? null;
  }

  function push(parentId) {
    const normalized = parentId ?? null;
    if (normalized && !store.hasChildren(normalized)) {
      return false;
    }
    stack.push({
      parentId: normalized,
    });
    return true;
  }

  function pop() {
    if (stack.length <= 1) {
      return false;
    }
    stack.pop();
    return true;
  }

  function reset() {
    stack.length = 0;
    stack.push({ parentId: null });
  }

  function popTo(parentId) {
    const normalized = parentId ?? null;
    const index = stack.findIndex((entry) => entry.parentId === normalized);
    if (index < 0) {
      return false;
    }
    stack.length = index + 1;
    return true;
  }

  function getBreadcrumb() {
    return stack.map((entry, index) => {
      if (entry.parentId === null) {
        return {
          id: null,
          name: 'Root',
          type: 'root',
          depth: 0,
          isCurrent: index === stack.length - 1,
        };
      }
      const node = store.getNode(entry.parentId);
      return {
        id: entry.parentId,
        name: node?.name ?? 'Unknown',
        type: node?.type ?? 'unknown',
        depth: (node?.depth ?? 0) + 1,
        isCurrent: index === stack.length - 1,
      };
    });
  }

  function getDepth() {
    return Math.max(0, stack.length - 1);
  }

  reset();

  return {
    push,
    pop,
    reset,
    popTo,
    getCurrent,
    getCurrentParentId,
    getBreadcrumb,
    getDepth,
  };
}
