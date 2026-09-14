const header = document.querySelector('[data-header]');
const headerIdentity = document.querySelector('.header-identity');
const headerLinks = document.querySelector('.header-links');
const siteNav = document.querySelector('.site-nav');
const projectRail = document.querySelector('[data-project-rail]');
const railLinks = [...document.querySelectorAll('[data-project-rail] a')];
const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const wordmark = document.querySelector('[data-hero]');
const wordmarkButtons = [...document.querySelectorAll('[data-wordmark-style]')];

wordmarkButtons.forEach((button) => {
  button.addEventListener('click', () => {
    const style = button.dataset.wordmarkStyle;
    wordmark?.setAttribute('data-wordmark', style);
    wordmarkButtons.forEach((option) => {
      const selected = option === button;
      option.classList.toggle('is-selected', selected);
      option.setAttribute('aria-pressed', String(selected));
    });
  });
});

const setActiveProject = (index) => {
  railLinks.forEach((link, linkIndex) => {
    const active = linkIndex === index;
    link.classList.toggle('is-active', active);
    if (active) link.setAttribute('aria-current', 'true');
    else link.removeAttribute('aria-current');
  });
};

const updateHeader = () => header?.classList.toggle('is-scrolled', window.scrollY > 28);
updateHeader();
window.addEventListener('scroll', updateHeader, { passive: true });

const initStaticFallback = () => {
  if (!('IntersectionObserver' in window)) return;

  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) return;
      const isHome = entry.target.id === 'top';
      const isContact = entry.target.id === 'contact';
      header?.classList.toggle('is-project', !isHome);
      projectRail?.classList.toggle('is-visible', !isHome && !isContact);
    });
  }, { rootMargin: '-42% 0px -52%', threshold: 0 });

  document.querySelectorAll('#top, .project-scene, #contact').forEach((section) => observer.observe(section));
};

const initMotion = () => {
  if (reduceMotion || !window.gsap || !window.ScrollTrigger) {
    initStaticFallback();
    return;
  }

  const { gsap } = window;
  gsap.registerPlugin(window.ScrollTrigger);
  if (window.ScrollSmoother) gsap.registerPlugin(window.ScrollSmoother);
  window.ScrollTrigger.config({ ignoreMobileResize: true });
  document.documentElement.classList.add('gsap-motion');

  let smoother = null;
  if (window.ScrollSmoother) {
    smoother = window.ScrollSmoother.create({
      wrapper: '#smooth-wrapper',
      content: '#smooth-content',
      smooth: 1.18,
      smoothTouch: .08,
      effects: true
    });
    document.documentElement.classList.add('gsap-smooth');
  }

  if (smoother) {
    document.querySelectorAll('a[href^="#"]').forEach((link) => {
      link.addEventListener('click', (event) => {
        const target = link.getAttribute('href');
        if (!target || target === '#') return;
        event.preventDefault();
        smoother.scrollTo(target, true, 'top top');
      });
    });
  }

  const hero = document.querySelector('[data-hero]');
  const heroStage = document.querySelector('[data-hero-stage]');
  const heroWordmark = document.querySelector('.hero-wordmark');
  const nameWords = gsap.utils.toArray('[data-name-word]');
  const taglineParts = gsap.utils.toArray('[data-tagline]');
  const scrollCue = document.querySelector('[data-scroll-cue]');

  if (hero) {
    gsap.set(siteNav, { autoAlpha: 0, y: -14 });
    gsap.set([headerIdentity, headerLinks], { autoAlpha: 0, y: -10 });
    gsap.set(nameWords, { yPercent: 120 });
    gsap.set(taglineParts, { autoAlpha: 0, y: 16, rotation: 0 });
    gsap.set(scrollCue, { autoAlpha: 0 });

    gsap.timeline({ defaults: { ease: 'power4.out' } })
      .to(siteNav, { autoAlpha: 1, y: 0, duration: .65 }, .04)
      .to(nameWords, { yPercent: 0, duration: 1.05, stagger: .12 }, .12)
      .to(taglineParts, { autoAlpha: 1, y: 0, duration: .62, stagger: .08, ease: 'back.out(1.3)' }, .72)
      .to(scrollCue, { autoAlpha: 1, y: 0, duration: .45, ease: 'power2.out' }, 1.02);

    gsap.timeline({
      scrollTrigger: {
        trigger: hero,
        start: 'top top',
        end: () => `+=${window.innerHeight}`,
        pin: true,
        pinSpacing: false,
        anticipatePin: 1,
        scrub: .85,
        invalidateOnRefresh: true,
        onUpdate: ({ progress }) => header?.classList.toggle('is-project', progress > .72),
        onLeaveBack: () => header?.classList.remove('is-project')
      }
    })
      .fromTo(scrollCue,
        { autoAlpha: 1, y: 0 },
        { autoAlpha: 0, y: -12, duration: .14, ease: 'none', immediateRender: false },
        0
      )
      .to(taglineParts, { autoAlpha: 0, y: -24, duration: .2, stagger: .015, ease: 'power1.in' }, .04)
      .to(heroWordmark, {
        x: () => -window.innerWidth * .405,
        y: () => -window.innerHeight * .405,
        scale: .13,
        transformOrigin: '50% 50%',
        duration: .66,
        ease: 'power2.inOut'
      }, .05)
      .to(heroStage, { autoAlpha: 0, duration: .08, ease: 'none' }, .58)
      .to(headerIdentity, { autoAlpha: 1, y: 0, duration: .18, ease: 'power2.out' }, .72)
      .to(headerLinks, { autoAlpha: 1, y: 0, duration: .18, ease: 'power2.out' }, .74);
  } else {
    header?.classList.add('is-project');
    gsap.set([siteNav, headerIdentity, headerLinks], { autoAlpha: 1, y: 0 });
  }

  const work = document.querySelector('[data-work]');
  if (work) {
    window.ScrollTrigger.create({
      trigger: work,
      start: 'top 55%',
      end: 'bottom 42%',
      onToggle: ({ isActive }) => projectRail?.classList.toggle('is-visible', isActive)
    });
  }

  const desktopScenes = gsap.matchMedia();
  desktopScenes.add('(min-width: 601px)', () => {
    const pins = [];
    document.querySelectorAll('.project-scene').forEach((scene) => {
      const viewport = scene.querySelector('.project-viewport');
      pins.push(window.ScrollTrigger.create({
        trigger: scene,
        start: 'top top',
        end: 'bottom bottom',
        pin: viewport,
        pinSpacing: false,
        anticipatePin: 1,
        invalidateOnRefresh: true
      }));
    });
    return () => pins.forEach((pin) => pin.kill());
  });

  document.querySelectorAll('.project-scene').forEach((scene, index) => {
    const title = scene.querySelector('[data-project-title]');
    const status = scene.querySelector('.project-status');
    const label = scene.querySelector('.project-label');
    const figures = gsap.utils.toArray('[data-float]', scene);

    gsap.timeline({
      scrollTrigger: {
        trigger: scene,
        start: 'top bottom',
        end: 'bottom top',
        scrub: .75,
        onEnter: () => setActiveProject(index),
        onEnterBack: () => setActiveProject(index)
      }
    })
      .fromTo(title, { autoAlpha: 0, scale: .82 }, { autoAlpha: 1, scale: 1, duration: .25, ease: 'power2.out' }, 0)
      .fromTo([status, label], { autoAlpha: 0, y: 22 }, { autoAlpha: 1, y: 0, duration: .2, stagger: .03 }, .08)
      .to(title, { autoAlpha: .12, scale: 1.08, duration: .22, ease: 'power2.in' }, .78)
      .to([status, label], { autoAlpha: 0, y: -18, duration: .16 }, .82);

    figures.forEach((figure) => {
      const speed = Number(figure.dataset.speed || 1);
      const startY = index === 0 ? 105 + Math.abs(speed) * 48 : speed * 48;
      gsap.fromTo(figure,
        { yPercent: startY, autoAlpha: index === 0 ? 0 : .2 },
        {
          yPercent: speed * -48,
          autoAlpha: 1,
          ease: 'none',
          scrollTrigger: {
            trigger: scene,
            start: 'top bottom',
            end: 'bottom top',
            scrub: .9
          }
        }
      );
    });
  });

  const contact = document.querySelector('#contact');
  if (contact) {
    window.ScrollTrigger.create({
      trigger: contact,
      start: 'top 52%',
      end: 'bottom top',
      onToggle: ({ isActive }) => document.body.classList.toggle('contact-in-view', isActive)
    });

    gsap.timeline({
      scrollTrigger: {
        trigger: contact,
        start: 'top 78%',
        end: 'top 12%',
        scrub: .8
      }
    })
      .from('.contact-circle', { scale: .55, autoAlpha: 0, stagger: .055, ease: 'power2.out' }, 0)
      .from('.contact-ribbon', { xPercent: -24, autoAlpha: 0, ease: 'power2.out' }, .08)
      .from('.contact-ghost', { scale: .86, autoAlpha: 0, ease: 'power2.out' }, .12)
      .from('.contact-content', { y: 42, autoAlpha: 0, ease: 'power3.out' }, .18);

    gsap.to('.contact-circle-red', { x: -10, y: 14, duration: 7, repeat: -1, yoyo: true, ease: 'sine.inOut' });
    gsap.to('.contact-circle-lime', { x: 12, y: -16, duration: 6, repeat: -1, yoyo: true, ease: 'sine.inOut' });
    gsap.to('.contact-ribbon', { xPercent: 1.6, duration: 5.5, repeat: -1, yoyo: true, ease: 'sine.inOut' });
  }

  if (window.matchMedia('(hover: hover) and (pointer: fine)').matches) {
    document.querySelectorAll('[data-float]').forEach((figure) => {
      const rotateX = gsap.quickTo(figure, 'rotationX', { duration: .42, ease: 'power3.out' });
      const rotateY = gsap.quickTo(figure, 'rotationY', { duration: .42, ease: 'power3.out' });
      const scale = gsap.quickTo(figure, 'scale', { duration: .42, ease: 'power3.out' });

      figure.addEventListener('pointermove', (event) => {
        const bounds = figure.getBoundingClientRect();
        const x = (event.clientX - bounds.left) / bounds.width - .5;
        const y = (event.clientY - bounds.top) / bounds.height - .5;
        rotateX(y * -8);
        rotateY(x * 10);
        scale(1.03);
      });

      figure.addEventListener('pointerleave', () => {
        rotateX(0);
        rotateY(0);
        scale(1);
      });
    });
  }

  window.addEventListener('load', () => window.ScrollTrigger.refresh(), { once: true });
};

initMotion();

const year = document.querySelector('[data-year]');
if (year) year.textContent = new Date().getFullYear();
