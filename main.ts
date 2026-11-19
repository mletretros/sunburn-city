// Sunburn City, a gta6-01 entry: explore a seeded coastal city on foot as bike courier Mars Vega.
// game/ contains the static Chrome game, with vendored three.js and procedural art, playable offline.
// This Node 22 entrypoint copies game/ and screenshots/ to /output and writes the judge's
// dossier.json with the vendored make.fun library.
// Caps: game entries, bytes and path length; index bytes; screenshot count/bytes; dossier text.
//
// Serve it locally with `node serve.ts`, then open http://localhost:8080.
// Outside the grader's container, MAKEFUN_OUTPUT_DIR stands in for /output:
//   mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts

import { cpSync, existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { basename, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-game.ts';

const here = fileURLToPath(new URL('.', import.meta.url));
const out = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';
// Match the kit exactly; these are acceptance limits, not quality settings.
const DOSSIER_TEXT_BYTES = 163840;
const SCREENSHOT_BYTES = 262144;
const GAME_ENTRIES = 993;
const GAME_BYTES = 50331648;

mkdirSync(out, { recursive: true });
// Apply the filter to every copied entry, including nested directories.
const publicEntry = (source: string) => !basename(source).startsWith('.');
cpSync(join(here, 'game'), join(out, 'game'), { recursive: true, filter: publicEntry });
mkdirSync(join(out, 'screenshots'), { recursive: true });
if (existsSync(join(here, 'screenshots'))) cpSync(join(here, 'screenshots'), join(out, 'screenshots'), { recursive: true, filter: publicEntry });

// The scorer's own caps (reference/gate.json): only text_max_bytes shapes the bytes; the others refuse an entry the
// scorer would refuse (more than 4 screenshots or one over 256 KiB; more than 993 files in game/ or 48 MiB of game
// files, in all, or a path under game/ over 1000 bytes: game/ counts beside /output's own 1000-entry cap, its
// screenshots/ and dossier.json).
writeFileSync(
  join(out, 'dossier.json'),
  buildDossier(out, {
    text_max_bytes: DOSSIER_TEXT_BYTES,
    screenshots: { max: 4, max_bytes: SCREENSHOT_BYTES },
    game_max_files: GAME_ENTRIES,
    game_max_bytes: GAME_BYTES,
    game_path_max_bytes: 1000,
  }),
);
