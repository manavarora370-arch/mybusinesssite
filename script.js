// === THREE.JS COFFEE RIPPLE BACKGROUND (robust) === //

let scene, camera, renderer, material, mesh, clock;
let uniforms = null;
let rafId = null;
let isWebGL = true;

function supportsWebGL() {
  try {
    const canvas = document.createElement('canvas');
    return !!(window.WebGLRenderingContext && (canvas.getContext('webgl') || canvas.getContext('experimental-webgl')));
  } catch (e) {
    return false;
  }
}

function makeFallback() {
  // If WebGL not available, style body to a nice fallback color and stop.
  document.body.style.background = '#efe6d0'; // light coffee fallback
  const canvas = document.getElementById('coffee-canvas');
  if (canvas) canvas.style.display = 'none';
  console.warn('WebGL not supported — using fallback style.');
}

async function loadText(url) {
  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) throw new Error(`Failed to load ${url}: ${res.status}`);
  return await res.text();
}

async function initCoffee() {
  if (!supportsWebGL()) {
    isWebGL = false;
    makeFallback();
    return;
  }

  const canvas = document.getElementById("coffee-canvas");
  if (!canvas) {
    console.error('Missing #coffee-canvas element.');
    return;
  }

  scene = new THREE.Scene();
  camera = new THREE.Camera();

  // renderer
  renderer = new THREE.WebGLRenderer({ canvas: canvas, antialias: true, alpha: false });
  const DPR = Math.min(window.devicePixelRatio || 1, 2);
  renderer.setPixelRatio(DPR);
  renderer.setSize(window.innerWidth, window.innerHeight, false);

  clock = new THREE.Clock();

  // geometry
  const geometry = new THREE.PlaneGeometry(2, 2);

  // placeholder material while we load shaders (prevents immediate errors)
  material = new THREE.ShaderMaterial({
    uniforms: {
      u_time: { value: 0 },
      u_mouse: { value: new THREE.Vector2(0.5, 0.5) },
      u_scroll: { value: 0 },
      u_resolution: { value: new THREE.Vector2(window.innerWidth, window.innerHeight) }
    },
    vertexShader: 'void main(){ gl_Position = vec4(position, 1.0); }',
    fragmentShader: 'void main(){ gl_FragColor = vec4(0.16,0.11,0.06,1.0); }',
    depthTest: false
  });

  // Mesh
  mesh = new THREE.Mesh(geometry, material);
  scene.add(mesh);

  // load shaders (vertex + fragment), then replace the material shaders
  try {
    const [vsrc, fsrc] = await Promise.all([
      loadText('coffee-shader.vert'),
      loadText('coffee-shader.frag')
    ]);

    // update material with real shaders and uniforms
    material.vertexShader = vsrc;
    material.fragmentShader = fsrc;
    // ensure our uniforms object is the one the shader expects
    material.uniforms = {
      u_time: { value: 0 },
      u_mouse: { value: new THREE.Vector2(0.5, 0.5) },
      u_scroll: { value: 0 },
      u_resolution: { value: new THREE.Vector2(window.innerWidth, window.innerHeight) }
    };

    uniforms = material.uniforms;
    material.needsUpdate = true;

    // start animation loop after shader compiled
    startLoop();
  } catch (err) {
    console.error('Failed to load shaders:', err);
    // keep fallback color on canvas
    renderer.setClearColor(0xefe6d0, 1);
    startLoop(); // still animate simple base
  }

  // event listeners
  window.addEventListener('mousemove', onMouseMove, { passive: true });
  window.addEventListener('touchmove', onTouchMove, { passive: true });
  window.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('resize', onResize);
}

function onMouseMove(e) {
  if (!uniforms) return;
  uniforms.u_mouse.value.set(e.clientX / window.innerWidth, 1 - e.clientY / window.innerHeight);
}

function onTouchMove(e) {
  if (!uniforms || !e.touches || e.touches.length === 0) return;
  const t = e.touches[0];
  uniforms.u_mouse.value.set(t.clientX / window.innerWidth, 1 - t.clientY / window.innerHeight);
}

function onScroll() {
  if (!uniforms) return;
  // scale scroll to small value to control strength
  uniforms.u_scroll.value = window.scrollY * 0.002;
}

function onResize() {
  if (!renderer || !material) return;
  const w = window.innerWidth;
  const h = window.innerHeight;
  renderer.setSize(w, h, false);
  if (uniforms && uniforms.u_resolution) {
    uniforms.u_resolution.value.set(w, h);
  }
}

function startLoop() {
  if (rafId) cancelAnimationFrame(rafId);
  function loop() {
    const t = clock.getElapsedTime();
    if (uniforms && uniforms.u_time) uniforms.u_time.value = t;
    // render only if renderer/material exists
    if (renderer && scene && camera) {
      renderer.render(scene, camera);
    }
    rafId = requestAnimationFrame(loop);
  }
  rafId = requestAnimationFrame(loop);
}

function destroy() {
  // cleanup listeners and GL resources
  window.removeEventListener('mousemove', onMouseMove);
  window.removeEventListener('touchmove', onTouchMove);
  window.removeEventListener('scroll', onScroll);
  window.removeEventListener('resize', onResize);
  if (rafId) cancelAnimationFrame(rafId);
  if (renderer) {
    renderer.dispose();
    renderer.forceContextLoss();
    renderer.domElement = null;
  }
  scene = camera = renderer = material = mesh = clock = uniforms = null;
}

// init on DOM ready
if (document.readyState === 'complete' || document.readyState === 'interactive') {
  initCoffee();
} else {
  window.addEventListener('DOMContentLoaded', initCoffee);
}
