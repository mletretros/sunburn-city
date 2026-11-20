import * as THREE from 'three';
import { makeRng } from '../rng.js';
const PARTICLES = 192, MARKS = 64, TRACERS = 12;
export function createEffects(scene, seed) {
  const particles = Array.from({ length: PARTICLES }, () => ({ life: 0, duration: 0, x: 0, y: 0, z: 0, dx: 0, dy: 0, dz: 0, size: 0, gravity: 0 }));
  const markLife = new Float32Array(MARKS), tracerLife = new Float32Array(TRACERS), endpoints = new Float32Array(TRACERS * 6);
  const pose = new THREE.Object3D(), color = new THREE.Color(), rubber = new THREE.Color(0x1c2028), hidden = new THREE.Matrix4().makeScale(0, 0, 0);
  const motes = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(1, 0), new THREE.MeshBasicMaterial(), PARTICLES);
  const marks = new THREE.InstancedMesh(new THREE.PlaneGeometry(), new THREE.MeshBasicMaterial({ transparent: true, opacity: .48, depthWrite: false }), MARKS);
  const tracer = new THREE.LineSegments(new THREE.BufferGeometry(), new THREE.LineBasicMaterial({ color: 0xffdb92, transparent: true }));
  const positions = new THREE.BufferAttribute(endpoints, 3).setUsage(THREE.DynamicDrawUsage); tracer.geometry.setAttribute('position', positions);
  motes.frustumCulled = marks.frustumCulled = tracer.frustumCulled = false;
  motes.instanceMatrix.setUsage(THREE.DynamicDrawUsage); marks.instanceMatrix.setUsage(THREE.DynamicDrawUsage); scene.add(motes, marks, tracer);
  let random, nextParticle = 0, nextMark = 0, nextTracer = 0, colorDirty = false;
  function reset() {
    random = makeRng(`${seed}:effects`); nextParticle = nextMark = nextTracer = 0; colorDirty = false;
    markLife.fill(0); tracerLife.fill(0); endpoints.fill(0);
    for (let i = 0; i < PARTICLES; i++) { particles[i].life = 0; motes.setMatrixAt(i, hidden); }
    for (let i = 0; i < MARKS; i++) marks.setMatrixAt(i, hidden);
    motes.instanceMatrix.needsUpdate = marks.instanceMatrix.needsUpdate = positions.needsUpdate = true;
  }
  function emit(x, y, z, tint, count, force, size, duration, gravity = -7) {
    color.setHex(tint);
    for (let i = 0; i < count; i++) {
      const index = nextParticle; nextParticle = (index + 1) % PARTICLES; const p = particles[index];
      p.x = x; p.y = y; p.z = z; p.dx = random.range(-force, force); p.dy = random.range(0, force); p.dz = random.range(-force, force);
      p.life = p.duration = duration * random.range(.6, 1); p.size = size * random.range(.55, 1.3); p.gravity = gravity; motes.setColorAt(index, color);
    }
    colorDirty = true;
  }
  reset();
  return {
    reset,
    update(dt) {
      let moved = false; pose.rotation.set(0, 0, 0);
      for (let i = 0; i < PARTICLES; i++) {
        const p = particles[i]; if (p.life <= 0) continue; moved = true; p.life -= dt;
        if (p.life <= 0) { motes.setMatrixAt(i, hidden); continue; }
        p.x += p.dx * dt; p.y += p.dy * dt; p.z += p.dz * dt; p.dy += p.gravity * dt;
        const fraction = p.life / p.duration; pose.position.set(p.x, p.y, p.z);
        pose.scale.setScalar(p.size * (p.gravity > 0 ? .42 + 1.8 * (1 - fraction) : fraction)); pose.updateMatrix(); motes.setMatrixAt(i, pose.matrix);
      }
      if (moved) motes.instanceMatrix.needsUpdate = true;
      if (colorDirty) { motes.instanceColor.needsUpdate = true; colorDirty = false; }
      for (let i = 0; i < MARKS; i++) {
        if (markLife[i] <= 0) continue;
        const left = markLife[i] -= dt;
        if (left <= 0) { marks.setMatrixAt(i, hidden); marks.instanceMatrix.needsUpdate = true; }
        else if (left < 1) { marks.setColorAt(i, color.setHex(0x88818a).lerp(rubber, left)); marks.instanceColor.needsUpdate = true; }
      }
      for (let i = 0; i < TRACERS; i++) if (tracerLife[i] > 0 && (tracerLife[i] -= dt) <= 0) { endpoints.fill(0, i * 6, i * 6 + 6); positions.needsUpdate = true; }
    },
    shot(from, to) {
      const index = nextTracer; nextTracer = (index + 1) % TRACERS; from.toArray(endpoints, index * 6); to.toArray(endpoints, index * 6 + 3);
      tracerLife[index] = .1; positions.needsUpdate = true; emit(from.x, from.y, from.z, 0xffe299, 5, 1.2, .13, .1, 0);
    },
    impact(x, y, z) { emit(x, y, z, 0xffbd68, 9, 3.8, .065, .42); },
    smoke(x, y, z, damaged) { emit(x, y, z, damaged ? 0x48505a : 0xc5c0ba, 3, .46, .24, 1.15, .68); },
    dust(x, y, z) { emit(x, y, z, 0xd8ba9c, 3, .38, .11, .4, .42); },
    explosion(x, y, z) { emit(x, y, z, 0xff7545, 32, 6.5, .37, .72, 1); emit(x, y, z, 0xffca63, 16, 8, .093, .62); emit(x, y, z, 0x424450, 22, 3.8, .53, 1.8, .55); },
    skid(x, y, z, heading) {
      const index = nextMark; nextMark = (index + 1) % MARKS; markLife[index] = 3.6;
      pose.position.set(x, y + .012, z); pose.rotation.set(-Math.PI / 2, 0, -heading); pose.scale.set(.16, .62, 1); pose.updateMatrix();
      marks.setMatrixAt(index, pose.matrix); marks.setColorAt(index, rubber); marks.instanceMatrix.needsUpdate = marks.instanceColor.needsUpdate = true;
    },
  };
}
