(async function(){

function loadText(path){
  return fetch(path).then(r=>r.ok?r.text():null).catch(()=>null);
}

const vert = await loadText("coffee-shader.vert");
const frag = await loadText("coffee-shader.frag");

const vertexShader = vert || `
varying vec2 vUv; 
void main(){ vUv=uv; gl_Position = projectionMatrix*modelViewMatrix*vec4(position,1.0); }
`;

const fragmentShader = frag || `
varying vec2 vUv;
void main(){ gl_FragColor = vec4(vUv.x, vUv.y, 0.3, 1.0); }
`;

const canvas = document.getElementById("hero-canvas");
const renderer = new THREE.WebGLRenderer({canvas,antialias:true,alpha:true});
renderer.setSize(window.innerWidth,window.innerHeight);

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(48,window.innerWidth/window.innerHeight,0.1,100);
camera.position.z = 6;

const plane = new THREE.Mesh(
  new THREE.PlaneGeometry(16,9,80,80),
  new THREE.ShaderMaterial({
    vertexShader,
    fragmentShader,
    uniforms:{uTime:{value:0}}
  })
);
plane.position.z = -3;
scene.add(plane);

const geo = new THREE.TorusKnotGeometry(1,0.3,120,20);
const mat = new THREE.MeshStandardMaterial({metalness:0.2,roughness:0.4});
const model = new THREE.Mesh(geo,mat);
scene.add(model);

scene.add(new THREE.AmbientLight(0xffffff,0.3));
const dl = new THREE.DirectionalLight(0xffffff,0.6);
dl.position.set(5,5,5);
scene.add(dl);

window.addEventListener("resize",()=>{
  renderer.setSize(window.innerWidth,window.innerHeight);
  camera.aspect=window.innerWidth/window.innerHeight;
  camera.updateProjectionMatrix();
});

const clock = new THREE.Clock();
function animate(){
  const t=clock.getElapsedTime();
  plane.material.uniforms.uTime.value=t;
  model.rotation.y += 0.01;
  renderer.render(scene,camera);
  requestAnimationFrame(animate);
}
animate();

try{
  const r = await fetch("logo-lottie.json",{method:"HEAD"});
  if(r.ok){
    lottie.loadAnimation({
      container:document.getElementById("lottie-placeholder"),
      renderer:"svg", loop:true, autoplay:true,
      path:"logo-lottie.json"
    });
  }
}catch(e){}

})();
