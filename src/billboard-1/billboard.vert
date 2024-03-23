uniform vec2 cursor;
attribute float random;
attribute float index;
attribute int texIndex;
attribute mat4 splinePoints;

uniform float t;
flat varying float vIndex;
flat varying int vTexIndex;
varying float vRandom;
varying vec2 vUv;

#define SPLINE_POINTS 8.0;

// from https://github.com/zadvorsky/three.bas/blob/master/src/glsl/catmull_rom_spline.glsl
vec2 catmullRomSpline(vec2 p0, vec2 p1, vec2 p2, vec2 p3, float t, vec2 c) {
  vec2 v0 = (p2 - p0) * c.x;
  vec2 v1 = (p3 - p1) * c.y;
  float t2 = t * t;
  float t3 = t * t * t;

  return vec2((2.0 * p1 - 2.0 * p2 + v0 + v1) * t3 + (-3.0 * p1 + 3.0 * p2 - 2.0 * v0 - v1) * t2 + v0 * t + p1);
}

vec2 catmullRomSpline(vec2 p0, vec2 p1, vec2 p2, vec2 p3, float t) {
  return catmullRomSpline(p0, p1, p2, p3, t, vec2(0.5, 0.5));
}

// interpolates the spline indexes based on the point
ivec4 getCatmullRomSplineIndices(float l, float p) {
  float index = floor(p);
  int i0 = int(max(0.0, index - 1.0));
  int i1 = int(index);
  int i2 = int(min(index + 1.0, l));
  int i3 = int(min(index + 2.0, l));

  return ivec4(i0, i1, i2, i3);
}

ivec4 getCatmullRomSplineIndicesClosed(float l, float p) {
  float index = floor(p);
  int i0 = int(index == 0.0 ? l : index - 1.0);
  int i1 = int(index);
  int i2 = int(mod(index + 1.0, l));
  int i3 = int(mod(index + 2.0, l));

  return ivec4(i0, i1, i2, i3);
}

void main() {

  ivec4 splineIndices = getCatmullRomSplineIndices(vIndex, SPLINE_POINTS);
  vec2 splinePosition = catmullRomSpline(splinePoints[0].xy, splinePoints[0].zw, splinePoints[1].xy, splinePoints[1].zw, vIndex);
  gl_Position = projectionMatrix * modelViewMatrix * instanceMatrix * vec4(splinePosition, 0.0, 1.0);

  vUv = uv;
  vRandom = random;
  vIndex = index;
  vTexIndex = texIndex;
}