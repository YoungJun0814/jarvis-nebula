#!/usr/bin/env node
/**
 * LLM smoke test.
 *
 * Exercises the provider factory end-to-end: loads .env, picks the right
 * backend (Cerebras by default), runs a short generation, and prints the
 * latency + key source so Stage 0 wiring is verifiable from the CLI.
 *
 * Usage:
 *   node scripts/llmSmoke.js "your prompt here"
 *   LLM_PROVIDER=gemini node scripts/llmSmoke.js "test"
 */

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

import { createLlmClient } from '../frontend/src/services/llm/index.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');

loadDotEnvIfPresent(resolve(ROOT, '.env'));

const prompt =
  process.argv.slice(2).join(' ').trim() ||
  'In one short sentence: what is Jarvis Nebula?';

async function main() {
  const started = Date.now();
  const client = createLlmClient();
  const reply = await client.generate({
    prompt,
    system:
      'You are helping smoke-test a new developer tool. Respond in one short sentence.',
  });
  const elapsed = Date.now() - started;

  console.log('---');
  console.log(`provider       : ${client.getProvider()}`);
  console.log(`model          : ${client.getModel()}`);
  console.log(`key source     : ${client.getApiKeySource()}`);
  console.log(`latency        : ${elapsed}ms`);
  console.log(`prompt         : ${prompt}`);
  console.log('---');
  console.log(reply.trim());
  console.log('---');
}

main().catch((err) => {
  const message = err?.message ?? String(err);
  let friendly = message;
  try {
    const parsed = JSON.parse(message);
    const apiErr = parsed?.error;
    if (apiErr) {
      friendly = `${apiErr.code ?? '???'} ${apiErr.status ?? ''}: ${apiErr.message ?? '(no message)'}`;
      if (apiErr.details?.[0]?.reason === 'API_KEY_INVALID') {
        friendly +=
          '\n\nHint: the current LLM_PROVIDER key is rejected by its vendor. ' +
          'Update .env or switch providers via LLM_PROVIDER=cerebras|gemini.';
      }
    }
  } catch {
    // message wasn't JSON — leave friendly as-is.
  }
  console.error('llmSmoke failed:', friendly);
  process.exitCode = 1;
});

/**
 * Minimal .env loader. We deliberately do not take a dependency on `dotenv`
 * for this one-file script — the format we need is trivial and adding a
 * runtime dependency for a smoke test is not worth the bytes.
 */
function loadDotEnvIfPresent(path) {
  let raw;
  try {
    raw = readFileSync(path, 'utf8');
  } catch {
    return;
  }
  for (const line of raw.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eq = trimmed.indexOf('=');
    if (eq < 1) continue;
    const key = trimmed.slice(0, eq).trim();
    let value = trimmed.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    if (!(key in process.env)) {
      process.env[key] = value;
    }
  }
}
