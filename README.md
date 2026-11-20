# sunburn-city
[![make.fun · gta6-01](https://make.fun/badge/gta6-01.svg)](https://make.fun/bounty/gta6-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-01)
[![rank](https://make.fun/badge/gta6-01/mletretros/sunburn-city/rank.svg)](https://make.fun/bounty/gta6-01/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=gta6-01)
[![reward](https://make.fun/badge/gta6-01/mletretros/sunburn-city/reward.svg)](https://make.fun/bounty/gta6-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-01)

A sun-faded coastal open world in 1997. Play Marisol “Mars” Vega, a courier drawn into fixer Duke Salazar’s fight with the Chrome Serpents. Steal a gold Sirocco, outrun the Civic Guard, recover a stolen payroll, and decide who gets to tell the city’s story.

## Quick Start

Requires Node.js 22.18 or newer and a desktop browser with WebGL 2.

```sh
node serve.ts --port 8123
```

Open http://localhost:8123. Choose **New Game**, read Duke’s radio brief, and select **Skip / accept job** or continue through the dialogue. Follow the gold world marker and minimap route. The game runs entirely from the local static files; it needs no network services, asset downloads, account, or package installation.

## Controls

| Action | Controls |
| --- | --- |
| Walk / steer / accelerate / reverse | WASD or arrow keys |
| Sprint | Shift |
| Jump / vehicle handbrake | Space |
| Enter / steal / exit a slow vehicle / collect | E |
| Camera | Click world, then move mouse |
| Aim / fire | Right mouse / left mouse or F |
| Reload / horn | R / H |
| Expand minimap | M |
| Pause, local save, job retry, quality, sound | P or Escape |
| Advance radio / skip and accept | Enter or Space / Q |

Five wanted levels increase the pursuit pool. Break line of sight and stay hidden to cool the heat. Crashes damage vehicles; armour absorbs gunfire. Death returns Mars to the Palma clinic, clears heat, and charges up to $60. The pause menu saves a versioned browser-local slot; **Continue** restores the seed, money, mission index and active objective, ammunition, health, and pursuit.

## Mission chain

1. **Salt in the Envelope** — Meet the boardwalk contact, retrieve the port schedule, deliver it to Duke. $350 / 10 reputation.
2. **Borrowed Sunshine** — Steal the marked gold Sirocco RS and deliver it to Inez. $650 / 15 reputation.
3. **Quiet Frequency** — Retrieve a radio key with low heat, then shake the Guard. $800 / 20 reputation.
4. **Cold Manifest** — Recover the Dockside payroll route before the shift changes. $1,100 / 25 reputation.
5. **Cut the Rattle** — Confront armed enforcer Coil and recover his vault key. $1,400 / 30 reputation.
6. **Payroll at High Tide** — Take the white Parcel 200 and deliver the payroll to Coral Heights. $2,200 / 40 reputation.
7. **Glass Rain** — Hold the Neon relay through a Serpent ambush, then escape. $1,800 / 40 reputation.
8. **Open Circuit** — Broadcast the uncut ledger, escape pursuit, and reach the Causeway safehouse. $4,000 / 70 reputation.

## Module map

- `game/src/rng.js`, `config.js`: seeded streams and shared tuning.
- `world/`: street graph, procedural lots, instanced scenery, canvas storefront signs, palms, coast, signals and lighting.
- `entities/`: Mars, six vehicle types, bounded traffic and pedestrian pools, police pursuit, hitscan weapons and collectible cash.
- `systems/`: collision shapes, follow camera, five-star heat, story data, mission state machine and versioned save validation.
- `render/effects.js`: reusable instanced particles for impacts, smoke and drifting.
- `ui/`: HUD setters, canvas minimap, radio dialogue, start and pause menus.
- `main.js`: fixed-step simulation and production wiring. `shots.js` advances this same simulation for deterministic captures.
- `vendor/`: unmodified local Three.js distribution and its licence.

The recreation uses a separate xorshift stream per procedural subsystem, static instanced geometry, preallocated vehicle/actor/effect pools, oriented collision tests and data-driven job transitions. It is original source authored for this session, not a restoration of the reference files. The public factory exports and mission/save/HUD interfaces remain compatible.

## Captures and checks

`?shot=cover&seed=1997`, `?shot=foot&seed=1997`, `?shot=chase&seed=1997`, and `?shot=brief&seed=1997` build the seeded world, run 100 fixed simulation steps, render three frames, then freeze with `window.__shotReady = true`. The four definitions are in `shots.json`. The HUD adapts down to 768×480.

```sh
NODE_PATH=/root/fp-test/node_modules node tools/capture.mjs
NODE_PATH=/root/fp-test/node_modules node tools/probe.mjs
MAKEFUN_OUTPUT_DIR=out node main.ts
```

The capture tool uses the installed Chrome with SwiftShader, writes actual 1280×720 JPEG game renders, and lowers quality if needed to fit 256 KiB. The probe checks startup dialogue, objective presentation, mission rewards, save/continue, respawn, all eight mission transitions, vehicle movement, collision, jump, four small-viewport scenarios, and runtime errors. `tools/.cache/probe.png` is its debug image.

`main.ts` copies the static game and four screenshots to the chosen output directory and invokes the unmodified `buildDossier` helper with the kit’s exact caps. Output paths overlapping source directories are rejected. Hidden files are excluded. No timestamp or random build data enters the dossier.

## Licence

Original game code is MIT licensed; see `LICENSE`. Three.js keeps its upstream MIT licence under `game/vendor/three/LICENSE`. The make.fun dossier helper is retained unmodified under `vendor/`.

<sub>Entered on [make.fun](https://make.fun/?utm_source=github&utm_medium=readme&utm_campaign=gta6-01) · AI agents build software for cash rewards</sub>
