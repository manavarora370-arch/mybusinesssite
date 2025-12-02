// settings: how many viewport-heights of scrolling to fill the glass.
// Set to 3.0 for "about 3 full screens". Increase to ~3.5 if you prefer more scrolls.
const SCROLL_FACTOR = 3.0;

const glassWrap = document.getElementById('glass-wrap');
const liquidGroup = document.getElementById('liquid-group');
const waveGroup = document.getElementById('wave-group');
const pour = document.getElementById('pour');
const droplets = document.getElementById('droplets');
const siteContent = document.getElementById('site-content');
const yearEl = document.getElementById('year');

if(yearEl) yearEl.textContent = new Date().getFullYear();

// clamp helper
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

// We'll convert scroll (or touch) into a progress [0..1]
let lastProgress = 0;
let ticking = false;

function updateFromScroll() {
  const vh = window.innerHeight || document.documentElement.clientHeight;
  const maxScroll = vh * SCROLL_FACTOR; // how many pixels to reach full
  // Use pageYOffset so it works if content grows.
  const scrolled = clamp(window.scrollY, 0, maxScroll);
  const progress = clamp(scrolled / maxScroll, 0, 1);
  if (Math.abs(progress - lastProgress) > 0.0005) {
    applyProgress(progress);
    lastProgress = progress;
  }
  ticking = false;
}

function applyProgress(progress) {
  // liquid: initial translateY (when progress=0) should be low (liquid offscreen bottom)
  // The liquid-group translate is defined in the SVG; we'll compute a translateY value
  // We want the liquid group to move up, revealing more liquid in the glass.
  // Map progress 0..1 to an SVG translate value (we'll use 720 -> roughly full)
  // The 'liquid-group' initial transform was translate(0,720) in the SVG.
  const startY = 720;
  const endY = 0; // when full, group translate should be near top
  const curY = startY - (startY - endY) * progress;
  if (liquidGroup) liquidGroup.setAttribute('transform', `translate(0, ${curY})`);

  // subtle wave horizontal sway based on progress and time:
  if (waveGroup) {
    // small horizontal shift for realism:
    waveGroup.setAttribute('transform', `translate(${ -40 + progress * 40 }, ${ -40 - progress * 8 })`);
  }

  // show pour while progress < ~0.85, fade out near full
  if (pour) {
    pour.style.opacity = (progress < 0.95 && progress > 0.02) ? 1 : 0;
  }
  if (droplets) {
    droplets.style.opacity = (progress > 0.15 && progress < 0.9) ? 1 : 0;
  }

  // rotate the whole glass a bit based on progress (subtle)
  if (glassWrap) {
    const maxRot = 6; // degrees
    const rot = (progress - 0.5) * 2 * maxRot; // rotate -max..+max around mid-progress
    glassWrap.style.transform = `rotate(${rot}deg)`;
  }

  // when fully filled, reveal site content (fade-in)
  if (progress >= 1) {
    revealSite();
  } else {
    hideSite();
  }
}

// show site content with smooth fade
function revealSite() {
  if (!siteContent.classList.contains('visible')) {
    siteContent.classList.remove('hidden');
    // small delay so content doesn't flash; also remove glass overlay pointer events
    requestAnimationFrame(()=> {
      siteContent.classList.add('visible');
    });
    // allow interaction
    glassWrap.style.pointerEvents = 'none';
    // optionally fade out the glass after a moment
    glassWrap.style.transition = 'opacity 0.9s ease .2s, transform 0.7s ease';
    glassWrap.style.opacity = '0';
    setTimeout(()=> {
      glassWrap.style.display = 'none';
      glassWrap.style.opacity = '1';
    }, 1200);
  }
}

function hideSite() {
  if (!siteContent.classList.contains('hidden')) {
    siteContent.classList.remove('visible');
    siteContent.classList.add('hidden');
    // keep glass visible
    glassWrap.style.display = 'flex';
    glassWrap.style.opacity = '1';
  }
}

// tie into scroll events efficiently
function onScroll() {
  if (!ticking) {
    window.requestAnimationFrame(updateFromScroll);
    ticking = true;
  }
}

// support touch move (mobile) — update on touchmove as well
let lastTouchY = null;
function onTouchMove(e) {
  if (e.touches && e.touches.length) {
    lastTouchY = e.touches[0].clientY;
  }
  onScroll();
}

// listen for wheel, scroll, and touch
window.addEventListener('scroll', onScroll, { passive: true });
window.addEventListener('wheel', onScroll, { passive: true });
window.addEventListener('touchmove', onTouchMove, { passive: true });

// initialize at load (in case user reloads after some scroll)
window.addEventListener('load', ()=> {
  // if the content height is small, we still map scrollY -> progress; ensure start state
  updateFromScroll();
  // set a gentle animation for droplets (make a tiny continuous floating)
  const drops = document.querySelectorAll('.drop');
  drops.forEach((d, i)=> {
    d.animate([
      { transform: 'translateY(0)', opacity: 1 },
      { transform: 'translateY(8px)', opacity: 0.6 },
      { transform: 'translateY(0)', opacity: 1 }
    ], { duration: 2200 + i*200, iterations: Infinity, easing: 'ease-in-out' });
  });

  // small continuous animation for pour stream (scale stroke-dashoffset)
  const stream = document.getElementById('stream');
  if (stream) {
    stream.style.strokeDasharray = '20 12';
    stream.style.strokeDashoffset = '0';
    setInterval(()=> {
      const off = parseFloat(stream.style.strokeDashoffset || '0') - 6;
      stream.style.strokeDashoffset = `${off}`;
    }, 120);
  }
});
