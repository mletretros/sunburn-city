import * as THREE from 'three';

// Spatial batches let the camera and shadow frusta skip whole parts of the city.
export function createBatches(scene) {
  const paint = new THREE.MeshStandardMaterial({ roughness: .82 });
  const box = new THREE.BoxGeometry();
  const cylinder = new THREE.CylinderGeometry(.5, .5, 1, 8);
  const up = new THREE.Vector3(0, 1, 0), delta = new THREE.Vector3();
  const buckets = new Map(), pose = new THREE.Object3D(), tint = new THREE.Color();
  function put(geometry, material, color, x, y, z, sx, sy, sz, rx = 0, ry = 0, rz = 0, shadow = true) {
    const sector = Math.max(sx, sy, sz) > 120 ? 'wide' : `${Math.floor(x / 116)},${Math.floor(z / 116)}`;
    const key = `${geometry.id}:${material.id}:${shadow}:${sector}`;
    if (!buckets.has(key)) buckets.set(key, { geometry, material, shadow, entries: [] });
    pose.position.set(x, y, z); pose.scale.set(sx, sy, sz);
    if (typeof rx === 'number') pose.rotation.set(rx, ry, rz);
    else pose.quaternion.copy(rx);
    pose.updateMatrix();
    buckets.get(key).entries.push([pose.matrix.clone(), tint.set(color).clone()]);
  }
  return {
    put, paint, boxGeometry: box,
    box: (c, x, y, z, w, h, d, ry = 0, shadow = true) => put(box, paint, c, x, y, z, w, h, d, 0, ry, 0, shadow),
    beam(c, x, y, z, bx, by, bz, width) {
      delta.set(bx - x, by - y, bz - z);
      const length = delta.length();
      const rotation = pose.quaternion.setFromUnitVectors(up, delta.divideScalar(length));
      put(cylinder, paint, c, (x + bx) / 2, (y + by) / 2, (z + bz) / 2, width, length, width, rotation);
    },
    finish() {
      for (const { geometry, material, shadow, entries } of buckets.values()) {
        const mesh = new THREE.InstancedMesh(geometry, material, entries.length);
        entries.forEach(([matrix, color], i) => { mesh.setMatrixAt(i, matrix); mesh.setColorAt(i, color); });
        mesh.castShadow = shadow; mesh.receiveShadow = true;
        mesh.computeBoundingSphere(); scene.add(mesh);
      }
      buckets.clear();
    },
  };
}
