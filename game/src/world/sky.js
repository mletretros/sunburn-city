import * as T from 'three';
export function buildSky(scene) {
  scene.background = new T.Color(0xd7c7b2); scene.fog = new T.Fog(0xd7c7b2, 140, 720);
  const hemisphere = new T.HemisphereLight(0xc0e4ef, 0xc09484, 2.2); scene.add(hemisphere);
  const sun = new T.DirectionalLight(0xffd2a1, 3.1); sun.position.set(-90, 140, 70); scene.add(sun, sun.target);
  sun.shadow.mapSize.set(2048, 2048); sun.shadow.camera.left = sun.shadow.camera.bottom = -85; sun.shadow.camera.right = sun.shadow.camera.top = 85; sun.shadow.camera.far = 400; sun.shadow.bias = -.001;
  const disc = new T.Mesh(new T.SphereGeometry(17, 20, 12), new T.MeshBasicMaterial({ color: 0xffe0a8 })); disc.position.set(-310, 85, -350); scene.add(disc);
  let hour = 17;
  return { sun, quality(enabled) { sun.castShadow = enabled; },
    setTime(value) { hour = value; const dusk = value >= 19; scene.background.setHex(dusk ? 0x766583 : 0xd7c7b2); scene.fog.color.copy(scene.background); sun.intensity = dusk ? 1.2 : 3.1; },
    update(camera, focus) { sun.position.set(focus.x - 90, 140, focus.z + 70); sun.target.position.set(focus.x, 0, focus.z); },
    get time() { return hour; },
  };
}
