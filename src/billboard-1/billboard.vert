uniform vec2 cursor;
attribute vec3 random;
varying vec2 vUv;
varying vec3 vRandom;

void main() {
  gl_Position = projectionMatrix * modelViewMatrix * instanceMatrix * vec4(position.xyz, 1.0);
  vUv = uv;
  vRandom = random;
}