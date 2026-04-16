import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { createLlmClient, __internal } from './index.js';

const ENV = import.meta.env;
const SNAPSHOT = { ...ENV };

function clearLlmEnv() {
  for (const key of Object.keys(ENV)) {
    if (key.startsWith('VITE_')) delete ENV[key];
  }
}

function fakeCerebrasSdk() {
  return {
    chat: {
      completions: {
        async create() {
          return { choices: [{ message: { content: 'cerebras-ok' } }] };
        },
      },
    },
  };
}

function fakeGeminiSdk() {
  return {
    models: {
      async generateContent() {
        return { text: 'gemini-ok' };
      },
    },
  };
}

describe('createLlmClient (factory)', () => {
  beforeEach(() => {
    clearLlmEnv();
    vi.stubGlobal('process', { env: {} });
  });

  afterEach(() => {
    for (const key of Object.keys(ENV)) delete ENV[key];
    Object.assign(ENV, SNAPSHOT);
    vi.unstubAllGlobals();
  });

  it('uses explicit provider override when provided', async () => {
    const client = createLlmClient({
      provider: 'cerebras',
      apiKey: 'k',
      client: fakeCerebrasSdk(),
    });
    expect(client.getProvider()).toBe('cerebras');
    expect(await client.generate({ prompt: 'hi' })).toBe('cerebras-ok');
  });

  it('honors LLM_PROVIDER env var', () => {
    ENV.VITE_LLM_PROVIDER = 'gemini';
    ENV.VITE_GEMINI_API_KEY = 'g';
    const client = createLlmClient({ client: fakeGeminiSdk() });
    expect(client.getProvider()).toBe('gemini');
  });

  it('prefers cerebras when only CEREBRAS_API_KEY is set', () => {
    ENV.VITE_CEREBRAS_API_KEY = 'c';
    const client = createLlmClient({ client: fakeCerebrasSdk() });
    expect(client.getProvider()).toBe('cerebras');
  });

  it('falls back to gemini when only GEMINI_API_KEY is set', () => {
    ENV.VITE_GEMINI_API_KEY = 'g';
    const client = createLlmClient({ client: fakeGeminiSdk() });
    expect(client.getProvider()).toBe('gemini');
  });

  it('defaults to cerebras when nothing is configured (but then needs a key to work)', () => {
    // Resolution defaults to cerebras; the underlying client will complain
    // about the missing key when we actually try to build it, so we supply
    // one via the option override to keep the assertion focused on choice.
    const client = createLlmClient({ apiKey: 'k', client: fakeCerebrasSdk() });
    expect(client.getProvider()).toBe('cerebras');
  });

  it('rejects unknown provider names', () => {
    expect(() =>
      createLlmClient({ provider: /** @type {any} */ ('anthropic') }),
    ).toThrow(/Unknown LLM provider/);
  });

  it('exposes the raw resolver for diagnostics', () => {
    ENV.VITE_CEREBRAS_API_KEY = 'c';
    expect(__internal.resolveProviderName()).toBe('cerebras');
  });
});
