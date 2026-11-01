// Gargantua-style black hole with a thin accretion disk, traced per pixel.
// Units: Schwarzschild radius = 1 (horizon at r = 1, photon sphere at 1.5).
//
// Photons are bent with the exact Schwarzschild orbit equation written as a Newtonian-style force,
//   a = -1.5 * h^2 * p / r^5   (h = |p x v|, conserved),
// integrated with a few dozen adaptive steps. That gives the shadow, the photon ring and the
// lensed far side of the disk arching over and under the hole for cheap.

#ifdef GL_FRAGMENT_PRECISION_HIGH
precision highp float;
#else
precision mediump float;
#endif

uniform vec2 uRes;          // drawing buffer size, px
uniform float uTime;        // seconds
uniform int uSteps;         // quality knob: integration steps (<= MAX_STEPS)
uniform float uRefAspect;   // aspect (w/h) of the poster this framing matches; we crop it like object-fit: cover
uniform float uZoom;        // tan(half vertical field of view) of the reference frame
uniform vec2 uCenter;       // hole position in reference units (y in [-0.5, 0.5])
uniform float uStarSize;    // star radius in radians (one poster pixel), same at every render resolution
uniform sampler2D uSky;     // equirectangular background haze, generated once at startup

const int MAX_STEPS = 128;
const float PI = 3.14159265;
const float TAU = 6.28318531;
// The disk runs right down to the photon sphere, as around a fast-spinning hole like Gargantua.
// (A non-spinning hole's disk would stop at r = 3 and leave a dark gap around the shadow.)
const float DISK_IN = 1.25;
const float DISK_OUT = 22.0;
const float CAM_DIST = 26.0;
const float CAM_ELEV = 0.075; // radians above the disk plane: nearly edge-on; higher = slimmer bottom arc
const float CAM_ROLL = 0.12;  // radians of tilt, for a bit of drama
const float SPIN_RATE = 1.6;  // visual speed of the disk's rotation (faster than real, so it reads as alive)
const float STAR_CELLS = 60.0; // star grid cells per radian of sky
// Apparent radius of the shadow: critical impact parameter 3*sqrt(3)/2 seen from CAM_DIST.
const float SHADOW_ANGLE = 0.1;

float pixelAngle; // radians per drawing-buffer pixel, set in main()

float hash(vec2 p) {
  return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
}

// Value noise, periodic in x with the given period so the disk has no seam at phi = +-pi.
float noise(vec2 p, float period) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f);
  float x0 = mod(i.x, period);
  float x1 = mod(i.x + 1.0, period);
  float a = hash(vec2(x0, i.y));
  float b = hash(vec2(x1, i.y));
  float c = hash(vec2(x0, i.y + 1.0));
  float d = hash(vec2(x1, i.y + 1.0));
  return mix(mix(a, b, u.x), mix(c, d, u.x), u.y);
}

// Disk color, hot inner edge to cool wispy outskirts: white -> pale rose -> peach -> copper.
vec3 diskRamp(float t) {
  vec3 c0 = vec3(1.0, 0.96, 0.94);
  vec3 c1 = vec3(1.0, 0.8, 0.74);
  vec3 c2 = vec3(0.95, 0.56, 0.43);
  vec3 c3 = vec3(0.7, 0.28, 0.2);
  if (t < 0.2) return mix(c0, c1, t / 0.2);
  if (t < 0.5) return mix(c1, c2, (t - 0.2) / 0.3);
  return mix(c2, c3, (t - 0.5) / 0.5);
}

// Emission and opacity where a ray crosses the disk plane at q, travelling along dir.
vec4 disk(vec3 q, vec3 dir) {
  float r = length(q.xz);
  float t = (r - DISK_IN) / (DISK_OUT - DISK_IN);

  // Keplerian differential rotation: inner material laps the outer material.
  float omega = pow(r, -1.5);
  float phi = atan(q.z, q.x) - omega * uTime * SPIN_RATE;
  float a = phi / TAU;

  // Streaky gas, stretched along the orbit. Smooth near the hole, ragged and wispy further out.
  float n = 0.5 * noise(vec2(a * 14.0, r * 2.0), 14.0)
          + 0.3 * noise(vec2(a * 40.0, r * 5.5), 40.0)
          + 0.2 * noise(vec2(a * 90.0, r * 12.0), 90.0);
  float wisp = smoothstep(0.15, 0.6, t);
  n = mix(mix(0.35, 1.45, n), smoothstep(0.35, 0.85, n) * 1.4, wisp);
  // A few big bright clumps orbiting with the gas, so the motion is noticeable at a glance.
  n *= mix(0.6, 1.5, noise(vec2(a * 5.0, r * 0.7), 5.0));

  float profile = smoothstep(0.0, 0.015, t) * smoothstep(1.0, 0.3, t) * pow(DISK_IN / r, 2.0);

  // A gentle hint of Doppler beaming (the approaching side slightly brighter). The film's Gargantua
  // had it removed entirely so the hole would look symmetric; we keep just a little.
  float beta = min(sqrt(0.5 / max(r - 1.0, 0.25)), 0.6);
  vec3 vel = normalize(vec3(-q.z, 0.0, q.x));
  float g = 1.0 + beta * dot(vel, -dir);
  float intensity = profile * n * pow(g, 0.6) * 4.5;

  float alpha = clamp(profile * n * 2.0, 0.0, 0.97);
  return vec4(diskRamp(t) * intensity, alpha);
}

// Background sky in direction d: the low-res haze texture plus procedural point stars. The stars are
// computed here rather than baked into the texture because lensing magnifies the sky a lot near the
// hole and texture stars smear into blocks. It's one cell lookup per pixel, only for escaped rays.
vec3 sky(vec3 d) {
  float lon = atan(d.z, d.x);
  float lat = asin(clamp(d.y, -1.0, 1.0));
  vec3 col = texture2D(uSky, vec2(lon / TAU + 0.5, 0.5 - lat / PI)).rgb;

  vec2 g = vec2(lon, lat) * STAR_CELLS;
  vec2 cell = floor(g);
  if (hash(cell) < 0.24) {
    vec2 at = 0.15 + 0.7 * vec2(hash(cell + 1.3), hash(cell + 7.1));
    vec2 off = (fract(g) - at) / STAR_CELLS;
    off.x *= cos(lat);
    float big = pow(hash(cell + 3.7), 8.0);
    // Fixed angular size so the live (low-res) render matches the poster. When a buffer pixel is
    // bigger than the star, draw it one pixel wide but dimmer, keeping the same total light.
    float size = uStarSize * (1.2 + 1.8 * big);
    float radius = max(size, pixelAngle * 0.75);
    float b = smoothstep(radius, 0.0, length(off)) * (0.35 + 0.65 * pow(hash(cell + 5.9), 3.0));
    b *= (size * size) / (radius * radius);
    float tint = hash(cell + 9.2);
    vec3 star = tint < 0.7 ? vec3(0.95, 0.92, 0.88) : tint < 0.85 ? vec3(0.96, 0.73, 0.55) : vec3(0.56, 0.77, 1.0);
    col += star * b * 2.0;
  }
  return col;
}

void main() {
  float refHeightPx = max(uRes.x / uRefAspect, uRes.y);
  vec2 uv = (gl_FragCoord.xy - 0.5 * uRes) / refHeightPx - uCenter;
  pixelAngle = 2.0 * uZoom / refHeightPx;

  vec3 camPos = CAM_DIST * vec3(0.0, sin(CAM_ELEV), -cos(CAM_ELEV));
  vec3 fwd = normalize(-camPos);
  vec3 right = normalize(cross(vec3(-sin(CAM_ROLL), cos(CAM_ROLL), 0.0), fwd));
  vec3 up = cross(fwd, right);
  vec3 dir = normalize(fwd + (uv.x * right + uv.y * up) * (2.0 * uZoom));

  vec3 p = camPos;
  vec3 v = dir;
  vec3 h = cross(p, v);
  float h2 = dot(h, h);

  vec3 col = vec3(0.0);
  float cover = 0.0;
  bool captured = false;

  for (int i = 0; i < MAX_STEPS; i++) {
    if (i >= uSteps) break;
    float r = length(p);
    // Fine steps near the hole where bending is strong, big strides far away where it's weak.
    float dt = r < 6.0 ? max(0.1 * r, 0.03) : min(0.25 * r, 5.0);
    v += -1.5 * h2 * p / pow(r, 5.0) * dt;
    vec3 next = p + v * dt;

    if (p.y * next.y < 0.0) {
      vec3 q = mix(p, next, p.y / (p.y - next.y));
      float rq = length(q.xz);
      if (rq > DISK_IN && rq < DISK_OUT) {
        vec4 e = disk(q, normalize(v));
        col += (1.0 - cover) * e.rgb;
        cover += (1.0 - cover) * e.a;
        if (cover > 0.98) break;
      }
    }

    p = next;
    float rn = length(p);
    if (rn < 1.0) {
      captured = true;
      break;
    }
    // Heading away and far enough out that the rest of the path is nearly straight: finish it
    // analytically, including one last disk crossing on the way out.
    if (rn > 12.0 && dot(p, v) > 0.0) {
      if (p.y * v.y < 0.0) {
        vec3 q = p - v * (p.y / v.y);
        float rq = length(q.xz);
        if (rq > DISK_IN && rq < DISK_OUT) {
          vec4 e = disk(q, normalize(v));
          col += (1.0 - cover) * e.rgb;
          cover += (1.0 - cover) * e.a;
        }
      }
      break;
    }
  }

  // Rays that ran out of steps still skimming the photon sphere are as good as captured.
  if (!captured && length(p) > 3.0) col += (1.0 - cover) * sky(normalize(v));

  // Bloom: the film's Gargantua glows so hard that light spills over the shadow itself.
  // Approximated as a soft halo around the hole in screen space.
  float d = length(uv) * 2.0 * uZoom / SHADOW_ANGLE; // distance from the hole's center, in shadow radii
  float breathe = 1.0 + 0.12 * sin(uTime * 0.9); // slow pulse in the glow
  col += vec3(1.0, 0.8, 0.74) * breathe * (0.2 * exp(-1.5 * max(d - 0.6, 0.0)) + 0.035 * exp(-0.3 * d));

  // Filmic-ish tone map so the white-hot core blooms instead of clipping.
  col = 1.0 - exp(-col * 1.5);
  gl_FragColor = vec4(col, 1.0);
}
