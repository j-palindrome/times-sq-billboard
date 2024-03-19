uniform vec2 cursor;
varying vec2 vUv;
attribute vec3 random;
varying vec3 uRandom;
varying float lengthTest;

void main() {

  uRandom = random;
  float len = distance(uv, cursor);
  float R = 1.0;
  float magnitude = max(0.0, pow(R - len, 6.0));

  vec2 distortion = ((uv - cursor) * magnitude);
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position.xy + distortion + (1.0 - magnitude) * (random.xy * 2.0 - 1.0), 0.0, 1.0);
  gl_PointSize = 4.0;

  lengthTest = magnitude;
  vUv = uv;
}