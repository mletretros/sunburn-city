import { BoxGeometry, Color, CylinderGeometry, InstancedMesh, MeshStandardMaterial, Object3D, Quaternion, Vector3 } from 'three';
export function createBatches(scene) {
  const paint = new MeshStandardMaterial({ roughness: .82 });
  const boxGeometry = new BoxGeometry(), cylinder = new CylinderGeometry(.5, .5, 1, 8);
  const groups = new Map(), pose = new Object3D(), rotation = new Quaternion();
  const up = new Vector3(0, 1, 0), direction = new Vector3();
  function put(geometry, material, tint, x, y, z, w, h, d, pitch = 0, yaw = 0, roll = 0, casts = true) {
    const tile = Math.max(w, h, d) > 120 ? 'wide' : `${Math.floor(x / 116)},${Math.floor(z / 116)}`;
    const key = `${geometry.id}/${material.id}/${casts}/${tile}`;
    let group = groups.get(key);
    if (!group) { group = { geometry, material, casts, matrices: [], colors: [] }; groups.set(key, group); }
    pose.position.set(x, y, z); pose.scale.set(w, h, d);
    if (typeof pitch === 'number') pose.rotation.set(pitch, yaw, roll); else pose.quaternion.copy(pitch);
    pose.updateMatrix(); group.matrices.push(pose.matrix.clone()); group.colors.push(new Color(tint));
  }
  const box = (tint, x, y, z, w, h, d, yaw = 0, casts = true) => put(boxGeometry, paint, tint, x, y, z, w, h, d, 0, yaw, 0, casts);
  return {
    paint, boxGeometry, put, box,
    beam(tint, ax, ay, az, bx, by, bz, width) {
      direction.set(bx - ax, by - ay, bz - az); const length = direction.length();
      if (length <= 1e-8) return;
      rotation.setFromUnitVectors(up, direction.multiplyScalar(1 / length));
      put(cylinder, paint, tint, (ax + bx) / 2, (ay + by) / 2, (az + bz) / 2, width, length, width, rotation);
    },
    finish() {
      for (const group of groups.values()) {
        const mesh = new InstancedMesh(group.geometry, group.material, group.matrices.length);
        for (let i = 0; i < group.matrices.length; i++) { mesh.setMatrixAt(i, group.matrices[i]); mesh.setColorAt(i, group.colors[i]); }
        mesh.castShadow = group.casts; mesh.receiveShadow = true; mesh.computeBoundingSphere(); scene.add(mesh);
      }
      groups.clear();
    },
  };
}
