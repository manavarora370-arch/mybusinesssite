// CORE: GSAP + ScrollTrigger (CDN loaded in each HTML). Register plugin:
gsap.registerPlugin(ScrollTrigger);

// small helpers
const $ = s => document.querySelector(s);
const $$ = s => Array.from(document.querySelectorAll(s));
const yearEl = document.getElementById('year'); if(yearEl) yearEl.textContent = new Date().getFullYear();

// HERO: a combined approach: if Lottie present we'll scrub it; otherwise use SVG pour timeline
function initHeroInteractions({pinLength = 2} = {}) {
  const intro = $('#intro');
  if(!intro) return;

  // If Lottie container exists and lottie loaded, we prefer it
  const lottieEl = document.getElementById('lottie-hero');
  if (lottieEl && window.lottie) {
    // Lottie was loaded in HTML - user can set data-src attribute or inline JSON
    // We'll create a ScrollTrigger that controls lottie frames if available.
    // Implementation will be provided per-HTML file (each page includes its own Lottie).
  } else {
    // fallback: if SVG glass exists we attach the pour animation (simple version)
    const pourTL = window.__pourTL;
    if(pourTL && intro) {
      ScrollTrigger.create({
        animation: pourTL,
        trigger: intro,
        start: 'top top',
        end: () => `+=${window.innerHeight * pinLength}`,
        scrub: 0.35,
        pin: true,
        anticipatePin: 1
      });
    }
  }
}

// Small global fade-in for sections
gsap.utils.toArray('.fade-section, .cards-section, .hero-section').forEach(section => {
  gsap.from(section, {
    y: 26, opacity: 0, duration: 0.9, ease: 'power2.out',
    scrollTrigger: { trigger: section, start: 'top 82%', toggleActions: 'play none none none' }
  });
});

// simple card hover tilt
$$('.card').forEach(card => {
  card.addEventListener('mousemove', e => {
    const r = card.getBoundingClientRect();
    const px = (e.clientX - r.left) / r.width;
    const py = (e.clientY - r.top) / r.height;
    const rx = (py - 0.5) * 6;
    const ry = (px - 0.5) * -6;
    card.style.transform = `perspective(800px) rotateX(${rx}deg) rotateY(${ry}deg) translateZ(0)`;
  });
  card.addEventListener('mouseleave', ()=> { card.style.transform = ''; });
});

// When page loads initialize hero interactions (index specific may override)
window.addEventListener('load', ()=> {
  initHeroInteractions({pinLength:2});
  ScrollTrigger.refresh();
});
window.addEventListener('resize', ()=> ScrollTrigger.refresh());
