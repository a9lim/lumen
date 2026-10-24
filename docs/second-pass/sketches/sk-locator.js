/* ---------- where the cut is: a locator for each specimen ----------
   A small line drawing of the cell or organelle the cross-section is cut from,
   with the cut boxed, as a map carries a locator. Hairlines in graphite; the
   membrane the section shows takes its specimen's ink. */
function capsule(c, x, y, w, h) { if (w <= 0 || h <= 0) { c.beginPath(); return; } const r = h / 2; c.beginPath(); c.moveTo(x + r, y); c.lineTo(x + w - r, y); c.arc(x + w - r, y + r, r, -Math.PI / 2, Math.PI / 2); c.lineTo(x + r, y + h); c.arc(x + r, y + r, r, Math.PI / 2, 3 * Math.PI / 2); c.closePath(); }
function lens(c, cx, cy, rx, ry) { c.beginPath(); c.moveTo(cx - rx, cy); c.bezierCurveTo(cx - rx * 0.7, cy - ry * 1.32, cx + rx * 0.7, cy - ry * 1.32, cx + rx, cy); c.bezierCurveTo(cx + rx * 0.7, cy + ry * 1.32, cx - rx * 0.7, cy + ry * 1.32, cx - rx, cy); c.closePath(); }
function cutBox(c, x, y, w, h, label, lx, ly, fs) {
  c.save();
  c.strokeStyle = tok.text; c.lineWidth = 1; c.setLineDash([2.5, 2]); c.strokeRect(Math.round(x) + 0.5, Math.round(y) + 0.5, Math.round(w), Math.round(h)); c.setLineDash([]);
  if (label) {
    c.strokeStyle = rgba(tok.text, 0.45); c.beginPath(); c.moveTo(x + w, y + h / 2); c.lineTo(lx - 3, ly); c.stroke();
    c.font = `600 ${fs}px ${FONT}`; c.fillStyle = tok.text; c.textAlign = 'left'; c.textBaseline = 'middle'; c.fillText(label, lx, ly);
  }
  c.restore();
}
/** Draw the locator for a specimen into the box (x, y, w, h). */
function drawLocator(c, x, y, w, h, spec, fs = 12, opts = {}) {
  const line = tok.text2, faint = rgba(tok.text, 0.32), hw = 1;
  c.save(); c.lineJoin = 'round'; c.lineCap = 'round';
  const capH = fs + 4, H = h - capH, cx = x + w / 2, cy = y + H / 2;
  const lab = opts.label ?? 'a';
  if (spec === 'thylakoid') {
    // a rod-shaped cyanobacterium: envelope, concentric thylakoids, carboxysomes
    const cw = w * 0.8, ch = Math.min(H * 0.86, cw * 0.46), x0 = cx - cw / 2, y0 = cy - ch / 2;
    capsule(c, x0, y0, cw, ch); c.strokeStyle = line; c.lineWidth = 1.3; c.stroke();
    capsule(c, x0 + 2.5, y0 + 2.5, cw - 5, ch - 5); c.lineWidth = 0.8; c.strokeStyle = faint; c.stroke();
    const th = mix(ink('sap'), tok.canvas, 0.1);
    for (let k = 0; k < 3; k++) {
      const d = 6 + k * 5;
      capsule(c, x0 + d, y0 + d, cw - 2 * d, ch - 2 * d); c.strokeStyle = th; c.lineWidth = 2.6; c.stroke();
      capsule(c, x0 + d, y0 + d, cw - 2 * d, ch - 2 * d); c.strokeStyle = tok.canvas; c.lineWidth = 1; c.stroke();
    }
    c.strokeStyle = mix(ink('umber'), tok.canvas, 0.2); c.lineWidth = 0.9;
    for (const [dx, r] of [[-0.12, 4.2], [0.1, 3.6]]) { c.beginPath(); hexPath(c, cx + dx * cw, cy, r, 0); c.stroke(); }
    cutBox(c, x0 + cw - ch * 0.62 - 3, y0 + ch - 19, 13, 13, lab, x + w - 8, y0 + ch + 4, fs);
  } else if (spec === 'chloroplast') {
    const rx = w * 0.42, ry = Math.min(H * 0.38, rx * 0.5);
    lens(c, cx, cy, rx, ry); c.strokeStyle = line; c.lineWidth = 1.3; c.stroke();
    lens(c, cx, cy, rx - 3, ry - 2.4); c.strokeStyle = faint; c.lineWidth = 0.8; c.stroke();
    const g = mix(ink('viridian'), tok.canvas, 0.1), stacks = [-0.62, -0.31, 0, 0.31, 0.6], gw = rx * 0.2;
    c.strokeStyle = mix(ink('sap'), tok.canvas, 0.25); c.lineWidth = 0.9;
    for (let i = 0; i < stacks.length - 1; i++) { const a = cx + stacks[i] * rx, b = cx + stacks[i + 1] * rx; c.beginPath(); c.moveTo(a + gw / 2, cy - 2 + (i % 2 ? 3 : -3)); c.lineTo(b - gw / 2, cy - 2 + (i % 2 ? -3 : 3)); c.stroke(); }
    stacks.forEach((sx, i) => {
      const n = [4, 6, 7, 6, 4][i], gx = cx + sx * rx;
      for (let k = 0; k < n; k++) { const gy = cy - (n * 2.6) / 2 + k * 2.6; c.beginPath(); c.roundRect(gx - gw / 2, gy, gw, 1.7, 0.85); c.fillStyle = g; c.fill(); }
    });
    cutBox(c, cx + 0.31 * rx - gw / 2 - 4, cy - 7, 10, 12, lab, x + w - 8, cy + ry + 2, fs);
  } else if (spec === 'cristae') {
    const cw = w * 0.8, ch = Math.min(H * 0.8, cw * 0.48), x0 = cx - cw / 2, y0 = cy - ch / 2;
    capsule(c, x0, y0, cw, ch); c.strokeStyle = line; c.lineWidth = 1.3; c.stroke();
    capsule(c, x0 + 3, y0 + 3, cw - 6, ch - 6); c.strokeStyle = mix(ink('mulberry'), tok.canvas, 0.15); c.lineWidth = 1; c.stroke();
    const n = 7, cr = mix(ink('mulberry'), tok.canvas, 0.15);
    for (let k = 0; k < n; k++) {
      const fx = x0 + cw * (0.16 + 0.68 * k / (n - 1)), top = k % 2 === 0, len = ch * (0.52 + 0.1 * Math.sin(k * 2.1));
      const y1 = top ? y0 + 3 : y0 + ch - 3, y2 = top ? y1 + len : y1 - len;
      c.beginPath(); c.moveTo(fx - 2, y1); c.lineTo(fx - 2, y2 + (top ? -2 : 2)); c.arc(fx, y2 + (top ? -2 : 2), 2, Math.PI, 0, !top); c.lineTo(fx + 2, y1);
      c.strokeStyle = cr; c.lineWidth = 1; c.stroke();
    }
    const kx = x0 + cw * (0.16 + 0.68 * 2 / (n - 1)), klen = ch * (0.52 + 0.1 * Math.sin(2 * 2.1));
    cutBox(c, kx - 8, y0 + 3 + klen - 12, 16, 15, lab, x + w - 8, y0 + ch + 4, fs);
  } else if (spec === 'plasma') {
    const cw = w * 0.8, ch = Math.min(H * 0.6, cw * 0.32), x0 = cx - cw / 2, y0 = cy - ch / 2;
    capsule(c, x0 - 3, y0 - 3, cw + 6, ch + 6); c.strokeStyle = mix(ink('umber'), tok.canvas, 0.3); c.lineWidth = 5; c.stroke();
    capsule(c, x0 + 1, y0 + 1, cw - 2, ch - 2); c.strokeStyle = line; c.lineWidth = 1.2; c.stroke();
    c.fillStyle = faint; for (let k = 0; k < 9; k++) { c.beginPath(); c.arc(x0 + cw * (0.2 + 0.07 * k), cy + Math.sin(k * 1.9) * ch * 0.18, 1.1, 0, TAU); c.fill(); }
    cutBox(c, x0 + cw * 0.55, y0 - 8, 14, 14, lab, x + w - 8, y0 + ch + 6, fs);
  } else if (spec === 'purple') {
    const cw = w * 0.84, ch = Math.min(H * 0.5, cw * 0.22), x0 = cx - cw / 2, y0 = cy - ch / 2;
    capsule(c, x0 - 2.5, y0 - 2.5, cw + 5, ch + 5); c.strokeStyle = faint; c.setLineDash([1, 2]); c.lineWidth = 1.2; c.stroke(); c.setLineDash([]);
    capsule(c, x0, y0, cw, ch); c.strokeStyle = line; c.lineWidth = 1.2; c.stroke();
    c.strokeStyle = ink('violet'); c.lineWidth = 3; c.lineCap = 'butt';
    for (const [a, b, top] of [[0.22, 0.36, 1], [0.58, 0.7, 1], [0.4, 0.52, 0], [0.75, 0.85, 0]]) { const yy = top ? y0 : y0 + ch; c.beginPath(); c.moveTo(x0 + cw * a, yy); c.lineTo(x0 + cw * b, yy); c.stroke(); }
    c.strokeStyle = faint; c.lineWidth = 0.8; c.lineCap = 'round';
    for (const fx of [0.3, 0.47, 0.62]) { c.beginPath(); c.ellipse(x0 + cw * fx, cy, 5, 1.8, 0, 0, TAU); c.stroke(); }
    cutBox(c, x0 + cw * 0.58 - 2, y0 - 7, 14, 13, lab, x + w - 8, y0 + ch + 8, fs);
  }
  if (opts.caption !== false) {
    c.font = `italic ${fs - 1}px ${FONT}`; c.fillStyle = tok.muted; c.textAlign = 'center'; c.textBaseline = 'alphabetic';
    c.fillText(opts.caption || 'Where the cut is', cx, y + h - 2);
  }
  c.restore();
}

INITS.push(() => {
  const cv = $('#cv-locator'); if (!cv) return;
  const SPECS = [['thylakoid', 'Cyanobacterium', 'a rod with concentric thylakoids'], ['chloroplast', 'Plant chloroplast', 'grana joined by stroma lamellae'], ['cristae', 'Animal mitochondrion', 'cristae folded from the inner membrane'], ['plasma', 'Obligate anaerobe', 'a thick peptidoglycan wall'], ['purple', 'Halophilic archaeon', 'purple patches in the envelope']];
  const sk = makeSketch(cv, {
    running: false,
    layout() {},
    step() {},
    draw() {
      const c = this.ctx, W = this.w, H = this.h, n = SPECS.length, narrow = W < 640;
      c.fillStyle = tok.canvas; c.fillRect(0, 0, W, H);
      const cols = narrow ? 2 : n, rowsN = Math.ceil(n / cols), cw = W / cols, chh = H / rowsN;
      SPECS.forEach(([k, name, sub], i) => {
        const col = i % cols, row = Math.floor(i / cols), x = col * cw, y = row * chh;
        drawLocator(c, x + 12, y + 14, cw - 24, chh - 52, k, narrow ? 11 : 12.5, { caption: false });
        c.font = `${narrow ? 14 : 15.5}px ${FONT}`; c.fillStyle = tok.text; c.textAlign = 'center'; c.textBaseline = 'alphabetic';
        c.fillText(name, x + cw / 2, y + chh - 24);
        c.font = `italic ${narrow ? 12 : 13}px ${FONT}`; c.fillStyle = tok.muted; c.fillText(sub, x + cw / 2, y + chh - 7);
      });
    },
  });
});
