import { describe, expect, it } from 'vitest';

import { routeVoiceCommand } from './routeVoiceCommand.js';

describe('routeVoiceCommand', () => {
  it('routes direct UI commands', () => {
    expect(routeVoiceCommand('reset view')).toMatchObject({
      kind: 'ui',
      command: 'reset',
    });
  });

  it('routes planning language to the agent placeholder', () => {
    expect(routeVoiceCommand('plan a rollout for Atlas')).toMatchObject({
      kind: 'agent',
    });
  });

  it('routes graph exploration language to graph queries', () => {
    expect(routeVoiceCommand('show archive documents')).toMatchObject({
      kind: 'graph',
      command: 'show archive documents',
    });
  });
});
