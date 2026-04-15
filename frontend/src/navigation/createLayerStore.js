const EMPTY_ARRAY = Object.freeze([]);

export function createLayerStore(graphData) {
  const nodes = Array.isArray(graphData?.nodes) ? graphData.nodes : [];
  const links = Array.isArray(graphData?.links) ? graphData.links : [];

  const nodesById = new Map();
  const childrenByParent = new Map();

  nodes.forEach((node) => {
    nodesById.set(node.id, node);
    const parentKey = normalizeParentKey(node.parentId);
    if (!childrenByParent.has(parentKey)) {
      childrenByParent.set(parentKey, []);
    }
    childrenByParent.get(parentKey).push(node);
  });

  const linksByPairKey = new Map();
  links.forEach((link) => {
    const sourceId = resolveNodeId(link.source);
    const targetId = resolveNodeId(link.target);
    if (!sourceId || !targetId) {
      return;
    }
    const key = pairKey(sourceId, targetId);
    if (!linksByPairKey.has(key)) {
      linksByPairKey.set(key, []);
    }
    linksByPairKey.get(key).push(link);
  });

  function getLayer(parentId) {
    const parentKey = normalizeParentKey(parentId);
    const layerNodes = childrenByParent.get(parentKey) ?? EMPTY_ARRAY;
    const idSet = new Set(layerNodes.map((node) => node.id));
    const layerLinks = [];
    idSet.forEach((sourceId) => {
      idSet.forEach((targetId) => {
        if (sourceId >= targetId) {
          return;
        }
        const key = pairKey(sourceId, targetId);
        const matches = linksByPairKey.get(key);
        if (matches) {
          matches.forEach((link) => layerLinks.push(link));
        }
      });
    });

    const typeCounts = {};
    layerNodes.forEach((node) => {
      typeCounts[node.type] = (typeCounts[node.type] ?? 0) + 1;
    });

    const parentNode = parentKey === null ? null : nodesById.get(parentKey) ?? null;

    return {
      parentId: parentKey === null ? null : parentKey,
      parentName: parentNode?.name ?? null,
      nodes: layerNodes.map((node) => cloneNode(node)),
      links: layerLinks.map((link) => ({ ...link })),
      stats: {
        nodeCount: layerNodes.length,
        linkCount: layerLinks.length,
        typeCounts,
        depth: layerNodes[0]?.depth ?? 0,
      },
    };
  }

  function getNode(id) {
    if (!id) {
      return null;
    }
    return nodesById.get(id) ?? null;
  }

  function getAncestors(id) {
    const chain = [];
    let current = getNode(id);
    while (current && current.parentId) {
      const parent = getNode(current.parentId);
      if (!parent) {
        break;
      }
      chain.unshift(parent);
      current = parent;
    }
    return chain;
  }

  function getChildIds(parentId) {
    const parent = getNode(parentId);
    if (parent?.childIds?.length) {
      return parent.childIds.slice();
    }
    const parentKey = normalizeParentKey(parentId);
    return (childrenByParent.get(parentKey) ?? EMPTY_ARRAY).map((node) => node.id);
  }

  function hasChildren(id) {
    const parent = getNode(id);
    if (parent?.childIds?.length) {
      return true;
    }
    return (childrenByParent.get(id)?.length ?? 0) > 0;
  }

  function getRootIds() {
    return (childrenByParent.get(null) ?? EMPTY_ARRAY).map((node) => node.id);
  }

  return {
    getLayer,
    getNode,
    getAncestors,
    getChildIds,
    hasChildren,
    getRootIds,
  };
}

function cloneNode(node) {
  return {
    ...node,
    childIds: Array.isArray(node.childIds) ? node.childIds.slice() : [],
  };
}

function normalizeParentKey(parentId) {
  if (parentId === undefined || parentId === null || parentId === '') {
    return null;
  }
  return parentId;
}

function pairKey(a, b) {
  return a < b ? `${a}::${b}` : `${b}::${a}`;
}

function resolveNodeId(ref) {
  if (ref && typeof ref === 'object') {
    return ref.id ?? null;
  }
  return ref ?? null;
}
