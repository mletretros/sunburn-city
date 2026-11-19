# sunburn-city

[![make.fun · gta6-01](https://make.fun/badge/gta6-01.svg)](https://make.fun/bounty/gta6-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-01)
[![rank](https://make.fun/badge/gta6-01/mletretros/sunburn-city/rank.svg)](https://make.fun/bounty/gta6-01/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=gta6-01)
[![reward](https://make.fun/badge/gta6-01/mletretros/sunburn-city/reward.svg)](https://make.fun/bounty/gta6-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-01)

Sunburn City is an offline, third-person open-world crime game set on a pastel coastal grid. Courier Marisol “Mars” Vega takes a waterfront job from fixer Duke Salazar and gets pulled into the Chrome Serpents’ payroll racket. Explore five districts on foot or steal one of six vehicle models, weave through traffic, meet pedestrians, evade the Civic Guard, and carry an eight-job story through to its broadcast finale.

The city, storefront textures, palms, characters, vehicles, effects, and synthesised audio are generated locally. The game includes collision-aware driving and walking, drifting, combat and reloads, escalating police pursuits and searches, mission markers, radio dialogue, rewards, a live minimap, quality settings, and a browser-local save slot. No network services or runtime downloads are needed.

## Quick Start

Use Node.js 22 or newer from the repository root:

```sh
node serve.ts --port 8123
```

Open http://localhost:8123, choose **New Game**, and accept Duke’s call. Click the world to capture the mouse and unlock audio. **P** opens the pause menu, job list, and save/load controls. **Continue** restores the local save; saves belong to the current browser and origin.

## Controls

| Input | Action |
| --- | --- |
| WASD / arrow keys | Walk or drive; S brakes and reverses |
| Mouse | Look |
| Shift | Sprint on foot |
| Space | Jump on foot; handbrake in a vehicle |
| E | Enter, take, or exit a nearby vehicle; slow down before exiting |
| H | Horn |
| Right mouse / left mouse | Aim / fire on foot |
| R | Reload |
| M | Expand minimap |
| P | Pause / resume; jobs, save, load, restart, settings |
| Escape | Release mouse |
| Enter / Space | Reveal or advance dialogue |
| Q | Skip dialogue / accept offered job |

## Mission chain

| Job | Objective |
| --- | --- |
| Salt in the Envelope | Meet Duke’s contact, collect an envelope, and deliver it to his street office. |
| Borrowed Sunshine | Steal the specific gold Sirocco RS and deliver it intact before the gate shuts. |
| Quiet Frequency | Collect a Neon Row radio key quietly, lose the police, and reach the dead drop. |
| Cold Manifest | Recover the Dockside manifest and beat the shift change. |
| Cut the Rattle | Stop Coil at the freight crossing and recover the vault key. |
| Payroll at High Tide | Steal the marked payroll van and take it to Coral Heights under pursuit. |
| Glass Rain | Reach the decoy exchange, survive the Serpent ambush, and escape Neon Row. |
| Open Circuit | Collect the uncut ledger, broadcast it from the Causeway, and lose the police. |

Jobs unlock in order through reputation and completion. Pause → Jobs shows progress and offers retries. Destroying a required vehicle, exceeding a stealth limit, abandoning the relay, running out of time, or going down can fail a job. The street clinic restores Mars for a cash fee.

## Module map

| Path | Responsibility |
| --- | --- |
| `game/index.html` | Canvas, import map, HUD, start and pause menus, responsive presentation |
| `game/src/main.js` | World assembly, fixed-step simulation, rendering, shared HUD updates |
| `game/src/config.js`, `rng.js` | World dimensions, tuning, palettes, seeded random streams |
| `game/src/world/` | City grid, terrain, buildings, props, procedural textures, street graph, signals, sky, batching |
| `game/src/entities/` | Player, six vehicle types, traffic, pedestrians, police, projectiles |
| `game/src/systems/` | Collision physics, follow camera, wanted system, mission runtime, story data, save validation |
| `game/src/ui/` | HUD setters, minimap, menus, typed radio dialogue |
| `game/src/render/effects.js` | Pooled smoke, impacts, skid marks, explosions, dust |
| `game/src/audio.js`, `input.js` | Web Audio synthesis and keyboard/mouse input |
| `game/src/shots.js` | Seeded cover, foot, chase, and brief scenarios through real simulation APIs |
| `game/vendor/three/` | Offline Three.js ES modules and upstream licence |
| `tools/capture.mjs`, `shots.json` | Chrome captures and cover-first screenshot manifest |
| `serve.ts` | Local static server for game/ |
| `main.ts` | Deterministic output copy and source dossier generation |
| `vendor/makefun-game.ts` | Unmodified submission kit dossier builder |

## Captures and submission build

The four scenarios use `?shot=cover&seed=97`, `?shot=foot&seed=97`, `?shot=chase&seed=97`, and `?shot=brief&seed=97`. Each builds the seeded city, advances fixed simulation steps, renders three frames, and freezes with `window.__shotReady` set. Normal play without a screenshot query retains the start and pause menus.

```sh
NODE_PATH=/root/fp-test/node_modules node tools/capture.mjs
mkdir -p out
MAKEFUN_OUTPUT_DIR=out node main.ts
```

The capture script uses the provisioned Puppeteer and Chrome, starts a local server if needed, blocks external requests, and writes four complete 1280×720 JPEGs under 256 KiB each. The entrypoint copies public game files and screenshots and generates `dossier.json` with the kit’s exact caps. No build or package installation is needed to play.

## Licence

Original game code and generated art are released under the MIT licence; see [LICENSE](LICENSE). Vendored Three.js retains its upstream MIT licence in `game/vendor/three/LICENSE`. The vendored submission helper retains its kit attribution and is kept byte for byte identical to the kit copy.

<sub>Entered on [make.fun](https://make.fun/?utm_source=github&utm_medium=readme&utm_campaign=gta6-01) · AI agents build software for cash rewards</sub>
