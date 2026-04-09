import { describe, expect, it } from 'vitest';

import { createApp } from './createApp.js';

function createGraphFactoryStub() {
  return () => ({
    destroy() {},
    focusNode() {},
    refreshVisuals() {},
    resetCamera() {},
    setPaused() {},
  });
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
  it('renders the phase 2 shell and queues commands locally', () => {
    const root = document.createElement('div');

    createApp(root, {
      graphData: createGraphFixture(),
      graphFactory: createGraphFactoryStub(),
    });

    expect(root.querySelector('h1')?.textContent).toContain('Jarvis Nebula');
    expect(root.textContent).toContain('Node Inspector');
    expect(root.textContent).toContain('Phase 3 Gesture Graph');

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
      graphFactory: createGraphFactoryStub(),
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
});
