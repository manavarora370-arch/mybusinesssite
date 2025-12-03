// === THREE.JS COFFEE RIPPLE BACKGROUND === //

let scene, camera, renderer, material, mesh, clock;

function initCoffee() {
  const canvas = document.getElementById("coffee-canvas");
  if (!canvas) {
    console.error("Canvas not found!");
    return;
  }

  scene = new THREE.Scene();
  camera = new THREE.Camera();

  renderer = new THREE.WebGLRenderer({
    canvas: canvas,
    antialias: true
  });
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setPixelRatio(window.devicePixelRatio);

  clock = new THREE.Clock();

  const geometry = new THREE.PlaneGeometry(2, 2);

  // get embedded shaders from script tags
  const vertexShader = document.getElementById("vertexShader")?.textContent;
  const fragmentShader = document.getElementById("fragmentShader")?.textContent;

  material = new THREE.ShaderMaterial({
    uniforms: {
      u_time: { value: 0 },
      u_mouse: { value: new THREE.Vector2(0.5, 0.5) },
      u_scroll: { value: 0 },
      u_resolution: { value: new THREE.Vector2(window.innerWidth, window.innerHeight) }
    },
    vertexShader: vertexShader,
    fragmentShader: fragmentShader
  });

  mesh = new THREE.Mesh(geometry, material);
  scene.add(mesh);

  animate();
}

function animate() {
  requestAnimationFrame(animate);
  if (material) {
    material.uniforms.u_time.value = clock.getElapsedTime();
  }
  renderer.render(scene, camera);
}

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

  renderer.setSize(window.innerWidth, window.innerHeight);
  material.uniforms.u_resolution.value.set(
    window.innerWidth,
    window.innerHeight
  );
});

initCoffee();
