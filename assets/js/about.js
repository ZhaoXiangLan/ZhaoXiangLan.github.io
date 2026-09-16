(() => {
  const track = document.querySelector('[data-about-track]');
  const stage = document.querySelector('[data-about-stage]');
  if (!track || !stage) return;

  const stickers = [...stage.querySelectorAll('.hobby-sticker')];
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  stickers.forEach((sticker) => {
    sticker.addEventListener('click', (event) => event.preventDefault());
  });

  if (reduceMotion || !window.gsap || !window.ScrollTrigger) return;

  const { gsap } = window;
  gsap.registerPlugin(window.ScrollTrigger);

  stickers.forEach((sticker) => {
    sticker.dataset.rotation = gsap.getProperty(sticker, 'rotation');
    const face = sticker.querySelector('.sticker-cut');
    const curl = face.cloneNode(true);
    curl.classList.add('curl-copy');
    curl.setAttribute('aria-hidden', 'true');
    sticker.append(curl);

    const roll = document.createElement('i');
    roll.className = 'roll-core';
    roll.setAttribute('aria-hidden', 'true');
    sticker.append(roll);

    const followsRoundEdge = sticker.matches('.plant');
    const followsRacketEdge = sticker.matches('.racket');
    sticker.updateRoll = (progress) => {
      const y = 1 - progress;
      let width;
      if (followsRacketEdge) {
        if (y > .78) width = 28;
        else if (y > .42) width = 10;
        else {
          const headY = y / .42;
          width = 2 * Math.sqrt(Math.max(0, headY * (1 - headY))) * 100;
        }
      } else if (followsRoundEdge) {
        width = 2 * Math.sqrt(Math.max(0, y * (1 - y))) * 100;
      } else {
        const edge = .14;
        const taper = y < edge ? y / edge : y > 1 - edge ? (1 - y) / edge : 1;
        width = 86 + 14 * Math.max(0, Math.min(1, taper));
      }
      sticker.style.setProperty('--roll-width', `${Math.max(7, width).toFixed(2)}%`);
    };
    sticker.updateRoll(0);
  });

  gsap.set(stickers, {
    autoAlpha: 1,
    scale: .92,
    x: 0,
    y: 52,
    rotationX: 24,
    rotation: (index) => Number(stickers[index].dataset.rotation || 0),
    '--reveal': '100%',
    '--curl-opacity': 0,
    '--curl-angle': '-56deg',
    '--curl-band': '9%',
    '--roll-opacity': 0,
    '--roll-spin': '0px',
    '--extras': 0
  });

  gsap.from('.about-wall-title h1 span', { yPercent: 120, autoAlpha: 0, stagger: .1, duration: 1, ease: 'power4.out' });
  gsap.from('.about-wall-title p', { y: 20, autoAlpha: 0, duration: .6, delay: .7, ease: 'power3.out' });

  const counter = stage.querySelector('[data-about-count]');
  const scrollCue = stage.querySelector('.about-scroll-cue');
  const timeline = gsap.timeline({
    scrollTrigger: {
      trigger: track,
      start: 'top top',
      end: 'bottom bottom',
      pin: stage,
      scrub: .7,
      anticipatePin: 1,
      invalidateOnRefresh: true,
      onUpdate: ({ progress }) => {
        counter.textContent = Math.min(stickers.length, Math.floor(progress * (stickers.length + .3)));
        scrollCue.style.opacity = progress < .05 ? .62 : Math.max(0, .5 - progress * 1.8);
      }
    }
  });

  stickers.forEach((sticker, index) => {
    const firstStart = .04;
    const lastStart = .78;
    const interval = stickers.length > 1 ? (lastStart - firstStart) / (stickers.length - 1) : 0;
    const start = firstStart + index * interval;
    timeline
      .to(sticker, { '--roll-opacity': 1, '--curl-opacity': 1, duration: .025, ease: 'power2.out' }, start)
      .to(sticker, {
        y: 0,
        scale: 1,
        rotationX: 0,
        '--reveal': '0%',
        '--curl-angle': '-42deg',
        '--curl-band': '7%',
        '--roll-spin': '-84px',
        duration: .18,
        ease: 'none',
        onUpdate() { sticker.updateRoll(this.progress()); }
      }, start)
      .to(sticker, { '--roll-opacity': 0, '--curl-opacity': 0, duration: .022, ease: 'power2.out' }, start + .175)
      .to(sticker, { '--extras': 1, duration: .015 }, start + .17)
      .to(sticker, { scaleY: .97, duration: .018, ease: 'power2.in' }, start + .17)
      .to(sticker, { scaleY: 1, duration: .032, ease: 'back.out(2.5)' }, start + .188);
  });

  timeline
    .to('.about-wall-title', { scale: .9, autoAlpha: .78, duration: .13 }, .48)
    .to('.about-done', { autoAlpha: 1, scale: 1, duration: .09, ease: 'back.out(1.8)' }, .94)
    .to('.about-hint', { autoAlpha: .65, duration: .05 }, .97);

  if (window.matchMedia('(hover: hover) and (pointer: fine)').matches) {
    document.addEventListener('pointermove', (event) => {
      const x = event.clientX / window.innerWidth - .5;
      const y = event.clientY / window.innerHeight - .5;
      gsap.to('.nikon, .racket, .billiards, .plant', { x: x * 8, y: y * 6, duration: .8, overwrite: 'auto' });
      gsap.to('.dji, .aquarium, .pc', { x: x * -7, y: y * -5, duration: .9, overwrite: 'auto' });
    }, { passive: true });
  }

  window.addEventListener('load', () => window.ScrollTrigger.refresh(), { once: true });
})();
