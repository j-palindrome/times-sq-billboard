varying vec2 vUv;
varying vec3 vRandom;
uniform vec3 colors[4];
uniform vec2 resolution;
uniform sampler2D tex;

#define PHI 1.4142135

const vec2 coordinates[4] = vec2[4](vec2(0.0, 1.0), vec2(1.0, 1.0), vec2(1.0, 0.0), vec2(0.0, 0.0));

void main() {
  float pi = 3.1415926535897 * 0.3;
  vec3 color = vec3(0.0, 0.0, 0.0);
  vec2 pos = gl_FragCoord.xy / resolution;

  vec4 mask = texture2D(tex, vUv);
  if(mask.a == 0.0) {
    discard;
  }
  gl_FragColor = vec4((mix(colors[0], colors[1], pos.x) + mix(colors[2], colors[3], pos.y)) / 2.0, mask.a);
}