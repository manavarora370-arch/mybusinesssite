#ifdef GL_ES
precision mediump float;
#endif

varying vec2 vUv;
uniform float uTime;

float noise(vec2 p){
  return fract(sin(dot(p, vec2(12.9898,78.233)))*43758.5453);
}

void main(){
  vec2 uv=vUv;

  float t=uTime*0.2;
  float n=noise(uv*5.0+t);

  vec3 col1=vec3(0.95,0.45,0.4);
  vec3 col2=vec3(0.2,0.45,0.55);
  vec3 col3=vec3(0.06,0.12,0.18);

  float g=smoothstep(0.0,1.0,uv.x+0.1*sin(uTime+uv.y*5.0));
  vec3 base=mix(col1,col2,g);
  base=mix(base,col3,uv.y*0.7);
  base+=0.15*n;

  float vign=smoothstep(0.7,0.3,distance(uv,vec2(0.5)));
  base*=1.0-(vign*0.5);

  gl_FragColor=vec4(base,1.0);
}
