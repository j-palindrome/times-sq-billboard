uniform vec2 cursor;
varying vec2 vUv;

attribute float random;
flat varying int vRandom;

void main() {
  gl_Position = projectionMatrix * modelViewMatrix * instanceMatrix * vec4(position.xyz, 1.0);
  vUv = uv;
  vRandom = int(random);
}