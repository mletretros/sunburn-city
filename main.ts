import { cpSync, existsSync, mkdirSync, realpathSync, rmSync, writeFileSync } from 'node:fs';
import * as paths from 'node:path';
import { buildDossier } from './vendor/makefun-game.ts';

// Resolve an as-yet uncreated output path without trusting symlink parents.
function locate(candidate: string): string {
  if (existsSync(candidate)) return realpathSync(candidate);
  const parent = locate(paths.dirname(candidate));
  return paths.join(parent, paths.basename(candidate));
}
function nested(parent: string, child: string): boolean {
  const route = paths.relative(parent, child);
  return route === '' || (!paths.isAbsolute(route) && route !== '..' && !route.startsWith('..' + paths.sep));
}
const destination = locate(paths.resolve(process.env.MAKEFUN_OUTPUT_DIR || '/output'));
const packages = ['game', 'screenshots'].map(folder => ({ folder, source: realpathSync(paths.join(import.meta.dirname, folder)) }));
for (const pack of packages) {
  if (nested(pack.source, destination) || nested(destination, pack.source)) throw new Error('Output must not overlap game or screenshot sources');
}
mkdirSync(destination, { recursive: true });
for (const pack of packages) {
  const target = paths.join(destination, pack.folder);
  rmSync(target, { force: true, recursive: true });
  cpSync(pack.source, target, {
    recursive: true,
    filter(entry) { return paths.relative(pack.source, entry).split(paths.sep).every(part => part[0] !== '.'); },
  });
}
const caps = {
  game_path_max_bytes: 1000,
  game_max_files: 993,
  game_max_bytes: 50331648,
  screenshots: { max_bytes: 262144, max: 4 },
  text_max_bytes: 163840,
};
writeFileSync(paths.join(destination, 'dossier.json'), buildDossier(destination, caps));
