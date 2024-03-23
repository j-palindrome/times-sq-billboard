uniform vec2 cursor;
attribute float random;
attribute float index;
attribute int texIndex;
attribute mat4 bezierPoints;

uniform float t;
flat varying float vIndex;
flat varying int vTexIndex;
varying float vRandom;
varying vec2 vUv;
flat varying vec2 vBezierPoints[8];

void main() {

  // float power = pow(t, 0.5);
  // float power = 1.0;
  // vec4 pos = vec4(position.xyz, 1.0) * vec4(power, power, 1.0, 1.0);
  // gl_Position = pos;
  gl_Position = projectionMatrix * modelViewMatrix * instanceMatrix * vec4(position, 1.0);

  vUv = uv;
  vRandom = random;
  vIndex = index;
  vTexIndex = texIndex;
  vBezierPoints = vec2[8](bezierPoints[0].xy, bezierPoints[0].zw, bezierPoints[1].xy, bezierPoints[1].zw, bezierPoints[2].zy, bezierPoints[2].zw, bezierPoints[3].xy, bezierPoints[3].zw);
}