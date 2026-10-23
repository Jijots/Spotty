// Usage: npx tsx scripts/check-license.ts "<key>"  — shows what the app would say about a key.
import { checkLicense, describeLicense } from '../src/lib/license';

const r = checkLicense(process.argv[2] ?? '');
console.log(r.ok ? describeLicense(r) : r.message);
