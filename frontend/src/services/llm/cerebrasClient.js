// Cerebras client wrapper.
//
// Mirrors the Gemini client's `generate({ prompt, system })` surface so the
// two are interchangeable behind the provider factory.
//
// Cerebras exposes an OpenAI-style chat.completions API; `system` maps to a
// leading system message and `prompt` to a trailing user message.
//
// See docs/ROADMAP_DESKTOP.md — Stage 0 / Stage 2, and
// docs/adr/002-tauri-over-electron.md for why the provider abstraction
// exists.

import Cerebras from '@cerebras/cerebras_cloud_sdk';

import { loadNebulaConfig } from '../config/loadEnvConfig.js';

/** @typedef {{ prompt: string, system?: string, model?: string }} GenerateInput */

// Qwen 235B gives us the best reasoning for future agent work; the 30 RPM /
// 30K TPM quota is generous enough for Stage 0-2 development. We can swap
// to `llama3.1-8b` for latency-sensitive paths via the `model` override.
const DEFAULT_MODEL = 'qwen-3-235b-a22b-instruct-2507';

/**
 * Create a Cerebras client bound to the current environment config.
 *
 * @param {{ apiKey?: string, model?: string, client?: unknown }} [options]
 *   - `apiKey` / `model`: direct overrides for scripts and tests.
 *   - `client`: injected SDK instance so unit tests can fake it.
 * @returns {{ generate: (input: GenerateInput) => Promise<string>,
 *             getModel: () => string,
 *             getApiKeySource: () => 'vite' | 'node',
 *             getProvider: () => 'cerebras' }}
 */
export function createCerebrasClient({ apiKey, model = DEFAULT_MODEL, client } = {}) {
  let resolvedKey = apiKey;
  let source = /** @type {'vite' | 'node'} */ ('node');
  if (!resolvedKey) {
    const config = loadNebulaConfig({ requireKeys: ['CEREBRAS_API_KEY'] });
    resolvedKey = config.cerebrasApiKey;
    source = config.source;
  }
  if (!resolvedKey) {
    throw new Error(
      'createCerebrasClient: no API key found. Set CEREBRAS_API_KEY ' +
        '(scripts) or VITE_CEREBRAS_API_KEY (renderer).',
    );
  }

  // `warmTCPConnection` preheats connections via `/v1/tcp_warming`. For
  // short-lived scripts (smoke tests) this just wastes a request; disable
  // it unless we later confirm lower TTFT in a long-running process.
  const sdk =
    client ??
    new Cerebras({
      apiKey: resolvedKey,
      warmTCPConnection: false,
    });

  async function generate({ prompt, system, model: modelOverride } = {}) {
    if (typeof prompt !== 'string' || prompt.length === 0) {
      throw new TypeError('generate: prompt must be a non-empty string');
    }
    const targetModel = modelOverride ?? model;

    const messages = [];
    if (system) {
      messages.push({ role: 'system', content: system });
    }
    messages.push({ role: 'user', content: prompt });

    const response = await sdk.chat.completions.create({
      model: targetModel,
      messages,
    });

    const text = response?.choices?.[0]?.message?.content;
    if (typeof text !== 'string') {
      throw new Error('Cerebras response missing text payload');
    }
    return text;
  }

  return {
    generate,
    getModel: () => model,
    getApiKeySource: () => source,
    getProvider: () => /** @type {const} */ ('cerebras'),
  };
}

export const __internal = { DEFAULT_MODEL };
