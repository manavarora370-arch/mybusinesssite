// === THREE.JS COFFEE RIPPLE BACKGROUND (updated to remove tile blocks) === //

let scene, camera, renderer, material, mesh, clock;

function initCoffee() {
  const canvas = document.getElementById("coffee-canvas");
  if (!canvas) {
    console.error("Canvas not found!");
    return;
  }

  // Scene + camera
  scene = new THREE.Scene();
  camera = new THREE.Camera();

  // Renderer: higher-quality settings to avoid tiley artifacts
  renderer = new THREE.WebGLRenderer({
    canvas: canvas,
    antialias: true,
    alpha: true,                  // allow transparent background so page content can sit above
    powerPreference: "high-performance"
  });

  // Cap pixel ratio for a balance between fidelity & perf
  const DPR = Math.min(window.devicePixelRatio || 1, 2);
  renderer.setPixelRatio(DPR);
  renderer.setSize(window.innerWidth, window.innerHeight);

  // Ensure color space is sRGB for smoother gradients (supports multiple Three.js versions)
  try {
    if ("outputColorSpace" in renderer) {
      // r152+ style
      renderer.outputColorSpace = THREE.SRGBColorSpace;
    } else if ("outputEncoding" in renderer) {
      // older versions
      renderer.outputEncoding = THREE.sRGBEncoding;
    }
  } catch (e) {
    // not fatal; continue
    console.warn("Could not set sRGB color space on renderer:", e);
  }

  // Optional: disable preserveDrawingBuffer (keeps perf better). Only enable if you need screenshots.
  // renderer.preserveDrawingBuffer = false;

  // Clock + geometry
  clock = new THREE.Clock();
  const geometry = new THREE.PlaneGeometry(2, 2);

  // Load embedded shaders (from index.html script tags)
  const vertexShader = document.getElementById("vertexShader")?.textContent || `
    precision highp float;
    attribute vec3 position;
    void main(){ gl_Position = vec4(position, 1.0); }
  `;
  const fragmentShader = document.getElementById("fragmentShader")?.textContent || `
    precision highp float;
    uniform float u_time;
    uniform vec2 u_resolution;
    uniform vec2 u_mouse;
    uniform float u_scroll;
    void main(){
      vec2 uv = gl_FragCoord.xy / u_resolution;
      gl_FragColor = vec4(vec3(uv.x, uv.y, 0.2 + 0.2*sin(u_time)), 1.0);
    }
  `;

  material = new THREE.ShaderMaterial({
    uniforms: {
      u_time: { value: 0 },
      u_mouse: { value: new THREE.Vector2(0.5, 0.5) },
      u_scroll: { value: 0 },
      u_resolution: { value: new THREE.Vector2(window.innerWidth, window.innerHeight) }
    },
    vertexShader: vertexShader,
    fragmentShader: fragmentShader,
    depthWrite: false,
    depthTest: false
  });

  mesh = new THREE.Mesh(geometry, material);
  scene.add(mesh);

  // Start loop
  animate();
}

function animate() {
  requestAnimationFrame(animate);

  if (!renderer || !material || !clock) return;

  // update uniforms
  material.uniforms.u_time.value = clock.getElapsedTime();

  // render
  renderer.render(scene, camera);
}

// Interaction updates (mouse / scroll)
window.addEventListener("mousemove", (e) => {
  if (!material) return;
  material.uniforms.u_mouse.value.set(
    e.clientX / window.innerWidth,
    1.0 - e.clientY / window.innerHeight
  );
});

window.addEventListener("scroll", () => {
  if (!material) return;
  material.uniforms.u_scroll.value = window.scrollY * 0.002;
});

window.addEventListener("resize", () => {
  if (!renderer || !material) return;
  const DPR = Math.min(window.devicePixelRatio || 1, 2);
  renderer.setPixelRatio(DPR);
  renderer.setSize(window.innerWidth, window.innerHeight);
  material.uniforms.u_resolution.value.set(window.innerWidth, window.innerHeight);
});

// init safely
try {
  initCoffee();
} catch (err) {
  console.error("initCoffee error:", err);
}
