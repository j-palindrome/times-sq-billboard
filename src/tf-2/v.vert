#version 300 es

in vec2 a_positionIn;
in vec2 a_velocity;
in vec4 a_color;
in float a_speedIn;

out vec2 a_positionOut;
out vec4 v_color;
out float a_speedOut;
out float a_audioOut;

uniform float u_deltaTime;
uniform float u_time;
uniform sampler2D u_sampler;
uniform float u_circleSize;
uniform float u_speed;

void main() {
  vec2 normVel = normalize(a_velocity);
  vec4 speedSample = texture(u_sampler, mod((a_positionIn * 0.5f + 0.5f) + normVel * u_circleSize, 1.0f)) * u_speed;
  a_positionOut = mod(a_positionIn + 1.0f + normVel * a_speedIn * 0.01f, vec2(2)) - 1.0f;
  float min_spd = 0.01f;
  a_speedOut = min_spd + ((1.0f - min_spd) * pow(speedSample.w, 0.8f));
  // project the velocity vector onto (1, 0) and see how it compares. 
  // a_audioOut = length(cross(normVel, vec2(1.0, 0.0)));
  // a_audioOut = a_speedOut * normVel.x;
  a_audioOut = (a_speedIn - a_speedOut) * normVel.x;
  // a_audioOut = 1.0f;
  v_color = a_color;

  gl_PointSize = 1.0f;
  gl_Position = vec4(a_positionOut, 0.0f, 1.0f);
}
