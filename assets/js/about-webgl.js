import * as THREE from '../vendor/three.module.min.js';

const start = () => {
  const orbButton = document.querySelector('[data-gallery-open]');
  const orbCanvas = document.querySelector('[data-gallery-orb-canvas]');
  const overlay = document.querySelector('[data-gallery-overlay]');
  const viewport = document.querySelector('[data-gallery-viewport]');
  const galleryCanvas = document.querySelector('[data-gallery-canvas]');
  const closeButton = document.querySelector('[data-gallery-close]');
  const lightbox = document.querySelector('[data-gallery-lightbox]');
  const lightboxClose = document.querySelector('[data-gallery-lightbox-close]');
  const items = Array.isArray(window.ZL_GALLERY_ITEMS) ? window.ZL_GALLERY_ITEMS : [];

  if (!orbButton || !orbCanvas || !overlay || !viewport || !galleryCanvas || !closeButton || !lightbox || !lightboxClose || !items.length) return;

  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const gsap = window.gsap || null;
  const state = {
    open: false,
    lightboxOpen: false,
    dragging: false,
    moved: false,
    pointerId: null,
    lastX: 0,
    lastY: 0,
    targetYaw: -.15,
    targetPitch: -.04,
    yaw: -.15,
    pitch: -.04,
    velocityX: 0,
    velocityY: 0,
    hovered: null,
    coreHovered: false,
    selected: null,
    orbVisible: true
  };

  let orbRenderer;
  let galleryRenderer;
  try {
    orbRenderer = createRenderer(orbCanvas, true);
    galleryRenderer = createRenderer(galleryCanvas, true);
  } catch (error) {
    document.documentElement.classList.add('webgl-unavailable');
    console.warn('WebGL gallery unavailable:', error);
    return;
  }

  const orbScene = new THREE.Scene();
  const orbCamera = new THREE.PerspectiveCamera(33, 1, .1, 30);
  orbCamera.position.set(0, 0, 4.25);
  const noiseTexture = createNoiseTexture();
  const orb = createKleinSphere(1.18, noiseTexture);
  orbScene.add(orb);
  addLights(orbScene, 1.15);

  const orbWordBelt = createOrbWordBelt(orbRenderer);
  orbScene.add(orbWordBelt);

  const orbHalo = new THREE.Mesh(
    new THREE.SphereGeometry(1.28, 48, 32),
    new THREE.MeshBasicMaterial({ color: 0x002fa7, transparent: true, opacity: .07, side: THREE.BackSide })
  );
  orbScene.add(orbHalo);

  const galleryScene = new THREE.Scene();
  const galleryCamera = new THREE.PerspectiveCamera(96, 1, .1, 40);
  galleryCamera.position.set(0, 0, 0);
  const photoRoot = new THREE.Group();
  galleryScene.add(photoRoot);

  const innerShell = new THREE.Mesh(
    new THREE.SphereGeometry(10.4, 48, 28),
    new THREE.MeshBasicMaterial({ color: 0xdce5ff, transparent: true, opacity: .055, side: THREE.BackSide, depthWrite: false })
  );
  galleryScene.add(innerShell);

  const core = createKleinSphere(1.08, noiseTexture);
  core.position.set(0, 0, -3.8);
  galleryScene.add(core);
  const coreWordBelt = createOrbWordBelt(galleryRenderer, 'EXIT THE GALLERY     ', 1.15, .31, 108);
  coreWordBelt.position.copy(core.position);
  galleryScene.add(coreWordBelt);
  const coreHalo = new THREE.Mesh(
    new THREE.SphereGeometry(1.2, 48, 32),
    new THREE.MeshBasicMaterial({ color: 0x002fa7, transparent: true, opacity: .09, side: THREE.BackSide, depthWrite: false })
  );
  coreHalo.position.copy(core.position);
  galleryScene.add(coreHalo);
  addLights(galleryScene, .92);

  const cardMeshes = buildPhotoSphere(items, photoRoot, galleryRenderer);
  viewport.dataset.webglReady = 'true';
  viewport.dataset.cardCount = String(cardMeshes.length);
  viewport.dataset.coreHovered = 'false';
  const raycaster = new THREE.Raycaster();
  const pointer = new THREE.Vector2(2, 2);
  const cameraDirection = new THREE.Vector3();
  const worldPosition = new THREE.Vector3();

  resizeOrb();
  resizeGallery();
  const orbResizeObserver = new ResizeObserver(resizeOrb);
  orbResizeObserver.observe(orbButton);
  window.addEventListener('resize', resizeGallery, { passive: true });

  const orbObserver = new IntersectionObserver((entries) => {
    state.orbVisible = entries.some((entry) => entry.isIntersecting);
  }, { threshold: 0 });
  orbObserver.observe(orbButton);

  orbButton.addEventListener('click', openGallery);
  closeButton.addEventListener('click', closeGallery);
  lightboxClose.addEventListener('click', closeLightbox);
  lightbox.addEventListener('click', (event) => {
    if (event.target === lightbox) closeLightbox();
  });

  viewport.addEventListener('pointerdown', (event) => {
    if (!state.open || state.lightboxOpen) return;
    updatePointer(event);
    state.dragging = true;
    state.moved = false;
    state.pointerId = event.pointerId;
    state.lastX = event.clientX;
    state.lastY = event.clientY;
    state.velocityX = 0;
    state.velocityY = 0;
    viewport.classList.add('is-dragging');
    viewport.setPointerCapture(event.pointerId);
  });

  viewport.addEventListener('pointermove', (event) => {
    updatePointer(event);
    if (!state.dragging || event.pointerId !== state.pointerId) {
      updateHover();
      return;
    }
    const dx = event.clientX - state.lastX;
    const dy = event.clientY - state.lastY;
    if (Math.abs(dx) + Math.abs(dy) > 3) state.moved = true;
    state.targetYaw += dx * .0044;
    state.targetPitch = clamp(state.targetPitch + dy * .0032, -.68, .68);
    state.velocityX = dx * .00065;
    state.velocityY = dy * .00048;
    state.lastX = event.clientX;
    state.lastY = event.clientY;
  });

  viewport.addEventListener('pointerup', (event) => {
    if (!state.dragging || event.pointerId !== state.pointerId) return;
    const wasMoved = state.moved;
    finishDrag();
    if (!wasMoved) selectAtPointer();
  });
  viewport.addEventListener('pointercancel', finishDrag);
  viewport.addEventListener('pointerleave', () => {
    if (state.dragging) return;
    state.coreHovered = false;
    state.hovered = null;
    viewport.dataset.coreHovered = 'false';
    viewport.style.cursor = 'grab';
  });

  viewport.addEventListener('wheel', (event) => {
    if (!state.open || state.lightboxOpen) return;
    event.preventDefault();
    state.targetYaw -= event.deltaY * .00075;
    state.targetPitch = clamp(state.targetPitch + event.deltaX * .0004, -.68, .68);
    state.velocityX = -event.deltaY * .000022;
  }, { passive: false });

  viewport.addEventListener('keydown', (event) => {
    if (!state.open || state.lightboxOpen) return;
    const step = .13;
    if (event.key === 'ArrowLeft') state.targetYaw -= step;
    else if (event.key === 'ArrowRight') state.targetYaw += step;
    else if (event.key === 'ArrowUp') state.targetPitch = clamp(state.targetPitch - step, -.68, .68);
    else if (event.key === 'ArrowDown') state.targetPitch = clamp(state.targetPitch + step, -.68, .68);
    else if (event.key === 'Enter' || event.key === ' ') openNearestCard();
    else return;
    event.preventDefault();
  });

  document.addEventListener('keydown', (event) => {
    if (event.key !== 'Escape') return;
    if (state.lightboxOpen) closeLightbox();
    else if (state.open) closeGallery();
  });

  let previousTime = performance.now();
  const render = (time) => {
    const delta = Math.min(.04, (time - previousTime) / 1000);
    previousTime = time;

    if (state.orbVisible && !state.open) {
      if (!reduceMotion) {
        orb.rotation.y += delta * .2;
        orb.rotation.x = Math.sin(time * .00035) * .08;
        orbWordBelt.rotation.y -= delta * .48;
        orbHalo.rotation.y -= delta * .08;
      }
      orbRenderer.render(orbScene, orbCamera);
    }

    if (state.open) {
      if (!state.dragging && !state.lightboxOpen && !reduceMotion) {
        state.targetYaw += state.velocityX;
        state.targetPitch = clamp(state.targetPitch + state.velocityY, -.68, .68);
        state.velocityX *= .94;
        state.velocityY *= .92;
      }
      state.yaw = THREE.MathUtils.lerp(state.yaw, state.targetYaw, reduceMotion ? 1 : .085);
      state.pitch = THREE.MathUtils.lerp(state.pitch, state.targetPitch, reduceMotion ? 1 : .085);
      viewport.dataset.yaw = state.yaw.toFixed(4);
      viewport.dataset.pitch = state.pitch.toFixed(4);
      photoRoot.rotation.y = state.yaw;
      photoRoot.rotation.x = state.pitch;
      if (!reduceMotion && !state.coreHovered) {
        core.rotation.y += delta * .22;
        core.rotation.x = Math.sin(time * .0004) * .08;
        coreWordBelt.rotation.y -= delta * .44;
      }
      viewport.dataset.coreBeltRotation = coreWordBelt.rotation.y.toFixed(4);
      coreHalo.rotation.y -= reduceMotion ? 0 : delta * .06;

      cardMeshes.forEach((mesh) => {
        const targetScale = mesh === state.hovered ? 1.035 : 1;
        const nextScale = THREE.MathUtils.lerp(mesh.scale.x, targetScale, .12);
        mesh.scale.setScalar(nextScale);
      });
      galleryRenderer.render(galleryScene, galleryCamera);
    }

    requestAnimationFrame(render);
  };
  requestAnimationFrame(render);

  function createRenderer(canvas, alpha) {
    const renderer = new THREE.WebGLRenderer({ canvas, alpha, antialias: true, powerPreference: 'high-performance' });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, window.innerWidth < 650 ? 1.35 : 1.75));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.08;
    renderer.setClearColor(0x000000, 0);
    return renderer;
  }

  function createKleinSphere(radius, bumpTexture) {
    const material = new THREE.MeshPhysicalMaterial({
      color: 0x002fa7,
      roughness: .3,
      metalness: .03,
      clearcoat: .62,
      clearcoatRoughness: .28,
      bumpMap: bumpTexture,
      bumpScale: .035
    });
    return new THREE.Mesh(new THREE.SphereGeometry(radius, 64, 48), material);
  }

  function createNoiseTexture() {
    const canvas = document.createElement('canvas');
    canvas.width = 192;
    canvas.height = 192;
    const context = canvas.getContext('2d');
    const image = context.createImageData(canvas.width, canvas.height);
    for (let index = 0; index < image.data.length; index += 4) {
      const value = 118 + Math.floor(Math.random() * 28);
      image.data[index] = value;
      image.data[index + 1] = value;
      image.data[index + 2] = value;
      image.data[index + 3] = 255;
    }
    context.putImageData(image, 0, 0);
    const texture = new THREE.CanvasTexture(canvas);
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    texture.repeat.set(3, 3);
    return texture;
  }

  function createOrbWordBelt(renderer, phrase = 'CLICK TO UNFOLD     ', radius = 1.245, height = .34, fontSize = 112) {
    const canvas = document.createElement('canvas');
    canvas.width = 4096;
    canvas.height = 192;
    const context = canvas.getContext('2d');
    context.clearRect(0, 0, canvas.width, canvas.height);
    context.textAlign = 'left';
    context.textBaseline = 'middle';
    context.font = `italic 400 ${fontSize}px "Instrument Serif", Georgia, serif`;
    context.fillStyle = '#f7f4ec';
    context.shadowColor = 'rgba(0, 15, 70, .72)';
    context.shadowBlur = 10;
    context.strokeStyle = 'rgba(0, 20, 82, .42)';
    context.lineWidth = 3;
    const phraseWidth = context.measureText(phrase).width;
    for (let x = -phraseWidth; x < canvas.width + phraseWidth; x += phraseWidth) {
      context.strokeText(phrase, x, canvas.height / 2);
      context.fillText(phrase, x, canvas.height / 2);
    }

    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.anisotropy = Math.min(8, renderer.capabilities.getMaxAnisotropy());
    texture.needsUpdate = true;

    const belt = new THREE.Mesh(
      new THREE.CylinderGeometry(radius, radius, height, 128, 1, true),
      new THREE.MeshBasicMaterial({
        map: texture,
        transparent: true,
        opacity: .96,
        side: THREE.DoubleSide,
        depthTest: true,
        depthWrite: false,
        alphaTest: .02,
        toneMapped: false
      })
    );
    belt.renderOrder = 2;
    belt.rotation.y = -.22;
    return belt;
  }

  function addLights(scene, intensity) {
    scene.add(new THREE.HemisphereLight(0xffffff, 0x00205d, 2.1 * intensity));
    const key = new THREE.DirectionalLight(0xffffff, 4.2 * intensity);
    key.position.set(-3.5, 4.5, 5);
    scene.add(key);
    const rim = new THREE.PointLight(0x7ea0ff, 5.5 * intensity, 18);
    rim.position.set(4, -1, 3);
    scene.add(rim);
  }

  function buildPhotoSphere(galleryItems, root, renderer) {
    // OpenPurpose-style layout: each photograph remains a flat plane, while
    // its centre is projected onto an invisible spherical shell. The camera
    // stays inside that shell, so the collection reads as a tidy 3D room
    // rather than a single image wrapped around a curved surface.
    const radius = 8.6;
    const rows = [
      { latitude: THREE.MathUtils.degToRad(28), offset: 0 },
      { latitude: 0, offset: THREE.MathUtils.degToRad(30) },
      { latitude: THREE.MathUtils.degToRad(-28), offset: 0 }
    ];
    const columns = 6;
    const longitudeStep = Math.PI * 2 / columns;
    // Keep each image substantially smaller than its 60-degree cell. From
    // the centre of the sphere this reveals a complete, evenly spaced mosaic
    // instead of a few oversized planes filling the viewport.
    const baseLongitudeCoverage = THREE.MathUtils.degToRad(32);
    const baseLatitudeCoverage = THREE.MathUtils.degToRad(18);
    const sizePattern = [
      [1.02, .94], [.9, 1.06], [1.05, .9], [.94, 1.02], [1.07, .92], [.91, 1.04]
    ];
    const maxAnisotropy = Math.min(8, renderer.capabilities.getMaxAnisotropy());
    const meshes = [];
    let itemIndex = 0;

    rows.forEach(({ latitude, offset }, rowIndex) => {
      const ringRadius = radius * Math.cos(latitude);
      for (let column = 0; column < columns; column += 1) {
        const item = galleryItems[itemIndex];
        if (!item) break;
        const longitudeCenter = -Math.PI + offset + column * longitudeStep;
        const [widthScale, heightScale] = sizePattern[(column + rowIndex * 2) % sizePattern.length];
        const cardLongitudeLength = baseLongitudeCoverage * widthScale;
        const cardLatitudeLength = baseLatitudeCoverage * heightScale;

        // Translate a controlled angular footprint into a flat tangent plane.
        // Every row closes around 360 degrees, while the unused angle becomes
        // a consistent visible gap instead of overlapping neighbouring cards.
        const cardWidth = 2 * ringRadius * Math.tan(cardLongitudeLength / 2);
        const cardHeight = 2 * radius * Math.tan(cardLatitudeLength / 2);
        const texture = createCardTexture(item, itemIndex, maxAnisotropy, cardWidth / cardHeight);
        const card = new THREE.Mesh(
          new THREE.PlaneGeometry(cardWidth, cardHeight, 1, 1),
          new THREE.MeshBasicMaterial({ map: texture, side: THREE.FrontSide, toneMapped: false })
        );
        card.position.set(
          radius * Math.sin(longitudeCenter) * Math.cos(latitude),
          radius * Math.sin(latitude),
          -radius * Math.cos(longitudeCenter) * Math.cos(latitude)
        );
        card.lookAt(0, 0, 0);
        card.userData.item = item;
        card.userData.index = itemIndex;
        card.renderOrder = 3;

        const frame = new THREE.Mesh(
          new THREE.PlaneGeometry(cardWidth + .1, cardHeight + .1, 1, 1),
          new THREE.MeshBasicMaterial({ color: 0xf7f4ec, toneMapped: false })
        );
        frame.position.z = -.025;
        frame.renderOrder = 2;
        card.add(frame);

        root.add(card);
        meshes.push(card);
        itemIndex += 1;
      }
    });

    const mosaicBacking = new THREE.Mesh(
      new THREE.SphereGeometry(radius + .65, 72, 42),
      new THREE.MeshBasicMaterial({
        color: 0xd8e2ff,
        transparent: true,
        opacity: .2,
        side: THREE.BackSide,
        depthWrite: false,
        toneMapped: false
      })
    );
    mosaicBacking.renderOrder = 1;
    root.add(mosaicBacking);
    return meshes;
  }

  function createCardTexture(item, index, anisotropy, aspect = 4 / 3) {
    const canvas = document.createElement('canvas');
    if (aspect >= 1) {
      canvas.width = 1024;
      canvas.height = Math.max(480, Math.round(1024 / aspect));
    } else {
      canvas.height = 1024;
      canvas.width = Math.max(480, Math.round(1024 * aspect));
    }
    const context = canvas.getContext('2d');
    paintCard(context, canvas, item, index, null);
    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.anisotropy = anisotropy;

    if (item.file) {
      const image = new Image();
      image.decoding = 'async';
      image.onload = () => {
        paintCard(context, canvas, item, index, image);
        texture.needsUpdate = true;
      };
      image.onerror = () => {
        paintCard(context, canvas, item, index, null);
        texture.needsUpdate = true;
      };
      image.src = `../assets/images/gallery/${item.file}`;
    }
    return texture;
  }

  function paintCard(context, canvas, item, index, image) {
    const { width, height } = canvas;
    context.clearRect(0, 0, width, height);
    if (image) {
      const scale = Math.max(width / image.naturalWidth, height / image.naturalHeight);
      const drawWidth = image.naturalWidth * scale;
      const drawHeight = image.naturalHeight * scale;
      context.drawImage(image, (width - drawWidth) / 2, (height - drawHeight) / 2, drawWidth, drawHeight);
      const shade = context.createLinearGradient(0, 0, 0, height);
      shade.addColorStop(0, 'rgba(0, 20, 70, 0.04)');
      shade.addColorStop(.72, 'rgba(0, 20, 70, 0.08)');
      shade.addColorStop(1, 'rgba(0, 20, 70, 0.52)');
      context.fillStyle = shade;
      context.fillRect(0, 0, width, height);
    } else {
      const gradient = context.createLinearGradient(0, 0, width, height);
      gradient.addColorStop(0, '#002fa7');
      gradient.addColorStop(.62, '#3f63d1');
      gradient.addColorStop(1, '#7188df');
      context.fillStyle = gradient;
      context.fillRect(0, 0, width, height);
      const glow = context.createRadialGradient(width * .72, height * .25, 4, width * .72, height * .25, width * .22);
      glow.addColorStop(0, item.accent || '#cdeb55');
      glow.addColorStop(.24, `${item.accent || '#cdeb55'}88`);
      glow.addColorStop(1, 'rgba(255,255,255,0)');
      context.fillStyle = glow;
      context.fillRect(0, 0, width, height);
      context.fillStyle = 'rgba(247,244,236,.86)';
      context.font = '500 18px monospace';
      context.letterSpacing = '2px';
      context.fillText(String(index + 1).padStart(2, '0'), 34, 48);
      context.font = '400 52px Georgia, serif';
      context.fillText(item.category || 'Gallery', 34, height - 92);
    }

    context.fillStyle = 'rgba(247,244,236,.94)';
    context.fillRect(22, height - 68, width - 44, 45);
    context.fillStyle = '#05070b';
    context.font = '700 18px monospace';
    context.textBaseline = 'middle';
    context.fillText((item.title || '').toUpperCase().slice(0, 34), 38, height - 45);
    context.textAlign = 'right';
    context.fillStyle = 'rgba(5,7,11,.58)';
    context.fillText(item.year || '', width - 38, height - 45);
    context.textAlign = 'left';
    context.textBaseline = 'alphabetic';
  }

  function resizeOrb() {
    const rect = orbButton.getBoundingClientRect();
    if (!rect.width || !rect.height) return;
    orbRenderer.setSize(rect.width, rect.height, false);
    orbCamera.aspect = rect.width / rect.height;
    orbCamera.updateProjectionMatrix();
  }

  function resizeGallery() {
    const rect = viewport.getBoundingClientRect();
    if (!rect.width || !rect.height) return;
    galleryRenderer.setSize(rect.width, rect.height, false);
    galleryCamera.aspect = rect.width / rect.height;
    galleryCamera.fov = rect.width < 650 ? 102 : 96;
    galleryCamera.updateProjectionMatrix();
  }

  function openGallery() {
    if (state.open) return;
    state.open = true;
    orbButton.setAttribute('aria-expanded', 'true');
    overlay.setAttribute('aria-hidden', 'false');
    overlay.classList.add('is-open');
    document.body.classList.add('gallery-is-open');
    resizeGallery();
    viewport.focus({ preventScroll: true });

    if (gsap && !reduceMotion) {
      gsap.killTweensOf([overlay, orbButton, photoRoot.scale, core.scale, coreWordBelt.scale]);
      gsap.set(overlay, { autoAlpha: 0 });
      gsap.set(photoRoot.scale, { x: .18, y: .18, z: .18 });
      gsap.set(core.scale, { x: 1.8, y: 1.8, z: 1.8 });
      gsap.set(coreWordBelt.scale, { x: 1.8, y: 1.8, z: 1.8 });
      galleryCamera.fov = 138;
      galleryCamera.updateProjectionMatrix();
      gsap.timeline()
        .to(orbButton, { scale: 4.6, autoAlpha: 0, filter: 'blur(14px)', duration: .72, ease: 'power3.in' }, 0)
        .to(overlay, { autoAlpha: 1, duration: .42, ease: 'power2.out' }, .18)
        .to(photoRoot.scale, { x: 1, y: 1, z: 1, duration: .95, ease: 'power3.out' }, .25)
        .to(core.scale, { x: 1, y: 1, z: 1, duration: .75, ease: 'back.out(1.35)' }, .34)
        .to(coreWordBelt.scale, { x: 1, y: 1, z: 1, duration: .75, ease: 'back.out(1.35)' }, .34)
        .to(galleryCamera, {
          fov: window.innerWidth < 650 ? 102 : 96,
          duration: .85,
          ease: 'power2.out',
          onUpdate: () => galleryCamera.updateProjectionMatrix()
        }, .24);
    } else {
      photoRoot.scale.setScalar(1);
      core.scale.setScalar(1);
      coreWordBelt.scale.setScalar(1);
    }
  }

  function closeGallery() {
    if (!state.open) return;
    if (state.lightboxOpen) closeLightbox();
    state.open = false;
    state.dragging = false;
    state.hovered = null;
    state.coreHovered = false;
    viewport.classList.remove('is-dragging');
    viewport.style.cursor = '';
    orbButton.setAttribute('aria-expanded', 'false');
    document.body.classList.remove('gallery-is-open');

    const complete = () => {
      overlay.classList.remove('is-open');
      overlay.setAttribute('aria-hidden', 'true');
      orbButton.focus({ preventScroll: true });
      if (gsap) gsap.set(orbButton, { clearProps: 'transform,opacity,visibility,filter' });
    };

    if (gsap && !reduceMotion) {
      gsap.to(overlay, { autoAlpha: 0, duration: .42, ease: 'power2.inOut', onComplete: complete });
    } else {
      complete();
    }
  }

  function finishDrag() {
    state.dragging = false;
    viewport.classList.remove('is-dragging');
    if (state.pointerId !== null && viewport.hasPointerCapture(state.pointerId)) viewport.releasePointerCapture(state.pointerId);
    state.pointerId = null;
  }

  function updatePointer(event) {
    const rect = viewport.getBoundingClientRect();
    pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    pointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
  }

  function updateHover() {
    if (!state.open || state.lightboxOpen || state.dragging) return;
    raycaster.setFromCamera(pointer, galleryCamera);
    const hit = raycaster.intersectObjects([core, ...cardMeshes], false)[0]?.object || null;
    state.coreHovered = hit === core;
    state.hovered = state.coreHovered ? null : hit;
    viewport.dataset.coreHovered = String(state.coreHovered);
    viewport.style.cursor = hit ? 'pointer' : 'grab';
  }

  function selectAtPointer() {
    raycaster.setFromCamera(pointer, galleryCamera);
    const hit = raycaster.intersectObjects([core, ...cardMeshes], false)[0]?.object;
    if (hit === core) closeGallery();
    else if (hit) openLightbox(hit.userData.item, hit);
  }

  function openNearestCard() {
    galleryCamera.getWorldDirection(cameraDirection);
    let best = null;
    let bestScore = -Infinity;
    cardMeshes.forEach((mesh) => {
      mesh.getWorldPosition(worldPosition);
      const score = worldPosition.normalize().dot(cameraDirection);
      if (score > bestScore) {
        bestScore = score;
        best = mesh;
      }
    });
    if (best) openLightbox(best.userData.item, best);
  }

  function openLightbox(item, mesh) {
    state.lightboxOpen = true;
    state.selected = mesh;
    const image = lightbox.querySelector('[data-gallery-lightbox-image]');
    const placeholder = lightbox.querySelector('[data-gallery-lightbox-placeholder]');
    lightbox.querySelector('[data-gallery-lightbox-title]').textContent = item.title || '';
    lightbox.querySelector('[data-gallery-lightbox-meta]').textContent = [item.category, item.year].filter(Boolean).join(' · ');
    lightbox.querySelector('[data-gallery-lightbox-description]').textContent = item.description || '';
    placeholder.style.background = `radial-gradient(circle at 65% 30%, ${item.accent || '#cdeb55'}, transparent 17%), linear-gradient(135deg, #002fa7, #5d7cdf 72%, #8fa4ec)`;

    if (item.file) {
      image.hidden = false;
      placeholder.hidden = true;
      image.src = `../assets/images/gallery/${item.file}`;
      image.alt = item.alt || item.title || '';
      image.onerror = () => {
        image.hidden = true;
        placeholder.hidden = false;
      };
    } else {
      image.hidden = true;
      image.removeAttribute('src');
      placeholder.hidden = false;
    }

    lightbox.classList.add('is-open');
    lightbox.setAttribute('aria-hidden', 'false');
    document.body.classList.add('gallery-photo-open');
    lightboxClose.focus({ preventScroll: true });
  }

  function closeLightbox() {
    if (!state.lightboxOpen) return;
    state.lightboxOpen = false;
    lightbox.classList.remove('is-open');
    lightbox.setAttribute('aria-hidden', 'true');
    document.body.classList.remove('gallery-photo-open');
    viewport.focus({ preventScroll: true });
    state.selected = null;
  }
};

if (document.readyState === 'complete') start();
else window.addEventListener('load', start, { once: true });

function clamp(value, minimum, maximum) {
  return Math.min(maximum, Math.max(minimum, value));
}
