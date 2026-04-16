// Structured configuration loader.
//
// Supports two execution contexts:
//   1. Vite renderer — reads `import.meta.env.*` values (prefixed `VITE_`).
//   2. Node scripts — reads `process.env.*` with optional `.env` fallback.
//
// Rationale: we want a single source of truth for configuration shape so
// that the Gemini client and anything else that consumes config can be
// constructed identically from tests, smoke scripts, and the renderer.
// See docs/ROADMAP_DESKTOP.md — Stage 0.

// Stage 0 default provider is Cerebras (fast, free tier, OpenAI-compatible).
// We only hard-require a key if no other provider key is present; the
// provider factory handles "pick whichever key is set".
const DEFAULT_REQUIRED_KEYS = Object.freeze([]);

/**
 * @typedef {'cerebras' | 'gemini'} LlmProviderName
 *
 * @typedef {Object} NebulaConfig
 * @property {string} cerebrasApiKey      Cerebras Cloud API key (preferred).
 * @property {string} geminiApiKey        Google AI Studio API key (fallback).
 * @property {LlmProviderName | ''} llmProvider   Explicit provider override.
 * @property {string} appName             Display name for the app.
 * @property {string=} neo4jUri           Optional — left over from the
 *                                        pre-pivot architecture; kept so the
 *                                        legacy backend still works.
 * @property {string=} neo4jUsername
 * @property {string=} neo4jPassword
 * @property {string} source              Which environment source populated
 *                                        the object: 'vite' | 'node'.
 */

/**
 * Read a value from whichever environment source is available.
 * Vite vars are prefixed (`VITE_FOO`); Node scripts get the raw name.
 *
 * @param {string} key
 * @returns {{ value: string | undefined, source: 'vite' | 'node' }}
 */
function readEnv(key) {
  // Vite browser bundle. Detection must be defensive — `import.meta.env`
  // only exists when bundled by Vite / Vitest.
  const viteEnv = safeImportMetaEnv();
  if (viteEnv) {
    const vitePrefixed = viteEnv[`VITE_${key}`];
    if (vitePrefixed !== undefined) {
      return { value: vitePrefixed, source: 'vite' };
    }
  }

  if (typeof process !== 'undefined' && process?.env) {
    const node = process.env[key];
    if (node !== undefined) {
      return { value: node, source: 'node' };
    }
  }

  return { value: undefined, source: viteEnv ? 'vite' : 'node' };
}

function safeImportMetaEnv() {
  try {
    return typeof import.meta !== 'undefined' ? import.meta.env : undefined;
  } catch {
    return undefined;
  }
}

/**
 * Assemble a NebulaConfig. Throws if any required key is missing so a bad
 * config fails fast at startup rather than during the first API call.
 *
 * @param {{ requireKeys?: readonly string[] }} [options]
 * @returns {NebulaConfig}
 */
export function loadNebulaConfig({ requireKeys = DEFAULT_REQUIRED_KEYS } = {}) {
  const missing = [];
  const get = (key) => {
    const { value } = readEnv(key);
    if ((value === undefined || value === '') && requireKeys.includes(key)) {
      missing.push(key);
    }
    return value;
  };

  const cerebrasApiKey = get('CEREBRAS_API_KEY') ?? '';
  const geminiApiKey = get('GEMINI_API_KEY') ?? '';
  const rawProvider = (get('LLM_PROVIDER') ?? '').trim().toLowerCase();
  const llmProvider =
    rawProvider === 'cerebras' || rawProvider === 'gemini' ? rawProvider : '';
  const appName = get('APP_NAME') ?? 'Jarvis Nebula';
  const neo4jUri = get('NEO4J_URI');
  const neo4jUsername = get('NEO4J_USERNAME');
  const neo4jPassword = get('NEO4J_PASSWORD');

  if (missing.length > 0) {
    throw new Error(
      `Missing required env var(s): ${missing.join(', ')}. ` +
        'See .env (copy from .env.example) or docs/ROADMAP_DESKTOP.md Stage 0.',
    );
  }

  // `source` is a coarse hint for diagnostics — prefer the canonical LLM
  // key if present, otherwise fall back to whatever env surface is active.
  const { source: cerebrasSource } = readEnv('CEREBRAS_API_KEY');
  const { source: geminiSource } = readEnv('GEMINI_API_KEY');
  const source = cerebrasApiKey ? cerebrasSource : geminiApiKey ? geminiSource : cerebrasSource;

  return {
    cerebrasApiKey,
    geminiApiKey,
    llmProvider,
    appName,
    neo4jUri,
    neo4jUsername,
    neo4jPassword,
    source,
  };
}

export const __internal = { readEnv };
