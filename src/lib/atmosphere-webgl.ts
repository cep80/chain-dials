/**
 * Lightweight WebGL1 volumetric fee fog for Mempool Atmosphere.
 * Fullscreen quad only. No Three.js. Falls back silently when GL is unavailable.
 */

export type FogLayer = {
  /** 0 = top of canvas, 1 = bottom (matches altitudeY / h). */
  y: number;
  weight: number;
  /** 0..3 fee band */
  band: number;
};

export type AtmosphereFogFrame = {
  time: number;
  intensity: number;
  breath: number;
  layers: FogLayer[];
};

export type AtmosphereFogHandle = {
  resize: () => void;
  render: (frame: AtmosphereFogFrame) => void;
  destroy: () => void;
};

const MAX_LAYERS = 8;

const VERT = `
attribute vec2 a_pos;
varying vec2 v_uv;
void main() {
  v_uv = a_pos * 0.5 + 0.5;
  gl_Position = vec4(a_pos, 0.0, 1.0);
}
`;

const FRAG = `
precision mediump float;
varying vec2 v_uv;
uniform vec2 u_res;
uniform float u_time;
uniform float u_intensity;
uniform float u_breath;
uniform int u_count;
uniform float u_y[8];
uniform float u_w[8];
uniform float u_b[8];

float hash(vec2 p) {
  return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
}

float noise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  float a = hash(i);
  float b = hash(i + vec2(1.0, 0.0));
  float c = hash(i + vec2(0.0, 1.0));
  float d = hash(i + vec2(1.0, 1.0));
  vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(a, b, u.x) + (c - a) * u.y * (1.0 - u.x) + (d - b) * u.x * u.y;
}

float fbm(vec2 p) {
  float v = 0.0;
  float a = 0.5;
  for (int i = 0; i < 4; i++) {
    v += a * noise(p);
    p *= 2.03;
    a *= 0.5;
  }
  return v;
}

vec3 bandColor(float b) {
  if (b > 2.5) return vec3(1.0, 0.36, 0.36);
  if (b > 1.5) return vec3(0.97, 0.58, 0.10);
  if (b > 0.5) return vec3(0.90, 0.72, 0.30);
  return vec3(0.66, 0.63, 0.58);
}

void main() {
  vec2 uv = v_uv;
  // Flip Y so 0 is top (matches canvas altitude).
  float y = 1.0 - uv.y;

  vec3 col = vec3(0.025, 0.032, 0.048);
  float skyHeat = u_intensity * 0.7;
  col = mix(col, vec3(0.16, 0.05, 0.04), (1.0 - y) * 0.42 * skyHeat);
  col = mix(col, vec3(0.22, 0.10, 0.02), pow(1.0 - y, 2.0) * 0.38 * skyHeat);

  // Soft upper bloom
  float bloom = exp(-pow((uv.x - 0.5) * 2.0, 2.0)) * exp(-pow(y * 2.8, 2.0));
  col += vec3(0.97, 0.58, 0.10) * bloom * (0.12 + u_intensity * 0.18);

  float t = u_time * (0.14 + u_intensity * 0.18);
  float fog = 0.0;
  vec3 fogCol = vec3(0.0);

  for (int i = 0; i < 8; i++) {
    float active = step(float(i), float(u_count) - 0.5);
    float ly = u_y[i] - u_breath * 0.05;
    float w = u_w[i] * active;
    float band = u_b[i];
    float thick = mix(0.07, 0.22, clamp(w, 0.0, 1.0)) * (0.9 + u_intensity * 0.45);
    float d = abs(y - ly);
    float envelope = exp(-pow(d / max(thick, 0.001), 1.65));

    // Domain-warped fbm so bands billow instead of reading as flat strips
    vec2 warp = vec2(
      fbm(vec2(uv.x * 1.6 + float(i) * 0.41 + t * 0.55, y * 2.2 - t * 0.25)),
      fbm(vec2(uv.x * 1.2 - t * 0.35, y * 2.8 + float(i) * 0.19))
    );
    vec2 np = vec2(uv.x * 2.8 + float(i) * 0.37 + t, y * 3.4 - t * 0.7) + (warp - 0.5) * 1.4;
    float n = fbm(np);
    float wisps = smoothstep(0.28, 0.78, n);
    float density = envelope * w * mix(0.45, 1.35, wisps);
    vec3 bc = bandColor(band);
    fogCol += bc * density;
    fog += density;
  }

  fog = clamp(fog, 0.0, 1.8);
  col = mix(col, fogCol / max(fog, 0.001), clamp(fog * 0.9, 0.0, 0.92));

  // Slow lateral drift highlight (reads as volume, not a 2D wash)
  float shaft = fbm(vec2(uv.x * 3.0 - t * 0.4, y * 0.8 + t * 0.1));
  col += vec3(0.97, 0.72, 0.35) * shaft * fog * 0.08;

  float grain = hash(uv * u_res + u_time) * 0.045;
  col += grain - 0.022;

  float vig = smoothstep(1.2, 0.32, length((uv - 0.5) * vec2(1.2, 1.05)));
  col *= mix(0.68, 1.0, vig);

  gl_FragColor = vec4(col, 1.0);
}
`;

function compile(
  gl: WebGLRenderingContext,
  type: number,
  src: string,
): WebGLShader | null {
  const sh = gl.createShader(type);
  if (!sh) return null;
  gl.shaderSource(sh, src);
  gl.compileShader(sh);
  if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) {
    gl.deleteShader(sh);
    return null;
  }
  return sh;
}

/**
 * Attach a WebGL fog renderer to an existing canvas.
 * Returns null when WebGL is unavailable or shaders fail.
 */
export function createAtmosphereFog(
  canvas: HTMLCanvasElement,
): AtmosphereFogHandle | null {
  const gl = canvas.getContext("webgl", {
    alpha: false,
    antialias: false,
    depth: false,
    stencil: false,
    premultipliedAlpha: false,
    powerPreference: "low-power",
  });
  // A previously lost context stays attached to the canvas; refuse it so the
  // caller can remount a fresh canvas element.
  if (!gl || gl.isContextLost()) return null;

  const vs = compile(gl, gl.VERTEX_SHADER, VERT);
  const fs = compile(gl, gl.FRAGMENT_SHADER, FRAG);
  if (!vs || !fs) {
    if (vs) gl.deleteShader(vs);
    if (fs) gl.deleteShader(fs);
    return null;
  }

  const prog = gl.createProgram();
  if (!prog) {
    gl.deleteShader(vs);
    gl.deleteShader(fs);
    return null;
  }
  gl.attachShader(prog, vs);
  gl.attachShader(prog, fs);
  gl.linkProgram(prog);
  gl.deleteShader(vs);
  gl.deleteShader(fs);
  if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) {
    gl.deleteProgram(prog);
    return null;
  }

  const buf = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, buf);
  gl.bufferData(
    gl.ARRAY_BUFFER,
    new Float32Array([-1, -1, 3, -1, -1, 3]),
    gl.STATIC_DRAW,
  );

  const aPos = gl.getAttribLocation(prog, "a_pos");
  const uRes = gl.getUniformLocation(prog, "u_res");
  const uTime = gl.getUniformLocation(prog, "u_time");
  const uIntensity = gl.getUniformLocation(prog, "u_intensity");
  const uBreath = gl.getUniformLocation(prog, "u_breath");
  const uCount = gl.getUniformLocation(prog, "u_count");
  const uY = gl.getUniformLocation(prog, "u_y");
  const uW = gl.getUniformLocation(prog, "u_w");
  const uB = gl.getUniformLocation(prog, "u_b");

  let destroyed = false;
  let lastW = 0;
  let lastH = 0;

  const resize = () => {
    if (destroyed) return;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const rect = canvas.getBoundingClientRect();
    const w = Math.max(1, Math.floor(rect.width * dpr));
    const h = Math.max(1, Math.floor(rect.height * dpr));
    if (w === lastW && h === lastH) return;
    lastW = w;
    lastH = h;
    canvas.width = w;
    canvas.height = h;
    gl.viewport(0, 0, w, h);
  };

  const ys = new Float32Array(MAX_LAYERS);
  const ws = new Float32Array(MAX_LAYERS);
  const bs = new Float32Array(MAX_LAYERS);

  const render = (frame: AtmosphereFogFrame) => {
    if (destroyed) return;
    resize();
    gl.useProgram(prog);
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.enableVertexAttribArray(aPos);
    gl.vertexAttribPointer(aPos, 2, gl.FLOAT, false, 0, 0);

    const count = Math.min(MAX_LAYERS, frame.layers.length);
    ys.fill(0);
    ws.fill(0);
    bs.fill(0);
    // Pick densest layers so quiet histograms still look like weather.
    const sorted = [...frame.layers]
      .sort((a, b) => b.weight - a.weight)
      .slice(0, count);
    for (let i = 0; i < sorted.length; i++) {
      const L = sorted[i]!;
      ys[i] = L.y;
      ws[i] = L.weight;
      bs[i] = L.band;
    }

    gl.uniform2f(uRes, lastW, lastH);
    gl.uniform1f(uTime, frame.time);
    gl.uniform1f(uIntensity, frame.intensity);
    gl.uniform1f(uBreath, frame.breath);
    gl.uniform1i(uCount, sorted.length);
    gl.uniform1fv(uY, ys);
    gl.uniform1fv(uW, ws);
    gl.uniform1fv(uB, bs);

    gl.drawArrays(gl.TRIANGLES, 0, 3);
  };

  const destroy = () => {
    if (destroyed) return;
    destroyed = true;
    gl.deleteBuffer(buf);
    gl.deleteProgram(prog);
    // Do not call WEBGL_lose_context.loseContext(): React Strict Mode remounts
    // reuse this canvas, and a lost context cannot be re-acquired reliably.
  };

  resize();
  return { resize, render, destroy };
}

/** Map histogram layers into shader y/weight/band using the same altitude curve. */
export function fogLayersFromHist(
  layers: Array<{ feeRate: number; weight: number; band: number }>,
  h: number,
  fees: { fastest: number | null; economy: number | null },
  altitude: (
    feeRate: number,
    h: number,
    fees: { fastest: number | null; economy: number | null },
  ) => number,
): FogLayer[] {
  if (!(h > 0) || !layers.length) return [];
  return layers.map((L) => ({
    y: altitude(L.feeRate, h, fees) / h,
    weight: L.weight,
    band: L.band,
  }));
}
