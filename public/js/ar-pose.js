// Estimasi pose 3D kode QR dari 4 sudutnya (homografi → rotasi + translasi).
// Input: sudut [TL, TR, BR, BL] dalam koordinat ternormalisasi kamera
//   xn = (px - cx) / f,  yn = (py - cy) / f   (y ke bawah, konvensi OpenCV)
// Bidang QR: sisi = 1 unit, pusat di (0,0), u ke kanan, v ke bawah.
// Output (koordinat kamera three.js: x kanan, y atas, kamera melihat ke -z):
//   { x: [r1], y: [r2], z: [r3], t: [tx,ty,tz] }  — kolom matriks rotasi + translasi

const PLANE = [[-0.5, -0.5], [0.5, -0.5], [0.5, 0.5], [-0.5, 0.5]];

function solve8(A, b) {
  // eliminasi Gauss dengan pivot parsial
  const n = 8;
  const M = A.map((row, i) => [...row, b[i]]);
  for (let c = 0; c < n; c++) {
    let p = c;
    for (let r = c + 1; r < n; r++) if (Math.abs(M[r][c]) > Math.abs(M[p][c])) p = r;
    if (Math.abs(M[p][c]) < 1e-12) return null;
    [M[c], M[p]] = [M[p], M[c]];
    for (let r = 0; r < n; r++) {
      if (r === c) continue;
      const f = M[r][c] / M[c][c];
      for (let k = c; k <= n; k++) M[r][k] -= f * M[c][k];
    }
  }
  return M.map((row, i) => row[n] / row[i]);
}

export function homography(img) {
  const A = [], b = [];
  for (let i = 0; i < 4; i++) {
    const [u, v] = PLANE[i], [x, y] = img[i];
    A.push([u, v, 1, 0, 0, 0, -u * x, -v * x]); b.push(x);
    A.push([0, 0, 0, u, v, 1, -u * y, -v * y]); b.push(y);
  }
  const h = solve8(A, b);
  if (!h) return null;
  return [[h[0], h[1], h[2]], [h[3], h[4], h[5]], [h[6], h[7], 1]];
}

const len = (a) => Math.hypot(a[0], a[1], a[2]);
const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const scale = (a, s) => [a[0] * s, a[1] * s, a[2] * s];
const sub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];

export function solvePose(img) {
  const H = homography(img);
  if (!H) return null;
  const c1 = [H[0][0], H[1][0], H[2][0]];
  const c2 = [H[0][1], H[1][1], H[2][1]];
  const c3 = [H[0][2], H[1][2], H[2][2]];
  let lambda = 2 / (len(c1) + len(c2));
  let t = scale(c3, lambda);
  if (t[2] < 0) { lambda = -lambda; t = scale(c3, lambda); }
  let r1 = scale(c1, lambda), r2 = scale(c2, lambda);
  // ortonormalisasi (Gram–Schmidt)
  r1 = scale(r1, 1 / len(r1));
  r2 = sub(r2, scale(r1, dot(r1, r2)));
  r2 = scale(r2, 1 / len(r2));
  const r3 = cross(r1, r2);
  // OpenCV (y bawah, z depan) → three.js (y atas, z belakang): kalikan diag(1,-1,-1)
  const C = (a) => [a[0], -a[1], -a[2]];
  return { x: C(r1), y: C(r2), z: C(r3), t: C(t) };
}
