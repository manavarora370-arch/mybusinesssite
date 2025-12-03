// GSAP + ScrollTrigger implementations for animations 1..7 (shorter, subtler sweep)
gsap.registerPlugin(ScrollTrigger);

// small helpers
const $ = s => document.querySelector(s);
const $$ = s => Array.from(document.querySelectorAll(s));
const year = $('#year'); if(year) year.textContent = new Date().getFullYear();

// ---------- LOTTIE: coffee spill animation data (compact vector animation) ----------
/*
 This is a compact Lottie "spill" animationData object. It simulates a dark coffee
 shape that grows/spreads vertically. The Lottie animation is scrubbed by ScrollTrigger.
*/
const coffeeSpillAnimationData = {
  "v":"5.7.4",
  "fr":60,
  "ip":0,
  "op":180,
  "w":1920,
  "h":1080,
  "nm":"coffee-spill",
  "ddd":0,
  "assets":[],
  "layers":[
    {
      "ddd":0,"ind":1,"ty":4,"nm":"spill-shape","sr":1,
      "ks":{
        "o":{"a":0,"k":100},
        "r":{"a":0,"k":0},
        "p":{"a":0,"k":[960,540,0]},
        "a":{"a":0,"k":[0,0,0]},
        // We'll animate scale 's' from low to high to simulate filling
        "s":{"a":1,"k":[
          {"i":{"x":[0.667,0.667,0.667],"y":[1,1,1]},"o":{"x":[0.333,0.333,0.333],"y":[0,0,0]},"t":0,"s":[10,0,100],"e":[10,60,100]},
          {"i":{"x":[0.667],"y":[1]},"o":{"x":[0.333],"y":[0]},"t":120,"s":[10,60,100],"e":[10,100,100]},
          {"t":179,"s":[10,100,100]}
        ]}
      },
      "shapes":[
        {
          "ty":"gr","it":[
            {"ty":"rc","d":1,"s":{"k":[1400,360]},"p":{"k":[0,60]},"r":{"k":90},"nm":"rect"},
            {"ty":"fl","c":{"k":[0.286,0.180,0.114,1]},"o":{"k":100},"nm":"fill"},
            {"ty":"tr","p":{"k":[0,0]},"a":{"k":[0,0]},"s":{"k":[100,100]},"r":{"k":0},"o":{"k":100},"sk":{"k":0},"sa":{"k":0}}
          ],
          "nm":"spill-group"
        }
      ],
      "ao":0,"ip":0,"op":180,"st":0,"bm":0
    }
  ],
  "markers":[]
};

// ---------- 1) Intro pinned scrubbed timeline (shorter duration ~2x viewport) ----------
(function introTimeline(){
  const intro = $('#intro');
  const bg = document.querySelector('.intro-bg');
  const sweep = document.querySelector('.light-sweep');
  const hint = document.querySelector('.hint');
  const skipBtn = document.getElementById('intro-skip');

  // timeline: scale bg lightly, subtle sweep, lighten mid, then fade
  const tl = gsap.timeline({ paused: true });

  tl.to(bg, { scale: 1.06, duration: 1.2, ease: "power2.inOut" }, 0);
  tl.to(sweep, { xPercent: 220, opacity: 0.28, duration: 1.2, ease: "power2.inOut" }, 0.1);
  tl.to('.brand-title', { y: -12, opacity: 1, duration: 0.7, ease: "power2.out" }, 0.05);
  tl.to('.lead', { y: -8, opacity: 1, duration: 0.7, ease: "power2.out" }, 0.08);

  // small settle
  tl.to(bg, { scale: 1.02, duration: 0.9, ease: "power3.inOut" }, 1.0);

  // final: fade out intro quicker (shorter)
  tl.to(intro, { opacity: 0, duration: 0.6, pointerEvents: 'none', onComplete() {
    intro.style.display = 'none';
  }}, 1.9);

  // Create ScrollTrigger that pins the intro and scrubs the timeline (shorter end)
  const st = ScrollTrigger.create({
    animation: tl,
    trigger: intro,
    start: 'top top',
    end: () => `+=${window.innerHeight * 2}`, // shorter: ~2x viewport
    scrub: 0.55,
    pin: true,
    anticipatePin: 1,
    onUpdate: self => {
      if (self.progress > 0.01 && hint) gsap.to(hint, { opacity: 0, duration: 0.18 });
      // Also update lottie timeline progress (if available)
      if (window.__coffeeLottie && typeof window.__coffeeLottie.totalFrames === 'number') {
        const lf = window.__coffeeLottie.totalFrames;
        const frame = Math.floor(self.progress * (lf - 1));
        try { window.__coffeeLottie.goToAndStop(frame, true); } catch(e){}
      }
    }
  });

  // skip functionality
  if (skipBtn) skipBtn.addEventListener('click', ()=> {
    tl.progress(1);
    // push lottie to end if present
    if (window.__coffeeLottie) {
      try{ window.__coffeeLottie.goToAndStop(window.__coffeeLottie.totalFrames-1, true); }catch(e){}
    }
  });

  // initialize Lottie now (so it's ready to be scrubbed)
  initCoffeeLottie();
})();

// ---------- LOTTIE: load and mount animation (with graceful fallback) ----------
function initCoffeeLottie(){
  const mount = document.getElementById('lottie-spill');
  if(!mount) return;

  // small helper to try/catch lottie create
  try {
    const anim = lottie.loadAnimation({
      container: mount,
      renderer: 'svg',
      loop: false,
      autoplay: false,
      animationData: coffeeSpillAnimationData,
      rendererSettings: { preserveAspectRatio: 'xMidYMid slice' }
    });

    // store reference globally so other code can update frames
    window.__coffeeLottie = anim;

    // set initial frame (very small)
    anim.goToAndStop(0, true);

    // Optional: subtle entrance fade for the lottie layer
    gsap.fromTo('#lottie-spill', { opacity: 0 }, { opacity: 0.98, duration: 0.9, ease: 'power2.out' });

    // In case animation loaded but totalFrames isn't ready instantly, add a short poll
    if (!anim.totalFrames) {
      const poll = setInterval(()=> {
        if (anim.totalFrames) {
          clearInterval(poll);
          // nothing more; scroll trigger will update frames in onUpdate
        }
      }, 60);
    }

  } catch (e) {
    console.warn('Lottie init failed — fallback: skipping spill animation', e);
    // ensure #lottie-spill hidden so it doesn't show a raw element
    try { document.getElementById('lottie-spill').style.display = 'none'; } catch(e2){}
  }
}

// ---------- 2) Fade-in sections on scroll (global) ----------
(function fadeSections(){
  const sections = gsap.utils.toArray('.fade-section, .cards-section, .hero-section');
  sections.forEach(section=>{
    gsap.from(section, {
      y: 24,
      opacity: 0,
      duration: 0.85,
      ease: 'power2.out',
      scrollTrigger: {
        trigger: section,
        start: 'top 82%',
        end: 'bottom 40%',
        toggleActions: 'play none none none'
      }
    });
  });
})();

// ---------- 3) Hero parallax ----------
(function heroParallax(){
  const heroImg = document.querySelector('.hero-media img');
  if(!heroImg) return;
  gsap.to(heroImg, {
    y: -100,
    ease: 'none',
    scrollTrigger: {
      trigger: '.hero-section',
      start: 'top bottom',
      end: 'bottom top',
      scrub: 0.6
    }
  });
})();

// ---------- 4) Sticky/pinned panels ----------
(function stickyPanels(){
  const wrap = document.querySelector('.sticky-wrap');
  if(!wrap) return;
  const panels = gsap.utils.toArray('.sticky-panel');
  panels.forEach(p=> p.style.opacity = 0);

  const tl = gsap.timeline({
    scrollTrigger: {
      trigger: '.sticky-wrap',
      start: 'top top',
      end: () => `+=${window.innerHeight * panels.length}`,
      scrub: 0.55,
      pin: true,
      anticipatePin: 1
    }
  });

  panels.forEach((p,i)=>{
    tl.to(p, { opacity:1, y:0, duration:0.6, ease:'power2.out' });
    tl.to(p, { opacity:0, duration:0.45, delay:0.55 });
  });
})();

// ---------- 5) Staggered card reveal ----------
(function cardReveal(){
  const cards = gsap.utils.toArray('.card');
  gsap.set(cards, { y: 18, opacity: 0 });
  gsap.to(cards, {
    y: 0, opacity: 1, duration: 0.85, ease: 'power2.out', stagger: 0.16,
    scrollTrigger: {
      trigger: '.card-grid',
      start: 'top 82%',
      end: 'bottom 40%',
      toggleActions: 'play none none none'
    }
  });
})();

// ---------- 6) Card hover & pointer tilt ----------
(function cardHoverTilt(){
  const cards = $$('.card');
  cards.forEach(card=>{
    const img = card.querySelector('img');
    card.addEventListener('mousemove', e=>{
      const r = card.getBoundingClientRect();
      const px = (e.clientX - r.left) / r.width;
      const py = (e.clientY - r.top) / r.height;
      const rx = (py - 0.5) * 5.5;
      const ry = (px - 0.5) * -5.5;
      card.style.transform = `perspective(800px) rotateX(${rx}deg) rotateY(${ry}deg) translateZ(0)`;
      if(img) img.style.transform = 'scale(1.05)';
    });
    card.addEventListener('mouseleave', ()=>{
      card.style.transform = '';
      if(img) img.style.transform = '';
    });
  });
})();

// ---------- 7) subtle scroll-linked 3D tilt for hero container ----------
(function subtleTilt(){
  const container = document.querySelector('.hero-section');
  if(!container) return;
  ScrollTrigger.create({
    trigger: container,
    start: 'top bottom',
    end: 'bottom top',
    scrub: true,
    onUpdate: self => {
      const r = (self.progress - 0.5) * 5;
      container.style.transform = `rotateX(${r/3}deg) rotateZ(${r}deg)`;
    }
  });
})();

// refresh on load/resize
window.addEventListener('load', ()=> {
  ScrollTrigger.refresh();
  // ensure lottie is synced if page loaded mid-scroll
  if (window.__coffeeLottie && typeof window.__coffeeLottie.totalFrames === 'number') {
    const st = ScrollTrigger.getAll().find(s=> s.trigger && s.trigger.id === 'intro');
    if (st) {
      const lf = window.__coffeeLottie.totalFrames;
      const frame = Math.floor(st.progress * (lf - 1));
      try { window.__coffeeLottie.goToAndStop(frame, true); } catch(e){}
    }
  }
});
window.addEventListener('resize', ()=> ScrollTrigger.refresh());
