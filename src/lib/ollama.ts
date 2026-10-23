// Talks to an Ollama server the user runs themselves (usually on their computer, over Wi-Fi). Nothing here
// touches the internet or any account: the address is whatever the user types in Settings.

import { SCHEMA, type ChatMessage } from './aiProgram';

export const DEFAULT_PORT = 11434;

/** "192.168.1.20" -> "http://192.168.1.20:11434". Returns null when it cannot be an address. */
export function normalizeUrl(input: string): string | null {
  let s = input.trim().replace(/\/+$/, '');
  if (!s) return null;
  if (!/^https?:\/\//i.test(s)) s = `http://${s}`;
  const m = /^(https?):\/\/([^/\s:]+)(?::(\d{1,5}))?(\/[^\s]*)?$/i.exec(s);
  if (!m) return null;
  const port = m[3] ? Number(m[3]) : DEFAULT_PORT;
  if (port < 1 || port > 65535) return null;
  return `${m[1].toLowerCase()}://${m[2]}:${port}${m[4] ?? ''}`.replace(/\/+$/, '');
}

export class OllamaError extends Error {}

async function call(url: string, path: string, init: RequestInit, timeoutMs: number): Promise<unknown> {
  const ctl = new AbortController();
  const timer = setTimeout(() => ctl.abort(), timeoutMs);
  try {
    const res = await fetch(url + path, { ...init, signal: ctl.signal, headers: { 'Content-Type': 'application/json' } });
    if (!res.ok) {
      const body = await res.text().catch(() => '');
      if (res.status === 404 && /model/i.test(body)) throw new OllamaError('That model is not installed on the server. Pull it first, for example: ollama pull llama3.1');
      throw new OllamaError(`The server answered with an error (${res.status}).`);
    }
    return await res.json();
  } catch (e) {
    if (e instanceof OllamaError) throw e;
    if ((e as { name?: string })?.name === 'AbortError') throw new OllamaError('The server took too long to answer. A bigger model may need more time, or try a smaller one.');
    throw new OllamaError(`Can't reach Ollama at ${url}. Check the address, that Ollama is running, and that your phone is on the same Wi-Fi.`);
  } finally {
    clearTimeout(timer);
  }
}

/** The models installed on the server, newest first. Also works as a connection test. */
export async function listModels(url: string): Promise<string[]> {
  const data = (await call(url, '/api/tags', { method: 'GET' }, 8000)) as { models?: { name?: string; modified_at?: string }[] };
  return (data.models ?? [])
    .filter((m): m is { name: string; modified_at?: string } => typeof m.name === 'string')
    .sort((a, b) => (b.modified_at ?? '').localeCompare(a.modified_at ?? ''))
    .map((m) => m.name);
}

/** Asks the model for a program as JSON and returns its raw text. */
export async function chatForProgram(url: string, model: string, messages: ChatMessage[], timeoutMs = 240_000): Promise<string> {
  const data = (await call(url, '/api/chat', {
    method: 'POST',
    body: JSON.stringify({ model, messages, stream: false, format: SCHEMA, options: { temperature: 0.4 } }),
  }, timeoutMs)) as { message?: { content?: string } };
  const text = data.message?.content;
  if (typeof text !== 'string' || !text.trim()) throw new OllamaError('The model returned an empty answer.');
  return text;
}
