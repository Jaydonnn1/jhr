/* ------------------------------------------------------------------ *
 *  main.js  —  smooth scroll + scroll-driven globe + interactions
 * ------------------------------------------------------------------ */

(function () {
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ----------------------------------------------- loading screen */
  let loaderHidden = false;
  function hideLoader() {
    if (loaderHidden) return;
    loaderHidden = true;
    if (lenis) lenis.start();              // unlock scrolling
    window.scrollTo(0, 0);
    const el = document.getElementById('loader');
    if (el && !el.classList.contains('done')) {
      el.classList.add('done');
      setTimeout(() => { if (el.parentNode) el.remove(); }, 1000);
    }
  }
  // hold the loader so the globe assembly plays out, then reveal
  const readyLoader = () => setTimeout(hideLoader, Math.max(0, 3600 - performance.now()));
  setTimeout(hideLoader, 11000);           // fallback if textures never report

  /* ----------------------------------------------------- the globe */
  const globe = new Globe(document.getElementById('globe-canvas'), readyLoader);
  window.addEventListener('resize', () => globe.resize());

  /* ordered list of scroll "steps" -> location keys */
  const steps = Array.from(document.querySelectorAll('.step[data-loc]')).map((el) => ({
    el, key: el.dataset.loc,
  }));
  globe.setKey(steps[0].key);                       // opening view

  /* ----------------------------------------------------- smooth scroll */
  let lenis = null;
  if (!reduceMotion && typeof Lenis !== 'undefined') {
    lenis = new Lenis({
      duration: 1.15,
      easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
      smoothWheel: true,
    });
    gsap.ticker.add((time) => lenis.raf(time * 1000));
    gsap.ticker.lagSmoothing(0);
    lenis.stop();                          // locked until the loader is dismissed
  }

  gsap.registerPlugin(ScrollTrigger);
  if (lenis) lenis.on('scroll', ScrollTrigger.update);

  function scrollToEl(el) {
    if (lenis) lenis.scrollTo(el, { duration: 1.4 });
    else el.scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth' });
  }

  /* ------------------------------------ globe travels with the scroll */
  // easeInOutSine for a natural slow-fast-slow rotation between stops
  const ease = (p) => 0.5 - 0.5 * Math.cos(Math.PI * p);

  for (let i = 1; i < steps.length; i++) {
    const fromKey = steps[i - 1].key;
    const toKey = steps[i].key;
    ScrollTrigger.create({
      trigger: steps[i].el,
      start: 'top bottom',     // step begins entering from the bottom
      end: 'top center',       // ...until it's centred in the viewport
      scrub: true,
      onUpdate: (self) => globe.slerpBetween(fromKey, toKey, ease(self.progress)),
    });
  }

  /* ------------------------------------------- active nav + chip state */
  const navIds = ['founding', 'travels', 'experiences', 'contact'];
  const navLinks = Array.from(document.querySelectorAll('.navlinks a[data-target]'));
  const chips = Array.from(document.querySelectorAll('.chip'));
  const stops = Array.from(document.querySelectorAll('.travel-stop'));

  function updateUI() {
    const mid = window.innerHeight * 0.5;

    let activeNav = null;
    navIds.forEach((id) => {
      const el = document.getElementById(id);
      if (el && el.getBoundingClientRect().top <= mid) activeNav = id;
    });
    navLinks.forEach((a) => a.classList.toggle('active', a.dataset.target === activeNav));

    let best = null, bestD = Infinity;
    stops.forEach((s) => {
      const r = s.getBoundingClientRect();
      if (r.bottom < 0 || r.top > window.innerHeight) return;
      const d = Math.abs(r.top + r.height / 2 - mid);
      if (d < bestD) { bestD = d; best = s; }
    });
    const chipId = best ? best.dataset.chip : null;
    chips.forEach((c) => c.classList.toggle('active', c.dataset.target === chipId));
  }

  if (lenis) lenis.on('scroll', updateUI);
  else window.addEventListener('scroll', updateUI, { passive: true });
  ScrollTrigger.addEventListener('refresh', updateUI);

  /* ------------------------------------------------ click navigation */
  document.addEventListener('click', (e) => {
    const t = e.target.closest('[data-target]');
    if (!t) return;
    const el = document.getElementById(t.dataset.target);
    if (!el) return;
    e.preventDefault();
    scrollToEl(el);
  });

  /* --------------------------------- hero text spirals into the void */
  if (!reduceMotion) {
    const title = document.querySelector('.hero-title');
    if (title) {
      // split into words (kept intact) of letters that can spiral independently
      Array.from(title.childNodes).slice().forEach((node) => {
        if (node.nodeType !== 3) return;
        const frag = document.createDocumentFragment();
        node.textContent.split(/(\s+)/).forEach((w) => {
          if (w.trim() === '') { frag.appendChild(document.createTextNode(w)); return; }
          const word = document.createElement('span');
          word.className = 'word';
          w.split('').forEach((c) => {
            const span = document.createElement('span');
            span.className = 'char';
            span.textContent = c;
            word.appendChild(span);
          });
          frag.appendChild(word);
        });
        title.replaceChild(frag, node);
      });

      gsap.timeline({
        scrollTrigger: { trigger: '#hero', start: 'top top', end: '88% top', scrub: 0.5 },
      })
        .to('.hero-title .char', {
          rotationZ: (i) => 25 + i * 10,
          scale: 0.05,
          opacity: 0,
          transformOrigin: '160% 50%',     // pivot off-screen -> vortex pull
          stagger: { each: 0.02, from: 'end' },
          ease: 'power2.in',
        }, 0)
        .to('.eyebrow, .hero-sub, .hero-cta, .scroll-hint', {
          opacity: 0, y: -30, ease: 'power1.in',
        }, 0);
    }
  }

  /* ------------------------------------------------------- misc */
  const yr = document.getElementById('year');
  if (yr) yr.textContent = new Date().getFullYear();

  window.addEventListener('load', () => ScrollTrigger.refresh());
  updateUI();
})();
