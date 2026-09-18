import * as THREE from '../vendor/three.module.min.js';

const start = () => {
  const orbButton = document.querySelector('[data-gallery-open]');
  const orbCanvas = document.querySelector('[data-gallery-orb-canvas]');
  const overlay = document.querySelector('[data-gallery-overlay]');
  const viewport = document.querySelector('[data-gallery-viewport]');
  const galleryCanvas = document.querySelector('[data-gallery-canvas]');
  const closeButton = document.querySelector('[data-gallery-close]');
  const galleryUi = overlay?.querySelector('.gallery-ui');
  const colorWash = document.querySelector('[data-gallery-color-wash]');
  const orbCursor = document.querySelector('[data-orb-cursor]');
  const lightbox = document.querySelector('[data-gallery-lightbox]');
  const lightboxClose = document.querySelector('[data-gallery-lightbox-close]');
  const items = Array.isArray(window.ZL_GALLERY_ITEMS) ? window.ZL_GALLERY_ITEMS : [];

  if (!orbButton || !orbCanvas || !overlay || !viewport || !galleryCanvas || !closeButton || !galleryUi || !colorWash || !orbCursor || !lightbox || !lightboxClose || !items.length) return;

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
    targetPitch: 0,
    yaw: -.15,
    pitch: 0,
    velocityX: 0,
    velocityY: 0,
    hovered: null,
    coreHovered: false,
    selected: null,
    orbVisible: true,
    orbHovered: false,
    transitioning: false,
    transitionTimeline: null,
    cursorX: -100,
    cursorY: -100,
    cursorTargetX: -100,
    cursorTargetY: -100
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
  orbCamera.position.set(0, 0, 5.2);
  const noiseTexture = createNoiseTexture();
  const orbRoot = new THREE.Group();
  orbScene.add(orbRoot);
  const orb = createLiquidGlassSphere(1.18);
  orbRoot.add(orb);
  addLights(orbScene, 1.15);

  const orbBeltRig = new THREE.Group();
  orbBeltRig.rotation.set(-.06, 0, THREE.MathUtils.degToRad(-25));
  orbRoot.add(orbBeltRig);
  const orbWordBelt = createOrbWordBelt(orbRenderer, 'CLICK', 1.42, .36, 162, 5);
  orbBeltRig.add(orbWordBelt);

  const orbBeltLine = new THREE.Mesh(
    new THREE.TorusGeometry(1.42, .008, 8, 160),
    new THREE.MeshBasicMaterial({
      color: 0xf7f4ec,
      transparent: true,
      opacity: .2,
      depthWrite: false,
      toneMapped: false
    })
  );
  orbBeltLine.rotation.x = Math.PI / 2;
  orbBeltLine.renderOrder = 1;
  orbBeltRig.add(orbBeltLine);

  const orbHalo = new THREE.Mesh(
    new THREE.SphereGeometry(1.28, 48, 32),
    new THREE.MeshBasicMaterial({ color: 0xeaf2ff, transparent: true, opacity: .12, side: THREE.BackSide, depthWrite: false })
  );
  orbRoot.add(orbHalo);

  const galleryScene = new THREE.Scene();
  galleryScene.background = new THREE.Color(0xffffff);
  const galleryCamera = new THREE.PerspectiveCamera(104, 1, .1, 40);
  galleryCamera.position.set(0, 0, 0);
  const photoRoot = new THREE.Group();
  photoRoot.rotation.order = 'YXZ';
  galleryScene.add(photoRoot);

  const innerShell = new THREE.Mesh(
    new THREE.SphereGeometry(10.4, 48, 28),
    new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: .18, side: THREE.BackSide, depthWrite: false })
  );
  galleryScene.add(innerShell);

  const coreRoot = new THREE.Group();
  coreRoot.position.set(0, 0, -3.7);
  galleryScene.add(coreRoot);
  const core = createLiquidGlassSphere(.86, {
    glassColor: 0x7fa5f2,
    edgeColor: 0x174bc3,
    innerColor: 0x4778df,
    blobColor: 0x4f7fe4,
    density: .9,
    innerOpacity: .2,
    blobOpacity: .12
  });
  coreRoot.add(core);
  const coreHitTarget = core.userData.hitTarget;
  const coreGlassUniforms = core.userData.glassUniforms;
  const coreBeltRig = new THREE.Group();
  coreBeltRig.rotation.set(-.04, 0, THREE.MathUtils.degToRad(-25));
  coreRoot.add(coreBeltRig);
  const coreWordBelt = createOrbWordBelt(galleryRenderer, 'EXIT', 1.08, .3, 148, 5);
  coreBeltRig.add(coreWordBelt);
  const coreBeltLine = new THREE.Mesh(
    new THREE.TorusGeometry(1.08, .007, 8, 144),
    new THREE.MeshBasicMaterial({ color: 0xf7f4ec, transparent: true, opacity: .2, depthWrite: false, toneMapped: false })
  );
  coreBeltLine.rotation.x = Math.PI / 2;
  coreBeltRig.add(coreBeltLine);
  const coreHalo = new THREE.Mesh(
    new THREE.SphereGeometry(.96, 48, 32),
    new THREE.MeshBasicMaterial({ color: 0x174cc5, transparent: true, opacity: .12, side: THREE.BackSide, depthWrite: false })
  );
  coreRoot.add(coreHalo);

  const fracture = createFractureSphere(1.18);
  fracture.root.visible = false;
  galleryScene.add(fracture.root);
  addLights(galleryScene, .92);

  const cardMeshes = buildPhotoSphere(items, photoRoot, galleryRenderer);
  const photoMaterials = [];
  const photoMaterialOpacities = [];
  photoRoot.traverse((object) => {
    if (!object.isMesh || !object.material) return;
    const materials = Array.isArray(object.material) ? object.material : [object.material];
    materials.forEach((material) => {
      material.transparent = true;
      material.needsUpdate = true;
      photoMaterials.push(material);
      photoMaterialOpacities.push(material.opacity);
    });
  });
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
  orbButton.addEventListener('pointerenter', () => {
    state.orbHovered = true;
    if (window.matchMedia('(hover: hover) and (pointer: fine)').matches) orbCursor.classList.add('is-visible');
  });
  orbButton.addEventListener('pointerleave', () => {
    state.orbHovered = false;
    orbCursor.classList.remove('is-visible');
  });
  orbButton.addEventListener('focus', () => { state.orbHovered = true; });
  orbButton.addEventListener('blur', () => { state.orbHovered = false; });
  closeButton.addEventListener('click', closeGallery);
  lightboxClose.addEventListener('click', closeLightbox);
  lightbox.addEventListener('click', (event) => {
    if (event.target === lightbox) closeLightbox();
  });

  document.addEventListener('pointermove', (event) => {
    state.cursorTargetX = event.clientX + 14;
    state.cursorTargetY = event.clientY + 14;
  }, { passive: true });

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
    state.targetPitch = 0;
    state.velocityX = dx * .00065;
    state.velocityY = 0;
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
    orbCursor.classList.remove('is-visible', 'is-exit');
  });

  viewport.addEventListener('wheel', (event) => {
    if (!state.open || state.lightboxOpen) return;
    event.preventDefault();
    state.targetYaw -= event.deltaY * .00075;
    state.velocityX = -event.deltaY * .000022;
  }, { passive: false });

  viewport.addEventListener('keydown', (event) => {
    if (!state.open || state.lightboxOpen) return;
    const step = .13;
    if (event.key === 'ArrowLeft') state.targetYaw -= step;
    else if (event.key === 'ArrowRight') state.targetYaw += step;
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
    state.cursorX = THREE.MathUtils.lerp(state.cursorX, state.cursorTargetX, .24);
    state.cursorY = THREE.MathUtils.lerp(state.cursorY, state.cursorTargetY, .24);
    orbCursor.style.transform = `translate3d(${state.cursorX}px, ${state.cursorY}px, 0) translate(-50%, -50%)`;

    if (state.orbVisible && !state.open) {
      const glassUniforms = orb.userData.glassUniforms;
      glassUniforms.uTime.value = time * .001;
      glassUniforms.uHover.value = THREE.MathUtils.lerp(
        glassUniforms.uHover.value,
        state.orbHovered ? 1 : 0,
        .08
      );
      if (!reduceMotion) {
        orb.userData.liquidBlobs.forEach((blob, index) => {
          const offset = index * 2.13;
          blob.position.set(
            Math.sin(time * .00055 + offset) * (.27 + index * .035),
            Math.cos(time * .00043 + offset * 1.3) * (.23 + index * .025),
            Math.sin(time * .00037 + offset * .8) * .2
          );
          blob.scale.setScalar(1 + Math.sin(time * .00072 + offset) * .12);
        });
      }
      if (!reduceMotion) {
        const phase = time / 5200;
        const breath = 1 + Math.sin(phase * Math.PI * 2) * .055;
        const hoverScale = state.orbHovered ? 1.035 : 1;
        const nextScale = THREE.MathUtils.lerp(orbBeltRig.scale.x, breath * hoverScale, .085);
        orbBeltRig.scale.setScalar(nextScale);
        orb.rotation.y += delta * .18;
        orb.rotation.x = Math.sin(time * .00034) * .075;
        orbWordBelt.rotation.y -= delta * .62;
        orbBeltLine.rotation.z += delta * .035;
        orbHalo.rotation.y -= delta * .08;
      } else {
        orbBeltRig.scale.setScalar(1);
      }
      orbRenderer.render(orbScene, orbCamera);
    }

    if (state.open) {
      if (!state.dragging && !state.lightboxOpen && !reduceMotion) {
        state.targetYaw += state.velocityX;
        state.targetPitch = 0;
        state.velocityX *= .94;
        state.velocityY *= .92;
      }
      state.yaw = THREE.MathUtils.lerp(state.yaw, state.targetYaw, reduceMotion ? 1 : .085);
      state.pitch = THREE.MathUtils.lerp(state.pitch, 0, reduceMotion ? 1 : .085);
      // Keep horizontal rotation numerically stable without introducing a
      // visible boundary: yaw can continue in either direction forever.
      if (Math.abs(state.yaw) > Math.PI * 64) {
        const completedTurns = Math.trunc(state.yaw / (Math.PI * 2));
        const wrappedTurns = completedTurns * Math.PI * 2;
        state.yaw -= wrappedTurns;
        state.targetYaw -= wrappedTurns;
      }
      viewport.dataset.yaw = state.yaw.toFixed(4);
      viewport.dataset.pitch = state.pitch.toFixed(4);
      photoRoot.rotation.y = state.yaw;
      photoRoot.rotation.x = state.pitch;
      if (!reduceMotion && !state.coreHovered) {
        core.rotation.y += delta * .22;
        core.rotation.x = Math.sin(time * .0004) * .08;
        coreWordBelt.rotation.y -= delta * .44;
      }
      coreGlassUniforms.uTime.value = time * .001;
      coreGlassUniforms.uHover.value = THREE.MathUtils.lerp(
        coreGlassUniforms.uHover.value,
        state.coreHovered ? 1 : 0,
        .09
      );
      if (!reduceMotion) {
        core.userData.liquidBlobs.forEach((blob, index) => {
          const offset = index * 2.37 + .6;
          blob.position.set(
            Math.sin(time * .00072 + offset) * (.19 + index * .018),
            Math.cos(time * .00058 + offset * 1.2) * (.17 + index * .016),
            Math.sin(time * .00047 + offset * .75) * .14
          );
          blob.scale.setScalar(1 + Math.sin(time * .0009 + offset) * .14);
        });
      }
      if (!reduceMotion) {
        const coreBreath = 1 + Math.sin(time / 820) * .045;
        const coreScale = THREE.MathUtils.lerp(coreBeltRig.scale.x, coreBreath, .075);
        coreBeltRig.scale.setScalar(coreScale);
        coreBeltLine.rotation.z -= delta * .025;
      }
      viewport.dataset.coreBeltRotation = coreWordBelt.rotation.y.toFixed(4);
      coreHalo.rotation.y -= reduceMotion ? 0 : delta * .06;
      fracture.material.uniforms.uTime.value = time * .001;

      cardMeshes.forEach((mesh) => {
        // The viewer is inside the sphere. A slightly smaller radius brings
        // the hovered photograph toward the camera without flattening it.
        const targetScale = mesh === state.hovered ? .982 : 1;
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

  function createLiquidGlassSphere(radius, options = {}) {
    const uniforms = {
      uTime: { value: 0 },
      uHover: { value: 0 },
      uReveal: { value: 1 },
      uDensity: { value: options.density ?? .12 },
      uGlassColor: { value: new THREE.Color(options.glassColor ?? 0x94b7ff) },
      uEdgeColor: { value: new THREE.Color(options.edgeColor ?? 0x527de0) }
    };
    const material = new THREE.ShaderMaterial({
      uniforms,
      vertexShader: `
        uniform float uTime;
        uniform float uHover;
        uniform float uReveal;
        uniform float uDensity;
        uniform vec3 uGlassColor;
        uniform vec3 uEdgeColor;
        varying vec3 vNormalWorld;
        varying vec3 vWorldPosition;
        varying vec3 vObjectPosition;
        void main() {
          float waveA = sin(position.y * 5.2 + uTime * 1.15);
          float waveB = sin(position.x * 4.1 - uTime * .82 + position.z * 2.4);
          float displacement = (waveA + waveB) * (.007 + uHover * .004);
          vec3 moved = position + normal * displacement;
          vObjectPosition = moved;
          vNormalWorld = normalize(mat3(modelMatrix) * normal);
          vec4 world = modelMatrix * vec4(moved, 1.0);
          vWorldPosition = world.xyz;
          gl_Position = projectionMatrix * viewMatrix * world;
        }
      `,
      fragmentShader: `
        uniform float uTime;
        uniform float uHover;
        uniform float uReveal;
        uniform float uDensity;
        uniform vec3 uGlassColor;
        uniform vec3 uEdgeColor;
        varying vec3 vNormalWorld;
        varying vec3 vWorldPosition;
        varying vec3 vObjectPosition;
        void main() {
          vec3 normal = normalize(vNormalWorld);
          vec3 viewDirection = normalize(cameraPosition - vWorldPosition);
          float facing = clamp(dot(normal, viewDirection), 0.0, 1.0);
          float fresnel = pow(1.0 - facing, 2.35);
          float flowA = sin(vObjectPosition.y * 6.2 + vObjectPosition.x * 2.7 + uTime * 1.05);
          float flowB = sin(vObjectPosition.z * 7.0 - vObjectPosition.y * 2.3 - uTime * .78);
          float flow = .5 + .25 * flowA + .25 * flowB;
          float caustic = smoothstep(.52, .92, flow) * (1.0 - fresnel);
          vec3 lightDirection = normalize(vec3(-.55, .72, 1.0));
          vec3 halfDirection = normalize(lightDirection + viewDirection);
          float specular = pow(max(dot(normal, halfDirection), 0.0), 72.0);
          float secondary = pow(max(dot(normal, normalize(vec3(.72, -.35, .62))), 0.0), 24.0);
          vec3 coolGlass = uGlassColor;
          vec3 clearGlass = vec3(.94, .975, 1.0);
          vec3 edgeBlue = uEdgeColor;
          vec3 color = mix(clearGlass, coolGlass, .16 + uDensity * .24 + flow * .16);
          color = mix(color, edgeBlue, fresnel * (.4 + uDensity * .25));
          color += caustic * vec3(.22, .3, .5);
          color += specular * vec3(1.0) + secondary * vec3(.2, .3, .52);
          float alpha = .065 + uDensity * .11 + fresnel * (.46 + uDensity * .12) + caustic * .11 + specular * .52 + secondary * .08;
          alpha += uHover * (.025 + fresnel * .06);
          gl_FragColor = vec4(color, clamp(alpha, .06, .9) * uReveal);
        }
      `,
      transparent: true,
      depthWrite: false,
      side: THREE.FrontSide,
      toneMapped: false
    });

    const root = new THREE.Group();
    const glass = new THREE.Mesh(new THREE.SphereGeometry(radius, 96, 64), material);
    glass.renderOrder = 3;
    root.add(glass);

    const innerShell = new THREE.Mesh(
      new THREE.SphereGeometry(radius * .965, 72, 48),
      new THREE.MeshBasicMaterial({
        color: options.innerColor ?? 0xbdd2ff,
        transparent: true,
        opacity: options.innerOpacity ?? .095,
        side: THREE.BackSide,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        toneMapped: false
      })
    );
    innerShell.renderOrder = 1;
    root.add(innerShell);

    const liquidBlobs = [0, 1, 2].map((index) => {
      const blob = new THREE.Mesh(
        new THREE.SphereGeometry(radius * (.24 + index * .035), 32, 24),
        new THREE.MeshBasicMaterial({
          color: index === 1 ? 0xffffff : (options.blobColor ?? 0x8fb3ff),
          transparent: true,
          opacity: index === 1 ? (options.blobOpacity ?? .075) * .72 : (options.blobOpacity ?? .075),
          depthWrite: false,
          blending: THREE.AdditiveBlending,
          toneMapped: false
        })
      );
      blob.renderOrder = 2;
      root.add(blob);
      return blob;
    });
    root.userData.glassUniforms = uniforms;
    root.userData.liquidBlobs = liquidBlobs;
    root.userData.hitTarget = glass;
    root.userData.glassMaterial = material;
    return root;
  }

  function createKleinSphere(radius, bumpTexture, options = {}) {
    const material = new THREE.MeshPhysicalMaterial({
      color: options.color ?? 0x002fa7,
      roughness: options.roughness ?? .08,
      metalness: 0,
      transmission: options.transmission ?? .78,
      thickness: options.thickness ?? 1.2,
      ior: options.ior ?? 1.42,
      attenuationColor: new THREE.Color(options.attenuationColor ?? options.color ?? 0x002fa7),
      attenuationDistance: options.attenuationDistance ?? 1.65,
      clearcoat: 1,
      clearcoatRoughness: .045,
      sheen: .28,
      sheenColor: new THREE.Color(options.sheenColor ?? 0x547ce5),
      sheenRoughness: .24,
      specularIntensity: 1.3,
      specularColor: new THREE.Color(options.specularColor ?? 0xb8caff),
      bumpMap: bumpTexture,
      bumpScale: options.bumpScale ?? .022,
      transparent: true,
      opacity: options.opacity ?? .94,
      side: THREE.DoubleSide,
      depthWrite: false
    });
    return new THREE.Mesh(new THREE.SphereGeometry(radius, 64, 48), material);
  }

  function createFractureSphere(radius) {
    const geometry = new THREE.SphereGeometry(radius, 24, 16).toNonIndexed();
    const positions = geometry.getAttribute('position');
    const centers = new Float32Array(positions.count * 3);
    const directions = new Float32Array(positions.count * 3);
    const axes = new Float32Array(positions.count * 3);
    const randoms = new Float32Array(positions.count);
    const a = new THREE.Vector3();
    const b = new THREE.Vector3();
    const c = new THREE.Vector3();
    const center = new THREE.Vector3();
    const direction = new THREE.Vector3();
    const axis = new THREE.Vector3();

    for (let index = 0; index < positions.count; index += 3) {
      a.fromBufferAttribute(positions, index);
      b.fromBufferAttribute(positions, index + 1);
      c.fromBufferAttribute(positions, index + 2);
      center.copy(a).add(b).add(c).multiplyScalar(1 / 3);
      const seed = Math.sin((index + 7) * 91.713) * 43758.5453;
      const noise = seed - Math.floor(seed);
      direction.copy(center).normalize();
      direction.x += Math.sin(index * 2.17) * .26;
      direction.y += Math.cos(index * 1.41) * .24;
      direction.z += Math.sin(index * .73) * .18;
      direction.normalize().multiplyScalar(2.9 + noise * 3.7);
      axis.set(
        Math.sin(index * .61 + .2),
        Math.cos(index * .47 + .8),
        Math.sin(index * .83 + 1.7)
      ).normalize();
      for (let vertex = 0; vertex < 3; vertex += 1) {
        const offset = (index + vertex) * 3;
        centers.set([center.x, center.y, center.z], offset);
        directions.set([direction.x, direction.y, direction.z], offset);
        axes.set([axis.x, axis.y, axis.z], offset);
        randoms[index + vertex] = noise;
      }
    }
    geometry.setAttribute('aCenter', new THREE.BufferAttribute(centers, 3));
    geometry.setAttribute('aDirection', new THREE.BufferAttribute(directions, 3));
    geometry.setAttribute('aAxis', new THREE.BufferAttribute(axes, 3));
    geometry.setAttribute('aRandom', new THREE.BufferAttribute(randoms, 1));

    const material = new THREE.ShaderMaterial({
      uniforms: {
        uExplode: { value: 0 },
        uOpacity: { value: 1 },
        uTime: { value: 0 }
      },
      vertexShader: `
        attribute vec3 aCenter;
        attribute vec3 aDirection;
        attribute vec3 aAxis;
        attribute float aRandom;
        uniform float uExplode;
        uniform float uTime;
        varying vec3 vNormal;
        varying float vLight;
        vec3 rotateAroundAxis(vec3 value, vec3 axis, float angle) {
          return value * cos(angle) + cross(axis, value) * sin(angle) + axis * dot(axis, value) * (1.0 - cos(angle));
        }
        void main() {
          float delayed = smoothstep(aRandom * .16, .72 + aRandom * .22, uExplode);
          float eased = delayed * delayed * (3.0 - 2.0 * delayed);
          vec3 local = position - aCenter;
          float angle = eased * (2.2 + aRandom * 4.4);
          vec3 rotated = rotateAroundAxis(local, aAxis, angle);
          vec3 displaced = aCenter + rotated + aDirection * eased;
          displaced += normalize(aDirection) * sin(uTime * 2.0 + aRandom * 12.0) * .025 * eased;
          vNormal = normalize(normalMatrix * rotateAroundAxis(normal, aAxis, angle));
          vLight = .72 + .28 * max(dot(vNormal, normalize(vec3(-.4, .75, 1.0))), 0.0);
          gl_Position = projectionMatrix * modelViewMatrix * vec4(displaced, 1.0);
        }
      `,
      fragmentShader: `
        uniform float uOpacity;
        varying float vLight;
        void main() {
          vec3 base = vec3(.88, .91, .97);
          vec3 highlight = vec3(1.0);
          gl_FragColor = vec4(mix(base, highlight, vLight * .72), uOpacity);
        }
      `,
      transparent: true,
      side: THREE.DoubleSide,
      depthWrite: false,
      toneMapped: false
    });
    const mesh = new THREE.Mesh(geometry, material);
    mesh.frustumCulled = false;
    mesh.renderOrder = 5;
    return { root: mesh, material };
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

  function createOrbWordBelt(renderer, phrase = 'CLICK TO UNFOLD     ', radius = 1.245, height = .34, fontSize = 112, repeatCount = 0) {
    const canvas = document.createElement('canvas');
    canvas.width = 4096;
    canvas.height = repeatCount ? 240 : 192;
    const context = canvas.getContext('2d');
    context.clearRect(0, 0, canvas.width, canvas.height);
    context.textAlign = repeatCount ? 'center' : 'left';
    context.textBaseline = 'middle';
    context.font = `italic 400 ${fontSize}px "Instrument Serif", Georgia, serif`;
    context.fillStyle = '#f7f4ec';
    context.shadowColor = 'rgba(0, 12, 56, .36)';
    context.shadowBlur = 3;
    context.strokeStyle = 'rgba(0, 13, 62, .78)';
    context.lineJoin = 'round';
    context.lineWidth = repeatCount ? 5 : 3;
    if (repeatCount) {
      const cellWidth = canvas.width / repeatCount;
      for (let index = 0; index < repeatCount; index += 1) {
        const x = cellWidth * (index + .5);
        context.strokeText(phrase, x, canvas.height / 2);
        context.fillText(phrase, x, canvas.height / 2);
      }
    } else {
      const phraseWidth = context.measureText(phrase).width;
      for (let x = -phraseWidth; x < canvas.width + phraseWidth; x += phraseWidth) {
        context.strokeText(phrase, x, canvas.height / 2);
        context.fillText(phrase, x, canvas.height / 2);
      }
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
    scene.add(new THREE.HemisphereLight(0xdde8ff, 0x00143f, 1.75 * intensity));
    const key = new THREE.DirectionalLight(0xffffff, 4.7 * intensity);
    key.position.set(-3.8, 4.8, 5.4);
    scene.add(key);
    const rim = new THREE.PointLight(0x7197ff, 6.2 * intensity, 18);
    rim.position.set(4.2, -.6, 3.2);
    scene.add(rim);
    const lowerBounce = new THREE.PointLight(0x002fa7, 3.4 * intensity, 12);
    lowerBounce.position.set(-2.2, -3.4, 2.2);
    scene.add(lowerBounce);
  }

  function buildPhotoSphere(galleryItems, root, renderer) {
    // Framer University's Open Purpose recreation builds the globe from
    // crossing 3D "arms", not stacked latitude bands. Nine X-axis arms and
    // four Y-axis arms make the top, bottom and corners converge as a sphere.
    const radius = 8.6;
    const globeRig = new THREE.Group();
    globeRig.name = 'gallery-globe-rig';
    root.add(globeRig);

    const armSpecs = [
      ...Array.from({ length: 9 }, (_, index) => ({
        axis: 'x',
        angle: index * 40,
        phase: 17 + index * 11.3
      })),
      ...[0, 45, 90, 130].map((angle, index) => ({
        axis: 'y',
        angle,
        phase: 31 + index * 17
      }))
    ];
    const maxAnisotropy = Math.min(8, renderer.capabilities.getMaxAnisotropy());
    const portraitItems = galleryItems.filter((item) => Number(item.aspect) < 1);
    const landscapeItems = galleryItems.filter((item) => Number(item.aspect) >= 1);
    const layoutItems = [];
    while (portraitItems.length || landscapeItems.length) {
      if (portraitItems.length) layoutItems.push(portraitItems.shift());
      if (landscapeItems.length) layoutItems.push(landscapeItems.shift());
    }
    const meshes = [];
    const candidates = [];
    const armGroups = armSpecs.map((spec, armIndex) => {
      const arm = new THREE.Group();
      arm.name = `gallery-arm-${spec.axis}-${armIndex}`;
      if (spec.axis === 'x') arm.rotation.x = THREE.MathUtils.degToRad(spec.angle);
      else arm.rotation.y = THREE.MathUtils.degToRad(spec.angle);
      globeRig.add(arm);

      // Twelve candidate positions per arm give the spacing pass enough room
      // to distribute the photographs without reconnecting them into bands.
      for (let slotIndex = 0; slotIndex < 12; slotIndex += 1) {
        const jitter = (seededUnit(armIndex * 97 + slotIndex * 41 + 13) - .5) * 3;
        const orbitAngle = THREE.MathUtils.degToRad(spec.phase + slotIndex * 30 + jitter);
        const localPosition = spec.axis === 'x'
          ? new THREE.Vector3(Math.sin(orbitAngle) * radius, 0, -Math.cos(orbitAngle) * radius)
          : new THREE.Vector3(0, Math.sin(orbitAngle) * radius, -Math.cos(orbitAngle) * radius);
        const worldPosition = localPosition.clone().applyEuler(arm.rotation);
        candidates.push({ arm, armIndex, slotIndex, localPosition, worldPosition });
      }
      return arm;
    });

    // Remove near-duplicate intersections where crossing arms meet. The
    // remaining slots stay irregular and read as one globe rather than rows.
    // The reference leaves a clear pocket of air around every frame. A
    // generous angular gap also accounts for wide landscape photographs, so
    // intersecting arms never create visible card-on-card collisions.
    const minSeparation = THREE.MathUtils.degToRad(7.5);
    const slots = [];
    candidates.forEach((candidate) => {
      const direction = candidate.worldPosition.clone().normalize();
      const overlaps = slots.some((slot) => (
        Math.acos(clamp(direction.dot(slot.direction), -1, 1)) < minSeparation
      ));
      if (!overlaps) slots.push({ ...candidate, direction });
    });

    // Farthest-point placement creates the airy, evenly scattered inner-globe
    // layout from the reference while keeping every photograph independent.
    const forward = new THREE.Vector3(0, 0, -1);
    const availableSlots = [...slots];
    const photoSlots = [];
    while (photoSlots.length < layoutItems.length && availableSlots.length) {
      let bestIndex = 0;
      let bestScore = -Infinity;
      availableSlots.forEach((slot, index) => {
        const nearest = photoSlots.length
          ? Math.min(...photoSlots.map((placed) => (
            Math.acos(clamp(slot.direction.dot(placed.direction), -1, 1))
          )))
          : Math.PI;
        const forwardBias = slot.direction.dot(forward) * (photoSlots.length ? .035 : .22);
        const score = nearest + forwardBias;
        if (score > bestScore) {
          bestScore = score;
          bestIndex = index;
        }
      });
      photoSlots.push(availableSlots.splice(bestIndex, 1)[0]);
    }
    photoSlots.forEach((slot, index) => {
      const item = layoutItems[index];
      slot.item = item;
      slot.itemIndex = galleryItems.indexOf(slot.item);
    });

    photoSlots.forEach((slot, slotIndex) => {
      const aspect = clamp(Number(slot.item.aspect) || 4 / 3, .54, 1.72);
      const height = 2.04 + seededUnit(slotIndex * 67 + 19) * .56;
      const width = height * aspect;
      const geometry = new THREE.PlaneGeometry(width, height, 1, 1);
      const texture = createCardTexture(slot.item, slot.itemIndex, maxAnisotropy, aspect);
      const material = new THREE.MeshBasicMaterial({
        map: texture,
        side: THREE.DoubleSide,
        toneMapped: false
      });

      const panel = new THREE.Mesh(geometry, material);
      panel.position.copy(slot.localPosition);
      // Keep every photograph's top edge legible while its face points back
      // toward the camera at the globe centre. Compensating for the arm's
      // quaternion prevents upper-arm cards from flipping upside down.
      const inward = slot.worldPosition.clone().normalize().negate();
      const upHint = Math.abs(inward.y) > .94
        ? new THREE.Vector3(0, 0, 1)
        : new THREE.Vector3(0, 1, 0);
      const right = upHint.clone().cross(inward).normalize();
      const stableUp = inward.clone().cross(right).normalize();
      const worldBasis = new THREE.Matrix4().makeBasis(right, stableUp, inward);
      const worldQuaternion = new THREE.Quaternion().setFromRotationMatrix(worldBasis);
      const inverseArmQuaternion = slot.arm.quaternion.clone().invert();
      panel.quaternion.copy(inverseArmQuaternion.multiply(worldQuaternion));
      panel.renderOrder = 3;
      panel.userData.placeholder = false;
      panel.userData.armAxis = armSpecs[slot.armIndex].axis;
      panel.userData.armAngle = armSpecs[slot.armIndex].angle;
      panel.userData.item = slot.item;
      panel.userData.index = slot.itemIndex;
      meshes.push(panel);
      slot.arm.add(panel);
    });

    // A white inner shell closes every gap so the immersive room remains
    // genuinely white in WebGL, independent of the page background beneath it.
    const outerSphere = new THREE.Mesh(
      new THREE.SphereGeometry(radius + .7, 96, 64),
      new THREE.MeshBasicMaterial({
        color: 0xffffff,
        transparent: false,
        opacity: 1,
        side: THREE.BackSide,
        depthWrite: true,
        toneMapped: false
      })
    );
    outerSphere.renderOrder = 1;
    outerSphere.userData.isOuterGallerySphere = true;
    globeRig.add(outerSphere);
    globeRig.userData.armCount = armGroups.length;
    return meshes;
  }

  function seededUnit(seed) {
    const value = Math.sin(seed * 12.9898 + 78.233) * 43758.5453;
    return value - Math.floor(value);
  }

  function createCardTexture(item, index, anisotropy, aspect = 4 / 3) {
    const canvas = document.createElement('canvas');
    if (aspect >= 1) {
      canvas.width = 768;
      canvas.height = Math.max(360, Math.round(768 / aspect));
    } else {
      canvas.height = 768;
      canvas.width = Math.max(360, Math.round(768 * aspect));
    }
    const context = canvas.getContext('2d');
    paintCard(context, canvas, item, index, null);
    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.anisotropy = anisotropy;

    if (item.preview || item.file) {
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
      image.src = `../assets/images/gallery/${item.preview || item.file}`;
    }
    return texture;
  }

  function paintCard(context, canvas, item, index, image) {
    const { width, height } = canvas;
    context.clearRect(0, 0, width, height);
    context.fillStyle = '#07143b';
    context.fillRect(0, 0, width, height);
    if (image) {
      const scale = Math.min(width / image.naturalWidth, height / image.naturalHeight);
      const drawWidth = image.naturalWidth * scale;
      const drawHeight = image.naturalHeight * scale;
      context.drawImage(image, (width - drawWidth) / 2, (height - drawHeight) / 2, drawWidth, drawHeight);
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
      context.fillText('PHOTO', 34, height - 30);
    }
  }

  function resizeOrb() {
    const rect = orbCanvas.getBoundingClientRect();
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
    galleryCamera.fov = rect.width < 650 ? 98 : 100;
    galleryCamera.updateProjectionMatrix();
  }

  function matchFractureToOrb() {
    const viewportRect = viewport.getBoundingClientRect();
    const orbRect = orbButton.getBoundingClientRect();
    const depth = 3.2;
    const worldHeight = 2 * depth * Math.tan(THREE.MathUtils.degToRad(galleryCamera.fov * .5));
    const worldWidth = worldHeight * galleryCamera.aspect;
    const centerX = orbRect.left + orbRect.width * .5;
    const centerY = orbRect.top + orbRect.height * .5;
    const normalizedX = ((centerX - viewportRect.left) / viewportRect.width) * 2 - 1;
    const normalizedY = -(((centerY - viewportRect.top) / viewportRect.height) * 2 - 1);
    fracture.root.position.set(normalizedX * worldWidth * .5, normalizedY * worldHeight * .5, -depth);
    const targetDiameter = Math.max(orbRect.width, orbRect.height) / viewportRect.height * worldHeight;
    fracture.root.scale.setScalar(targetDiameter / 2.36);
    colorWash.style.setProperty('--wash-x', `${((centerX - viewportRect.left) / viewportRect.width) * 100}%`);
    colorWash.style.setProperty('--wash-y', `${((centerY - viewportRect.top) / viewportRect.height) * 100}%`);
  }

  function openGallery() {
    if (state.open && !state.transitioning) return;
    state.open = true;
    state.transitioning = true;
    orbButton.setAttribute('aria-expanded', 'true');
    overlay.setAttribute('aria-hidden', 'false');
    overlay.classList.add('is-open');
    document.body.classList.add('gallery-is-open');
    orbCursor.classList.remove('is-visible', 'is-exit');
    resizeGallery();
    matchFractureToOrb();

    if (gsap && !reduceMotion) {
      if (state.transitionTimeline) state.transitionTimeline.kill();
      fracture.root.visible = true;
      fracture.material.uniforms.uExplode.value = 0;
      fracture.material.uniforms.uOpacity.value = 1;
      gsap.set(overlay, { autoAlpha: 1 });
      gsap.set(colorWash, { xPercent: -50, yPercent: -50, scale: 0 });
      gsap.set(photoRoot.scale, { x: .52, y: .52, z: .52 });
      gsap.set(photoMaterials, { opacity: 0 });
      gsap.set(galleryUi, { autoAlpha: 0 });
      gsap.set(coreRoot.scale, { x: .28, y: .28, z: .28 });
      gsap.set(coreGlassUniforms.uReveal, { value: 0 });
      gsap.set(coreWordBelt.material, { opacity: 0 });
      gsap.set(coreBeltLine.material, { opacity: 0 });
      gsap.set(coreHalo.material, { opacity: 0 });
      state.transitionTimeline = gsap.timeline({
        paused: true,
        defaults: { overwrite: 'auto' },
        onComplete: () => {
          state.transitioning = false;
          fracture.root.visible = false;
          viewport.focus({ preventScroll: true });
        },
        onReverseComplete: finalizeClose
      });
      state.transitionTimeline
        .to(orbButton, { autoAlpha: 0, duration: .24, ease: 'power1.inOut' }, 0)
        .to(fracture.material.uniforms.uExplode, { value: 1, duration: 1.5, ease: 'power2.inOut' }, .08)
        .to(colorWash, { scale: 24, duration: 1.45, ease: 'power2.inOut' }, .16)
        .to(photoRoot.scale, { x: 1, y: 1, z: 1, duration: 1.35, ease: 'power2.out' }, .55)
        .to(photoMaterials, { opacity: (index) => photoMaterialOpacities[index], duration: 1.15, ease: 'sine.inOut' }, .58)
        .to(galleryUi, { autoAlpha: 1, duration: .7, ease: 'sine.out' }, 1.15)
        .to(coreRoot.scale, { x: 1, y: 1, z: 1, duration: 1.15, ease: 'power2.out' }, .85)
        .to(coreGlassUniforms.uReveal, { value: 1, duration: .95, ease: 'sine.out' }, .9)
        .to(coreWordBelt.material, { opacity: .96, duration: .75, ease: 'sine.out' }, 1.1)
        .to(coreBeltLine.material, { opacity: .2, duration: .68, ease: 'sine.out' }, 1.12)
        .to(coreHalo.material, { opacity: .09, duration: .68, ease: 'sine.out' }, 1.12)
        .to(fracture.material.uniforms.uOpacity, { value: 0, duration: .55, ease: 'sine.out' }, 1.3)
        .play(0);
    } else {
      photoRoot.scale.setScalar(1);
      photoMaterials.forEach((material, index) => { material.opacity = photoMaterialOpacities[index]; });
      galleryUi.style.opacity = '1';
      galleryUi.style.visibility = 'visible';
      coreRoot.scale.setScalar(1);
      coreGlassUniforms.uReveal.value = 1;
      coreWordBelt.material.opacity = .96;
      coreBeltLine.material.opacity = .2;
      coreHalo.material.opacity = .09;
      fracture.root.visible = false;
      colorWash.style.transform = 'translate(-50%, -50%) scale(24)';
      state.transitioning = false;
      viewport.focus({ preventScroll: true });
    }
  }

  function closeGallery() {
    if (!state.open) return;
    if (state.lightboxOpen) closeLightbox();
    state.dragging = false;
    state.hovered = null;
    state.coreHovered = false;
    viewport.classList.remove('is-dragging');
    viewport.style.cursor = '';
    orbCursor.classList.remove('is-visible', 'is-exit');

    if (gsap && !reduceMotion && state.transitionTimeline) {
      state.transitioning = true;
      fracture.root.visible = true;
      fracture.material.uniforms.uOpacity.value = 0;
      matchFractureToOrb();
      state.transitionTimeline.reverse();
    } else {
      finalizeClose();
    }
  }

  function finalizeClose() {
    state.open = false;
    state.transitioning = false;
    fracture.root.visible = false;
    overlay.classList.remove('is-open');
    overlay.setAttribute('aria-hidden', 'true');
    orbButton.setAttribute('aria-expanded', 'false');
    document.body.classList.remove('gallery-is-open');
    if (gsap) {
      gsap.set(overlay, { autoAlpha: 0 });
      gsap.set(orbButton, { clearProps: 'transform,opacity,visibility,filter' });
    }
    else colorWash.style.transform = '';
    orbButton.focus({ preventScroll: true });
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
    if (!state.open || state.lightboxOpen || state.dragging || state.transitioning) return;
    raycaster.setFromCamera(pointer, galleryCamera);
    const hit = raycaster.intersectObjects([coreHitTarget, ...cardMeshes], false)[0]?.object || null;
    state.coreHovered = hit === coreHitTarget;
    state.hovered = state.coreHovered ? null : hit;
    viewport.dataset.coreHovered = String(state.coreHovered);
    viewport.style.cursor = hit ? 'pointer' : 'grab';
    const finePointer = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
    orbCursor.classList.toggle('is-visible', finePointer && state.coreHovered);
    orbCursor.classList.toggle('is-exit', state.coreHovered);
  }

  function selectAtPointer() {
    raycaster.setFromCamera(pointer, galleryCamera);
    const hit = raycaster.intersectObjects([coreHitTarget, ...cardMeshes], false)[0]?.object;
    if (hit === coreHitTarget) closeGallery();
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
    lightbox.querySelector('[data-gallery-lightbox-title]').textContent = item.date || '';
    lightbox.querySelector('[data-gallery-lightbox-meta]').textContent = item.location || '';
    lightbox.querySelector('[data-gallery-lightbox-description]').textContent = '';
    placeholder.style.background = `radial-gradient(circle at 65% 30%, ${item.accent || '#cdeb55'}, transparent 17%), linear-gradient(135deg, #002fa7, #5d7cdf 72%, #8fa4ec)`;

    if (item.file) {
      image.hidden = false;
      placeholder.hidden = true;
      image.src = `../assets/images/gallery/${item.file}`;
      image.alt = [item.date, item.location].filter(Boolean).join(', ') || 'Gallery photograph';
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
