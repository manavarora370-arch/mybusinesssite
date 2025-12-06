// script.js
// Loads external shader files (coffee-shader.vert & coffee-shader.frag), sets up three.js, particles and UI animations.

(async function(){
  // fetch shaders
  const vertText = await fetch('coffee-shader.vert').then(r => r.text());
  const fragText = await fetch('coffee-shader.frag').then(r => r.text());

  const canvas = document.getElementById('hero-canvas');
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setSize(window.innerWidth, window.innerHeight);

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(50, window.innerWidth/window.innerHeight, 0.1, 1000);
  camera.position.set(0,0,6);

  const clock = new THREE.Clock();

  const planeGeo = new THREE.PlaneGeometry(16,9,64,64);
  const planeMat = new THREE.ShaderMaterial({
    vertexShader: vertText,
    fragmentShader: fragText,
    uniforms: { uTime: { value: 0 } },
    side: THREE.DoubleSide
  });

  const plane = new THREE.Mesh(planeGeo, planeMat);
  plane.scale.set(1.2,1.2,1);
  plane.rotation.x = -0.05;
  plane.position.z = -2;
  scene.add(plane);

  const particleCount = 350;
  const pGeo = new THREE.BufferGeometry();
  const positions = new Float32Array(particleCount * 3);
  for(let i=0;i<particleCount;i++){
    positions[i*3+0] = (Math.random() - 0.5) * 14;
    positions[i*3+1] = (Math.random() - 0.5) * 8;
    positions[i*3+2] = (Math.random() - 0.5) * 6;
  }
  pGeo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  const pMat = new THREE.PointsMaterial({ size: 0.035, transparent: true, opacity: 0.65 });
  const particles = new THREE.Points(pGeo, pMat);
  scene.add(particles);

  function onResize(){
    const w = window.innerWidth, h = window.innerHeight;
    renderer.setSize(w,h);
    camera.aspect = w/h;
    camera.updateProjectionMatrix();
  }
  window.addEventListener('resize', onResize, { passive: true });

  const mouse = { x:0, y:0 };
  window.addEventListener('mousemove', (e)=>{
    mouse.x = (e.clientX / window.innerWidth) * 2 - 1;
    mouse.y = (e.clientY / window.innerHeight) * 2 - 1;
  });

  function animate(){
    const t = clock.getElapsedTime();
    planeMat.uniforms.uTime.value = t;
    particles.rotation.y = t * 0.02;
    camera.position.x += (mouse.x * 0.8 - camera.position.x) * 0.05;
    camera.position.y += (-mouse.y * 0.6 - camera.position.y) * 0.05;
    camera.lookAt(0,0,0);
    renderer.render(scene, camera);
    requestAnimationFrame(animate);
  }
  animate();

  // UI interactions
  const card = document.getElementById('floating-card');
  window.addEventListener('mousemove', (e)=>{
    const rx = (e.clientX / window.innerWidth) - 0.5;
    const ry = (e.clientY / window.innerHeight) - 0.5;
    if(card){
      card.style.transform = `translate3d(${rx * 18}px, ${ry * 18}px, 0) rotateX(${ -ry * 6 }deg) rotateY(${ rx * 8 }deg)`;
    }
  });

  // GSAP animations
  gsap.registerPlugin(ScrollTrigger);
  gsap.from(".hero-left h1", { y: 40, opacity:0, duration:1.05, ease:"power3.out", delay:0.2 });
  gsap.from(".lead", { y: 20, opacity:0, duration:0.9, ease:"power3.out", delay:0.45 });
  gsap.from(".btn", { y: 12, opacity:0, duration:0.7, stagger:0.08, delay:0.7 });

  gsap.utils.toArray('.card').forEach((el)=>{
    gsap.from(el, {
      scrollTrigger:{ trigger: el, start: "top 80%" },
      y: 30, opacity: 0, duration: 0.9, ease: "power3.out"
    });
  });

})();
