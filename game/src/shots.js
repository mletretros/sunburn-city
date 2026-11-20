// Capture mode advances the production simulation, never an illustration-only scene.
export const SHOT_NAMES = Object.freeze(['cover', 'foot', 'chase', 'brief']);
export async function runShot(name, game) {
  const { player, traffic, pedestrians, wanted, missions, dialogue, rig, effects } = game;
  game.start();
  const isStreet = name === 'cover' || name === 'chase';
  const pose = isStreet ? { x: 58, z: -94, heading: -.18 } : { x: -10.5, z: 59, heading: .3 };
  player.reset(pose); game.resetStreetLife(player.state.position);
  if (isStreet) {
    player.state.reputation = 25;
    missions.load({ index: 1, state: 'active', step: 1, remaining: 76, car: { x: 58, z: -94, heading: -.18, health: 100 } });
    // Only the mission Sirocco occupies this lane; the spare stays back on Palma.
    const delivery = missions.cars[0]; traffic.claim(delivery); player.enter(delivery);
    delivery.speed = name === 'chase' ? 15 : 0; delivery.velocity.set(-2, -delivery.speed);
    wanted.crime('stolen-transponder', name === 'chase' ? 73 : 14, player.state.position);
  } else {
    missions.accept(); if (name === 'brief') missions.completeObjective('meet');
    traffic.starter.place(-5, .03, 59, 0); traffic.starter.active = true; traffic.starter.driver = null;
    player.reset({ x: -7.4, z: name === 'brief' ? 48 : 59, heading: .3 });
  }
  dialogue.hide();
  const drive = { throttle: name === 'chase', brake: false, steer: name === 'chase' ? .28 : 0, handbrake: name === 'chase' };
  const controls = { ...game.neutral, driving: () => drive };
  const initialX = player.state.position.x, initialZ = player.state.position.z;
  for (let tick = 0; tick < 100; tick++) game.simulate(1 / 60, controls);
  if (name === 'chase') {
    wanted.reset(); wanted.crime('Serpent-payroll-pursuit', 73, player.state.position);
    const p = player.state.position;
    for (let n = 0; n < game.police.cruisers.length; n++) {
      const cop = game.police.cruisers[n]; if (!cop.active) continue;
      cop.place(p.x + (n % 2 ? -3.4 : 3.5), .03, p.z + 9 + n * 9, -.08); cop.speed = 15; cop.animate(1 / 60);
      game.police.blips[n].x = cop.position.x; game.police.blips[n].z = cop.position.z;
    }
    const car = player.state.vehicle; car.skid = .8; car.speed = 22;
    for (let n = 0; n < 22; n++) { effects.smoke(p.x - 1 + n % 3, .35 + n * .018, p.z + 1 + n * .17, false); effects.update(1 / 60); }
  }
  const p = player.state.position;
  for (let n = 0; n < 10; n++) {
    const person = pedestrians.walkers[n]; person.position.set(isStreet ? 47 + (n % 2) * 22 : -11 - (n % 2) * 3, .16, p.z - 5 - n * 4.5);
  }
  if (name === 'brief') dialogue.show([{ speaker: 'Duke', text: 'The envelope carries the dock access schedule. The Chrome Serpents tax every crate that lands here. Bring it to my street office, Mars. We are cancelling their toll.' }], null, 'DUKE SALAZAR / ENCRYPTED RADIO');
  rig.camera.position.set(p.x - (isStreet ? 10 : 9), isStreet ? 6.5 : 3.8, p.z + (isStreet ? 13 : 10));
  rig.camera.lookAt(p.x + (isStreet ? 4 : 2), isStreet ? 2.5 : 1.7, p.z - (isStreet ? 14 : 8));
  const tag = document.createElement('div'); tag.id = 'shot-tag';
  tag.textContent = name === 'chase' ? '04 / NO CLEAN GETAWAYS' : name === 'cover' ? '02 / BORROWED SUNSHINE' : name === 'brief' ? '01 / SALT IN THE ENVELOPE' : 'MARISOL “MARS” VEGA / PALMA, 1997'; document.body.append(tag);
  for (let frame = 0; frame < 3; frame++) { game.render(100 / 60); await new Promise(resolve => requestAnimationFrame(resolve)); }
  window.__shotState = { name, ticks: 100, traveled: Math.hypot(p.x - initialX, p.z - initialZ), frames: 3 };
  window.__shotReady = true;
}
