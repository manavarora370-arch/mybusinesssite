// script.js - lightweight Three.js hero + graceful fallback
(function(){
  const canvas = document.getElementById('hero-canvas');
  if (!canvas) return;

  // try to use THREE if available
  if (typeof THREE === 'undefined') {
    console.warn('Three.js not loaded — hero will be static.');
    return;
  }

  // renderer
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha:true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio||1, 2));
  function resize() {
    renderer.setSize(window.innerWidth, window.innerHeight);
  }
  resize();
  window.addEventListener('resize', resize);

  // scene + camera
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(45, window.innerWidth/window.innerHeight, 0.1, 100);
  camera.position.set(0, 0.8, 6);

  scene.add(new THREE.AmbientLight(0xffffff, 0.4));
  const light = new THREE.DirectionalLight(0xffffff, 0.8); light.position.set(5,5,5); scene.add(light);

  // background plane with simple shader-like color using MeshBasicMaterial gradient via texture
  const geom = new THREE.PlaneGeometry(16, 9, 1, 1);
  const mat = new THREE.MeshBasicMaterial({ color: 0x0b0b0b });
  const plane = new THREE.Mesh(geom, mat);
  plane.position.z = -2;
  scene.add(plane);

  // torus knot (fallback)
  const knotGeo = new THREE.TorusKnotGeometry(1.0, 0.27, 120, 32);
  const knotMat = new THREE.MeshStandardMaterial({ color: 0x7a4b2a, metalness:0.3, roughness:0.5 });
  const knot = new THREE.Mesh(knotGeo, knotMat);
  knot.position.set(0, -0.2, 0);
  knot.scale.set(1.1,1.1,1.1);
  scene.add(knot);

  // simple particles
  const pts = new THREE.BufferGeometry();
  const cnt = 200;
  const positions = new Float32Array(cnt*3);
  for (let i=0;i<cnt;i++){
    positions[i*3+0] = (Math.random()-0.5)*12;
    positions[i*3+1] = (Math.random()-0.5)*6;
    positions[i*3+2] = (Math.random()-0.5)*8;
  }
  pts.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  const pMat = new THREE.PointsMaterial({ size:0.03, color:0xd4a37e, opacity:0.6, transparent:true });
  const particles = new THREE.Points(pts, pMat);
  scene.add(particles);

  // animation
  const clock = new THREE.Clock();
  function animate(){
    const t = clock.getElapsedTime();
    knot.rotation.y += 0.006;
    knot.rotation.x = Math.sin(t*0.2)*0.04;
    particles.rotation.y = t*0.02;
    renderer.render(scene, camera);
    requestAnimationFrame(animate);
  }
  animate();
})();
