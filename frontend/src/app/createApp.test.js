import { describe, expect, it } from 'vitest';

import { createApp } from './createApp.js';

describe('createApp', () => {
  it('renders the phase 0 scaffold status view', () => {
    const root = document.createElement('div');

    createApp(root);

    expect(root.querySelector('h1')?.textContent).toContain('Jarvis Nebula');
    expect(root.textContent).toContain('Phase 0 scaffold is complete');
  });
});
