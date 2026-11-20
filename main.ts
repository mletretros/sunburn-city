import { cpSync, existsSync, mkdirSync, realpathSync, rmSync, writeFileSync } from 'node:fs';
import { basename, dirname, isAbsolute, join, relative, resolve, sep } from 'node:path';
import { buildDossier } from './vendor/makefun-game.ts';

// Canonicalise absent destinations too, preventing a symlinked ancestor from hiding overlap.
function canonical(path: string): string {
  return existsSync(path) ? realpathSync(path) : join(canonical(dirname(path)), basename(path));
}
function contains(parent: string, child: string): boolean {
  const path = relative(parent, child);
  return !isAbsolute(path) && path !== '..' && !path.startsWith(`..${sep}`);
}
const destination = canonical(resolve(process.env.MAKEFUN_OUTPUT_DIR ?? '/output'));
const payloads = ['game', 'screenshots'].map(name => ({
  source: canonical(join(import.meta.dirname, name)), target: join(destination, name),
}));
const caps = {
  text_max_bytes: 163_840,
  screenshots: { max: 4, max_bytes: 262_144 },
  game_max_files: 993,
  game_max_bytes: 50_331_648,
  game_path_max_bytes: 1_000,
};
// Validate every source/target pair before removing any previous output.
for (const payload of payloads) for (const other of payloads) {
  if (contains(payload.source, other.target) || contains(other.target, payload.source)) throw new Error(`Output overlaps source: ${other.target}`);
}
mkdirSync(destination, { recursive: true });
for (const { source, target } of payloads) {
  rmSync(target, { recursive: true, force: true });
  cpSync(source, target, {
    recursive: true,
    filter: entry => !relative(source, entry).split(sep).some(part => part.startsWith('.')),
  });
}
writeFileSync(join(destination, 'dossier.json'), buildDossier(destination, caps));
