uniform vec2 cursor;
attribute float random;
attribute float index;
attribute int texIndex;

uniform float t;
flat varying float vIndex;
flat varying int vTexIndex;
varying float vRandom;
varying vec2 vUv;

void main() {

  // float power = pow(t, 0.5);
  float power = 1.0;
  vec4 pos = vec4(position.xyz, 1.0) * vec4(power, power, 1.0, 1.0);
  // gl_Position = pos;
  gl_Position = projectionMatrix * modelViewMatrix * instanceMatrix * pos;

  vUv = uv;
  vRandom = random;
  vIndex = index;
  vTexIndex = texIndex;
}