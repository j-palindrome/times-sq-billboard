#version 300 es
precision mediump float;
in vec4 v_color;
out vec4 fragColor;

void main() {
  if(distance(gl_PointCoord, vec2(0.5f, 0.5f)) > 0.5f)
    discard;
  fragColor = vec4(1.0f, 1.0f, 1.0f, 0.8f);
}