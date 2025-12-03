precision highp float;

uniform float u_time;
uniform vec2 u_resolution;
uniform vec2 u_mouse;
uniform float u_scroll;

float ripple(vec2 uv, vec2 center, float speed, float scale) {
  float d = distance(uv, center);
  return sin(d * scale - u_time * speed) / (d * 12.0 + 0.8);
}

void main() {
  vec2 uv = gl_FragCoord.xy / u_resolution.xy;
  
  float base = 0.1;

  float r1 = ripple(uv, u_mouse, 3.5, 18.0);
  float r2 = ripple(uv, vec2(0.5), 2.2, 9.0);
  float r3 = ripple(uv, vec2(0.3, 0.7), 1.8, 14.0);

  float effect = r1 + r2 + r3 + u_scroll * 0.15;

  vec3 coffee = vec3(0.24, 0.15, 0.07);

  vec3 color = coffee + effect * 0.25;

  gl_FragColor = vec4(color, 1.0);
}
