import * as T from 'three';
import { makeRng } from '../rng.js';
export function createEffects(scene, seed) {
  const dice = makeRng(seed + '/particles'), capacity = 256, particles = [];
  const sphere = new T.IcosahedronGeometry(1, 0), material = new T.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: .55, depthWrite: false });
  const mesh = new T.InstancedMesh(sphere, material, capacity), pose = new T.Object3D(), color = new T.Color();
  mesh.frustumCulled = false; scene.add(mesh); let cursor = 0;
  for (let n = 0; n < capacity; n++) particles.push({ x: 0, y: -100, z: 0, vx: 0, vy: 0, vz: 0, life: 0, ttl: 1, size: 0, color: 0xffffff });
  function emit(x, y, z, tint, count, radius, lifespan, velocity) {
    for (let n = 0; n < count; n++) {
      const p = particles[cursor++ % capacity]; p.x = x; p.y = y; p.z = z; p.color = tint; p.size = radius;
      p.life = p.ttl = lifespan * dice.range(.7, 1.3); p.vx = dice.range(-velocity, velocity); p.vz = dice.range(-velocity, velocity); p.vy = dice.range(.4, velocity + .5);
    }
  }
  const api = {
    reset() { for (let n = 0; n < capacity; n++) particles[n].life = 0; api.update(0); },
    update(dt) {
      for (let n = 0; n < capacity; n++) {
        const p = particles[n]; p.life = Math.max(0, p.life - dt);
        if (p.life) { p.x += p.vx * dt; p.y += p.vy * dt; p.z += p.vz * dt; pose.position.set(p.x, p.y, p.z); const age = 1 - p.life / p.ttl; pose.scale.setScalar(p.size * (.6 + age * 1.9)); }
        else { pose.position.set(0, -100, 0); pose.scale.setScalar(0); }
        pose.updateMatrix(); mesh.setMatrixAt(n, pose.matrix); color.setHex(p.color); mesh.setColorAt(n, color);
      }
      mesh.instanceMatrix.needsUpdate = true; if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
    },
    shot(from, to) { emit(to.x, to.y, to.z, 0xffe2a5, 4, .06, .15, 1); },
    impact(x, y, z) { emit(x, y, z, 0xffc57e, 10, .09, .4, 3); },
    smoke(x, y, z, damaged) { emit(x, y, z, damaged ? 0x4a535e : 0xc6c6c0, 3, .35, 1.4, .6); },
    dust(x, y, z) { emit(x, y, z, 0xe1c49d, 2, .12, .5, .5); },
    explosion(x, y, z) { emit(x, y, z, 0xff975a, 35, .35, 1.2, 5); },
    skid(x, y, z, heading) { emit(x, y + .03, z, 0x34373d, 1, .07, 4, 0); },
  };
  api.reset(); return api;
}
