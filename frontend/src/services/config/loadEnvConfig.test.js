import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { loadNebulaConfig } from './loadEnvConfig.js';

// The loader reads either `import.meta.env.*` (Vite-style, via Vitest) or
// `process.env.*`. Vitest exposes import.meta.env, so we mutate that.

const ENV = import.meta.env;

function setEnv(patch) {
  for (const [k, v] of Object.entries(patch)) {
    if (v === undefined) {
      delete ENV[k];
    } else {
      ENV[k] = v;
    }
  }
}

describe('loadNebulaConfig', () => {
  const original = { ...ENV };

  beforeEach(() => {
    for (const key of Object.keys(ENV)) {
      if (key.startsWith('VITE_')) delete ENV[key];
    }
  });

  afterEach(() => {
    for (const key of Object.keys(ENV)) delete ENV[key];
    Object.assign(ENV, original);
    vi.restoreAllMocks();
  });

  it('returns empty keys and does not throw when nothing is required', () => {
    vi.stubGlobal('process', { env: {} });
    const cfg = loadNebulaConfig();
    expect(cfg.cerebrasApiKey).toBe('');
    expect(cfg.geminiApiKey).toBe('');
    expect(cfg.llmProvider).toBe('');
  });

  it('throws when requireKeys flags a missing value', () => {
    vi.stubGlobal('process', { env: {} });
    expect(() => loadNebulaConfig({ requireKeys: ['CEREBRAS_API_KEY'] })).toThrowError(
      /CEREBRAS_API_KEY/,
    );
  });

  it('reads VITE_-prefixed keys when present', () => {
    setEnv({
      VITE_CEREBRAS_API_KEY: 'vite-cerebras',
      VITE_GEMINI_API_KEY: 'vite-gemini',
      VITE_LLM_PROVIDER: 'cerebras',
      VITE_APP_NAME: 'CustomApp',
    });
    const cfg = loadNebulaConfig();
    expect(cfg.cerebrasApiKey).toBe('vite-cerebras');
    expect(cfg.geminiApiKey).toBe('vite-gemini');
    expect(cfg.llmProvider).toBe('cerebras');
    expect(cfg.appName).toBe('CustomApp');
    expect(cfg.source).toBe('vite');
  });

  it('normalizes LLM_PROVIDER and ignores unknown values', () => {
    setEnv({
      VITE_CEREBRAS_API_KEY: 'x',
      VITE_LLM_PROVIDER: '  GEMINI  ',
    });
    expect(loadNebulaConfig().llmProvider).toBe('gemini');

    setEnv({ VITE_LLM_PROVIDER: 'anthropic' });
    expect(loadNebulaConfig().llmProvider).toBe('');
  });

  it('falls back to process.env when Vite env is empty', () => {
    vi.stubGlobal('process', {
      env: {
        CEREBRAS_API_KEY: 'node-cerebras',
        LLM_PROVIDER: 'cerebras',
        APP_NAME: 'Fallback',
      },
    });
    const cfg = loadNebulaConfig();
    expect(cfg.cerebrasApiKey).toBe('node-cerebras');
    expect(cfg.llmProvider).toBe('cerebras');
    expect(cfg.appName).toBe('Fallback');
  });

  it('populates optional Neo4j fields without requiring them', () => {
    setEnv({
      VITE_CEREBRAS_API_KEY: 'x',
      VITE_NEO4J_URI: 'bolt://localhost:7687',
      VITE_NEO4J_USERNAME: 'neo4j',
      VITE_NEO4J_PASSWORD: 'secret',
    });
    const cfg = loadNebulaConfig();
    expect(cfg.neo4jUri).toBe('bolt://localhost:7687');
    expect(cfg.neo4jUsername).toBe('neo4j');
    expect(cfg.neo4jPassword).toBe('secret');
  });
});
