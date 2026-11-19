import * as THREE from 'three';
import { DRIVE as D } from '../config.js';
import { setFootprint } from '../systems/physics.js';

// All silhouettes face local -Z. Dimensions are metres; speed is metres/second.
export const VEHICLES = [
  { name: 'Aster 90', type: 'compact', width: 1.76, length: 3.65, sill: .80, roof: 1.46, cabin: .59, offset: .09, top: 31 },
  { name: 'Bayshore LX', type: 'sedan', width: 1.90, length: 4.55, sill: .86, roof: 1.48, cabin: .49, offset: .02, top: 36 },
  { name: 'Mesa V8', type: 'muscle', width: 1.97, length: 4.64, sill: .86, roof: 1.34, cabin: .45, offset: .27, top: 39 },
  { name: 'Parcel 200', type: 'van', width: 2.03, length: 4.80, sill: 1.02, roof: 2.04, cabin: .78, offset: .10, top: 26 },
  { name: 'Dunework', type: 'pickup', width: 2.02, length: 4.90, sill: 1.00, roof: 1.77, cabin: .40, offset: -.46, top: 33 },
  { name: 'Sirocco RS', type: 'sports', width: 1.95, length: 4.25, sill: .73, roof: 1.18, cabin: .43, offset: .09, top: 45 },
];
export const CAR_PAINT = [0x38bba8, 0xd94456, 0xd9a048, 0x777ab0, 0x5a8cab, 0xe5cfc0, 0x4e6170, 0xeb8067];
const box = new THREE.BoxGeometry(), tire = new THREE.CylinderGeometry(1, 1, 1, 12).rotateZ(Math.PI / 2);
const glass = new THREE.MeshStandardMaterial({ color: 0x406875, metalness: .31, roughness: .25,
  transparent: true, opacity: .65, depthWrite: false });
const shellMat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: .48, metalness: .13 });
const wheelMat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: .76 });
const plateCanvas = document.createElement('canvas');
plateCanvas.width = 128; plateCanvas.height = 48;
const plateInk = plateCanvas.getContext('2d');
plateInk.fillStyle = '#fff1cf'; plateInk.fillRect(0, 0, 128, 48);
plateInk.fillStyle = '#25525d'; plateInk.textAlign = 'center'; plateInk.font = 'bold 11px monospace';
plateInk.fillText('SUNBURN', 64, 12); plateInk.font = 'bold 25px monospace'; plateInk.fillText('PAL 097', 64, 39);
const plateMap = new THREE.CanvasTexture(plateCanvas); plateMap.colorSpace = THREE.SRGBColorSpace;
const plateMat = new THREE.MeshBasicMaterial({ map: plateMap });
const plateGeo = new THREE.PlaneGeometry(.29, .111);
const wallImpact = { police: false };

// Bake trim, lamps and sheet metal into one colored mesh; moving wheels remain separate.
function bakeParts(parts) {
  const vertices = [], normals = [], colors = [], color = new THREE.Color();
  for (const [source, tint, x, y, z, w, h, l] of parts) {
    const p = source.attributes.position, n = source.attributes.normal, idx = source.index;
    color.set(tint);
    for (let i = 0; i < idx.count; i++) {
      const j = idx.getX(i), nx = n.getX(j) / w, ny = n.getY(j) / h, nz = n.getZ(j) / l;
      const inv = 1 / Math.hypot(nx, ny, nz);
      vertices.push(x + w * p.getX(j), y + h * p.getY(j), z + l * p.getZ(j));
      normals.push(nx * inv, ny * inv, nz * inv); colors.push(color.r, color.g, color.b);
    }
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
  geo.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3));
  geo.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
  return geo;
}

const wheelGeometry = bakeParts([
  [tire, 0x22262d, 0, 0, 0, .216, 1, 1],
  [tire, 0xb5bcba, 0, 0, 0, .232, .68, .68],
  [box, 0x4b535a, 0, 0, 0, .239, .16, .53],
  [box, 0x4b535a, 0, 0, 0, .239, .53, .15],
  [tire, 0xe6d4b7, 0, 0, 0, .25, .22, .22],
]);

function makeCabin(width, length, height) {
  const corners = [
    [-width / 2, 0, -length / 2], [width / 2, 0, -length / 2], [width / 2, 0, length / 2], [-width / 2, 0, length / 2],
    [-width * .41, height, -length * .32], [width * .41, height, -length * .32],
    [width * .41, height, length * .36], [-width * .41, height, length * .36],
  ];
  const vertices = [];
  for (const i of [0,4,5, 0,5,1, 1,5,6, 1,6,2, 2,6,7, 2,7,3, 3,7,4, 3,4,0]) vertices.push(...corners[i]);
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3)); g.computeVertexNormals();
  return g;
}

export function createVehicle(scene, spec, color) {
  const root = new THREE.Group(), wheels = [], rollers = [];
  const { width: w, length: l, sill: h, roof, offset } = spec, cabin = l * spec.cabin;
  const trim = 0x303642, silver = 0xc1c9c6, wheelbase = l * .61;
  const radius = spec.type === 'pickup' || spec.type === 'van' ? .37 : .32;
  const parts = [];
  const part = (tint, x, y, z, width, height, depth) => parts.push([box, tint, x, y, z, width, height, depth]);
  part(color, 0, (h + .44) / 2, 0, w, h - .44, l * .96);
  part(color, 0, h - .022, -l * .34, w * .93, .13, l * .25);
  part(trim, 0, .43, 0, w * .79, .26, l * .87);
  part(color, 0, roof - .035, offset + cabin * .02, w * .77, .084, cabin * .69);
  part(trim, -.34, h - .25, offset + .25, .35, .39, .22);
  part(trim, .34, h - .25, offset + .25, .35, .39, .22);
  if (spec.type === 'pickup') {
    for (const side of [-1, 1]) part(color, side * w * .44, h + .06, l * .30, .14, .19, l * .33);
    part(trim, 0, h + .018, l * .30, w * .75, .033, l * .30);
  }
  if (spec.type === 'sports') part(trim, 0, h + .08, l * .42, w * .93, .07, .25);
  if (spec.type === 'van') part(color, 0, (roof + h) / 2, l * .28, w * .89, roof - h - .07, l * .32);
  for (const side of [-1, 1]) {
    part(trim, side * w * .495, h - .22, 0, .04, .066, l * .83);
    part(silver, side * w * .505, h - .065, offset + .22, .026, .043, .16);
    part(color, side * w * .48, h + .13, offset - cabin * .31, .24, .11, .19);
    part(trim, side * w * .455, h + .12, offset - cabin * .22, .19, .095, .052);
    part(trim, side * w * .436, h + (roof - h) * .48, offset + cabin * .07, .088, (roof - h) * .96, .09);
    part(0xffefbe, side * w * .345, h - .11, -l * .478, w * .237, .135, .081);
    part(0xef435b, side * w * .365, h - .12, l * .478, w * .22, .13, .081);
    part(0xffaa58, side * w * .493, h - .13, -l * .43, .037, .078, .14);
    for (const axle of [-1, 1]) {
      const swivel = new THREE.Group(); swivel.position.set(side * w * .44, radius, axle * wheelbase / 2);
      const mesh = new THREE.Mesh(wheelGeometry, wheelMat);
      mesh.scale.set(1, radius, radius); swivel.add(mesh); root.add(swivel);
      rollers.push(mesh); if (axle === -1) wheels.push(swivel);
    }
  }
  part(trim, 0, h - .13, -l * .481, w * .46, .123, .068);
  part(silver, 0, h - .112, -l * .505, w * .44, .025, .018);
  for (const side of [-1, 1]) part(trim, 0, h - .32, side * l * .48, w * .98, .14, .17);
  const shell = new THREE.Mesh(bakeParts(parts), shellMat);
  shell.castShadow = true; shell.receiveShadow = true; root.add(shell);
  const windows = new THREE.Mesh(makeCabin(w * .93, cabin, roof - h - .043), glass);
  windows.position.set(0, h, offset); root.add(windows);
  const plate = new THREE.Mesh(plateGeo, plateMat);
  plate.position.set(0, h - .16, l * .492); root.add(plate);
  let lightbar = null, lightsClock = 0;
  if (spec.type === 'police') {
    lightbar = new THREE.Mesh(new THREE.BoxGeometry(.72, .11, .24), new THREE.MeshBasicMaterial({ color: 0xff5b71 }));
    lightbar.position.set(0, roof + .11, offset); root.add(lightbar);
    const stripe = new THREE.Mesh(new THREE.BoxGeometry(w * .9, .035, .08), new THREE.MeshBasicMaterial({ color: 0xe9e2ce }));
    stripe.position.set(0, h + .02, -.12); root.add(stripe);
  }
  scene.add(root);

  const car = { root, spec, position: root.position, heading: 0, speed: 0, steering: 0, gear: 'N',
    health: 100, driver: null, handbrake: false, throttle: false, skid: 0, active: false, destroyed: false,
    footprint: {}, seat: new THREE.Vector3(), velocity: new THREE.Vector2(), ambient: false, braked: false };
  const candidate = {};
  let roll = 0, impactCooldown = 0;
  function sync() {
    root.visible = car.active; root.rotation.y = -car.heading;
    const { x, y, z } = car.position, s = Math.sin(car.heading), c = Math.cos(car.heading);
    setFootprint(car.footprint, x, z, car.heading, w, l);
    car.seat.set(x - .33 * c - (offset - cabin * .12) * s, y + h - .10,
      z - .33 * s + (offset - cabin * .12) * c);
  }
  function animate(dt) {
    roll = (roll - car.speed * dt / radius) % (Math.PI * 2);
    for (const wheel of wheels) wheel.rotation.y = -car.steering;
    for (const wheel of rollers) wheel.rotation.x = roll;
    car.gear = car.speed < -.23 ? 'R' : car.speed < .23 ? 'N' : Math.min(5, 1 + Math.floor(car.speed / 8));
    if (lightbar) { lightsClock = (lightsClock + dt) % .44; lightbar.material.color.set(lightsClock > .22 ? 0x4b8cff : 0xff5667); }
    sync();
  }
  car.place = (x, y, z, heading) => {
    car.position.set(x, y, z); car.heading = heading; car.velocity.set(0, 0);
    car.speed = car.steering = car.skid = roll = impactCooldown = lightsClock = 0;
    car.handbrake = car.throttle = car.braked = false; car.health = 100; car.destroyed = false; car.impact = null; animate(0);
  };
  car.animate = animate;
  car.enter = driver => { const previous = car.driver; car.driver = driver; return previous; };
  car.exit = () => { car.driver = null; car.speed = 0; car.velocity.set(0, 0); car.steering = 0; car.skid = 0; car.throttle = car.handbrake = false; animate(0); };
  car.destroy = () => { car.destroyed = true; car.active = false; car.driver = null; car.speed = 0; animate(0); };
  car.doorDistance = (x, z) => {
    const dx = x - car.position.x, dz = z - car.position.z;
    const { c, s } = car.footprint;
    return Math.hypot(Math.abs(dx * c + dz * s) - w * .49, -dx * s + dz * c - offset);
  };
  car.drive = (dt, controls, physics) => {
    const p = car.position, v = car.velocity, speed = car.speed;
    car.throttle = controls.throttle; car.handbrake = controls.handbrake;
    car.braked = controls.brake;
    let next = speed;
    if (controls.throttle) next = speed < -.18 ? Math.min(0, next + D.brake * dt) : next + D.acceleration * dt;
    if (controls.brake) next = speed > .18 ? Math.max(0, next - D.brake * dt) : next - D.reverse * dt;
    const drag = D.drag + (controls.throttle || controls.brake ? 0 : D.friction) + (car.handbrake ? D.handbrake : 0);
    next = Math.sign(next) * Math.max(0, Math.abs(next) - drag * dt);
    const maxSpeed = spec.top * (.5 + .5 * car.health / 100);
    car.speed = THREE.MathUtils.clamp(next, -9, maxSpeed);
    const steer = controls.steer * D.steer / (1 + Math.abs(car.speed) * .068);
    car.steering += (steer - car.steering) * (1 - Math.exp(-dt * 11));
    const heading = car.heading + car.speed * Math.tan(car.steering) * dt / wheelbase * (car.handbrake ? 1.85 : 1);
    const s = Math.sin(heading), c = Math.cos(heading);
    const lateral = v.x * c + v.y * s;
    const slip = lateral * Math.exp(-dt * (car.handbrake ? D.driftGrip : D.grip));
    v.set(s * car.speed + c * slip, -c * car.speed + s * slip);
    car.skid = car.handbrake ? Math.min(1, (Math.abs(slip) + Math.abs(car.speed) * Math.abs(car.steering)) * .18) : 0;
    setFootprint(candidate, p.x + v.x * dt, p.z + v.y * dt, heading, w, l);
    const floor = physics.vehicleGround(candidate, p.y);
    const solid = !Number.isFinite(floor) || physics.staticVehicleBlocked(candidate, floor, roof);
    const contact = solid ? null : physics.vehicleContact(candidate, car);
    impactCooldown = Math.max(0, impactCooldown - dt);
    if (solid || contact) {
      const hit = Math.abs(car.speed) + Math.abs(slip) * .45;
      if (hit > D.impact && !impactCooldown) {
        impactCooldown = .29;
        car.impact = contact ?? wallImpact;
        car.health = Math.max(0, car.health - Math.round(hit * 1.4));
        if (contact) { contact.health = Math.max(0, contact.health - Math.round(hit * .72)); contact.speed *= .32; }
      }
      car.speed *= -.20; v.multiplyScalar(-.12);
    } else {
      p.set(candidate.x, p.y + (floor - p.y) * Math.min(1, dt * 19), candidate.z);
      car.heading = heading;
    }
    animate(dt);
  };
  sync();
  return car;
}
