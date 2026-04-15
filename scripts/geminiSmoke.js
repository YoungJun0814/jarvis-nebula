#!/usr/bin/env node
/**
 * Gemini smoke test.
 *
 * Usage:
 *   node scripts/geminiSmoke.js "hello, who are you?"
 *
 * Reads GEMINI_API_KEY from either process.env or the project-root `.env`
 * file. Prints the model's reply, plus latency and key-source metadata, so
 * we can verify Stage 0 wiring end-to-end without booting the frontend.
 */

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

import { createGeminiClient } from '../frontend/src/services/llm/geminiClient.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');

loadDotEnvIfPresent(resolve(ROOT, '.env'));

const prompt = process.argv.slice(2).join(' ').trim() ||
  'In one short sentence: what is Jarvis Nebula?';

async function main() {
  const started = Date.now();
  const client = createGeminiClient();
  const reply = await client.generate({
    prompt,
    system: 'You are helping smoke-test a new developer tool. Respond in one short sentence.',
  });
  const elapsed = Date.now() - started;

  console.log('---');
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
  // Gemini returns a JSON blob as the message when the API rejects a call.
  // Try to surface the most useful fragment without dumping the whole thing.
  let friendly = message;
  try {
    const parsed = JSON.parse(message);
    const apiErr = parsed?.error;
    if (apiErr) {
      friendly = `${apiErr.code ?? '???'} ${apiErr.status ?? ''}: ${apiErr.message ?? '(no message)'}`;
      if (apiErr.details?.[0]?.reason === 'API_KEY_INVALID') {
        friendly +=
          '\n\nHint: rotate GEMINI_API_KEY in .env. Get a new key at ' +
          'https://aistudio.google.com/app/apikey';
      }
    }
  } catch {
    // message wasn't JSON — leave friendly as-is.
  }
  console.error('geminiSmoke failed:', friendly);
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
