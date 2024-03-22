uniform vec3 colors[4];
uniform vec2 resolution;
uniform float t;
uniform float points;

varying vec2 vUv;
varying float vRandom;
flat varying float vIndex;
flat varying int vTexIndex;
flat varying vec2 vBezierPoints[8];

#define PHI 1.4142135
#define PI 3.1415926535897
#define DIM 7.0
#define POINTS 100.0
#define RADIUS 0.01
#define POINT_PROGRESS 0.005

vec2 bezierVertex(vec2 point, float dimension, float index, float t) {
  float value = pow(1.0 - t, dimension - index) * pow(t, index);
  if(index != 0.0 && index != dimension)
    value *= dimension;
  return vec2(value, value) * point;
}

bool isInCircle(vec2 point, vec2 center, float radius) {
  return length(point - center) < radius;
}

const vec2 coordinates[4] = vec2[4](vec2(0.0, 1.0), vec2(1.0, 1.0), vec2(1.0, 0.0), vec2(0.0, 0.0));

void main() {
  float progress = pow(t, 0.2 + (vIndex * 0.8));
  vec2 pos = gl_FragCoord.xy / resolution;

  // vec2 bezierPoint = toBezier(t, vBezierPoints[0], vBezierPoints[1], vBezierPoints[2], vBezierPoints[3]);
  // if(isInCircle(vUv, bezierPoint, 0.01) == false && (vUv.x < 0.01 == false) && (vUv.y < 0.01 == false))
  bool isInCurve = false;

  vec2 lastBezierPoint = vBezierPoints[0];
  float totalLength;

  float speeds[10] = float[10](0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0);
  for(int i = 1; i < 10; i++) {
    float t = float(i) / 10.0;
    vec2 bezierPoint = bezierVertex(vBezierPoints[0], DIM, 0.0, t) + bezierVertex(vBezierPoints[1], DIM, 1.0, t) + bezierVertex(vBezierPoints[2], DIM, 2.0, t) + bezierVertex(vBezierPoints[3], DIM, 3.0, t) + bezierVertex(vBezierPoints[4], DIM, 4.0, t) + bezierVertex(vBezierPoints[5], DIM, 5.0, t) + bezierVertex(vBezierPoints[6], DIM, 6.0, t) + bezierVertex(vBezierPoints[7], DIM, 7.0, t);
    float distance = length(bezierPoint - lastBezierPoint);
    speeds[i - 1] = distance;
    totalLength += distance;
    lastBezierPoint = bezierPoint;
  }

  float averageLength = totalLength / 10.0;
  for(int i = 0; i < speeds.length(); i++) {
    // speed parameter: higher than 1 when length is long, lower when length is short.
    speeds[i] = averageLength / speeds[i];
    // speeds[i] = speeds[i] / averageLength;
  }

  float mappedT = 0.0;
  for(float i = 0.0; i < progress; i += POINT_PROGRESS) {
    // arcs with a higher SPEED should be more gradually progressed.
    float thisArc = speeds[int(floor(i * 10.0))];

    // iterate 100 times through, adding the proper curvature to T to interpolate the current value.
    mappedT += thisArc * POINT_PROGRESS;
  }

  mappedT = max(0.0, min(1.0, mappedT));
  // mappedT = t;

  for(float i = 0.0; i < mappedT; i += POINT_PROGRESS) {
    vec2 bezierPoint = bezierVertex(vBezierPoints[0], DIM, 0.0, i) +
      bezierVertex(vBezierPoints[1], DIM, 1.0, i) +
      bezierVertex(vBezierPoints[2], DIM, 2.0, i) +
      bezierVertex(vBezierPoints[3], DIM, 3.0, i) +
      bezierVertex(vBezierPoints[4], DIM, 4.0, i) +
      bezierVertex(vBezierPoints[5], DIM, 5.0, i) +
      bezierVertex(vBezierPoints[6], DIM, 6.0, i) +
      bezierVertex(vBezierPoints[7], DIM, 7.0, i);

    if(isInCircle(vUv, bezierPoint, RADIUS)) {
      isInCurve = true;
      break;
    };
  }

  if(isInCurve == false)
    discard;

  // float scanRight = pow(t, 0.5 + (vIndex * 0.5)) * 0.7;
  // // float scanRight = pow(t, mod(vIndex * 10.0, 1.0) * 2.0 * (0.9 + vRandom * 0.2));
  // // float scanRight = 1.0;
  // if(vUv.x > scanRight)
  //   discard;

  gl_FragColor = vec4((mix(colors[0], colors[1], pos.x) + mix(colors[2], colors[3], pos.y)) / 2.0, 1.0);
}