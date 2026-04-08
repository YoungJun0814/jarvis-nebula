import { describe, expect, it } from 'vitest';

import { createApp } from './createApp.js';

describe('createApp', () => {
  it('renders the phase 1 shell and queues commands locally', () => {
    const root = document.createElement('div');
    const graphFactory = () => ({
      destroy() {},
      focusNode() {},
      refreshVisuals() {},
      resetCamera() {},
      setPaused() {},
    });

    createApp(root, {
      graphData: {
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
          },
        ],
        links: [],
        stats: {
          nodeCount: 1,
          linkCount: 0,
          typeCounts: { person: 0, project: 1, concept: 0, document: 0 },
        },
      },
      graphFactory,
    });

    expect(root.querySelector('h1')?.textContent).toContain('Jarvis Nebula');
    expect(root.textContent).toContain('Node Inspector');

    const input = root.querySelector('#command-input');
    const form = root.querySelector('[data-command-form]');

    input.value = 'show active launch dependencies';
    form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));

    expect(root.textContent).toContain('show active launch dependencies');
  });
});
