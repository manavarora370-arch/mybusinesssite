/**
 * coffee-background.js
 * Enhanced Three.js fullscreen shader background with pointer inertia,
 * scroll parallax, adaptive pixel ratio, and graceful fallbacks.
 *
 * Usage:
 * 1. Include Three.js before this script (or attach via module loader).
 *    Example:
 *      <script src="https://unpkg.com/three@0.158.0/build/three.min.js"></script>
 *      <script src="/path/to/coffee-background.js"></script>
 * 2. Ensure you have a <canvas id="coffee-canvas"></canvas> present.
 * 3. Optional: provide 'coffee-shader.vert' and 'coffee-shader.frag' in the same folder.
 *
 * If EffectComposer (postprocessing) is available, this script will try to use it.
 */

(function () {
  'use strict';

  // ---------------------------
  // CONFIGURATION (tweak these)
  // ---------------------------
  const CONFIG = {
    canvasId: 'coffee-canvas',
    shaderVertUrl: 'coffee-shader.vert',
    shaderFragUrl: 'coffee-shader.frag',
    // Visual tuning
    pointerInfluence: 0.9,    // how strongly pointer affects ripple (0..1)
    scrollInfluence: 0.7,     // how strongly scroll affects ripple
    timeScale: 1.0,           // global time multiplier for shader
    basePixelRatio: Math.min(window.devicePixelRatio || 1, 2), // default DPR cap
    adaptive: true,           // allow adaptive DPR based on performance
    adaptiveThresholdMs: 22,  // if frame > this, reduce DPR (ms)
    minPixelRatio: 0.6,       // min DPR when adapting for perf
    fpsCheckInterval: 1000,   // ms - evaluate performance every N ms
    lowPowerMaxFPS: 30,       // when device memory / battery is low, cap to this
    resizeDebounce: 120,      // ms
    usePostprocessingIfAvailable: true
  };

  // ---------------------------
  // Basic inline fallback shaders
  // ---------------------------
  const FALLBACK_VERTEX = `
    varying vec2 vUv;
    void main() {
      vUv = uv;
      gl_Position = vec4(position, 1.0);
    }
  `;

  // Simple coffee-like ripple effect fallback fragment shader
  const FALLBACK_FRAGMENT = `
    precision highp float;
    uniform float u_time;
    uniform vec2 u_resolution;
    uniform vec2 u_mouse;
    uniform float u_scroll;
    varying vec2 vUv;

    // Simple noise-ish function (not real Perlin, but ok for fallback)
    float hash(vec2 p){ return fract(sin(dot(p, vec2(127.1,311.7))) * 43758.5453123); }
    float noise(vec2 p){
      vec2 i = floor(p);
      vec2 f = fract(p);
      float a = hash(i);
      float b = hash(i + vec2(1.0, 0.0));
      float c = hash(i + vec2(0.0, 1.0));
      float d = hash(i + vec2(1.0, 1.0));
      vec2 u = f * f * (3.0 - 2.0 * f);
      return mix(a, b, u.x) + (c - a) * u.y * (1.0 - u.x) + (d - b) * u.x * u.y;
    }

    void main() {
      vec2 uv = vUv;
      vec2 m = u_mouse.xy;
      vec2 p = uv * u_resolution.xy / min(u_resolution.x, u_resolution.y);

      float t = u_time * 0.6;
      // ripple from mouse
      float d = distance(uv, m);
      float ripple = 0.03 / (d + 0.02) * sin(8.0 * d - t * 6.0);

      // subtle animated noise
      float n = noise(uv * 6.0 + vec2(t * 0.05, t * 0.1));
      float scroll = u_scroll * 0.25;

      // base coffee color gradient
      vec3 col = mix(vec3(0.06, 0.04, 0.02), vec3(0.25, 0.16, 0.08), uv.y + scroll * 0.4);
      col += ripple * 0.6 + n * 0.04;

      // slight vignette
      float vig = smoothstep(0.95, 0.3, distance(uv, vec2(0.5)));
      col *= mix(1.0, 0.85, vig);

      gl_FragColor = vec4(col, 1.0);
    }
  `;

  // ---------------------------
  // Feature detection & globals
  // ---------------------------
  const hasThree = typeof THREE !== 'undefined' && THREE !== null;
  if (!hasThree) {
    console.warn('Three.js not found. coffee-background.js requires Three.js. Please include it before this script.');
    // We won't throw — we just stop here gracefully.
    return;
  }

  let scene, camera, renderer, mesh, material, clock;
  let composer = null; // optional postprocessing composer
  let canvasEl = document.getElementById(CONFIG.canvasId);
  if (!canvasEl) {
    // Create canvas if missing so script is more plug-n-play
    canvasEl = document.createElement('canvas');
    canvasEl.id = CONFIG.canvasId;
    canvasEl.style.position = 'fixed';
    canvasEl.style.top = '0';
    canvasEl.style.left = '0';
    canvasEl.style.width = '100vw';
    canvasEl.style.height = '100vh';
    canvasEl.style.zIndex = '-2';
    document.body.appendChild(canvasEl);
  }

  // Internal state
  const state = {
    dpr: CONFIG.basePixelRatio,
    lastFrameTime: performance.now(),
    running: true,
    lastResize: 0,
    pointer: { x: 0.5, y: 0.5, vx: 0, vy: 0 },
    targetPointer: { x: 0.5, y: 0.5 },
    scroll: 0,
    adaptiveAccumulator: 0,
    framesSinceLastCheck: 0,
    frameTimeSum: 0,
    lastPerfCheck: performance.now()
  };

  // Utility: debounce
  function debounce(fn, wait) {
    let t;
    return function (...args) {
      clearTimeout(t);
      t = setTimeout(() => fn.apply(this, args), wait);
    };
  }

  // ---------------------------
  // Shader loader with fallback
  // ---------------------------
  async function loadShaderText(url) {
    try {
      const res = await fetch(url, { cache: 'no-cache' });
      if (!res.ok) throw new Error('Shader fetch failed: ' + res.status);
      return await res.text();
    } catch (err) {
      console.warn('Could not load shader', url, err);
      return null;
    }
  }

  async function createMaterial() {
    // Try to fetch external shaders, otherwise use fallback strings
    const [vText, fText] = await Promise.all([
      loadShaderText(CONFIG.shaderVertUrl),
      loadShaderText(CONFIG.shaderFragUrl)
    ]);

    const vertexShader = vText || FALLBACK_VERTEX;
    const fragmentShader = fText || FALLBACK_FRAGMENT;

    return new THREE.ShaderMaterial({
      uniforms: {
        u_time: { value: 0 },
        u_mouse: { value: new THREE.Vector2(0.5, 0.5) },
        u_scroll: { value: 0 },
        u_resolution: { value: new THREE.Vector2(window.innerWidth, window.innerHeight) },
        u_pixel_ratio: { value: state.dpr }
      },
      vertexShader,
      fragmentShader,
      transparent: false,
      depthTest: false
    });
  }

  // ---------------------------
  // Init Three scene
  // ---------------------------
  async function init() {
    scene = new THREE.Scene();
    // Orthographic camera that sits at z=0 for a 2x2 plane; this is common for full-screen shader quads
    camera = new THREE.Camera();

    // Renderer
    renderer = new THREE.WebGLRenderer({
      canvas: canvasEl,
      antialias: true,
      alpha: false,
      powerPreference: 'high-performance'
    });

    // initial size
    resizeRenderer();

    // Attempt to use postprocessing if available (EffectComposer + RenderPass)
    if (CONFIG.usePostprocessingIfAvailable && typeof THREE.EffectComposer !== 'undefined') {
      try {
        const RenderPass = THREE.RenderPass || (window.THREE && THREE.RenderPass);
        const ShaderPass = THREE.ShaderPass || (window.THREE && THREE.ShaderPass);

        // Basic attempt to set up composer (works if you have postprocessing files)
        composer = new THREE.EffectComposer(renderer);
      } catch (err) {
        composer = null;
      }
    }

    // Prepare geometry & material
    const geometry = new THREE.PlaneGeometry(2, 2);
    material = await createMaterial();
    mesh = new THREE.Mesh(geometry, material);
    scene.add(mesh);

    clock = new THREE.Clock();

    attachEventHandlers();
    startLoop();
  }

  // ---------------------------
  // Loop & rendering
  // ---------------------------
  let rafId = null;
  function startLoop() {
    if (rafId !== null) cancelAnimationFrame(rafId);
    state.running = true;
    state.lastFrameTime = performance.now();
    rafId = requestAnimationFrame(tick);
  }

  function stopLoop() {
    state.running = false;
    if (rafId !== null) {
      cancelAnimationFrame(rafId);
      rafId = null;
    }
  }

  function tick(now) {
    rafId = requestAnimationFrame(tick);

    // Compute delta time (ms -> seconds)
    const dtMs = Math.min(100, now - state.lastFrameTime);
    const dt = dtMs / 1000;
    state.lastFrameTime = now;

    // Performance tracking for adaptive DPR
    state.framesSinceLastCheck++;
    state.frameTimeSum += dtMs;
    const elapsedPerf = now - state.lastPerfCheck;
    if (elapsedPerf >= CONFIG.fpsCheckInterval) {
      const avgFrameMs = state.frameTimeSum / Math.max(1, state.framesSinceLastCheck);
      adaptPixelRatio(avgFrameMs);
      state.framesSinceLastCheck = 0;
      state.frameTimeSum = 0;
      state.lastPerfCheck = now;
    }

    // Update pointer inertia: simple lerp towards target
    const inertia = 0.12 + (1 - CONFIG.pointerInfluence) * 0.6; // inverse mapping for smoother control
    state.pointer.vx += (state.targetPointer.x - state.pointer.x) * (1 - inertia);
    state.pointer.vy += (state.targetPointer.y - state.pointer.y) * (1 - inertia);
    state.pointer.x += state.pointer.vx;
    state.pointer.y += state.pointer.vy;

    // Decay velocity slightly
    state.pointer.vx *= 0.88;
    state.pointer.vy *= 0.88;

    // Update uniforms
    if (material && material.uniforms) {
      material.uniforms.u_time.value = clock.getElapsedTime() * CONFIG.timeScale;
      material.uniforms.u_mouse.value.set(state.pointer.x, 1 - state.pointer.y); // flip Y if shader expects that
      material.uniforms.u_scroll.value = state.scroll * CONFIG.scrollInfluence;
      if (material.uniforms.u_resolution) {
        material.uniforms.u_resolution.value.set(renderer.domElement.width, renderer.domElement.height);
      }
      if (material.uniforms.u_pixel_ratio) {
        material.uniforms.u_pixel_ratio.value = state.dpr;
      }
    }

    // Render (use composer if present)
    if (composer) {
      composer.render(dt);
    } else {
      renderer.render(scene, camera);
    }
  }

  // ---------------------------
  // Adaptive DPR based on avg frame ms
  // ---------------------------
  function adaptPixelRatio(avgFrameMs) {
    if (!CONFIG.adaptive) return;
    // If frames are slow -> reduce DPR
    if (avgFrameMs > CONFIG.adaptiveThresholdMs && state.dpr > CONFIG.minPixelRatio) {
      state.dpr = Math.max(CONFIG.minPixelRatio, state.dpr * 0.9);
      applyPixelRatio();
      // console.log('Reducing DPR to', state.dpr, 'avgFrameMs', avgFrameMs);
    } else if (avgFrameMs < CONFIG.adaptiveThresholdMs * 0.6 && state.dpr < CONFIG.basePixelRatio) {
      // If running fast, gradually restore DPR towards base
      state.dpr = Math.min(CONFIG.basePixelRatio, state.dpr * 1.075);
      applyPixelRatio();
      // console.log('Increasing DPR to', state.dpr, 'avgFrameMs', avgFrameMs);
    }
  }

  // ---------------------------
  // Resize handling
  // ---------------------------
  function resizeRenderer() {
    const w = window.innerWidth;
    const h = window.innerHeight;
    // width/height in physical pixels
    const width = Math.max(1, Math.floor(w * state.dpr));
    const height = Math.max(1, Math.floor(h * state.dpr));
    renderer.setPixelRatio(1); // we'll control pixel size manually for consistent results
    renderer.setSize(width, height, false);
    // set style size to CSS pixels
    renderer.domElement.style.width = `${w}px`;
    renderer.domElement.style.height = `${h}px`;

    // Update shader resolution uniform if present
    if (material && material.uniforms && material.uniforms.u_resolution) {
      material.uniforms.u_resolution.value.set(width, height);
    }
  }

  const debouncedResize = debounce(() => {
    resizeRenderer();
    state.lastResize = performance.now();
  }, CONFIG.resizeDebounce);

  // ---------------------------
  // Input / events
  // ---------------------------
  function attachEventHandlers() {
    // Pointer support
    function onPointerMove(e) {
      let x, y;
      if (e.touches && e.touches.length) {
        x = e.touches[0].clientX;
        y = e.touches[0].clientY;
      } else {
        x = e.clientX;
        y = e.clientY;
      }
      state.targetPointer.x = x / window.innerWidth;
      state.targetPointer.y = y / window.innerHeight;
    }

    window.addEventListener('mousemove', onPointerMove, { passive: true });
    window.addEventListener('touchstart', onPointerMove, { passive: true });
    window.addEventListener('touchmove', onPointerMove, { passive: true });

    // scroll influence
    window.addEventListener('scroll', () => {
      state.scroll = window.scrollY / (document.body.scrollHeight || 1);
    }, { passive: true });

    // resize
    window.addEventListener('resize', debouncedResize, { passive: true });

    // Visibility: stop rendering when tab hidden
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) stopLoop();
      else startLoop();
    });

    // Optional: pointerleave -> slowly return pointer to center
    window.addEventListener('mouseleave', () => {
      state.targetPointer.x = 0.5;
      state.targetPointer.y = 0.5;
    });

    // Keyboard shortcut to toggle pause (for dev)
    window.addEventListener('keydown', (e) => {
      if ((e.key === 'p' || e.key === 'P') && (e.ctrlKey || e.metaKey)) {
        state.running ? stopLoop() : startLoop();
      }
    });
  }

  // ---------------------------
  // Utilities: expose minimal API for runtime control
  // ---------------------------
  const API = {
    setPointerInfluence(v) { CONFIG.pointerInfluence = Math.min(1, Math.max(0, v)); },
    setScrollInfluence(v) { CONFIG.scrollInfluence = Math.min(1, Math.max(0, v)); },
    setTimeScale(v) { CONFIG.timeScale = Math.max(0, v); },
    setPixelRatio(v) { state.dpr = Math.max(CONFIG.minPixelRatio, Math.min(CONFIG.basePixelRatio, v)); applyPixelRatio(); },
    pause() { stopLoop(); },
    resume() { startLoop(); }
  };

  function applyPixelRatio() {
    resizeRenderer();
    if (material && material.uniforms && material.uniforms.u_pixel_ratio) {
      material.uniforms.u_pixel_ratio.value = state.dpr;
    }
  }

  // ---------------------------
  // Init sequence
  // ---------------------------
  (async function start() {
    try {
      await init();

      // initial render frame (in case we want a first paint right away)
      renderer.render(scene, camera);
      // expose API for debugging (window scope)
      window.CoffeeBG = API;

      // Adaptive low-power detection (optional)
      try {
        if (navigator.getBattery) {
          navigator.getBattery().then(batt => {
            if (batt && batt.level !== undefined && batt.level < 0.25) {
              // Lower DPR if battery is low
              state.dpr = Math.min(state.dpr, 1.0);
              applyPixelRatio();
            }
          });
        }
        if ('connection' in navigator && navigator.connection) {
          const c = navigator.connection;
          if (c.saveData || (c.effectiveType && (c.effectiveType.indexOf('2g') !== -1))) {
            state.dpr = Math.min(state.dpr, 1.0);
            applyPixelRatio();
          }
        }
      } catch (err) {
        // ignore detection errors
      }

    } catch (err) {
      console.error('coffee-background initialization failed', err);
    }
  })();

  // Expose small debug helper in case you want to manually update pointer or scroll from other code
  window.__coffeeBG_internal = {
    state,
    material,
    renderer,
    scene,
    camera
  };

})();
