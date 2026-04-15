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

  it('throws when required keys are missing', () => {
    // Block the node fallback so we actually fail.
    const processStub = vi.stubGlobal('process', { env: {} });
    expect(() => loadNebulaConfig()).toThrowError(/GEMINI_API_KEY/);
    processStub; // referenced to satisfy lints
  });

  it('reads VITE_-prefixed keys when present', () => {
    setEnv({ VITE_GEMINI_API_KEY: 'vite-key', VITE_APP_NAME: 'CustomApp' });
    const cfg = loadNebulaConfig();
    expect(cfg.geminiApiKey).toBe('vite-key');
    expect(cfg.appName).toBe('CustomApp');
    expect(cfg.source).toBe('vite');
  });

  it('falls back to process.env when Vite env is empty', () => {
    vi.stubGlobal('process', {
      env: { GEMINI_API_KEY: 'node-key', APP_NAME: 'Fallback' },
    });
    const cfg = loadNebulaConfig();
    expect(cfg.geminiApiKey).toBe('node-key');
    expect(cfg.appName).toBe('Fallback');
  });

  it('populates optional Neo4j fields without requiring them', () => {
    setEnv({
      VITE_GEMINI_API_KEY: 'x',
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
