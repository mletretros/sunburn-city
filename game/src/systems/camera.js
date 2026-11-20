import { MathUtils, PerspectiveCamera, Vector3 } from 'three';
import { CAMERA as C, DRIVE } from '../config.js';
const { clamp, lerp } = MathUtils, lag = (rate, dt) => 1 - Math.exp(-rate * dt);
const axes = [['x', 'minX', 'maxX'], ['z', 'minZ', 'maxZ'], ['y', 'minY', 'maxY']];
function obstruction(colliders, origin, ray) {
  let closest = 1;
  for (let i = 0; i < colliders.length; i++) {
    const box = colliders[i]; let enter = 0, leave = closest;
    for (let n = 0; n < axes.length; n++) {
      const axis = axes[n], start = origin[axis[0]], direction = ray[axis[0]], min = box[axis[1]] - C.radius, max = box[axis[2]] + C.radius;
      if (Math.abs(direction) < .00001) { if (start < min || start > max) { enter = Infinity; break; } }
      else {
        const a = (min - start) / direction, b = (max - start) / direction;
        enter = Math.max(enter, Math.min(a, b)); leave = Math.min(leave, Math.max(a, b)); if (enter > leave) break;
      }
    }
    if (enter <= leave) closest = enter;
    if (!closest) break;
  }
  return closest;
}
export function createFollowCamera(city) {
  const camera = new PerspectiveCamera(C.foot.fov, 1, .085, C.far), follow = new Vector3(), anchor = new Vector3(), arm = new Vector3(), look = new Vector3(), mouse = { x: 0, y: 0 };
  let snap = true, orbitHold = 0, driving = 0, reach = 0;
  const rig = {
    camera, yaw: 0, pitch: C.pitch, sensitivity: 1,
    reset(yaw = 0, pitch = C.pitch) { rig.yaw = Number.isFinite(yaw) ? yaw : 0; rig.pitch = clamp(Number.isFinite(pitch) ? pitch : C.pitch, C.pitchMin, C.pitchMax); snap = true; orbitHold = driving = 0; },
    read(input) {
      input.readMouse(mouse); if (mouse.x || mouse.y) orbitHold = 2.5;
      rig.yaw = (rig.yaw + mouse.x * C.sensitivity * rig.sensitivity) % (2 * Math.PI);
      rig.pitch = clamp(rig.pitch + mouse.y * C.sensitivity * rig.sensitivity, C.pitchMin, C.pitchMax);
    },
    update(dt, focus, vehicle = null, aiming = false) {
      orbitHold = Math.max(0, orbitHold - dt); const speed = Math.abs(vehicle?.speed ?? 0);
      if (vehicle && !orbitHold) { const delta = vehicle.heading - rig.yaw; rig.yaw += Math.atan2(Math.sin(delta), Math.cos(delta)) * lag(speed > 2 ? 3.8 : 2.6, dt); }
      driving = lerp(driving, vehicle ? 1 : 0, lag(4.5, dt));
      const seat = vehicle ? focus.y - vehicle.position.y : 0, height = lerp(C.foot.target, C.driving.target - seat, driving);
      const right = lerp(C.foot.shoulder, C.driving.shoulder, driving), distance = lerp(aiming ? 3.2 : C.foot.distance, C.driving.distance, driving);
      const pitch = clamp(rig.pitch + .075 * driving, C.pitchMin, C.pitchMax), sin = Math.sin(rig.yaw), cos = Math.cos(rig.yaw), forward = distance * Math.cos(pitch), easing = snap ? 1 : lag(C.follow, dt);
      follow.lerp(focus, easing); anchor.set(focus.x, focus.y + height, focus.z);
      arm.set(follow.x - sin * forward + cos * right, follow.y + height + distance * Math.sin(pitch), follow.z + cos * forward + sin * right);
      arm.y = Math.max(arm.y, city.groundAt(arm.x, arm.z) + .34); arm.sub(anchor);
      const length = arm.length(), fraction = obstruction(city.colliders, anchor, arm), available = Math.max(.07, fraction * length - (fraction < 1 ? C.clearance : 0));
      reach = snap || available <= reach ? available : lerp(reach, available, lag(C.recovery, dt)); snap = false;
      camera.position.copy(anchor).addScaledVector(arm, reach / Math.max(.001, length));
      const normalized = Math.min(1, speed / 30), lead = driving * (1.3 + normalized * DRIVE.lookAhead);
      look.set(follow.x + cos * right + sin * lead, follow.y + height, follow.z + sin * right - cos * lead); camera.lookAt(look);
      const fov = lerp(camera.fov, lerp(aiming ? 46 : C.foot.fov, C.driving.fov + normalized * DRIVE.speedFov, driving), easing * .63);
      if (Math.abs(fov - camera.fov) > .001) { camera.fov = fov; camera.updateProjectionMatrix(); }
    },
  };
  return rig;
}
