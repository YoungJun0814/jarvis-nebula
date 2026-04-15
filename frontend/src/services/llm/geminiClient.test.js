import { describe, expect, it, vi } from 'vitest';

import { createGeminiClient } from './geminiClient.js';

function fakeSdk({ text = 'ok', capture } = {}) {
  return {
    models: {
      async generateContent(args) {
        capture?.push(args);
        return { text };
      },
    },
  };
}

describe('createGeminiClient', () => {
  it('requires a non-empty prompt', async () => {
    const client = createGeminiClient({ apiKey: 'k', client: fakeSdk() });
    await expect(client.generate({})).rejects.toThrow(TypeError);
    await expect(client.generate({ prompt: '' })).rejects.toThrow(TypeError);
  });

  it('sends prompt and system instruction to the SDK', async () => {
    const captured = [];
    const client = createGeminiClient({
      apiKey: 'k',
      client: fakeSdk({ capture: captured, text: 'hello back' }),
    });

    const result = await client.generate({
      prompt: 'hello',
      system: 'respond briefly',
    });

    expect(result).toBe('hello back');
    expect(captured).toHaveLength(1);
    expect(captured[0].contents).toBe('hello');
    expect(captured[0].config).toEqual({ systemInstruction: 'respond briefly' });
  });

  it('falls back to candidates[0].content.parts[0].text when .text is missing', async () => {
    const sdk = {
      models: {
        async generateContent() {
          return {
            candidates: [{ content: { parts: [{ text: 'via candidates' }] } }],
          };
        },
      },
    };
    const client = createGeminiClient({ apiKey: 'k', client: sdk });
    expect(await client.generate({ prompt: 'hi' })).toBe('via candidates');
  });

  it('throws when no text payload is present', async () => {
    const sdk = {
      models: {
        async generateContent() {
          return { candidates: [] };
        },
      },
    };
    const client = createGeminiClient({ apiKey: 'k', client: sdk });
    await expect(client.generate({ prompt: 'hi' })).rejects.toThrow(/missing text/);
  });

  it('throws without an API key when config loader returns nothing', () => {
    // No apiKey passed + no env → the loader throws the "Missing required"
    // error first. We assert that it propagates rather than being swallowed.
    vi.stubGlobal('process', { env: {} });
    const viteEnv = import.meta.env;
    const originalKey = viteEnv.VITE_GEMINI_API_KEY;
    delete viteEnv.VITE_GEMINI_API_KEY;
    try {
      expect(() => createGeminiClient({ client: fakeSdk() })).toThrow(/GEMINI_API_KEY/);
    } finally {
      if (originalKey !== undefined) viteEnv.VITE_GEMINI_API_KEY = originalKey;
      vi.unstubAllGlobals();
    }
  });
});
