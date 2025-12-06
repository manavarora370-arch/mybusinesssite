// script.js
// Enhanced three.js shader + particles + GSAP scroll/entry animations
// Expects coffee-shader.vert & coffee-shader.frag to exist (or use built-in shaders below)

(async function(){
  // attempt to load external shader files, fallback to inline shader if fetch fails
  async function loadText(url){
    try {
      const r = await fetch(url);
      if(!r.ok) throw new Error('no');
      return await r.text();
    } catch(e){
      return null;
    }
  }

  const vert = await loadText('coffee-shader.vert');
  const frag = await loadText('coffee-shader.frag');

  const vertexShader = vert || `
  varying vec2 vUv;
  uniform float uTime;
  void main(){
    vUv = uv;
    vec3 p = position;
    float freq = 1.6;
    float amp = 0.35;
    p.z += sin((p.x + uTime * 0.8) * freq) * amp + cos((p.y - uTime * 0.5) * freq) * amp * 0.6;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(p,1.0);
  }
  `;
  const fragmentShader = frag || `
  varying vec2 vUv;
  uniform float uTime;
  void main(){
    vec3 col1 = vec3(0.02, 0.09, 0.12);
    vec3 col2 = vec3(0.05, 0.35, 0.28);
    vec3 col3 = vec3(0.9, 0.4, 0.45);
    float g = smoothstep(0.0,1.0,vUv.y + 0.1*sin(uTime*0.2 + vUv.x*6.0));
    vec3 color = mix(col1, col2, g);
    color = mix(color, col3, pow(vUv.x, 2.0)*0.12);
    float vign = smoothstep(0.7, 0.15, distance(vUv, vec2(0.5)));
    color *= (1.0 - 0.5 * vign);
    gl_FragColor = vec4(color, 1.0);
  }
  `;

  /* three.js setup */
  const canvas = document.getElementById('hero-canvas');
  const renderer = new THREE.WebGLRenderer({ canvas, antialias:true, alpha:true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setSize(window.innerWidth, window.innerHeight);

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(48, window.innerWidth/window.innerHeight, 0.1, 1000);
  camera.position.set(0,0,6);

  const clock = new THREE.Clock();

  const planeGeo = new THREE.PlaneGeometry(16,9,80,80);
  const planeMat = new THREE.ShaderMaterial({
    vertexShader,
    fragmentShader,
    uniforms:{ uTime:{ value: 0 } },
    side: THREE.DoubleSide
  });
  const plane = new THREE.Mesh(planeGeo, planeMat);
  plane.scale.set(1.12,1.12,1);
  plane.rotation.x = -0.05;
  plane.position.z = -2;
  scene.add(plane);

  // subtle particle field
  const pCount = 480;
  const pGeo = new THREE.BufferGeometry();
  const pos = new Float32Array(pCount * 3);
  for(let i=0;i<pCount;i++){
    pos[i*3+0] = (Math.random()-0.5) * 16;
    pos[i*3+1] = (Math.random()-0.5) * 10;
    pos[i*3+2] = (Math.random()-0.5) * 8;
  }
  pGeo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  const pMat = new THREE.PointsMaterial({ size: 0.03, transparent: true, opacity: 0.6 });
  const points = new THREE.Points(pGeo, pMat);
  scene.add(points);

  // resize
  function onResize(){
    renderer.setSize(window.innerWidth, window.innerHeight);
    camera.aspect = window.innerWidth/window.innerHeight;
    camera.updateProjectionMatrix();
  }
  window.addEventListener('resize', onResize, { passive:true });

  // mouse parallax
  const mouse = { x:0, y:0 };
  window.addEventListener('mousemove', (e)=>{
    mouse.x = (e.clientX / window.innerWidth) * 2 - 1;
    mouse.y = (e.clientY / window.innerHeight) * 2 - 1;
  });

  function animate(){
    const t = clock.getElapsedTime();
    planeMat.uniforms.uTime.value = t;
    points.rotation.y = t * 0.018;
    // camera parallax
    camera.position.x += (mouse.x * 0.8 - camera.position.x) * 0.06;
    camera.position.y += (-mouse.y * 0.5 - camera.position.y) * 0.06;
    camera.lookAt(0,0,0);
    renderer.render(scene, camera);
    requestAnimationFrame(animate);
  }
  animate();

  /* Floating card micro-interaction */
  const floating = document.getElementById('lottie-placeholder');
  window.addEventListener('mousemove', (e)=>{
    const rx = (e.clientX / window.innerWidth) - 0.5;
    const ry = (e.clientY / window.innerHeight) - 0.5;
    if(floating){
      floating.style.transform = `translate3d(${rx * 18}px, ${ry * 18}px, 0) rotateX(${ -ry * 6 }deg) rotateY(${ rx * 7 }deg)`;
    }
  });

  /* GSAP animations for content reveal */
  gsap.registerPlugin(ScrollTrigger);

  // hero entrance
  gsap.from(".hero-left .tag", { y: 12, opacity:0, duration:0.7, ease:"power3.out" });
  gsap.from(".hero-left h1", { y: 30, opacity:0, duration:1.1, delay:0.08, ease:"power3.out" });
  gsap.from(".sub", { y: 18, opacity:0, duration:0.9, delay:0.22 });
  gsap.from(".hero-actions .btn", { y: 12, opacity:0, duration:0.8, delay:0.36, stagger:0.08 });

  // section reveals
  document.querySelectorAll('.section').forEach((sec)=>{
    gsap.from(sec.querySelectorAll('h2, .section-sub, .service-card, .project, .price-card, .member, .contact-form, .contact-info'), {
      scrollTrigger: { trigger: sec, start: "top 80%" },
      y: 26, opacity: 0, duration: 0.9, stagger: 0.08, ease: "power3.out"
    });
  });

  // subtle pulse on recommended pricing
  gsap.to(".price-card.recommended", { y: -4, repeat: -1, yoyo: true, ease: "sine.inOut", duration: 2 });

  /* Optional: Lottie integration notes (uncomment if lottie script included)
    // Example: load a Lottie animation into #lottie-placeholder
    // lottie.loadAnimation({ container: document.getElementById('lottie-placeholder'), renderer: 'svg', loop:true, autoplay:true, path: 'your-lottie.json' });
  */

})();
