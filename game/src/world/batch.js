import * as T from 'three';
export function createBatches(scene) {
  const paint = new T.MeshStandardMaterial({ roughness: .88 }), boxGeometry = new T.BoxGeometry(1, 1, 1);
  const entries = new Map(), transform = new T.Object3D(), up = new T.Vector3(0, 1, 0), axis = new T.Vector3(), rotation = new T.Quaternion();
  const cylinder = new T.CylinderGeometry(.5, .5, 1, 7);
  function put(geometry, material, tint, x, y, z, w, h, d, rx = 0, ry = 0, rz = 0, casts = true) {
    const bucket = geometry.uuid + material.uuid + casts;
    if (!entries.has(bucket)) entries.set(bucket, { geometry, material, casts, poses: [], shades: [] });
    transform.position.set(x, y, z); transform.scale.set(w, h, d);
    if (typeof rx === 'number') transform.rotation.set(rx, ry, rz); else transform.quaternion.copy(rx);
    transform.updateMatrix();
    const group = entries.get(bucket); group.poses.push(transform.matrix.clone()); group.shades.push(new T.Color(tint));
  }
  return { paint, boxGeometry, put,
    box(tint, x, y, z, w, h, d, yaw = 0, casts = true) { put(boxGeometry, paint, tint, x, y, z, w, h, d, 0, yaw, 0, casts); },
    beam(tint, ax, ay, az, bx, by, bz, width) {
      axis.set(bx - ax, by - ay, bz - az); const length = axis.length();
      if (!length) return; rotation.setFromUnitVectors(up, axis.divideScalar(length));
      put(cylinder, paint, tint, (ax + bx) * .5, (ay + by) * .5, (az + bz) * .5, width, length, width, rotation);
    },
    finish() {
      entries.forEach(pack => {
        const mesh = new T.InstancedMesh(pack.geometry, pack.material, pack.poses.length);
        pack.poses.forEach((matrix, n) => { mesh.setMatrixAt(n, matrix); mesh.setColorAt(n, pack.shades[n]); });
        mesh.castShadow = pack.casts; mesh.receiveShadow = true; mesh.computeBoundingSphere(); scene.add(mesh);
      }); entries.clear();
    },
  };
}
