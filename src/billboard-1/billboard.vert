uniform vec2 cursor;
attribute float random;
attribute float index;

flat varying float vIndex;
varying float vRandom;
varying vec2 vUv;

void main() {
  gl_Position = projectionMatrix * modelViewMatrix * instanceMatrix * vec4(position.xyz, 1.0);

  vUv = uv;
  vRandom = random;
  vIndex = index;
}