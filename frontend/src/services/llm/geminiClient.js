// Gemini client wrapper.
//
// Stage 0 goal: a single entry point `generate({ prompt, system })` that
// returns a string. No streaming, no tool-use, no multi-turn yet — those
// arrive in Stage 2 when the agent loop lands.
//
// Why wrap the SDK instead of using it directly?
//   - Keeps the rest of the app ignorant of the provider. Stage 2 introduces
//     a `services/llm/provider.js` interface so Claude/OpenAI can slot in.
//   - Centralises error translation (API errors -> domain errors).
//   - Gives us one place to instrument token usage and latency.
//
// See docs/ROADMAP_DESKTOP.md — Stage 0 / Stage 2.

import { GoogleGenAI } from '@google/genai';

import { loadNebulaConfig } from '../config/loadEnvConfig.js';

/** @typedef {{ prompt: string, system?: string, model?: string }} GenerateInput */

const DEFAULT_MODEL = 'gemini-2.5-flash';

/**
 * Create a Gemini client bound to the current environment config.
 *
 * @param {{ apiKey?: string, model?: string, client?: unknown }} [options]
 *   Optional overrides — `apiKey`/`model` for direct use, `client` for tests
 *   that want to inject a fake `GoogleGenAI` instance.
 * @returns {{ generate: (input: GenerateInput) => Promise<string>,
 *             getModel: () => string,
 *             getApiKeySource: () => 'vite' | 'node' }}
 */
export function createGeminiClient({ apiKey, model = DEFAULT_MODEL, client } = {}) {
  let resolvedKey = apiKey;
  let source = /** @type {'vite' | 'node'} */ ('node');
  if (!resolvedKey) {
    const config = loadNebulaConfig({ requireKeys: ['GEMINI_API_KEY'] });
    resolvedKey = config.geminiApiKey;
    source = config.source;
  }
  if (!resolvedKey) {
    throw new Error(
      'createGeminiClient: no API key found. Set GEMINI_API_KEY (scripts) ' +
        'or VITE_GEMINI_API_KEY (renderer).',
    );
  }

  const sdk = client ?? new GoogleGenAI({ apiKey: resolvedKey });

  async function generate({ prompt, system, model: modelOverride } = {}) {
    if (typeof prompt !== 'string' || prompt.length === 0) {
      throw new TypeError('generate: prompt must be a non-empty string');
    }
    const targetModel = modelOverride ?? model;

    // The @google/genai v1 SDK exposes `models.generateContent`. We pass the
    // system instruction as a top-level field rather than inlining it, so
    // the model treats it as a hard constraint.
    const response = await sdk.models.generateContent({
      model: targetModel,
      contents: prompt,
      ...(system ? { config: { systemInstruction: system } } : {}),
    });

    // The SDK exposes both a convenience `.text` accessor and a full
    // candidates array. Prefer `.text` when available; fall back to the
    // first candidate's first part for robustness.
    if (typeof response?.text === 'string') {
      return response.text;
    }
    const firstPart = response?.candidates?.[0]?.content?.parts?.[0]?.text;
    if (typeof firstPart === 'string') {
      return firstPart;
    }
    throw new Error('Gemini response missing text payload');
  }

  return {
    generate,
    getModel: () => model,
    getApiKeySource: () => source,
    getProvider: () => /** @type {const} */ ('gemini'),
  };
}

export const __internal = { DEFAULT_MODEL };
