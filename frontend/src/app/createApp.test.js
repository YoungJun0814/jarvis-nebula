import { describe, expect, it } from 'vitest';

import { createApp } from './createApp.js';

function createStageFactoryStub() {
  return () => {
    let count = 0;
    return {
      addLayer() {
        count += 1;
        return { card: { destroy() {} } };
      },
      pushLayer() {
        count += 1;
        return Promise.resolve();
      },
      popLayer() {
        count = Math.max(count - 1, 0);
        return Promise.resolve(true);
      },
      reset() {
        count = 1;
      },
      currentCard() {
        return {
          destroy() {},
          focusNode() {},
          refreshVisuals() {},
          resetCamera() {},
          setPaused() {},
          zoomBy() {},
        };
      },
      refreshVisuals() {},
      orbitBy() {},
      zoomBy() {},
      resetCamera() {},
      getLayerCount() {
        return count;
      },
      destroy() {},
    };
  };
}

function createGraphFixture() {
  return {
    nodes: [
      {
        id: 'project-1',
        name: 'Atlas initiative 1',
        type: 'project',
        cluster: 'Launch',
        connections: 4,
        signalStrength: 0.72,
        summary: 'Tracks launch readiness.',
        updatedAt: '2026-04-08',
        x: 0,
        y: 1,
        z: 2,
      },
    ],
    links: [],
    stats: {
      nodeCount: 1,
      linkCount: 0,
      typeCounts: { person: 0, project: 1, concept: 0, document: 0 },
    },
  };
}

describe('createApp', () => {
  it('renders the phase 9 shell and queues commands locally', () => {
    const root = document.createElement('div');

    createApp(root, {
      graphData: createGraphFixture(),
      stageFactory: createStageFactoryStub(),
    });

    expect(root.querySelector('h1')?.textContent).toContain('Jarvis Nebula');
    expect(root.textContent).toContain('Node Inspector');
    expect(root.textContent).toContain('Phase 9 Liquid Glass');
    expect(root.textContent).toContain('Mic');

    const input = root.querySelector('#command-input');
    const form = root.querySelector('[data-command-form]');

    input.value = 'show active launch dependencies';
    form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));

    expect(root.textContent).toContain('show active launch dependencies');
  });

  it('applies a remote graph query response to the status panel', async () => {
    const root = document.createElement('div');
    const graphApi = {
      async fetchGraphSnapshot() {
        return {
          source: 'neo4j',
          graph: createGraphFixture(),
          query: {
            summary: 'Loaded the default graph snapshot from Neo4j.',
            cypher: 'MATCH (root:NebulaNode) RETURN collect(root.id) AS root_ids',
          },
          warnings: [],
        };
      },
      async queryGraph() {
        return {
          source: 'neo4j',
          graph: {
            nodes: [
              {
                id: 'document-2',
                name: 'Brief summary 2',
                type: 'document',
                cluster: 'Archive',
                connections: 2,
                signalStrength: 0.64,
                summary: 'Stores archive context.',
                updatedAt: '2026-04-09',
                x: 1,
                y: 2,
                z: 3,
              },
            ],
            links: [],
            stats: {
              nodeCount: 1,
              linkCount: 0,
              typeCounts: { person: 0, project: 0, concept: 0, document: 1 },
            },
          },
          query: {
            summary: 'Focused the graph on archive documents.',
            cypher: 'MATCH (root:NebulaNode) WHERE root.cluster = $cluster RETURN collect(root.id) AS root_ids',
          },
          warnings: [],
        };
      },
    };

    createApp(root, {
      graphData: createGraphFixture(),
      stageFactory: createStageFactoryStub(),
      graphApi,
      remoteGraphEnabled: true,
    });

    const input = root.querySelector('#command-input');
    const form = root.querySelector('[data-command-form]');

    input.value = 'show archive';
    form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
    await Promise.resolve();
    await Promise.resolve();

    expect(root.textContent).toContain('Neo4j live graph');
    expect(root.textContent).toContain('Focused the graph on archive documents.');
  });

  it('opens and closes the help overlay from keyboard and button input', () => {
    const root = document.createElement('div');

    createApp(root, {
      graphData: createGraphFixture(),
      stageFactory: createStageFactoryStub(),
    });

    const helpOverlay = root.querySelector('[data-help-overlay]');
    const closeButton = root.querySelector('[data-help-close]');

    window.dispatchEvent(
      new KeyboardEvent('keydown', {
        key: '?',
        bubbles: true,
      }),
    );

    expect(helpOverlay.hidden).toBe(false);

    closeButton.click();

    expect(helpOverlay.hidden).toBe(true);
  });

  it('closes the help overlay with Escape and backdrop pointer input', () => {
    const root = document.createElement('div');

    createApp(root, {
      graphData: createGraphFixture(),
      stageFactory: createStageFactoryStub(),
    });

    const helpOverlay = root.querySelector('[data-help-overlay]');

    window.dispatchEvent(
      new KeyboardEvent('keydown', {
        key: '?',
        bubbles: true,
      }),
    );
    expect(helpOverlay.hidden).toBe(false);

    helpOverlay.dispatchEvent(
      new PointerEvent('pointerdown', {
        bubbles: true,
      }),
    );
    expect(helpOverlay.hidden).toBe(true);

    window.dispatchEvent(
      new KeyboardEvent('keydown', {
        key: '?',
        bubbles: true,
      }),
    );
    expect(helpOverlay.hidden).toBe(false);

    window.dispatchEvent(
      new KeyboardEvent('keydown', {
        key: 'Escape',
        bubbles: true,
      }),
    );
    expect(helpOverlay.hidden).toBe(true);
  });
});
