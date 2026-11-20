// Neon Horizon Cover Studio — the hand-in program.
//
// The entry is the static web app in app/ plus its screenshots in
// screenshots/. This program delivers them: it copies both folders into the
// output directory and writes the dossier the judge reads, using the kit's
// own buildDossier so the bytes are exactly the ones the scorer rebuilds.
// Node 22, standard library only; it runs twice and writes the same bytes
// both times, because nothing here depends on time, order or chance.
//
// Run it outside the grader with:
//   mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts

import { cpSync, existsSync, mkdirSync, readdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-app.ts';

const repoDir = fileURLToPath(new URL('.', import.meta.url));
const outputDir = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';

// The gate's caps, from the kit's reference limits: the dossier text the
// judge reads is capped, screenshots are at most four files of 256 KiB, and
// the app tree is at most 993 entries, 48 MiB and 1,000 bytes a path.
const GATE_LIMITS = {
  text_max_bytes: 163840,
  screenshots: { max: 4, max_bytes: 262144 },
  app_max_files: 993,
  app_max_bytes: 50331648,
  app_path_max_bytes: 1000,
};

/** Counts the files under a directory, for the one-line delivery note. */
function countFiles(dir: string): number {
  let total = 0;
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    total += entry.isDirectory() ? countFiles(join(dir, entry.name)) : 1;
  }
  return total;
}

mkdirSync(outputDir, { recursive: true });

const appSource = join(repoDir, 'app');
cpSync(appSource, join(outputDir, 'app'), { recursive: true });

const shotsTarget = join(outputDir, 'screenshots');
mkdirSync(shotsTarget, { recursive: true });
const shotsSource = join(repoDir, 'screenshots');
if (existsSync(shotsSource)) cpSync(shotsSource, shotsTarget, { recursive: true });

const dossier = buildDossier(outputDir, GATE_LIMITS);
writeFileSync(join(outputDir, 'dossier.json'), dossier);

console.log(
  `Neon Horizon Cover Studio handed in: ${countFiles(join(outputDir, 'app'))} app files, ` +
    `${countFiles(shotsTarget)} screenshots, dossier of ${Buffer.byteLength(dossier)} bytes.`,
);
