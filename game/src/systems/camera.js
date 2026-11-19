import * as THREE from 'three';
import { CAMERA as C, DRIVE as D } from '../config.js';

export function createFollowCamera(city) {
  const camera = new THREE.PerspectiveCamera(C.foot.fov, 1, .085, C.far);
  const target = new THREE.Vector3(), pivot = new THREE.Vector3(), delta = new THREE.Vector3();
  const desired = new THREE.Vector3(), view = new THREE.Vector3();
  const mouse = { x: 0, y: 0 };
  let x = 0, y = 0, z = 0, distance = 0, fresh = true, driveBlend = 0, lookHold = 0;
  const mix = THREE.MathUtils.lerp;
  const rig = {
    camera, yaw: 0, pitch: C.pitch, sensitivity: 1,
    reset(yaw = 0, pitch = C.pitch) { rig.yaw = yaw; rig.pitch = pitch; fresh = true; driveBlend = lookHold = 0; },
    read(input) {
      input.readMouse(mouse);
      if (mouse.x || mouse.y) lookHold = 2.5;
      rig.yaw = (rig.yaw + mouse.x * C.sensitivity * rig.sensitivity) % (2 * Math.PI);
      rig.pitch = THREE.MathUtils.clamp(rig.pitch + mouse.y * C.sensitivity * rig.sensitivity, C.pitchMin, C.pitchMax);
    },
    update(dt, position, vehicle = null, aiming = false) {
      lookHold = Math.max(0, lookHold - dt);
      const speed = vehicle ? Math.abs(vehicle.speed) : 0;
      if (vehicle && !lookHold) {
        const gap = vehicle.heading - rig.yaw;
        rig.yaw += Math.atan2(Math.sin(gap), Math.cos(gap)) * (1 - Math.exp(-dt * (speed > 2 ? 3.8 : 2.6)));
      }
      driveBlend += ((vehicle ? 1 : 0) - driveBlend) * (1 - Math.exp(-dt * 4.5));
      const seatHeight = vehicle ? position.y - vehicle.position.y : 0;
      const height = mix(C.foot.target, C.driving.target - seatHeight, driveBlend);
      const shoulder = mix(C.foot.shoulder, C.driving.shoulder, driveBlend);
      const boom = mix(aiming ? 3.2 : C.foot.distance, C.driving.distance, driveBlend);
      const pitch = THREE.MathUtils.clamp(rig.pitch + driveBlend * .075, C.pitchMin, C.pitchMax);
      const s = Math.sin(rig.yaw), c = Math.cos(rig.yaw), h = Math.cos(pitch);
      const smooth = fresh ? 1 : 1 - Math.exp(-C.follow * dt);
      x += (position.x - x) * smooth; y += (position.y - y) * smooth; z += (position.z - z) * smooth;
      pivot.set(x, y + height, z);
      target.set(position.x, position.y + height, position.z);
      desired.set(pivot.x - s * h * boom + c * shoulder,
        pivot.y + Math.sin(pitch) * boom, pivot.z + c * h * boom + s * shoulder);
      desired.y = Math.max(city.groundAt(desired.x, desired.z) + .34, desired.y);
      delta.subVectors(desired, target);
      const length = delta.length();
      let allowed = 1;
      for (const b of city.colliders) {
        const t = hitFraction(b, target, delta);
        if (t < allowed) allowed = t;
      }
      const limit = Math.max(.07, length * allowed - (allowed < 1 ? C.clearance : 0));
      distance = fresh || limit <= distance ? limit : distance + (limit - distance) * (1 - Math.exp(-C.recovery * dt));
      fresh = false;
      camera.position.copy(target).addScaledVector(delta, distance / Math.max(.001, length));
      const lead = driveBlend * (1.3 + Math.min(1, speed / 30) * D.lookAhead);
      view.set(pivot.x + c * shoulder + s * lead, pivot.y, pivot.z + s * shoulder - c * lead);
      camera.lookAt(view);
      const fov = mix(camera.fov, mix(aiming ? 46 : C.foot.fov, C.driving.fov + Math.min(1, speed / 30) * D.speedFov, driveBlend), smooth * .63);
      if (Math.abs(fov - camera.fov) > .001) { camera.fov = fov; camera.updateProjectionMatrix(); }
    },
  };
  return rig;
}

function hitFraction(b, p, v) {
  const r = C.radius;
  let lo = 0, hi = 1;
  if (Math.abs(v.x) < .00001) { if (p.x < b.minX - r || p.x > b.maxX + r) return 1; }
  else {
    const a = (b.minX - r - p.x) / v.x, z = (b.maxX + r - p.x) / v.x;
    lo = Math.max(lo, Math.min(a, z)); hi = Math.min(hi, Math.max(a, z));
    if (lo > hi) return 1;
  }
  if (Math.abs(v.z) < .00001) { if (p.z < b.minZ - r || p.z > b.maxZ + r) return 1; }
  else {
    const a = (b.minZ - r - p.z) / v.z, z = (b.maxZ + r - p.z) / v.z;
    lo = Math.max(lo, Math.min(a, z)); hi = Math.min(hi, Math.max(a, z));
    if (lo > hi) return 1;
  }
  if (Math.abs(v.y) < .00001) return p.y < b.minY - r || p.y > b.maxY + r ? 1 : lo;
  const a = (b.minY - r - p.y) / v.y, z = (b.maxY + r - p.y) / v.y;
  lo = Math.max(lo, Math.min(a, z)); hi = Math.min(hi, Math.max(a, z));
  return lo <= hi ? lo : 1;
}
