import * as T from 'three';
export function createFollowCamera(city) {
  const camera = new T.PerspectiveCamera(57, innerWidth / innerHeight, .1, 1500);
  const mouse = { x: 0, y: 0 }, destination = new T.Vector3(), look = new T.Vector3();
  let snap = true;
  const rig = { camera, yaw: 0, pitch: .26, sensitivity: .0025,
    reset(angle = 0, pitch = .26) { rig.yaw = angle; rig.pitch = pitch; snap = true; },
    read(input) { input.readMouse(mouse); rig.yaw -= mouse.x * rig.sensitivity; rig.pitch = T.MathUtils.clamp(rig.pitch + mouse.y * rig.sensitivity, -.15, 1.05); },
    update(dt, focus, vehicle = null, aiming = false) {
      const distance = vehicle ? 10 : aiming ? 3.2 : 7.4;
      look.set(focus.x, focus.y + (vehicle ? 1 : 1.45), focus.z);
      destination.set(look.x - Math.sin(rig.yaw) * distance * Math.cos(rig.pitch), look.y + 1.7 + Math.sin(rig.pitch) * distance, look.z + Math.cos(rig.yaw) * distance * Math.cos(rig.pitch));
      if (city.blocked(destination.x, destination.y, destination.z, .35)) destination.lerp(look, .55);
      camera.position.lerp(destination, snap ? 1 : 1 - Math.exp(-dt * 7)); camera.lookAt(look); snap = false;
    },
  };
  return rig;
}
