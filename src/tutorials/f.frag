uniform float t;
uniform vec3 colors[4];
uniform vec2 resolution;

varying float vProgress;
varying float vRandom;

const vec2 coordinates[4] = vec2[4](vec2(0.0, 1.0), vec2(1.0, 1.0), vec2(1.0, 0.0), vec2(0.0, 0.0));

void main() {
  float t0 = pow(t, vRandom);
  float t1 = pow(t, 1.0 - vRandom);
  // if(vProgress > max(t0, t1))
  //   discard;
  // if(vProgress < min(t0, t1))
  //   discard;
  if(vProgress > pow(t, vRandom * 1.5 + 0.5))
    discard;
  if(vProgress < pow(t, vRandom * 5.0))
    discard;

  vec2 pos = gl_FragCoord.xy / resolution;
  // quadratic: y = 1 - (2x - 1) ** 2
  // gl_FragColor = vec4(mix(vec3(1.0, 1.0, 1.0), (mix(colors[0], colors[1], pos.x) + mix(colors[2], colors[3], pos.y)), (1.0 - pow(2.0 * t - 1.0, 2.0)) * 0.5) / 2.0, 1.0);
  gl_FragColor = vec4(1.0, 1.0, 1.0, 1.0);
}