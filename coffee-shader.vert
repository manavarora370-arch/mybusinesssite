varying vec2 vUv;
uniform float uTime;

void main(){
  vUv = uv;
  vec3 p = position;
  p.z += sin((p.x + uTime)*2.0)*0.2;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(p,1.0);
}
