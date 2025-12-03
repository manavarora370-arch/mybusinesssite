// GSAP + ScrollTrigger implementations for animations 1..7 (now with realistic SVG pour)
gsap.registerPlugin(ScrollTrigger);

// helpers
const $ = s => document.querySelector(s);
const $$ = s => Array.from(document.querySelectorAll(s));
const year = $('#year'); if(year) year.textContent = new Date().getFullYear();

// Elements for pour animation
const intro = $('#intro');
const liquidRect = document.getElementById('liquid-rect');
const wavesGroup = document.getElementById('waves');
const pourStream = document.getElementById('pour-stream');
const splashGroup = document.getElementById('splashes');
const hint = document.querySelector('.hint');
const skipBtn = document.getElementById('intro-skip');

// Safety: if any SVG element missing, skip pour and reveal site
if (!intro || !liquidRect || !pourStream) {
  console.warn('Pour elements missing — skipping pour animation.');
  // Reveal site immediately (keep other animations)
  intro.style.display = 'none';
} else {

  // Build a timeline that matches the poured behavior. We'll control it with ScrollTrigger (scrubbed).
  const pourTL = gsap.timeline({ paused: true });

  // Initial: hide stream & splashes (they're already opacity 0 by CSS/SVG)
  gsap.set(pourStream, { opacity: 0, scale: 1 });
  gsap.set(splashGroup, { opacity: 0 });

  // Step 1: stream appears and starts falling
  pourTL.to(pourStream, { opacity: 1, duration: 0.35, ease: 'power1.out' }, 0.05);

  // step 2: drop accelerated (we animate 'drop' via small translate)
  pourTL.to('#drop', { y: 260, duration: 0.9, ease: 'power3.in' }, 0.05);

  // step 3: splashes: create procedural small splashes
  pourTL.call(() => {
    // create a few circles for splash effect (inside splashGroup)
    splashGroup.innerHTML = '';
    for (let i=0;i<6;i++){
      const c = document.createElementNS('http://www.w3.org/2000/svg','circle');
      const cx = 380 + (Math.random()*60 - 30);
      const cy = 260 + (Math.random()*20 - 10);
      c.setAttribute('cx', cx);
      c.setAttribute('cy', cy);
      c.setAttribute('r', 2 + Math.random()*4);
      c.setAttribute('fill', '#2f150e');
      c.setAttribute('opacity', '0');
      splashGroup.appendChild(c);
      gsap.to(c, { opacity: 1, y: -20 - Math.random()*20, scale: 1.2, duration: 0.6 + Math.random()*0.4, ease: 'power2.out', clearProps: 'all' });
      gsap.to(c, { opacity: 0, duration: 0.9, delay: 0.35 + Math.random()*0.2 });
    }
  }, null, 0.6);

  // step 4: liquid lift (fill) — move liquidRect upward to fill glass (from y ~950 to y ~120)
  // We animate y attribute by tweening an object.
  const startY = 950;
  const endY = 120;
  const obj = { y: startY };
  pourTL.to(obj, {
    y: endY,
    duration: 1.2,
    ease: 'power2.inOut',
    onUpdate: () => {
      try {
        liquidRect.setAttribute('y', String(obj.y));
        // move waves group a bit for realism
        const waveOffset = 900 - (obj.y - endY) * 0.18;
        wavesGroup.setAttribute('transform', `translate(0,${waveOffset})`);
      } catch (e) {}
    }
  }, 0.9);

  // small wave motion and settle
  pourTL.to('#waveA', { x: 18, duration: 1.1, ease: 'sine.inOut' }, 1.0);
  pourTL.to('#waveB', { x: -12, duration: 1.1, ease: 'sine.inOut' }, 1.0);

  // final: fade out stream and splashes and reveal site content
  pourTL.to(pourStream, { opacity: 0, duration: 0.4, ease: 'power1.out' }, 2.05);
  pourTL.to(splashGroup, { opacity: 0, duration: 0.6 }, 2.05);

  // On complete: hide intro and allow normal page
  pourTL.call(() => {
    gsap.to(intro, { opacity: 0, duration: 0.6, onComplete: () => { intro.style.display = 'none'; }});
  }, null, 2.3);

  // Link pourTL to ScrollTrigger: scrubbed, pinned, length = 2 viewports
  ScrollTrigger.create({
    animation: pourTL,
    trigger: intro,
    start: 'top top',
    end: () => `+=${window.innerHeight * 2}`, // your requested ~2.0 scroll length
    scrub: 0.35,
    pin: true,
    anticipatePin: 1,
    onUpdate: self => {
      if (self.progress > 0.02 && hint) gsap.to(hint, { opacity: 0, duration: 0.12 });
    }
  });

  // Skip button: push timeline to end instantly
  if (skipBtn) skipBtn.addEventListener('click', () => {
    pourTL.progress(1);
  });
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
window.addEventListener('load', ()=> ScrollTrigger.refresh());
window.addEventListener('resize', ()=> ScrollTrigger.refresh());
