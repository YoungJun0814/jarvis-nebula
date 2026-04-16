// LLM provider factory.
//
// Pick the right backend based on `LLM_PROVIDER` env / Vite var, with a
// safe default when the user hasn't configured anything. Downstream code
// (agents, smoke tests, renderer UI) imports *only* `createLlmClient`
// from here — never a specific provider file — so swapping providers is a
// one-line change.
//
// See docs/ROADMAP_DESKTOP.md — Stage 0 / Stage 2.

import { loadNebulaConfig } from '../config/loadEnvConfig.js';

import { createCerebrasClient } from './cerebrasClient.js';
import { createGeminiClient } from './geminiClient.js';

/** @typedef {'cerebras' | 'gemini'} ProviderName */

/** @type {Readonly<Record<ProviderName, (opts?: any) => any>>} */
const FACTORIES = Object.freeze({
  cerebras: createCerebrasClient,
  gemini: createGeminiClient,
});

/**
 * Resolve which provider to instantiate. Priority:
 *   1. Explicit `provider` argument.
 *   2. `LLM_PROVIDER` env var (or VITE_ equivalent).
 *   3. Whichever provider has a non-empty API key in config.
 *   4. Default to 'cerebras' — the Stage 0 canonical provider.
 *
 * @param {{ provider?: ProviderName }} [options]
 * @returns {ProviderName}
 */
function resolveProviderName({ provider } = {}) {
  if (provider) {
    if (!(provider in FACTORIES)) {
      throw new Error(`Unknown LLM provider: ${provider}`);
    }
    return provider;
  }

  const config = loadNebulaConfig({ requireKeys: [] });

  if (config.llmProvider && config.llmProvider in FACTORIES) {
    return /** @type {ProviderName} */ (config.llmProvider);
  }

  if (config.cerebrasApiKey) return 'cerebras';
  if (config.geminiApiKey) return 'gemini';

  return 'cerebras';
}

/**
 * Create an LLM client for the selected provider.
 *
 * The returned object always exposes:
 *   - `generate({ prompt, system, model? }) -> Promise<string>`
 *   - `getModel() -> string`
 *   - `getProvider() -> ProviderName`
 *   - `getApiKeySource() -> 'vite' | 'node'`
 *
 * @param {{ provider?: ProviderName, apiKey?: string, model?: string,
 *           client?: unknown }} [options]
 */
export function createLlmClient(options = {}) {
  const provider = resolveProviderName(options);
  const factory = FACTORIES[provider];
  // Strip `provider` before forwarding — the specific factories don't need
  // (or accept) it.
  const rest = { ...options };
  delete rest.provider;
  return factory(rest);
}

export { createCerebrasClient, createGeminiClient };

export const __internal = { resolveProviderName, FACTORIES };
