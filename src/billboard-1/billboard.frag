uniform vec3 colors[4];
uniform vec2 resolution;
uniform float t;
uniform sampler2D tex0;
uniform sampler2D tex1;
uniform sampler2D tex2;
uniform sampler2D tex3;
uniform sampler2D tex4;

varying vec2 vUv;
varying float vRandom;
flat varying float vIndex;

#define PHI 1.4142135
#define PI 3.1415926535897

const vec2 coordinates[4] = vec2[4](vec2(0.0, 1.0), vec2(1.0, 1.0), vec2(1.0, 0.0), vec2(0.0, 0.0));

void main() {
  if(t < vIndex)
    discard;
  vec2 pos = gl_FragCoord.xy / resolution;

  vec4 mask;
  if(vRandom < 1.0)
    mask = texture2D(tex0, vUv);
  else if(vRandom < 2.0)
    mask = texture2D(tex1, vUv);
  else if(vRandom < 3.0)
    mask = texture2D(tex2, vUv);
  else if(vRandom < 4.0)
    mask = texture2D(tex3, vUv);
  else if(vRandom < 5.0)
    mask = texture2D(tex4, vUv);

  if(mask.r == 0.0) {
    discard;
  }
  gl_FragColor = vec4((mix(colors[0], colors[1], pos.x) + mix(colors[2], colors[3], pos.y)) / 2.0, mask.r * t);
}