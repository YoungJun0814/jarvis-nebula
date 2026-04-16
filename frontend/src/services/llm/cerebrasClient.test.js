import { describe, expect, it, vi } from 'vitest';

import { createCerebrasClient } from './cerebrasClient.js';

function fakeSdk({ content = 'ok', capture } = {}) {
  return {
    chat: {
      completions: {
        async create(args) {
          capture?.push(args);
          return { choices: [{ message: { role: 'assistant', content } }] };
        },
      },
    },
  };
}

describe('createCerebrasClient', () => {
  it('requires a non-empty prompt', async () => {
    const client = createCerebrasClient({ apiKey: 'k', client: fakeSdk() });
    await expect(client.generate({})).rejects.toThrow(TypeError);
    await expect(client.generate({ prompt: '' })).rejects.toThrow(TypeError);
  });

  it('sends a system + user message pair when system is provided', async () => {
    const captured = [];
    const client = createCerebrasClient({
      apiKey: 'k',
      client: fakeSdk({ capture: captured, content: 'hello back' }),
    });

    const result = await client.generate({
      prompt: 'hello',
      system: 'respond briefly',
    });

    expect(result).toBe('hello back');
    expect(captured).toHaveLength(1);
    expect(captured[0].messages).toEqual([
      { role: 'system', content: 'respond briefly' },
      { role: 'user', content: 'hello' },
    ]);
  });

  it('omits the system message when none is provided', async () => {
    const captured = [];
    const client = createCerebrasClient({
      apiKey: 'k',
      client: fakeSdk({ capture: captured }),
    });
    await client.generate({ prompt: 'hi' });
    expect(captured[0].messages).toEqual([{ role: 'user', content: 'hi' }]);
  });

  it('throws when no text payload is present', async () => {
    const sdk = {
      chat: {
        completions: {
          async create() {
            return { choices: [] };
          },
        },
      },
    };
    const client = createCerebrasClient({ apiKey: 'k', client: sdk });
    await expect(client.generate({ prompt: 'hi' })).rejects.toThrow(/missing text/);
  });

  it('reports provider name', () => {
    const client = createCerebrasClient({ apiKey: 'k', client: fakeSdk() });
    expect(client.getProvider()).toBe('cerebras');
  });

  it('throws without an API key when config loader returns nothing', () => {
    vi.stubGlobal('process', { env: {} });
    const viteEnv = import.meta.env;
    const originalKey = viteEnv.VITE_CEREBRAS_API_KEY;
    delete viteEnv.VITE_CEREBRAS_API_KEY;
    try {
      expect(() => createCerebrasClient({ client: fakeSdk() })).toThrow(
        /CEREBRAS_API_KEY/,
      );
    } finally {
      if (originalKey !== undefined) viteEnv.VITE_CEREBRAS_API_KEY = originalKey;
      vi.unstubAllGlobals();
    }
  });
});
