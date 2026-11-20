import * as THREE from 'three';
import { DRIVE as D } from '../config.js';
import { setFootprint } from '../systems/physics.js';
const spec = (name, type, width, length, sill, roof, cabin, offset, top) => ({ name, type, width, length, sill, roof, cabin, offset, top });
export const VEHICLES = [
  spec('Aster 90', 'compact', 1.76, 3.65, .8, 1.46, .59, .09, 31),
  spec('Bayshore LX', 'sedan', 1.9, 4.55, .86, 1.48, .49, .02, 36),
  spec('Mesa V8', 'muscle', 1.97, 4.64, .86, 1.34, .45, .27, 39),
  spec('Parcel 200', 'van', 2.03, 4.8, 1.02, 2.04, .78, .1, 26),
  spec('Dunework', 'pickup', 2.02, 4.9, 1, 1.77, .4, -.46, 33),
  spec('Sirocco RS', 'sports', 1.95, 4.25, .73, 1.18, .43, .09, 45),
];
export const CAR_PAINT = [0x38bba8, 0xd94456, 0xd9a048, 0x777ab0, 0x5a8cab, 0xe5cfc0, 0x4e6170, 0xeb8067];
const sides = [-1, 1], cube = new THREE.BoxGeometry(), tyre = new THREE.CylinderGeometry(1, 1, 1, 12).rotateZ(Math.PI / 2);
const shellPaint = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: .48, metalness: .13 });
const wheelPaint = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: .76 });
const glassPaint = new THREE.MeshStandardMaterial({ color: 0x406875, metalness: .31, roughness: .25, transparent: true, opacity: .65, depthWrite: false });
const wallImpact = { police: false };
function bake(parts) {
  const vertices = [], normals = [], colors = [], color = new THREE.Color();
  for (const [source, tint, x, y, z, w, h, d] of parts) {
    const position = source.attributes.position, normal = source.attributes.normal; color.set(tint);
    for (let i = 0; i < source.index.count; i++) {
      const index = source.index.getX(i), nx = normal.getX(index) / w, ny = normal.getY(index) / h, nz = normal.getZ(index) / d, inverse = 1 / Math.hypot(nx, ny, nz);
      vertices.push(x + w * position.getX(index), y + h * position.getY(index), z + d * position.getZ(index));
      normals.push(nx * inverse, ny * inverse, nz * inverse); colors.push(color.r, color.g, color.b);
    }
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3)); geometry.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3)); geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3)); return geometry;
}
const wheelGeometry = bake([
  [tyre, 0x22262d, 0, 0, 0, .216, 1, 1], [tyre, 0xb5bcba, 0, 0, 0, .232, .68, .68],
  [cube, 0x4b535a, 0, 0, 0, .239, .16, .53], [cube, 0x4b535a, 0, 0, 0, .239, .53, .15], [tyre, 0xe6d4b7, 0, 0, 0, .25, .22, .22],
]);
function cabinGeometry(width, length, height) {
  const corners = [[-width / 2, 0, -length / 2], [width / 2, 0, -length / 2], [width / 2, 0, length / 2], [-width / 2, 0, length / 2],
    [-width * .41, height, -length * .32], [width * .41, height, -length * .32], [width * .41, height, length * .36], [-width * .41, height, length * .36]];
  const vertices = [];
  for (const i of [0, 4, 5, 0, 5, 1, 1, 5, 6, 1, 6, 2, 2, 6, 7, 2, 7, 3, 3, 7, 4, 3, 4, 0]) vertices.push(...corners[i]);
  const geometry = new THREE.BufferGeometry(); geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3)); geometry.computeVertexNormals(); return geometry;
}
function plateMaterial() {
  const canvas = document.createElement('canvas'); canvas.width = 128; canvas.height = 48; const pen = canvas.getContext('2d');
  pen.fillStyle = '#fff1cf'; pen.fillRect(0, 0, 128, 48); pen.fillStyle = '#25525d'; pen.textAlign = 'center';
  pen.font = 'bold 11px monospace'; pen.fillText('SUNBURN', 64, 12); pen.font = 'bold 25px monospace'; pen.fillText('PAL 097', 64, 39);
  const map = new THREE.CanvasTexture(canvas); map.colorSpace = THREE.SRGBColorSpace; return new THREE.MeshBasicMaterial({ map });
}
const platePaint = plateMaterial(), plateGeometry = new THREE.PlaneGeometry(.29, .111);
function bodywork(root, spec, color) {
  const { width: w, length: l, sill: h, roof, offset, type } = spec, cabin = l * spec.cabin, trim = 0x303642, silver = 0xc1c9c6;
  const parts = [], steeringWheels = [], rollers = [], wheelbase = l * .61, radius = type === 'pickup' || type === 'van' ? .37 : .32;
  const part = (tint, x, y, z, width, height, depth) => parts.push([cube, tint, x, y, z, width, height, depth]);
  part(color, 0, (h + .44) / 2, 0, w, h - .44, l * .96); part(color, 0, h - .022, -l * .34, w * .93, .13, l * .25);
  part(trim, 0, .43, 0, w * .79, .26, l * .87); part(color, 0, roof - .035, offset + cabin * .02, w * .77, .084, cabin * .69);
  for (const side of sides) part(trim, side * .34, h - .25, offset + .25, .35, .39, .22);
  if (type === 'pickup') { for (const side of sides) part(color, side * w * .44, h + .06, l * .3, .14, .19, l * .33); part(trim, 0, h + .018, l * .3, w * .75, .033, l * .3); }
  if (type === 'sports') part(trim, 0, h + .08, l * .42, w * .93, .07, .25);
  if (type === 'van') part(color, 0, (roof + h) / 2, l * .28, w * .89, roof - h - .07, l * .32);
  for (const side of sides) {
    part(trim, side * w * .495, h - .22, 0, .04, .066, l * .83); part(silver, side * w * .505, h - .065, offset + .22, .026, .043, .16);
    part(color, side * w * .48, h + .13, offset - cabin * .31, .24, .11, .19); part(trim, side * w * .455, h + .12, offset - cabin * .22, .19, .095, .052);
    part(trim, side * w * .436, h + (roof - h) * .48, offset + cabin * .07, .088, (roof - h) * .96, .09);
    part(0xffefbe, side * w * .345, h - .11, -l * .478, w * .237, .135, .081); part(0xef435b, side * w * .365, h - .12, l * .478, w * .22, .13, .081);
    part(0xffaa58, side * w * .493, h - .13, -l * .43, .037, .078, .14);
    for (const axle of sides) {
      const pivot = new THREE.Group(), roller = new THREE.Mesh(wheelGeometry, wheelPaint);
      pivot.position.set(side * w * .44, radius, axle * wheelbase / 2); roller.scale.set(1, radius, radius); pivot.add(roller); root.add(pivot); rollers.push(roller);
      if (axle < 0) steeringWheels.push(pivot);
    }
  }
  part(trim, 0, h - .13, -l * .481, w * .46, .123, .068); part(silver, 0, h - .112, -l * .505, w * .44, .025, .018);
  for (const end of sides) part(trim, 0, h - .32, end * l * .48, w * .98, .14, .17);
  const shell = new THREE.Mesh(bake(parts), shellPaint); shell.castShadow = shell.receiveShadow = true;
  const glass = new THREE.Mesh(cabinGeometry(w * .93, cabin, roof - h - .043), glassPaint); glass.position.set(0, h, offset);
  const plate = new THREE.Mesh(plateGeometry, platePaint); plate.position.set(0, h - .16, l * .492); root.add(shell, glass, plate);
  let lightbar = null;
  if (type === 'police') {
    lightbar = new THREE.Mesh(new THREE.BoxGeometry(.72, .11, .24), new THREE.MeshBasicMaterial({ color: 0xff5b71 })); lightbar.position.set(0, roof + .11, offset);
    const stripe = new THREE.Mesh(new THREE.BoxGeometry(w * .9, .035, .08), new THREE.MeshBasicMaterial({ color: 0xe9e2ce })); stripe.position.set(0, h + .02, -.12); root.add(lightbar, stripe);
  }
  return { steeringWheels, rollers, lightbar, radius, wheelbase, cabin };
}
export function createVehicle(scene, spec, color) {
  const root = new THREE.Group(), model = bodywork(root, spec, color); scene.add(root);
  const car = { root, spec, position: root.position, heading: 0, speed: 0, steering: 0, gear: 'N', health: 100,
    driver: null, handbrake: false, throttle: false, skid: 0, active: false, destroyed: false,
    footprint: {}, seat: new THREE.Vector3(), velocity: new THREE.Vector2(), ambient: false, braked: false, impact: null };
  const candidate = {}; let roll = 0, cooldown = 0, flash = 0;
  function sync() {
    root.visible = car.active; root.rotation.y = -car.heading;
    const { x, y, z } = car.position, c = Math.cos(car.heading), s = Math.sin(car.heading), seatZ = spec.offset - model.cabin * .12;
    setFootprint(car.footprint, x, z, car.heading, spec.width, spec.length); car.seat.set(x - .33 * c - seatZ * s, y + spec.sill - .1, z - .33 * s + seatZ * c);
  }
  function animate(dt) {
    roll = (roll - car.speed * dt / model.radius) % (Math.PI * 2);
    for (let i = 0; i < model.steeringWheels.length; i++) model.steeringWheels[i].rotation.y = -car.steering;
    for (let i = 0; i < model.rollers.length; i++) model.rollers[i].rotation.x = roll;
    car.gear = car.speed < -.23 ? 'R' : car.speed < .23 ? 'N' : Math.min(5, 1 + Math.floor(car.speed / 8));
    if (model.lightbar) { flash = (flash + dt) % .44; model.lightbar.material.color.setHex(flash > .22 ? 0x4b8cff : 0xff5667); }
    sync();
  }
  car.animate = animate;
  car.place = (x, y, z, heading) => {
    car.position.set(x, y, z); car.heading = heading; car.velocity.set(0, 0); car.speed = car.steering = car.skid = roll = cooldown = flash = 0;
    car.handbrake = car.throttle = car.braked = car.destroyed = false; car.health = 100; car.impact = null; animate(0);
  };
  car.enter = driver => { const previous = car.driver; car.driver = driver; return previous; };
  car.exit = () => { car.driver = null; car.speed = car.steering = car.skid = 0; car.velocity.set(0, 0); car.throttle = car.handbrake = false; animate(0); };
  car.destroy = () => { car.destroyed = true; car.active = false; car.exit(); };
  car.doorDistance = (x, z) => { const dx = x - car.position.x, dz = z - car.position.z, { c, s } = car.footprint; return Math.hypot(Math.abs(dx * c + dz * s) - spec.width * .49, -dx * s + dz * c - spec.offset); };
  car.drive = (dt, controls, physics) => {
    const p = car.position, v = car.velocity; car.throttle = controls.throttle; car.handbrake = controls.handbrake; car.braked = controls.brake;
    let speed = car.speed;
    if (controls.throttle) speed = speed < -.18 ? Math.min(0, speed + D.brake * dt) : speed + D.acceleration * dt;
    if (controls.brake) speed = speed > .18 ? Math.max(0, speed - D.brake * dt) : speed - D.reverse * dt;
    const resistance = D.drag + (controls.throttle || controls.brake ? 0 : D.friction) + (car.handbrake ? D.handbrake : 0);
    speed = Math.sign(speed) * Math.max(0, Math.abs(speed) - resistance * dt); car.speed = THREE.MathUtils.clamp(speed, -9, spec.top * (.5 + .5 * car.health / 100));
    car.steering += (controls.steer * D.steer / (1 + Math.abs(car.speed) * .068) - car.steering) * (1 - Math.exp(-dt * 11));
    const heading = car.heading + car.speed * Math.tan(car.steering) * dt / model.wheelbase * (car.handbrake ? 1.85 : 1), s = Math.sin(heading), c = Math.cos(heading);
    const slip = (v.x * c + v.y * s) * Math.exp(-dt * (car.handbrake ? D.driftGrip : D.grip)); v.set(s * car.speed + c * slip, -c * car.speed + s * slip);
    car.skid = car.handbrake ? Math.min(1, (Math.abs(slip) + Math.abs(car.speed) * Math.abs(car.steering)) * .18) : 0;
    setFootprint(candidate, p.x + v.x * dt, p.z + v.y * dt, heading, spec.width, spec.length);
    const ground = physics.vehicleGround(candidate, p.y), blocked = !Number.isFinite(ground) || physics.staticVehicleBlocked(candidate, ground, spec.roof), other = blocked ? null : physics.vehicleContact(candidate, car);
    cooldown = Math.max(0, cooldown - dt);
    if (blocked || other) {
      const force = Math.abs(car.speed) + Math.abs(slip) * .45;
      if (force > D.impact && !cooldown) {
        cooldown = .29; car.impact = other ?? wallImpact; car.health = Math.max(0, car.health - Math.round(force * 1.4));
        if (other) { other.health = Math.max(0, other.health - Math.round(force * .72)); other.speed *= .32; }
      }
      car.speed *= -.2; v.multiplyScalar(-.12);
    } else { p.set(candidate.x, p.y + (ground - p.y) * Math.min(1, dt * 19), candidate.z); car.heading = heading; }
    animate(dt);
  };
  sync(); return car;
}
