// Usage: npx tsx scripts/try-ai.ts [model] ["what you want"]  — runs the AI generator against a local Ollama server.
import { LIBRARY } from '../src/data/exercises';
import { buildMenu, buildMessages, parseAiProgram } from '../src/lib/aiProgram';
import { chatForProgram, listModels, normalizeUrl } from '../src/lib/ollama';

async function main() {
const url = normalizeUrl(process.env.OLLAMA_URL ?? 'localhost')!;
const model = process.argv[2] ?? (await listModels(url))[0];
const ask = process.argv[3] ?? 'I train 4 days a week for muscle size. I want to bring up my chest and shoulders. I have a full gym.';
const menu = buildMenu(LIBRARY, ['barbell', 'dumbbell', 'machine', 'cable', 'bodyweight']);

console.log(`Model ${model} at ${url}\nAsking: ${ask}\n`);
const t0 = Date.now();
const raw = await chatForProgram(url, model, buildMessages(ask, menu));
console.log(`Replied in ${Math.round((Date.now() - t0) / 1000)}s`);
const r = parseAiProgram(raw, menu);
if (!r.ok) { console.log('REJECTED:', r.error, '\n', raw.slice(0, 400)); process.exit(1); }
const name = (id: string) => menu.find((m) => m.id === id)?.name ?? id;
console.log(`\n${r.draft.name}`);
for (const d of r.draft.days) {
  console.log(`  ${d.name}`);
  for (const it of d.items) console.log(`    ${it.sets}x${it.repMin}-${it.repMax} RIR ${it.rir}  ${name(it.exerciseId)}`);
}
if (r.notes.length) console.log('\nNotes:', r.notes);
}

main().catch((e) => { console.error(e instanceof Error ? e.message : e); process.exit(1); });
