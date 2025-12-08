// script.js - robust loader + 3D hero + Lottie + GSAP reveals
(async function(){
  // helper: ensure a global lib exists or load via CDN
  async function ensureGlobal(name, src) {
    if (typeof window[name] !== 'undefined') return true;
    return new Promise((resolve, reject) => {
      const s = document.createElement('script');
      s.src = src;
      s.async = false;
      s.onload = () => resolve(true);
      s.onerror = () => reject(new Error('Failed to load ' + src));
      document.head.appendChild(s);
    });
  }

  // Ensure THREE and GSAP & Lottie (CDN paths are already included in index.html but this is a safety net)
  try {
    if (typeof THREE === 'undefined') await ensureGlobal('THREE', 'https://cdnjs.cloudflare.com/ajax/libs/three.js/r152/three.min.js');
    if (typeof gsap === 'undefined') await ensureGlobal('gsap', 'https://cdnjs.cloudflare.com/ajax/libs/gsap/3.12.2/gsap.min.js');
    if (typeof lottie === 'undefined') await ensureGlobal('lottie', 'https://cdnjs.cloudflare.com/ajax/libs/lottie-web/5.9.6/lottie.min.js');
  } catch (e) {
    console.error('Library load failed', e);
    // If THREE missing we cannot continue - exit gracefully
    if (typeof THREE === 'undefined') return;
  }

  // --- Scene setup ---
  const canvas = document.getElementById('hero-canvas');
  // protect if canvas not present
  if (!canvas) return;

  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.setSize(window.innerWidth, window.innerHeight);

  const scene = new THREE.Scene();

  // subtle background color (transparent so CSS background shows)
  renderer.setClearColor(0x000000, 0);

  const camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 100);
  camera.position.set(0, 0.6, 6);

  // lights
  const amb = new THREE.AmbientLight(0xffffff, 0.35);
  scene.add(amb);
  const key = new THREE.DirectionalLight(0xffffff, 0.9);
  key.position.set(5, 5, 5);
  scene.add(key);
  const rim = new THREE.DirectionalLight(0xff9aa2, 0.12);
  rim.position.set(-4, -2, -3);
  scene.add(rim);

  // geometry: a stylized torus-knot (nice 3D shape) with smooth material
  const geo = new THREE.TorusKnotGeometry(1.0, 0.28, 200, 32);
  const mat = new THREE.MeshStandardMaterial({
    metalness: 0.25,
    roughness: 0.45,
    envMapIntensity: 0.8,
    color: new THREE.Color(0x88c7ff)
  });
  const object = new THREE.Mesh(geo, mat);
  object.scale.set(1.3, 1.3, 1.3);
  object.position.set(0, -0.2, 0);
  scene.add(object);

  // add soft "glow" using an emissive second mesh (subtle)
  const emissiveMat = new THREE.MeshBasicMaterial({ color: 0xff6b6b, transparent: true, opacity: 0.06 });
  const glow = new THREE.Mesh(geo.clone(), emissiveMat);
  glow.scale.set(1.18, 1.18, 1.18);
  glow.position.copy(object.position);
  scene.add(glow);

  // responsive
  window.addEventListener('resize', () => {
    renderer.setSize(window.innerWidth, window.innerHeight);
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
  });

  // mouse parallax
  const mouse = { x: 0, y: 0 };
  window.addEventListener('mousemove', (e) => {
    mouse.x = (e.clientX / window.innerWidth) * 2 - 1;
    mouse.y = (e.clientY / window.innerHeight) * 2 - 1;
    const floating = document.getElementById('lottie-placeholder');
    if (floating) {
      floating.style.transform = `translate3d(${mouse.x * 18}px, ${mouse.y * 18}px, 0) rotateX(${ -mouse.y * 6 }deg) rotateY(${ mouse.x * 6 }deg)`;
    }
  }, { passive: true });

  // small particle field behind the object for depth
  const particlesCount = 420;
  const pGeo = new THREE.BufferGeometry();
  const positions = new Float32Array(particlesCount * 3);
  for (let i = 0; i < particlesCount; i++) {
    positions[i * 3 + 0] = (Math.random() - 0.5) * 12;
    positions[i * 3 + 1] = (Math.random() - 0.5) * 6;
    positions[i * 3 + 2] = (Math.random() - 0.5) * 8;
  }
  pGeo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  const pMat = new THREE.PointsMaterial({ size: 0.03, transparent: true, opacity: 0.55 });
  const particles = new THREE.Points(pGeo, pMat);
  scene.add(particles);

  // animation loop
  const clock = new THREE.Clock();
  function animate() {
    const t = clock.getElapsedTime();
    object.rotation.y += 0.005;
    object.rotation.x = Math.sin(t * 0.2) * 0.05;
    glow.rotation.copy(object.rotation);
    particles.rotation.y = t * 0.02;
    // slow camera parallax
    camera.position.x += (mouse.x * 0.6 - camera.position.x) * 0.04;
    camera.position.y += (-mouse.y * 0.35 - camera.position.y) * 0.04;
    camera.lookAt(0, 0, 0);
    renderer.render(scene, camera);
    requestAnimationFrame(animate);
  }
  animate();

  // GSAP content reveals (if gsap present)
  try {
    if (typeof gsap !== 'undefined') {
      gsap.from(".hero-left .tag", { y: 12, opacity: 0, duration: 0.7, ease: "power3.out" });
      gsap.from(".hero-left h1", { y: 26, opacity: 0, duration: 1, delay: 0.08, ease: "power3.out" });
      gsap.from(".sub", { y: 16, opacity: 0, duration: 0.9, delay: 0.2 });
      gsap.from(".hero-actions .btn", { y: 12, opacity: 0, duration: 0.8, delay: 0.3, stagger: 0.08 });
      gsap.from(".floating", { y: 6, opacity: 0, duration: 0.9, delay: 0.5 });
    }
  } catch (e) { /* ignore */ }

  // load logo-lottie.json if present
  try {
    const res = await fetch('logo-lottie.json', { method: 'HEAD' });
    if (res.ok && typeof lottie !== 'undefined') {
      lottie.loadAnimation({
        container: document.getElementById('lottie-placeholder'),
        renderer: 'svg',
        loop: true,
        autoplay: true,
        path: 'logo-lottie.json'
      });
    }
  } catch (e) { /* ignore if missing */ }

  // quick debug message
  console.info('3D hero initialized — if you do not see motion, check console for errors or try incognito/hard refresh.');
})();
