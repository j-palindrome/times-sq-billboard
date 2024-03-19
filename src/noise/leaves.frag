varying vec2 vUv;
varying vec3 uRandom;
varying float lengthTest;

void main() {
  float pi = 3.1415926535897 * 0.3;
  float alpha = lengthTest;
  if(lengthTest == 0.0)
    alpha = 1.0;
  gl_FragColor = vec4(1.0, 1.0, 1.0, alpha);
}