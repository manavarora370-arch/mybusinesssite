// coffee-shader.vert
#ifdef GL_ES
precision mediump float;
#endif

attribute vec3 position;
attribute vec2 uv;
uniform mat4 projectionMatrix;
uniform mat4 modelViewMatrix;
uniform float uTime;
varying vec2 vUv;

void main(){
  vUv = uv;
  vec3 pos = position;
  float freq = 1.6;
  float amp = 0.35;
  pos.z += sin((pos.x + uTime * 0.8) * freq) * amp + cos((pos.y - uTime * 0.5) * freq) * amp * 0.6;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
}
