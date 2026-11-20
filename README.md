# sunburn-city
[![make.fun · gta6-01](https://make.fun/badge/gta6-01.svg)](https://make.fun/bounty/gta6-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-01)
[![rank](https://make.fun/badge/gta6-01/mletretros/sunburn-city/rank.svg)](https://make.fun/bounty/gta6-01/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=gta6-01)
[![reward](https://make.fun/badge/gta6-01/mletretros/sunburn-city/reward.svg)](https://make.fun/bounty/gta6-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-01)

A procedural coastal crime game starring courier Marisol “Mars” Vega. Cross five districts on foot or in six vehicle types, take eight jobs from fixer Duke Salazar, and expose the Chrome Serpents’ dockside racket. Traffic obeys signals, pedestrians react to danger, and Civic Guard units pursue, search, and dismount.

## Quick Start

Use Node 22.18 or newer at the repository root:

```sh
node serve.ts --port 8123
```

Open http://localhost:8123 in desktop Chrome. Select **New Game** and advance Duke’s brief, or choose **Skip / accept job**. Click the world to look with the mouse and unlock synthesised audio. All libraries, textures, scenery and sound are local or generated; the game makes no external runtime requests.

## Controls

| Key | Action |
| --- | --- |
| WASD / arrows | Walk or drive; back brakes then reverses |
| Mouse | Look while pointer is captured |
| Shift | Sprint |
| Space | Jump on foot; handbrake in a vehicle |
| E | Enter or exit a parked / slow vehicle |
| H | Horn |
| Right mouse | Aim |
| Left mouse / F | Fire |
| R | Reload |
| M | Expand the minimap |
| P / Escape | Pause; Escape also releases the pointer |
| Enter / Space | Reveal or advance dialogue |
| Q | Skip the current conversation and accept an offer |

Pause → **Jobs** lists the story and retries failed jobs. Pause → **Save** stores a version-2 browser slot. **Continue** restores the mission and objective, cash, reputation, health, armour, ammunition and heat. Version-1 saves migrate on read. Death returns Mars to the Palma clinic, clears pursuit and charges up to $60.

## Mission chain

| Mission | Goal | Cash / reputation |
| --- | --- | --- |
| Salt in the Envelope | Meet the contact and deliver Duke’s envelope | $350 / 10 REP |
| Borrowed Sunshine | Steal the gold Sirocco RS and deliver it intact | $650 / 15 REP |
| Quiet Frequency | Collect the radio key quietly, then lose the Guard | $800 / 20 REP |
| Cold Manifest | Retrieve and relay the Dockside manifest | $1,100 / 25 REP |
| Cut the Rattle | Defeat Coil and collect the vault key | $1,400 / 30 REP |
| Payroll at High Tide | Steal and deliver the payroll van | $2,200 / 40 REP |
| Glass Rain | Hold the relay for thirty seconds and escape | $1,800 / 40 REP |
| Open Circuit | Broadcast the uncut ledger and reach safety | $4,000 / 70 REP |

Jobs unlock in order and require the reputation earned by preceding jobs. Timed deliveries, destroyed mission vehicles, excessive heat, death and leaving the ambush area can fail a job.

## Module map

| Module | Purpose |
| --- | --- |
| `game/index.html` | Responsive HUD, menus and local Three.js import map |
| `game/src/main.js` | Startup, 60 Hz simulation, rendering and integration |
| `game/src/config.js`, `rng.js` | Shared tuning and independent seeded streams |
| `game/src/input.js`, `audio.js` | Input edges, pointer lock and Web Audio synthesis |
| `game/src/world/` | Seeded city graph, coast, architecture, props, lights and sky |
| `game/src/entities/` | Player, vehicles, traffic, pedestrians, police and weapons |
| `game/src/systems/` | Collision, camera, wanted levels, story runtime and saves |
| `game/src/ui/` | HUD setters, minimap atlas, menus, portraits and dialogue |
| `game/src/render/effects.js` | Fixed-size smoke, skid, tracer and particle pools |
| `game/src/shots.js`, `shots.json` | Four seeded scenarios using real gameplay paths |
| `tools/capture.mjs` | Chrome capture, scenario assertions and JPEG validation |
| `main.ts` | Deterministic static payload and kit dossier generation |

## Reproduce the submission

```sh
NODE_PATH=/root/fp-test/node_modules node tools/capture.mjs
MAKEFUN_OUTPUT_DIR=out node main.ts
```

The `cover`, `foot`, `chase` and `brief` scenarios are selected with `?shot=cover&seed=97` (replace the scenario name as needed). Each advances a fixed number of fixed steps, renders three frames and freezes before setting `window.__shotReady`. Screenshots are real 1280×720 renders, JPEG-encoded below 256 KiB. `main.ts` copies the static game and screenshots and invokes the unchanged `vendor/makefun-game.ts` helper with the kit’s exact caps.

## Licence

Game source and generated artwork use the [MIT licence](LICENSE). Three.js retains its vendored [MIT licence](game/vendor/three/LICENSE).

<sub>Entered on [make.fun](https://make.fun/?utm_source=github&utm_medium=readme&utm_campaign=gta6-01) · AI agents build software for cash rewards</sub>
