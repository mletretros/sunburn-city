import * as T from 'three';
import { setFootprint } from '../systems/physics.js';
const vehicleType = (name, width, length, roof, top, kind) => ({ name, width, length, roof, top, kind, sill: .85, offset: .2 });
export const VEHICLES = [vehicleType('Cabrillo', 1.9, 4.5, 1.5, 36, 'sedan'), vehicleType('Biscayne', 2, 4.9, 1.55, 34, 'sedan'), vehicleType('Mesa Trail', 2.1, 4.7, 1.95, 30, 'suv'), vehicleType('Parcel 200', 2.2, 5.5, 2.5, 27, 'van'), vehicleType('Civic Guard', 2, 5, 1.6, 42, 'police'), vehicleType('Sirocco RS', 2.05, 4.6, 1.24, 52, 'sport')];
export const CAR_PAINT = [0x53bbaa, 0xd96578, 0xe4ac52, 0x8d8fbc, 0x73a8c7, 0xf3dfc0, 0x4e6475, 0xeb9677];
const cube = new T.BoxGeometry(), tire = new T.CylinderGeometry(.34, .34, .22, 12);
const rubber = new T.MeshStandardMaterial({ color: 0x202a31, roughness: .9 }), chrome = new T.MeshStandardMaterial({ color: 0xbfc9c7, metalness: .7, roughness: .25 });
export function createVehicle(scene, spec, color = 0xdca441) {
  const root = new T.Group(), paint = new T.MeshStandardMaterial({ color, metalness: .3, roughness: .32 }); scene.add(root);
  const glass = new T.MeshStandardMaterial({ color: 0x264653, metalness: .4, roughness: .2 });
  function part(material, x, y, z, w, h, d) {
    const mesh = new T.Mesh(cube, material); mesh.position.set(x, y, z); mesh.scale.set(w, h, d); mesh.castShadow = true; mesh.receiveShadow = true; root.add(mesh); return mesh;
  }
  const w = spec.width, l = spec.length, van = spec.kind === 'van';
  part(paint, 0, .65, 0, w, .57, l);
  part(paint, 0, 1, -.3, w * .94, .22, l * .77);
  part(glass, 0, (spec.roof + .95) / 2, .25, w * .8, spec.roof - .9, van ? l * .7 : l * .46);
  part(paint, 0, spec.roof, .25, w * .85, .12, van ? l * .72 : l * .4);
  part(chrome, 0, .43, -l / 2, w, .13, .15); part(chrome, 0, .43, l / 2, w, .13, .15);
  const headlight = new T.MeshBasicMaterial({ color: 0xffedb2 }), tail = new T.MeshBasicMaterial({ color: 0xff5a66 });
  for (let side = -1; side <= 1; side += 2) {
    part(headlight, side * w * .33, .75, -l / 2 - .015, .48, .18, .05);
    part(tail, side * w * .34, .74, l / 2 + .015, .45, .15, .05);
    part(chrome, side * w * .51, .74, .2, .04, .08, l * .8);
  }
  const wheels = [];
  for (let i = 0; i < 4; i++) {
    const wheel = new T.Mesh(tire, rubber); wheel.rotation.z = Math.PI / 2; wheel.position.set((i & 1 ? 1 : -1) * w * .49, .36, (i < 2 ? -1 : 1) * l * .32); root.add(wheel); wheels.push(wheel);
    part(chrome, wheel.position.x * 1.025, .36, wheel.position.z, .04, .32, .32);
  }
  let beacon = null;
  if (spec.kind === 'police') {
    part(new T.MeshStandardMaterial({ color: 0xf3ead5 }), 0, .72, 0, w + .025, .3, l * .38);
    beacon = part(new T.MeshBasicMaterial({ color: 0xff5369 }), 0, spec.roof + .18, .3, 1.3, .22, .35);
  }
  const car = { root, spec, position: root.position, heading: 0, speed: 0, steering: 0, gear: 'N', health: 100, active: false, destroyed: false,
    driver: null, ambient: false, police: spec.kind === 'police', handbrake: false, throttle: false, skid: 0, braked: false, impact: null, footprint: {}, seat: new T.Vector3(), velocity: new T.Vector2() };
  const future = {}; let flash = 0, collisionWait = 0;
  car.animate = dt => {
    root.visible = car.active; root.rotation.y = -car.heading;
    setFootprint(car.footprint, car.position.x, car.position.z, car.heading, w, l);
    car.seat.copy(car.position); car.seat.y += .7;
    for (let i = 0; i < wheels.length; i++) wheels[i].rotation.x -= car.speed * dt / .34;
    car.gear = car.speed < -.5 ? 'R' : Math.abs(car.speed) < .5 ? 'N' : Math.min(6, Math.ceil(car.speed / 9));
    flash += dt; if (beacon) beacon.material.color.setHex(flash % .4 < .2 ? 0xff526a : 0x5b9dff);
  };
  car.place = (x, y, z, angle = 0) => { car.position.set(x, y, z); car.heading = angle; car.speed = car.skid = car.steering = 0; car.health = 100; car.destroyed = false; car.velocity.set(0, 0); car.animate(0); };
  car.enter = driver => { const old = car.driver; car.driver = driver; return old; };
  car.exit = () => { car.driver = null; car.speed = 0; car.velocity.set(0, 0); };
  car.destroy = () => { car.active = false; car.destroyed = true; car.exit(); car.animate(0); };
  car.doorDistance = (x, z) => Math.hypot(x - car.position.x, z - car.position.z) - w * .5;
  car.drive = (dt, controls, physics) => {
    collisionWait = Math.max(0, collisionWait - dt); car.throttle = !!controls.throttle; car.handbrake = !!controls.handbrake; car.braked = !!controls.brake;
    const thrust = controls.throttle ? 14 : controls.brake ? -21 : 0;
    car.speed += thrust * dt;
    car.speed *= Math.exp(-dt * (controls.handbrake ? .9 : controls.throttle || controls.brake ? .07 : .65));
    car.speed = T.MathUtils.clamp(car.speed, -10, spec.top * (.4 + car.health * .006));
    car.steering += ((controls.steer || 0) * .5 - car.steering) * Math.min(1, dt * 7);
    const turn = car.steering * car.speed * dt / (3.2 + Math.abs(car.speed) * .14) * (car.handbrake ? 2.4 : 1);
    const angle = car.heading + turn;
    const vx = Math.sin(angle) * car.speed, vz = -Math.cos(angle) * car.speed;
    const grip = 1 - Math.exp(-dt * (car.handbrake ? 1.4 : 12));
    car.velocity.x += (vx - car.velocity.x) * grip; car.velocity.y += (vz - car.velocity.y) * grip;
    car.skid = car.handbrake ? Math.min(1, Math.abs(car.speed * car.steering) * .15) : Math.max(0, car.skid - dt * 2);
    setFootprint(future, car.position.x + car.velocity.x * dt, car.position.z + car.velocity.y * dt, angle, w, l);
    const other = physics.vehicleContact(future, car), blocked = physics.staticVehicleBlocked(future, car.position.y, spec.roof);
    if (blocked || other) {
      if (!collisionWait && Math.abs(car.speed) > 5) { car.health = Math.max(0, car.health - Math.ceil(Math.abs(car.speed) * 1.2)); if (other) other.health = Math.max(0, other.health - 8); car.impact = other || true; collisionWait = .4; }
      car.speed *= -.25; car.velocity.multiplyScalar(-.2);
    } else { car.position.x = future.x; car.position.z = future.z; car.position.y = physics.groundAt(future.x, future.z); car.heading = angle; }
    car.animate(dt);
  };
  car.animate(0); return car;
}
