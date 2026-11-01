import frag from './blackhole.frag?raw';
import { drawSky } from './sky';
import type { Framing } from './framing';

const VERT = 'attribute vec2 aPos; void main() { gl_Position = vec4(aPos, 0.0, 1.0); }';

export interface Quality {
  /** Drawing buffer size relative to CSS px x device pixel ratio; the browser upscales the rest. */
  scale: number;
  /** Ray integration steps in the shader. */
  steps: number;
}

export interface Renderer {
  /** Sizes the drawing buffer for a CSS size, DPR and quality scale. */
  resize(cssWidth: number, cssHeight: number, pixelRatio: number): void;
  draw(time: number, framing: Framing, quality: Quality): void;
}

/** Returns null if WebGL is unavailable or the shader fails to compile; the caller keeps the poster. */
export function createRenderer(canvas: HTMLCanvasElement): Renderer | null {
  const gl = canvas.getContext('webgl', {
    alpha: false,
    antialias: false,
    depth: false,
    stencil: false,
    powerPreference: 'low-power',
  });
  if (!gl) return null;

  const compile = (type: number, src: string) => {
    const s = gl.createShader(type)!;
    gl.shaderSource(s, src);
    gl.compileShader(s);
    if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) {
      console.warn('[blackhole] shader compile failed:', gl.getShaderInfoLog(s));
      return null;
    }
    return s;
  };
  const vs = compile(gl.VERTEX_SHADER, VERT);
  const fs = compile(gl.FRAGMENT_SHADER, frag);
  if (!vs || !fs) return null;

  const program = gl.createProgram()!;
  gl.attachShader(program, vs);
  gl.attachShader(program, fs);
  gl.linkProgram(program);
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    console.warn('[blackhole] program link failed:', gl.getProgramInfoLog(program));
    return null;
  }
  gl.useProgram(program);

  // One big triangle covering the viewport.
  gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer());
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
  const aPos = gl.getAttribLocation(program, 'aPos');
  gl.enableVertexAttribArray(aPos);
  gl.vertexAttribPointer(aPos, 2, gl.FLOAT, false, 0, 0);

  // Background haze texture, generated once. Power-of-two so horizontal REPEAT works in WebGL1.
  gl.bindTexture(gl.TEXTURE_2D, gl.createTexture());
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGB, gl.RGB, gl.UNSIGNED_BYTE, drawSky());
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.REPEAT);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);

  const u = (name: string) => gl.getUniformLocation(program, name);
  const uRes = u('uRes');
  const uTime = u('uTime');
  const uSteps = u('uSteps');
  const uRefAspect = u('uRefAspect');
  const uZoom = u('uZoom');
  const uCenter = u('uCenter');
  const uStarSize = u('uStarSize');
  gl.uniform1i(u('uSky'), 0);

  let css = { w: 1, h: 1, dpr: 1 };

  return {
    resize(cssWidth, cssHeight, pixelRatio) {
      css = { w: cssWidth, h: cssHeight, dpr: pixelRatio };
    },
    draw(time, framing, quality) {
      const w = Math.max(1, Math.round(css.w * css.dpr * quality.scale));
      const h = Math.max(1, Math.round(css.h * css.dpr * quality.scale));
      if (canvas.width !== w || canvas.height !== h) {
        canvas.width = w;
        canvas.height = h;
      }
      gl.viewport(0, 0, w, h);
      gl.uniform2f(uRes, w, h);
      gl.uniform1f(uTime, time);
      gl.uniform1i(uSteps, quality.steps);
      gl.uniform1f(uRefAspect, framing.width / framing.height);
      gl.uniform1f(uZoom, framing.zoom);
      gl.uniform2f(uCenter, framing.center[0], framing.center[1]);
      gl.uniform1f(uStarSize, (2 * framing.zoom) / framing.height);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
    },
  };
}
