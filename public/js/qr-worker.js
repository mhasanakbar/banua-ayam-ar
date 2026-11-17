// Web Worker: deteksi QR (jsQR) di luar thread utama supaya kamera tetap mulus.
importScripts('../vendor/jsQR.js');

self.onmessage = (e) => {
  const { id, width, height, buffer } = e.data;
  const data = new Uint8ClampedArray(buffer);
  let res = null;
  try {
    const r = self.jsQR(data, width, height, { inversionAttempts: 'dontInvert' });
    if (r) {
      const L = r.location;
      res = {
        text: r.data,
        corners: [L.topLeftCorner, L.topRightCorner, L.bottomRightCorner, L.bottomLeftCorner].map((p) => [p.x, p.y]),
      };
    }
  } catch (err) { /* abaikan frame rusak */ }
  self.postMessage({ id, res, buffer }, [buffer]);
};
