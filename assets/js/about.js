(() => {
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const hasGsap = Boolean(window.gsap && window.ScrollTrigger);

  if (hasGsap) window.gsap.registerPlugin(window.ScrollTrigger);

  initStickerWall();
  initGalleryTransition();

  function initStickerWall() {
    const track = document.querySelector('[data-about-track]');
    const stage = document.querySelector('[data-about-stage]');
    if (!track || !stage) return;

    const stickers = [...stage.querySelectorAll('.hobby-sticker')];
    const counter = stage.querySelector('[data-about-count]');
    const scrollCue = stage.querySelector('.about-scroll-cue');

    stickers.forEach((sticker) => {
      sticker.addEventListener('click', (event) => event.preventDefault());
    });

    if (reduceMotion || !hasGsap) {
      counter.textContent = stickers.length;
      stage.style.setProperty('--about-progress', '1');
      return;
    }

    const { gsap } = window;

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
          stage.style.setProperty('--about-progress', progress.toFixed(4));
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
        if (document.body.classList.contains('gallery-is-open')) return;
        const x = event.clientX / window.innerWidth - .5;
        const y = event.clientY / window.innerHeight - .5;
        gsap.to('.nikon, .racket, .billiards, .plant, .printer', { x: x * 8, y: y * 6, duration: .8, overwrite: 'auto' });
        gsap.to('.dji, .aquarium, .pc, .snowboard', { x: x * -7, y: y * -5, duration: .9, overwrite: 'auto' });
      }, { passive: true });
    }
  }

  function initGalleryTransition() {
    const track = document.querySelector('[data-gallery-track]');
    const stage = document.querySelector('[data-gallery-stage]');
    const lightField = document.querySelector('[data-about-light-field]');
    const portal = document.querySelector('[data-gallery-portal]');
    if (!track || !stage || !lightField || !portal) return;

    if (reduceMotion || !hasGsap) {
      lightField.style.transform = 'translate3d(0, -50vh, 0)';
      portal.style.opacity = '1';
      portal.style.transform = 'translate(-50%, -50%)';
      return;
    }

    const { gsap } = window;
    gsap.set(portal, { autoAlpha: 0, scale: .72, xPercent: -50, yPercent: -50, x: 0, y: 0 });

    gsap.timeline({
      scrollTrigger: {
        trigger: track,
        start: 'top bottom',
        end: 'top top',
        scrub: .8,
        invalidateOnRefresh: true
      }
    })
      .fromTo(lightField, { y: '0vh' }, { y: '-50vh', duration: 1, ease: 'none' }, 0)
      .to(portal, { autoAlpha: 1, scale: 1, duration: .5, ease: 'power3.out' }, .3)
      .fromTo('.gallery-scroll-label', { autoAlpha: 0, y: 10 }, { autoAlpha: .65, y: 0, duration: .13 }, .8);

    window.ScrollTrigger.create({
      trigger: track,
      start: 'top top',
      end: 'bottom bottom',
      pin: stage,
      anticipatePin: 1,
      invalidateOnRefresh: true
    });
  }

  window.addEventListener('load', () => {
    if (window.ScrollTrigger) window.ScrollTrigger.refresh();
  }, { once: true });
})();
