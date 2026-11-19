import * as THREE from 'three';
import { makeRng } from '../rng.js';

export function createEffects(scene, seed) {
  const rng = makeRng(`${seed}:effects`), count = 192;
  const mesh = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(1, 0), new THREE.MeshBasicMaterial(), count);
  const marks = new THREE.InstancedMesh(new THREE.PlaneGeometry(), new THREE.MeshBasicMaterial({ transparent: true, opacity: .48, depthWrite: false }), 64);
  const pose = new THREE.Object3D(), color = new THREE.Color(), trackTint = new THREE.Color(0x1c2028), hidden = new THREE.Matrix4().makeScale(0, 0, 0);
  const particles = Array.from({ length: count }, () => ({ life: 0 })), tracks = new Float32Array(64);
  let cursor = 0, mark = 0, dirty = false;
  mesh.frustumCulled = marks.frustumCulled = false;
  mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage); marks.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  scene.add(mesh, marks);
  const tracer = new THREE.LineSegments(new THREE.BufferGeometry(), new THREE.LineBasicMaterial({ color: 0xffdb92, transparent: true }));
  const lines = new Float32Array(12 * 6), lineLife = new Float32Array(12);
  tracer.geometry.setAttribute('position', new THREE.BufferAttribute(lines, 3)); tracer.frustumCulled = false; scene.add(tracer);
  let line = 0;
  function reset() {
    for (let i = 0; i < count; i++) { particles[i].life = 0; mesh.setMatrixAt(i, hidden); }
    for (let i = 0; i < tracks.length; i++) marks.setMatrixAt(i, hidden);
    tracks.fill(0); lines.fill(0); lineLife.fill(0);
    mesh.instanceMatrix.needsUpdate = marks.instanceMatrix.needsUpdate = tracer.geometry.attributes.position.needsUpdate = true;
  }
  function burst(x, y, z, tint, n, force, size, duration, lift = -7) {
    for (let i = 0; i < n; i++) {
      const index = cursor++ % count, p = particles[index];
      p.x = x; p.y = y; p.z = z; p.vx = rng.range(-force, force); p.vy = rng.range(0, force); p.vz = rng.range(-force, force);
      p.life = p.max = duration * rng.range(.6, 1); p.size = size * rng.range(.55, 1.3); p.lift = lift;
      mesh.setColorAt(index, color.set(tint)); dirty = true;
    }
  }
  reset();
  return {
    reset,
    shot(from, to) {
      const i = line++ % lineLife.length, o = i * 6;
      lines[o] = from.x; lines[o + 1] = from.y; lines[o + 2] = from.z;
      lines[o + 3] = to.x; lines[o + 4] = to.y; lines[o + 5] = to.z;
      lineLife[i] = .10; tracer.geometry.attributes.position.needsUpdate = true;
      burst(from.x, from.y, from.z, 0xffe299, 5, 1.2, .13, .10, 0);
    },
    impact(x, y, z) { burst(x, y, z, 0xffbd68, 9, 3.8, .065, .42); },
    smoke(x, y, z, damaged) { burst(x, y, z, damaged ? 0x48505a : 0xc5c0ba, 3, .46, .24, 1.15, .68); },
    dust(x, y, z) { burst(x, y, z, 0xd8ba9c, 3, .38, .11, .40, .42); },
    explosion(x, y, z) {
      burst(x, y, z, 0xff7545, 32, 6.5, .37, .72, 1);
      burst(x, y, z, 0xffca63, 16, 8, .093, .62);
      burst(x, y, z, 0x424450, 22, 3.8, .53, 1.8, .55);
    },
    skid(x, y, z, heading) {
      const i = mark++ % tracks.length; tracks[i] = 3.6;
      pose.position.set(x, y + .012, z); pose.rotation.set(-Math.PI / 2, 0, -heading);
      pose.scale.set(.16, .62, 1); pose.updateMatrix(); marks.setMatrixAt(i, pose.matrix);
      marks.setColorAt(i, color.setHex(0x1c2028)); marks.instanceColor.needsUpdate = marks.instanceMatrix.needsUpdate = true;
    },
    update(dt) {
      let active = false;
      for (let i = 0; i < count; i++) {
        const p = particles[i]; if (p.life <= 0) continue;
        active = true; p.life -= dt;
        if (p.life <= 0) { mesh.setMatrixAt(i, hidden); continue; }
        p.x += p.vx * dt; p.y += p.vy * dt; p.z += p.vz * dt; p.vy += p.lift * dt;
        pose.position.set(p.x, p.y, p.z); pose.rotation.set(0, 0, 0);
        pose.scale.setScalar(p.size * (p.lift > 0 ? (1 - p.life / p.max) * 1.8 + .42 : p.life / p.max));
        pose.updateMatrix(); mesh.setMatrixAt(i, pose.matrix);
      }
      if (active) mesh.instanceMatrix.needsUpdate = true;
      if (dirty) { dirty = false; mesh.instanceColor.needsUpdate = true; }
      for (let i = 0; i < tracks.length; i++) if (tracks[i] > 0) {
        tracks[i] -= dt;
        if (tracks[i] <= 0) marks.setMatrixAt(i, hidden);
        else if (tracks[i] < 1) marks.setColorAt(i, color.setHex(0x88818a).lerp(trackTint, tracks[i]));
        if (tracks[i] <= 1) { marks.instanceMatrix.needsUpdate = true; marks.instanceColor.needsUpdate = true; }
      }
      for (let i = 0; i < lineLife.length; i++) if (lineLife[i] > 0 && (lineLife[i] -= dt) <= 0) {
        lines.fill(0, i * 6, i * 6 + 6); tracer.geometry.attributes.position.needsUpdate = true;
      }
    },
  };
}
