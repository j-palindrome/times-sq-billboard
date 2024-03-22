uniform vec3 colors[4];
uniform vec2 resolution;
uniform float t;
uniform float points;
uniform sampler2D tex0;
uniform sampler2D tex1;
uniform sampler2D tex2;
uniform sampler2D tex3;
uniform sampler2D tex4;

varying vec2 vUv;
varying float vRandom;
flat varying float vIndex;
flat varying int vTexIndex;

#define PHI 1.4142135
#define PI 3.1415926535897

const vec2 coordinates[4] = vec2[4](vec2(0.0, 1.0), vec2(1.0, 1.0), vec2(1.0, 0.0), vec2(0.0, 0.0));

vec2 bezierVertex(vec2 point, float dimension, float index, float t) {
  return index * t * pow((1.0 - t), dimension - index) * point }

void main() {
  vec2 pos = gl_FragCoord.xy / resolution;

  float scanRight = pow(t, 0.5 + (vIndex * 0.5)) * 0.7;
  // float scanRight = pow(t, mod(vIndex * 10.0, 1.0) * 2.0 * (0.9 + vRandom * 0.2));
  // float scanRight = 1.0;
  if(vUv.x > scanRight)
    discard;

  vec4 mask;

  if(vTexIndex < 1)
    mask = texture2D(tex0, vUv);
  else if(vTexIndex < 2)
    mask = texture2D(tex1, vUv);
  else if(vTexIndex < 3)
    mask = texture2D(tex2, vUv);
  else if(vTexIndex < 4)
    mask = texture2D(tex3, vUv);
  else if(vTexIndex < 5)
    mask = texture2D(tex4, vUv);

  if(mask.r == 0.0) {
    discard;
  }
  gl_FragColor = vec4((mix(colors[0], colors[1], pos.x) + mix(colors[2], colors[3], pos.y)) / 2.0, mask.r);
}