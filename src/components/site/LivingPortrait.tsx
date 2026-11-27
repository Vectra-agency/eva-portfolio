"use client";

import { useEffect, useRef, useState } from "react";

/**
 * The "living portrait": one picture on a soft sheet in WebGL. The skin stretches like dough
 * when grabbed and ripples back; a cursor over it rubs it along; the head leans toward the
 * pointer. Adapted from the studio template, but with a single picture (her own photo, or a
 * monogram when there is none) — expressions are never faked in code.
 */

const OVER = 1.7;
const N = 72;
const M = N + 1;
const SPAN = OVER / N;
const ORIGIN = 0.5 - OVER / 2;
const WOBBLE = 2.3 * 2 * Math.PI;
const REACH = 0.085 / SPAN;
const C = REACH * WOBBLE;
const GAMMA = 2 * 0.14 * WOBBLE;
const NU = 0.2 * C;
const H = 1 / 240; // fixed physics step, whatever the frame rate
const GAP = SPAN * 0.34;
const CORNER = 0.05; // rounded corners for rectangular photos (in texture space)

const VS = `attribute vec2 a, d; attribute float s; varying vec2 vUv; varying float vS;
  uniform vec2 lean; uniform float overS;
  void main(){ vUv = a; vS = s; vec2 p = a + d + lean; gl_Position = vec4(vec2(p.x-.5, .5-p.y)*2./overS, 0., 1.); }`;
const FS = `precision highp float; varying vec2 vUv; varying float vS;
  uniform sampler2D face; uniform float corner;
  void main(){
    if(vUv.x<0.||vUv.y<0.||vUv.x>1.||vUv.y>1.){ gl_FragColor = vec4(0.); return; }
    vec4 c = texture2D(face, vUv);
    vec2 q = abs(vUv - .5) - (.5 - corner);
    float dist = length(max(q, 0.)) + min(max(q.x, q.y), 0.) - corner;
    float m = 1. - smoothstep(-.004, .0, dist);
    if(c.a*m < .004){ gl_FragColor = vec4(0.); return; }
    gl_FragColor = vec4(c.rgb*vS*m, c.a*m);
  }`;

/** A soft disc with initials, used until a photo is uploaded. */
async function monogram(initials: string): Promise<HTMLCanvasElement> {
  try {
    await document.fonts.load('900 300px "Kanit"');
  } catch {}
  const s = 1024;
  const cv = document.createElement("canvas");
  cv.width = cv.height = s;
  const g = cv.getContext("2d")!;
  const grad = g.createLinearGradient(0, 0, 0, s);
  grad.addColorStop(0, "#bbccd7");
  grad.addColorStop(1, "#646973");
  g.fillStyle = grad;
  g.beginPath();
  g.arc(s / 2, s / 2, s * 0.46, 0, Math.PI * 2);
  g.fill();
  const shine = g.createRadialGradient(s * 0.36, s * 0.3, 0, s * 0.36, s * 0.3, s * 0.5);
  shine.addColorStop(0, "rgba(255,255,255,.45)");
  shine.addColorStop(1, "rgba(255,255,255,0)");
  g.fillStyle = shine;
  g.fill();
  g.fillStyle = "#0c0c0c";
  g.font = `900 ${s * 0.34}px Kanit, Montserrat, sans-serif`;
  g.textAlign = "center";
  g.textBaseline = "middle";
  g.fillText(initials, s / 2, s * 0.53);
  return cv;
}

function loadImage(src: string): Promise<HTMLImageElement | null> {
  return new Promise((res) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => res(img);
    img.onerror = () => res(null);
    img.src = src;
  });
}

export function LivingPortrait({ src, initials, alt }: { src: string | null; initials: string; alt: string }) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [ready, setReady] = useState(false);
  const [aspect, setAspect] = useState(src ? 0.75 : 1);

  useEffect(() => {
    const wrap = wrapRef.current!;
    const canvas = canvasRef.current!;
    const gl = canvas.getContext("webgl", { alpha: true, premultipliedAlpha: true, antialias: true });
    if (!gl) return;
    const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
    let disposed = false;
    let raf = 0;

    // The same canvas can be set up again (remounts, back-navigation), so everything created
    // here is deleted on cleanup instead of throwing the whole context away.
    const shaders: WebGLShader[] = [];
    const buffers: WebGLBuffer[] = [];
    const buffer = () => {
      const b = gl.createBuffer()!;
      buffers.push(b);
      return b;
    };
    const compile = (type: number, source: string) => {
      const sh = gl.createShader(type)!;
      gl.shaderSource(sh, source);
      gl.compileShader(sh);
      shaders.push(sh);
      return sh;
    };
    const pr = gl.createProgram()!;
    gl.attachShader(pr, compile(gl.VERTEX_SHADER, VS));
    gl.attachShader(pr, compile(gl.FRAGMENT_SHADER, FS));
    gl.linkProgram(pr);
    gl.useProgram(pr);
    gl.uniform1f(gl.getUniformLocation(pr, "overS"), OVER);
    gl.uniform1i(gl.getUniformLocation(pr, "face"), 0);
    const uLean = gl.getUniformLocation(pr, "lean");
    const uCorner = gl.getUniformLocation(pr, "corner");

    // ---- the sheet: a damped wave equation on the displacement of each node ----
    const count = M * M;
    const ux = new Float32Array(count), uy = new Float32Array(count);
    const vx = new Float32Array(count), vy = new Float32Array(count);
    const sx = new Float32Array(count), sy = new Float32Array(count);
    const rest = new Float32Array(count * 2), dyn = new Float32Array(count * 3);
    const restX = new Float32Array(count), restY = new Float32Array(count);
    for (let j = 0, k = 0; j < M; j++)
      for (let i = 0; i < M; i++, k++) {
        rest[k * 2] = restX[k] = ORIGIN + i * SPAN;
        rest[k * 2 + 1] = restY[k] = ORIGIN + j * SPAN;
      }
    const idx = new Uint16Array(N * N * 6);
    for (let j = 0, k = 0; j < N; j++)
      for (let i = 0; i < N; i++) {
        const a = j * M + i, b = a + 1, c = a + M, d = c + 1;
        idx[k++] = a; idx[k++] = c; idx[k++] = b; idx[k++] = b; idx[k++] = c; idx[k++] = d;
      }
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer());
    gl.bufferData(gl.ARRAY_BUFFER, rest, gl.STATIC_DRAW);
    const aa = gl.getAttribLocation(pr, "a");
    gl.enableVertexAttribArray(aa);
    gl.vertexAttribPointer(aa, 2, gl.FLOAT, false, 0, 0);
    const dynBuf = buffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, dynBuf);
    gl.bufferData(gl.ARRAY_BUFFER, dyn, gl.DYNAMIC_DRAW);
    const ad = gl.getAttribLocation(pr, "d"), as = gl.getAttribLocation(pr, "s");
    gl.enableVertexAttribArray(ad);
    gl.vertexAttribPointer(ad, 2, gl.FLOAT, false, 12, 0);
    gl.enableVertexAttribArray(as);
    gl.vertexAttribPointer(as, 1, gl.FLOAT, false, 12, 8);
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, buffer());
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, idx, gl.STATIC_DRAW);
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
    gl.clearColor(0, 0, 0, 0);

    // a handful of skin: nodes near the point follow the hand, fully at the centre
    type Brush = { u: number; v: number; list: [number, number, number, number][]; px: number; py: number };
    let brush: Brush | null = null;
    const takeHold = (u: number, v: number, radius = 0.22) => {
      const list: Brush["list"] = [];
      for (let k = 0; k < count; k++) {
        const dx = rest[k * 2] + ux[k] - u, dy = rest[k * 2 + 1] + uy[k] - v;
        const w = Math.exp(-(dx * dx + dy * dy) / (radius * radius));
        if (w > 0.02) list.push([k, w, ux[k], uy[k]]);
      }
      brush = { u, v, list, px: 0, py: 0 };
    };

    // The sheet must never fold: each row and column is forced back into order every frame.
    const lineA = new Float32Array(M), lineB = new Float32Array(M), lineP = new Float32Array(M);
    const order = (start: number, stride: number, field: Float32Array, base: Float32Array) => {
      for (let i = 0; i < M; i++) { const k = start + i * stride; lineP[i] = base[k] + field[k]; }
      lineA[0] = lineP[0];
      for (let i = 1; i < M; i++) lineA[i] = Math.max(lineP[i], lineA[i - 1] + GAP);
      lineB[N] = lineP[N];
      for (let i = N - 1; i >= 0; i--) lineB[i] = Math.min(lineP[i], lineB[i + 1] - GAP);
      for (let i = 0; i < M; i++) { const k = start + i * stride; field[k] = (lineA[i] + lineB[i]) / 2 - base[k]; }
    };
    const untangle = () => {
      for (let pass = 0; pass < 2; pass++) {
        for (let j = 0; j < M; j++) order(j * M, 1, sx, restX);
        for (let i = 0; i < M; i++) order(i, M, sy, restY);
      }
    };

    const step = (dt: number) => {
      const c2 = C * C, wo2 = WOBBLE * WOBBLE;
      for (let j = 1; j < N; j++)
        for (let i = 1; i < N; i++) {
          const k = j * M + i, l = k - 1, r = k + 1, t = k - M, b = k + M;
          const lx = ux[l] + ux[r] + ux[t] + ux[b] - 4 * ux[k], ly = uy[l] + uy[r] + uy[t] + uy[b] - 4 * uy[k];
          const lvx = vx[l] + vx[r] + vx[t] + vx[b] - 4 * vx[k], lvy = vy[l] + vy[r] + vy[t] + vy[b] - 4 * vy[k];
          vx[k] += (c2 * lx - wo2 * ux[k] - GAMMA * vx[k] + NU * lvx) * dt;
          vy[k] += (c2 * ly - wo2 * uy[k] - GAMMA * vy[k] + NU * lvy) * dt;
        }
      if (brush)
        for (const [k, w, u0, v0] of brush.list) {
          const K = 3000 * w, D = 90 * w;
          vx[k] += ((u0 + brush.px * w - ux[k]) * K - vx[k] * D) * dt;
          vy[k] += ((v0 + brush.py * w - uy[k]) * K - vy[k] * D) * dt;
        }
      for (let k = 0; k < count; k++) { ux[k] += vx[k] * dt; uy[k] += vy[k] * dt; }
    };
    const poke = (u: number, v: number, dx: number, dy: number, radius = 0.09) => {
      for (let k = 0; k < count; k++) {
        const ax = rest[k * 2] - u, ay = rest[k * 2 + 1] - v;
        const w = Math.exp(-(ax * ax + ay * ay) / (radius * radius));
        vx[k] += dx * w; vy[k] += dy * w;
      }
    };

    // ---- state & input ----
    let alphaMap: Uint8ClampedArray | null = null;
    let texture: WebGLTexture | null = null;
    let last = performance.now(), simLeft = 0, visible = true;
    let pu = 0.5, pv = 0.5, lastX = 0, lastY = 0, awake = false, pressed = false;
    let lastInput = performance.now(), nextIdle = 30000 + Math.random() * 15000;
    let leanX = 0, leanY = 0, lvX = 0, lvY = 0;

    const toUv = (x: number, y: number): [number, number] => {
      const r = canvas.getBoundingClientRect();
      return [((x - r.left) / r.width - 0.5) * OVER + 0.5, ((y - r.top) / r.height - 0.5) * OVER + 0.5];
    };
    const solid = (u: number, v: number) =>
      !!alphaMap && u >= 0 && v >= 0 && u < 1 && v < 1 &&
      alphaMap[(((v * 128) | 0) * 128 + ((u * 128) | 0)) * 4 + 3] > 40;

    const onMove = (e: PointerEvent) => {
      const dx = e.clientX - lastX, dy = e.clientY - lastY;
      lastX = e.clientX; lastY = e.clientY;
      [pu, pv] = toUv(e.clientX, e.clientY);
      awake = true;
      lastInput = performance.now();
      const onHead = solid(pu, pv);
      wrap.style.cursor = pressed ? "grabbing" : onHead ? "grab" : "";
      // a cursor on the skin rubs it along
      if (onHead && !pressed) poke(pu, pv, dx * 0.00035, dy * 0.00035, 0.07);
      if (pressed && brush) {
        let px = pu - brush.u, py = pv - brush.v;
        const L = Math.hypot(px, py), lim = 0.24;
        if (L > 0) { const k = (lim * (1 - Math.exp(-L / lim))) / L; px *= k; py *= k; }
        brush.px = px; brush.py = py;
      }
    };
    const onDown = (e: PointerEvent) => {
      const [u, v] = toUv(e.clientX, e.clientY);
      if (!solid(u, v)) return;
      lastInput = performance.now();
      pressed = true;
      takeHold(u, v);
      wrap.setPointerCapture(e.pointerId);
      e.preventDefault();
    };
    const release = () => {
      if (!pressed) return;
      // a tap gives a little bounce; a pull simply ripples back once let go
      if (brush && Math.hypot(brush.px, brush.py) < 0.03) poke(brush.u, brush.v, 0, 0.5, 0.06);
      pressed = false;
      brush = null;
      wrap.style.cursor = "";
    };
    const onScroll = () => { lastInput = performance.now(); };

    addEventListener("pointermove", onMove);
    wrap.addEventListener("pointerdown", onDown);
    addEventListener("pointerup", release);
    addEventListener("pointercancel", release);
    addEventListener("scroll", onScroll, { passive: true });

    const io = new IntersectionObserver((es) => { visible = es[0].isIntersecting; }, { threshold: 0 });
    io.observe(canvas);
    const ro = new ResizeObserver(() => {
      const r = Math.min(devicePixelRatio || 1, 2), b = canvas.getBoundingClientRect();
      canvas.width = Math.max(1, b.width * r);
      canvas.height = Math.max(1, b.height * r);
      gl.viewport(0, 0, canvas.width, canvas.height);
    });
    ro.observe(canvas);

    // ---- frame ----
    const frame = (now: number) => {
      raf = requestAnimationFrame(frame);
      const dt = Math.min(0.04, (now - last) / 1000);
      last = now;
      if (!texture || !visible) return;

      // when the page goes quiet, an occasional nudge keeps her alive
      if (!reduced && !pressed && now - lastInput > nextIdle) {
        poke(0.5 + (Math.random() - 0.5) * 0.4, 0.5 + (Math.random() - 0.5) * 0.3, (Math.random() - 0.5) * 0.6, -0.4, 0.12);
        lastInput = now;
        nextIdle = 30000 + Math.random() * 15000;
      }

      // the head leans toward the pull and the cursor
      const tx = (pressed ? (brush ? brush.px * 0.16 : 0) : awake ? (pu - 0.5) * 0.012 : 0) + Math.sin(now * 0.0009) * 0.0015;
      const ty = (pressed ? (brush ? brush.py * 0.16 : 0) : awake ? (pv - 0.46) * 0.008 : 0) + Math.sin(now * 0.0013) * 0.0022;
      lvX += ((tx - leanX) * 70 - lvX * 8) * dt;
      lvY += ((ty - leanY) * 70 - lvY * 8) * dt;
      leanX += lvX * dt;
      leanY += lvY * dt;

      simLeft += dt;
      let steps = 0;
      while (simLeft >= H && steps < 9) { step(H); simLeft -= H; steps++; }
      if (steps === 9) simLeft = 0;
      for (let j = 0; j < M; j++)
        for (let i = 0; i < M; i++) {
          const k = j * M + i, edge = i === 0 || j === 0 || i === N || j === N;
          sx[k] = edge ? ux[k] : (ux[k] * 4 + ux[k - 1] + ux[k + 1] + ux[k - M] + ux[k + M]) / 8;
          sy[k] = edge ? uy[k] : (uy[k] * 4 + uy[k - 1] + uy[k + 1] + uy[k - M] + uy[k + M]) / 8;
        }
      untangle();
      for (let k = 0, o = 0; k < count; k++) {
        dyn[o++] = sx[k];
        dyn[o++] = sy[k];
        const r = k % M, c = (k / M) | 0;
        let shade = 1;
        if (r > 0 && r < N && c > 0 && c < N)
          shade = Math.max(0.86, Math.min(1.16, 1 - (sx[k + 1] - sx[k - 1] + (sy[k + M] - sy[k - M])) * 1.8));
        dyn[o++] = shade;
      }
      gl.bindBuffer(gl.ARRAY_BUFFER, dynBuf);
      gl.bufferSubData(gl.ARRAY_BUFFER, 0, dyn);
      gl.clear(gl.COLOR_BUFFER_BIT);
      gl.activeTexture(gl.TEXTURE0);
      gl.bindTexture(gl.TEXTURE_2D, texture);
      gl.uniform2f(uLean, leanX, leanY);
      gl.drawElements(gl.TRIANGLES, idx.length, gl.UNSIGNED_SHORT, 0);
    };

    (async () => {
      const source: HTMLImageElement | HTMLCanvasElement | null = src ? await loadImage(src) : await monogram(initials);
      if (!source || disposed) return;
      const w = "naturalWidth" in source ? source.naturalWidth : source.width;
      const h = "naturalHeight" in source ? source.naturalHeight : source.height;
      setAspect(w / h);
      // Photos without transparency get softly rounded corners; cut-outs keep their outline.
      const probe = document.createElement("canvas");
      probe.width = probe.height = 128;
      const pc = probe.getContext("2d", { willReadFrequently: true })!;
      pc.drawImage(source, 0, 0, 128, 128);
      alphaMap = pc.getImageData(0, 0, 128, 128).data;
      gl.uniform1f(uCorner, alphaMap[3] > 250 ? CORNER : 0);

      gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, true);
      texture = gl.createTexture();
      gl.activeTexture(gl.TEXTURE0);
      gl.bindTexture(gl.TEXTURE_2D, texture);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, source);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
      setReady(true);
      raf = requestAnimationFrame(frame);
    })();

    return () => {
      disposed = true;
      cancelAnimationFrame(raf);
      removeEventListener("pointermove", onMove);
      wrap.removeEventListener("pointerdown", onDown);
      removeEventListener("pointerup", release);
      removeEventListener("pointercancel", release);
      removeEventListener("scroll", onScroll);
      io.disconnect();
      ro.disconnect();
      if (texture) gl.deleteTexture(texture);
      buffers.forEach((b) => gl.deleteBuffer(b));
      shaders.forEach((sh) => gl.deleteShader(sh));
      gl.deleteProgram(pr);
      gl.clear(gl.COLOR_BUFFER_BIT);
    };
  }, [src, initials]);

  return (
    <div className="portrait-wrap" ref={wrapRef} style={{ "--ar": aspect } as React.CSSProperties}>
      <div className="portrait-inner studio-in" style={{ "--d": "0.6s", "--y": "30px" } as React.CSSProperties}>
        {src ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={src} alt={alt} className="portrait-fallback" style={{ visibility: ready ? "hidden" : "visible" }} />
        ) : (
          <div className="portrait-blank" aria-hidden="true" />
        )}
        <canvas ref={canvasRef} className="portrait-gl" aria-hidden="true" />
      </div>
    </div>
  );
}
