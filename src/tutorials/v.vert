uniform float t;

attribute mat4 instanceMatrix;
attribute mat4 splinePoints;
attribute float progress;
attribute float random;

varying float vProgress;
varying float vRandom;

#define MAX_POINTS 8.0

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

vec2 getSplinePoint(int index) {
  float vector = float(index) / 2.0;
  int matrixRow = int(floor(vector));
  vec2 splinePoint;
  if(vector == floor(vector))
    splinePoint = vec2(splinePoints[matrixRow][0], splinePoints[matrixRow][1]);
  else
    splinePoint = splinePoints[matrixRow].zw;

  // scale them so they gradually rotate...
  // spline point y is from [-1] to [1], so just flip it
  // return vec2(splinePoint.x, splinePoint.y * (mod(t + random, 1.0) * 2.0 - 1.0));
  return splinePoint;
}

void main() {
  ivec4 splineIndices = getCatmullRomSplineIndices(MAX_POINTS, progress * MAX_POINTS);
  vec2 splinePosition = catmullRomSpline(getSplinePoint(splineIndices.x), getSplinePoint(splineIndices.y), getSplinePoint(splineIndices.z), getSplinePoint(splineIndices.w), mod(progress * MAX_POINTS, 1.0));

  gl_Position = modelViewMatrix * projectionMatrix * instanceMatrix * vec4(splinePosition, 0.0, 1.0);

  vProgress = progress;
  vRandom = random;
}