// coffee-shader.frag
#ifdef GL_ES
precision mediump float;
#endif

varying vec2 vUv;
uniform float uTime;

void main(){
  vec3 col1 = vec3(0.02, 0.09, 0.12);
  vec3 col2 = vec3(0.05, 0.35, 0.28);
  vec3 col3 = vec3(0.9, 0.4, 0.45);
  float g = smoothstep(0.0, 1.0, vUv.y + 0.1 * sin(uTime * 0.2 + vUv.x * 6.0));
  vec3 color = mix(col1, col2, g);
  color = mix(color, col3, pow(vUv.x, 2.0) * 0.12);
  float vign = smoothstep(0.7, 0.15, distance(vUv, vec2(0.5)));
  color *= (1.0 - 0.5 * vign);
  gl_FragColor = vec4(color, 1.0);
}
