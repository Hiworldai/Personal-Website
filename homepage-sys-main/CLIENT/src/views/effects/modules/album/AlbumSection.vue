<template>
  <section
    ref="sectionRef"
    class="album-section"
    aria-labelledby="album-title"
    :style="albumSectionStyle"
  >
    <div
      class="album-stage"
      @pointerdown="handlePointerDown"
      @pointermove="handlePointerMove"
      @pointerup="handlePointerUp"
      @pointerleave="handlePointerLeave"
      @click="handleSceneClick"
      @wheel="handleSceneWheel"
    >
      <div class="album-copy">
        <p class="eyebrow">Photon Album</p>
        <h2 id="album-title">{{ albumCopy.title }}</h2>
        <p>{{ albumCopy.descriptionStart }} {{ albumCopy.descriptionEnd }}</p>
      </div>

      <div
        ref="sceneHostRef"
        class="photon-scene"
        aria-label="3D particle photo album"
      >
      </div>
      <button
        class="back-button"
        type="button"
        aria-label="Back to experience section"
        @pointerdown.stop
        @click.stop="scrollToExperience"
      >
        <span class="back-arrow">&#8592;</span>
        <span class="back-text">Back</span>
      </button>
    </div>

    <teleport to="body">
      <div
        v-if="selectedPhoto"
        class="photo-modal"
        role="dialog"
        aria-modal="true"
        aria-label="Photo preview"
        @click.self="closePhoto"
        @wheel="handleModalWheel"
      >
        <button class="modal-close" type="button" aria-label="Close photo" @click="closePhoto">&times;</button>
        <button class="modal-nav prev" type="button" aria-label="Previous photo" @click="showPrevPhoto">&#8249;</button>

        <figure class="modal-figure">
          <video
            v-if="selectedPhoto && isVideoItem(selectedPhoto)"
            :src="selectedPhoto.src"
            :poster="getPreviewSrc(selectedPhoto.poster || selectedPhoto.src)"
            controls
            autoplay
            playsinline
            preload="metadata"
            class="modal-media"
            :style="modalMediaStyle"
          ></video>
          <picture v-else-if="selectedPhoto" class="modal-picture">
            <source :srcset="getDisplayWebpSrc(selectedPhoto.src)" type="image/webp">
            <img
              :src="getDisplaySrc(selectedPhoto.src)"
              :alt="selectedPhoto.title"
              class="modal-media"
              :style="modalMediaStyle"
              loading="eager"
              decoding="async"
            >
          </picture>
          <figcaption>
            <strong>{{ selectedPhoto.title }}</strong>
            <span>{{ selectedPhoto.description }}</span>
          </figcaption>
        </figure>

        <button class="modal-nav next" type="button" aria-label="Next photo" @click="showNextPhoto">&#8250;</button>
      </div>
    </teleport>
  </section>
</template>

<script setup>
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue';
import * as THREE from 'three';
import { albumCopy, galleryItems } from '../../content/albumContent';
import { profileAvatarSrc } from '../../content/assetContent';

const MIN_CAMERA_Z = 18;
const MAX_CAMERA_Z = 58;
const MODAL_ZOOM_STEP = 0.12;
const MIN_MODAL_ZOOM = 0.6;
const MAX_MODAL_ZOOM = 3;
const TREE_TOP_Y = 6;
const TREE_NEAR_CAMERA_Z = 22;
const TREE_FAR_CAMERA_Z = 37.5;
const TREE_NEAR_CAMERA_Y = 2.9;
const TREE_FAR_CAMERA_Y = 2.55;
const TREE_NEAR_FOCUS_Y = 2.5;
const TREE_FAR_FOCUS_Y = -2.3;
const AVATAR_FACE_ROTATION_Z = Math.PI / 2;
const AVATAR_START_X = 0;
const AVATAR_START_Y = 10.1;
const AVATAR_START_Z = 0.62;
const AVATAR_END_Y = TREE_TOP_Y + 1.02;
const AVATAR_END_Z = 0.18;

const props = defineProps({
  storyProgress: {
    type: Number,
    default: 0
  }
});

const sectionRef = ref(null);
const sceneHostRef = ref(null);
const selectedPhotoIndex = ref(-1);
const modalZoom = ref(1);
const manualZoomProgress = ref(0);

const selectedPhoto = computed(() => {
  if (selectedPhotoIndex.value < 0) return null;
  return galleryItems[selectedPhotoIndex.value];
});

const getSegmentProgress = (start, end, value) => {
  if (end <= start) return value >= end ? 1 : 0;
  return clamp((value - start) / (end - start), 0, 1);
};

const phaseDarkenProgress = computed(() => getSegmentProgress(0, 0.28, props.storyProgress));
const phaseAvatarProgress = computed(() => getSegmentProgress(0.15, 0.6, props.storyProgress));
const phaseZoomProgress = computed(() => manualZoomProgress.value);
const darkenEasedProgress = computed(() => easeInOutCubic(phaseDarkenProgress.value));

const albumSectionStyle = computed(() => ({
  '--entry-progress': `${darkenEasedProgress.value}`
}));

const modalMediaStyle = computed(() => ({
  transform: `scale(${modalZoom.value})`
}));

let renderer;
let scene;
let camera;
let photoOrbit;
let photonTree;
let photonDisk;
let starField;
let avatarCoin;
let raycaster;
let pointer;
let animationFrame = 0;
let resizeObserver;
let sectionObserver;
let isVisible = false;
let isDragging = false;
let dragMoved = false;
let lastPointer = { x: 0, y: 0 };
let targetRotationY = 0;
let targetRotationX = 0.08;
let cameraTargetZ = TREE_NEAR_CAMERA_Z;
let cameraTargetY = TREE_NEAR_CAMERA_Y;
let cameraLookAtY = TREE_NEAR_FOCUS_Y;
let cameraUserZoomOffset = 0;
let pointerDriftX = 0;
let pointerDriftY = 0;
let pointerDriftTargetX = 0;
let pointerDriftTargetY = 0;
let photoMeshes = [];
let avatarCoinMaterials = [];
let avatarCoinTexture;

const isVideoItem = (item) => /\.mp4$/i.test(item?.src || '');

const getGalleryFileBaseName = (src = '') => {
  const fileName = src.split('/').pop() || '';
  return fileName.replace(/\.[^.]+$/, '');
};

const getPreviewSrc = (src) => `/gallery/preview/${getGalleryFileBaseName(src)}.jpg`;
const getDisplaySrc = (src) => `/gallery/display/${getGalleryFileBaseName(src)}.jpg`;
const getDisplayWebpSrc = (src) => `/gallery/display/${getGalleryFileBaseName(src)}.webp`;
const getTextureSrc = (item) => getPreviewSrc(isVideoItem(item) ? item.poster : item.src);
const clamp = (value, min, max) => Math.min(max, Math.max(min, value));
const easeInOutCubic = (value) => (value < 0.5
  ? 4 * value * value * value
  : 1 - Math.pow(-2 * value + 2, 3) / 2);

const updatePointerDrift = (event) => {
  const host = sceneHostRef.value;
  if (!host) return;

  const rect = host.getBoundingClientRect();
  const normalizedX = ((event.clientX - rect.left) / Math.max(rect.width, 1)) * 2 - 1;
  const normalizedY = ((event.clientY - rect.top) / Math.max(rect.height, 1)) * 2 - 1;

  pointerDriftTargetX = clamp(normalizedX, -1, 1);
  pointerDriftTargetY = clamp(normalizedY, -1, 1);
};

const resetModalZoom = () => {
  modalZoom.value = 1;
};

const openPhoto = (index) => {
  selectedPhotoIndex.value = index;
  resetModalZoom();
  document.body.classList.add('modal-open');
};

const closePhoto = () => {
  selectedPhotoIndex.value = -1;
  resetModalZoom();
  document.body.classList.remove('modal-open');
};

const showPrevPhoto = () => {
  selectedPhotoIndex.value = (selectedPhotoIndex.value - 1 + galleryItems.length) % galleryItems.length;
  resetModalZoom();
};

const showNextPhoto = () => {
  selectedPhotoIndex.value = (selectedPhotoIndex.value + 1) % galleryItems.length;
  resetModalZoom();
};

const handleModalWheel = (event) => {
  if (!event.ctrlKey) return;

  event.preventDefault();
  const direction = event.deltaY > 0 ? -1 : 1;
  modalZoom.value = Number(clamp(modalZoom.value + direction * MODAL_ZOOM_STEP, MIN_MODAL_ZOOM, MAX_MODAL_ZOOM).toFixed(2));
};

const createCircleTexture = () => {
  const size = 96;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const context = canvas.getContext('2d');
  const gradient = context.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  gradient.addColorStop(0, 'rgba(255,255,255,1)');
  gradient.addColorStop(0.35, 'rgba(190,244,255,0.9)');
  gradient.addColorStop(1, 'rgba(190,244,255,0)');
  context.fillStyle = gradient;
  context.fillRect(0, 0, size, size);
  return new THREE.CanvasTexture(canvas);
};

const createStarTexture = () => {
  const size = 96;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const context = canvas.getContext('2d');
  context.translate(size / 2, size / 2);
  context.fillStyle = 'rgba(255,255,255,0.95)';
  context.beginPath();
  for (let i = 0; i < 10; i += 1) {
    const radius = i % 2 === 0 ? 36 : 12;
    const angle = (Math.PI * 2 * i) / 10 - Math.PI / 2;
    context.lineTo(Math.cos(angle) * radius, Math.sin(angle) * radius);
  }
  context.closePath();
  context.fill();
  return new THREE.CanvasTexture(canvas);
};

const createPointCloud = ({ count, color, size, texture, generator }) => {
  const positions = new Float32Array(count * 3);
  const colors = new Float32Array(count * 3);
  const colorBase = new THREE.Color(color);

  for (let i = 0; i < count; i += 1) {
    const point = generator(i, count);
    const index = i * 3;
    positions[index] = point.x;
    positions[index + 1] = point.y;
    positions[index + 2] = point.z;

    const shade = point.shade ?? 1;
    colors[index] = colorBase.r * shade;
    colors[index + 1] = colorBase.g * shade;
    colors[index + 2] = colorBase.b * shade;
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));

  const material = new THREE.PointsMaterial({
    size,
    map: texture,
    transparent: true,
    opacity: 0.9,
    vertexColors: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending
  });

  return new THREE.Points(geometry, material);
};

const buildPhotonScene = () => {
  const particleTexture = createCircleTexture();
  const starTexture = createStarTexture();

  starField = createPointCloud({
    count: 1400,
    color: '#dffbff',
    size: 0.12,
    texture: particleTexture,
    generator: () => ({
      x: (Math.random() - 0.5) * 78,
      y: (Math.random() - 0.5) * 38 + 4,
      z: (Math.random() - 0.5) * 56,
      shade: 0.45 + Math.random() * 0.65
    })
  });
  scene.add(starField);

  const accentStars = createPointCloud({
    count: 90,
    color: '#ffffff',
    size: 0.32,
    texture: starTexture,
    generator: () => ({
      x: (Math.random() - 0.5) * 72,
      y: (Math.random() - 0.5) * 30 + 4,
      z: (Math.random() - 0.5) * 48,
      shade: 0.75 + Math.random() * 0.35
    })
  });
  scene.add(accentStars);

  photonDisk = createPointCloud({
    count: 2800,
    color: '#f4fdff',
    size: 0.075,
    texture: particleTexture,
    generator: () => {
      const angle = Math.random() * Math.PI * 2;
      const radius = Math.sqrt(Math.random()) * 17.6;
      return {
        x: Math.cos(angle) * radius,
        y: -7.18 + (Math.random() - 0.5) * 0.24,
        z: Math.sin(angle) * radius * 0.68,
        shade: 0.55 + Math.random() * 0.7
      };
    }
  });
  scene.add(photonDisk);

  photonTree = createPointCloud({
    count: 3600,
    color: '#ffffff',
    size: 0.07,
    texture: particleTexture,
    generator: () => {
      const height = Math.random();
      const angle = Math.random() * Math.PI * 2 + height * 9;
      const radius = (1 - height) * 5.2 * Math.random();
      return {
        x: Math.cos(angle) * radius,
        y: -7.36 + height * 13.35,
        z: Math.sin(angle) * radius,
        shade: 0.72 + height * 0.42
      };
    }
  });
  scene.add(photonTree);

  const beam = createPointCloud({
    count: 900,
    color: '#f5fdff',
    size: 0.09,
    texture: particleTexture,
    generator: () => {
      const height = Math.random();
      const angle = Math.random() * Math.PI * 2;
      const radius = Math.random() * (0.16 + height * 0.1);
      return {
        x: Math.cos(angle) * radius,
        y: -7.52 + height * 12.95,
        z: Math.sin(angle) * radius,
        shade: 0.86 + Math.random() * 0.34
      };
    }
  });
  scene.add(beam);
  createAvatarCoin();
};

const setAvatarCoinOpacity = (opacity) => {
  avatarCoinMaterials.forEach((material) => {
    const multiplier = material.userData.opacityMultiplier ?? 1;
    material.opacity = opacity * multiplier;
  });
};

const createAvatarCoin = () => {
  const loader = new THREE.TextureLoader();
  avatarCoinTexture = loader.load(profileAvatarSrc);
  avatarCoinTexture.colorSpace = THREE.SRGBColorSpace;
  avatarCoinTexture.anisotropy = renderer.capabilities.getMaxAnisotropy();

  const radius = 1.34;
  const thickness = 0.28;
  const coinGeometry = new THREE.CylinderGeometry(radius, radius, thickness, 64, 1, false);
  coinGeometry.rotateX(Math.PI / 2);

  const edgeMaterial = new THREE.MeshBasicMaterial({
    color: '#dffcff',
    transparent: true,
    opacity: 0,
    depthWrite: false
  });
  edgeMaterial.userData.opacityMultiplier = 0.28;

  const faceMaterialFront = new THREE.MeshBasicMaterial({
    map: avatarCoinTexture,
    transparent: true,
    opacity: 0,
    depthWrite: false
  });
  faceMaterialFront.userData.opacityMultiplier = 0.74;

  const faceMaterialBack = new THREE.MeshBasicMaterial({
    map: avatarCoinTexture,
    transparent: true,
    opacity: 0,
    depthWrite: false
  });
  faceMaterialBack.userData.opacityMultiplier = 0.62;

  const coinMesh = new THREE.Mesh(coinGeometry, [edgeMaterial, faceMaterialFront, faceMaterialBack]);

  const rimMaterial = new THREE.MeshBasicMaterial({
    color: '#f3feff',
    transparent: true,
    opacity: 0,
    blending: THREE.AdditiveBlending
  });
  rimMaterial.userData.opacityMultiplier = 0.36;

  const rimMesh = new THREE.Mesh(
    new THREE.TorusGeometry(radius * 0.99, 0.07, 18, 80),
    rimMaterial
  );

  const haloMaterial = new THREE.MeshBasicMaterial({
    color: '#79eeff',
    transparent: true,
    opacity: 0,
    side: THREE.DoubleSide,
    blending: THREE.AdditiveBlending,
    depthWrite: false
  });
  haloMaterial.userData.opacityMultiplier = 0.14;

  const haloMesh = new THREE.Mesh(
    new THREE.RingGeometry(radius * 1.08, radius * 1.3, 80),
    haloMaterial
  );
  haloMesh.position.z = -0.18;

  avatarCoin = new THREE.Group();
  avatarCoin.add(coinMesh);
  avatarCoin.add(rimMesh);
  avatarCoin.add(haloMesh);
  avatarCoin.position.set(AVATAR_START_X, AVATAR_START_Y, AVATAR_START_Z);
  avatarCoin.rotation.x = Math.PI * 0.08;
  avatarCoin.rotation.z = AVATAR_FACE_ROTATION_Z;
  avatarCoin.scale.setScalar(0.7);

  avatarCoinMaterials = [edgeMaterial, faceMaterialFront, faceMaterialBack, rimMaterial, haloMaterial];
  setAvatarCoinOpacity(0);
  scene.add(avatarCoin);
};

const updateAvatarFall = (progress) => {
  if (!avatarCoin) return;

  const eased = easeInOutCubic(progress);
  const settle = clamp((progress - 0.88) / 0.12, 0, 1);
  const currentY = AVATAR_START_Y + (AVATAR_END_Y - AVATAR_START_Y) * eased;
  const currentZ = AVATAR_START_Z + (AVATAR_END_Z - AVATAR_START_Z) * eased;
  const currentRotationX = (-Math.PI * 0.42) + eased * Math.PI * 2.96;
  const finalScale = 0.7 + eased * 0.14;
  const fadeIn = clamp(progress * 2.4, 0, 1);

  avatarCoin.position.set(0, currentY, currentZ);
  avatarCoin.rotation.x = currentRotationX * (1 - settle);
  avatarCoin.rotation.y = 0;
  avatarCoin.rotation.z = AVATAR_FACE_ROTATION_Z;
  avatarCoin.scale.setScalar(finalScale);
  setAvatarCoinOpacity(0.82 * fadeIn);
};

watch(phaseAvatarProgress, (newVal) => {
  updateAvatarFall(newVal);
});

const createPhotoCards = () => {
  const loader = new THREE.TextureLoader();
  photoOrbit = new THREE.Group();
  scene.add(photoOrbit);

  galleryItems.forEach((item, index) => {
    const texture = loader.load(getTextureSrc(item));
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.anisotropy = renderer.capabilities.getMaxAnisotropy();

    const ring = index % 3;
    const angle = (index / galleryItems.length) * Math.PI * 2 + ring * 0.72;
    const radius = [12, 18, 24][ring] + (index % 5) * 0.36;
    const y = -3.45 + ((index * 7) % 15) * 0.88;
    const width = ring === 0 ? 2.3 : 2.0;
    const height = width * 1.28;

    const card = new THREE.Group();
    card.position.set(Math.cos(angle) * radius, y, Math.sin(angle) * radius);
    card.lookAt(0, y * 0.16, 0);

    const frame = new THREE.Mesh(
      new THREE.PlaneGeometry(width + 0.16, height + 0.16),
      new THREE.MeshBasicMaterial({
        color: '#e8fbff',
        transparent: true,
        opacity: 0.34,
        side: THREE.DoubleSide,
        depthWrite: false
      })
    );
    frame.position.z = -0.012;
    card.add(frame);

    const mesh = new THREE.Mesh(
      new THREE.PlaneGeometry(width, height),
      new THREE.MeshBasicMaterial({
        map: texture,
        transparent: true,
        opacity: 0.92,
        side: THREE.DoubleSide
      })
    );
    mesh.userData = { index };
    card.add(mesh);

    const glow = new THREE.Mesh(
      new THREE.PlaneGeometry(width + 0.44, height + 0.44),
      new THREE.MeshBasicMaterial({
        color: '#73edff',
        transparent: true,
        opacity: 0.08,
        side: THREE.DoubleSide,
        blending: THREE.AdditiveBlending,
        depthWrite: false
      })
    );
    glow.position.z = -0.03;
    card.add(glow);

    photoMeshes.push(mesh);
    photoOrbit.add(card);
  });
};

const resizeRenderer = () => {
  const host = sceneHostRef.value;
  if (!host || !renderer || !camera) return;

  const width = host.clientWidth || 1;
  const height = host.clientHeight || 1;
  renderer.setSize(width, height, false);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  camera.aspect = width / height;
  camera.updateProjectionMatrix();
};

const animate = (time = 0) => {
  animationFrame = requestAnimationFrame(animate);

  if (!isVisible && document.hidden) return;

  const t = time * 0.001;
  const zoomPhase = phaseZoomProgress.value;

  if (!isDragging) {
    targetRotationY += 0.00115 + zoomPhase * 0.0009;
  }

  if (photoOrbit) {
    photoOrbit.rotation.y += (targetRotationY - photoOrbit.rotation.y) * 0.045;
    photoOrbit.rotation.x += (targetRotationX - photoOrbit.rotation.x) * 0.045;
  }

  if (camera) {
    const zoomEased = easeInOutCubic(zoomPhase);
    const baseCameraZ = TREE_NEAR_CAMERA_Z + (TREE_FAR_CAMERA_Z - TREE_NEAR_CAMERA_Z) * zoomEased;
    const baseCameraY = TREE_NEAR_CAMERA_Y + (TREE_FAR_CAMERA_Y - TREE_NEAR_CAMERA_Y) * zoomEased;
    const baseLookAtY = TREE_NEAR_FOCUS_Y + (TREE_FAR_FOCUS_Y - TREE_NEAR_FOCUS_Y) * zoomEased;
    const driftStrength = 0.75 + zoomEased * 0.85;

    cameraTargetZ = clamp(baseCameraZ + cameraUserZoomOffset, MIN_CAMERA_Z, MAX_CAMERA_Z);
    cameraTargetY = baseCameraY;
    cameraLookAtY = baseLookAtY;

    pointerDriftX += (pointerDriftTargetX - pointerDriftX) * 0.055;
    pointerDriftY += (pointerDriftTargetY - pointerDriftY) * 0.055;

    const cameraDriftX = pointerDriftX * 1.85 * driftStrength;
    const cameraDriftY = -pointerDriftY * 0.72 * driftStrength;
    const lookDriftX = pointerDriftX * 3.1 * driftStrength;
    const lookDriftY = -pointerDriftY * 1.5 * driftStrength;

    camera.position.x += (cameraDriftX - camera.position.x) * 0.08;
    camera.position.z += (cameraTargetZ - camera.position.z) * 0.08;
    camera.position.y += ((cameraTargetY + cameraDriftY) - camera.position.y) * 0.08;
    camera.lookAt(lookDriftX, cameraLookAtY + lookDriftY, 0);
  }

  if (photonTree) {
    photonTree.rotation.y = t * 0.28;
    photonTree.material.opacity = 0.76 + Math.sin(t * 2.2) * 0.12;
  }

  if (photonDisk) {
    photonDisk.rotation.y = -t * 0.18;
  }

  if (starField) {
    starField.rotation.y = t * 0.015;
  }

  if (avatarCoin && phaseAvatarProgress.value >= 1) {
    avatarCoin.position.set(
      0,
      AVATAR_END_Y + Math.sin(t * 1.35) * 0.12,
      AVATAR_END_Z + Math.sin(t * 0.8) * 0.025
    );
    avatarCoin.rotation.x = Math.sin(t * 1.15) * 0.04;
    avatarCoin.rotation.y = 0;
    avatarCoin.rotation.z = AVATAR_FACE_ROTATION_Z + Math.sin(t * 0.9) * 0.012;
  }

  renderer.render(scene, camera);
};

const initScene = async () => {
  await nextTick();
  const host = sceneHostRef.value;
  if (!host) return;

  scene = new THREE.Scene();
  scene.fog = new THREE.FogExp2(0x020508, 0.018);

  camera = new THREE.PerspectiveCamera(50, 1, 0.1, 120);
  camera.position.set(0, cameraTargetY, cameraTargetZ);
  camera.lookAt(0, cameraLookAtY, 0);

  renderer = new THREE.WebGLRenderer({
    antialias: true,
    alpha: true,
    powerPreference: 'high-performance'
  });
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.setClearColor(0x020508, 1);
  host.appendChild(renderer.domElement);

  raycaster = new THREE.Raycaster();
  pointer = new THREE.Vector2();

  buildPhotonScene();
  createPhotoCards();
  resizeRenderer();
  animate();
};

const pickPhoto = (event) => {
  if (!renderer || !camera || !raycaster || !pointer) return;

  const rect = renderer.domElement.getBoundingClientRect();
  pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
  pointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
  raycaster.setFromCamera(pointer, camera);

  const intersections = raycaster.intersectObjects(photoMeshes, false);
  const hit = intersections[0]?.object;
  if (typeof hit?.userData?.index === 'number') {
    openPhoto(hit.userData.index);
  }
};

const handlePointerDown = (event) => {
  if (event.target.closest('.back-button')) return;

  updatePointerDrift(event);
  isDragging = true;
  dragMoved = false;
  lastPointer = { x: event.clientX, y: event.clientY };
  sceneHostRef.value?.setPointerCapture?.(event.pointerId);
};

const handlePointerMove = (event) => {
  if (event.target.closest('.back-button')) return;
  updatePointerDrift(event);
  if (!isDragging) return;

  const dx = event.clientX - lastPointer.x;
  const dy = event.clientY - lastPointer.y;
  if (Math.abs(dx) + Math.abs(dy) > 4) dragMoved = true;

  targetRotationY += dx * 0.0075;
  targetRotationX = clamp(targetRotationX + dy * 0.0038, -0.56, 0.56);

  lastPointer = { x: event.clientX, y: event.clientY };
};

const handlePointerUp = (event) => {
  if (event.target.closest('.back-button')) {
    isDragging = false;
    return;
  }
  if (!isDragging) return;

  isDragging = false;
  sceneHostRef.value?.releasePointerCapture?.(event.pointerId);

  if (!dragMoved) {
    pickPhoto(event);
  }
};

const handleSceneClick = (event) => {
  if (dragMoved || selectedPhoto.value) return;
  if (event.target.closest('.back-button')) return;
  pickPhoto(event);
};

const handlePointerLeave = () => {
  isDragging = false;
  pointerDriftTargetX = 0;
  pointerDriftTargetY = 0;
};

const handleSceneWheel = (event) => {
  if (event.target.closest('.back-button')) return;
  if (phaseAvatarProgress.value < 1 || selectedPhoto.value) return;

  const nextZoom = clamp(manualZoomProgress.value + event.deltaY * 0.0022, 0, 1);
  const zoomChanged = Math.abs(nextZoom - manualZoomProgress.value) > 0.0001;

  if (event.deltaY > 0) {
    event.preventDefault();
  }

  if (!zoomChanged) return;

  manualZoomProgress.value = nextZoom;
  if (event.deltaY > 0 || manualZoomProgress.value > 0.001) {
    event.preventDefault();
  }
};

watch(phaseAvatarProgress, (newVal) => {
  if (newVal < 1) {
    manualZoomProgress.value = 0;
    cameraUserZoomOffset = 0;
  }
});

const handleKeydown = (event) => {
  if (!selectedPhoto.value) return;

  if (event.key === 'Escape') closePhoto();
  if (event.key === 'ArrowLeft') showPrevPhoto();
  if (event.key === 'ArrowRight') showNextPhoto();
};

const scrollToExperience = () => {
  const section = document.getElementById('experience-section');
  if (section) {
    const root = document.documentElement;
    const previousScrollBehavior = root.style.scrollBehavior;
    root.style.scrollBehavior = 'smooth';
    section.scrollIntoView({ behavior: 'smooth', block: 'start' });
    setTimeout(() => {
      root.style.scrollBehavior = previousScrollBehavior;
    }, 1000);
  }
};

onMounted(() => {
  initScene();
  updateAvatarFall(phaseAvatarProgress.value);
  window.addEventListener('keydown', handleKeydown);

  if ('ResizeObserver' in window && sceneHostRef.value) {
    resizeObserver = new ResizeObserver(resizeRenderer);
    resizeObserver.observe(sceneHostRef.value);
  } else {
    window.addEventListener('resize', resizeRenderer);
  }

  if ('IntersectionObserver' in window && sectionRef.value) {
    sectionObserver = new IntersectionObserver((entries) => {
      isVisible = entries.some((entry) => entry.isIntersecting);
    }, {
      rootMargin: '240px 0px'
    });
    sectionObserver.observe(sectionRef.value);
  } else {
    isVisible = true;
  }
});

onBeforeUnmount(() => {
  window.removeEventListener('keydown', handleKeydown);
  window.removeEventListener('resize', resizeRenderer);
  cancelAnimationFrame(animationFrame);
  resizeObserver?.disconnect();
  sectionObserver?.disconnect();
  document.body.classList.remove('modal-open');

  photoMeshes = [];

  if (renderer) {
    renderer.dispose();
    renderer.domElement?.remove();
  }

  if (avatarCoin) {
    avatarCoin.traverse((child) => {
      child.geometry?.dispose?.();
      if (Array.isArray(child.material)) {
        child.material.forEach((material) => material?.dispose?.());
      } else {
        child.material?.dispose?.();
      }
    });
  }

  avatarCoinTexture?.dispose?.();
});
</script>

<style scoped>
.album-section {
  position: relative;
  height: 100svh;
  min-height: 100svh;
  padding: 0;
  overflow: hidden;
  color: #f6fdff;
  font-family: 'Inter', 'Noto Sans SC', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
  background:
    radial-gradient(circle at 50% 60%, rgba(85, 222, 255, 0.045), transparent 38%),
    radial-gradient(circle at 18% 18%, rgba(132, 229, 255, 0.03), transparent 26%),
    linear-gradient(180deg, #020a12 0%, #02070c 36%, #010305 70%, #000 100%);
}

.album-stage {
  position: relative;
  height: 100%;
  min-height: 100svh;
  overflow: hidden;
}

.album-stage::before {
  position: absolute;
  inset: 0;
  z-index: 3;
  content: '';
  background:
    radial-gradient(circle at 50% 56%, transparent 0 28%, rgba(0, 0, 0, 0.2) 52%, rgba(0, 0, 0, 0.68) 100%),
    linear-gradient(180deg, rgba(0, 0, 0, 0.22), transparent 28%, transparent 72%, rgba(0, 0, 0, 0.32));
  opacity: var(--entry-progress, 1);
  pointer-events: none;
}

.album-stage::after {
  content: none;
}

.album-copy {
  position: absolute;
  top: clamp(1.5rem, 5vh, 3.2rem);
  left: clamp(1.25rem, 5vw, 5rem);
  z-index: 3;
  display: grid;
  gap: 0.35rem;
  width: min(35rem, 48vw);
  pointer-events: none;
  opacity: calc(0.38 + var(--entry-progress, 1) * 0.62);
  filter: blur(calc((1 - var(--entry-progress, 1)) * 8px));
  transform: translate3d(0, calc((1 - var(--entry-progress, 1)) * 2.4rem), 0);
  transition: opacity 0.18s linear, filter 0.18s linear, transform 0.18s linear;
}

.eyebrow,
.album-copy h2,
.album-copy p {
  margin: 0;
}

.eyebrow {
  color: #8beeff;
  font-size: 0.78rem;
  font-weight: 900;
  letter-spacing: 0.14em;
  text-transform: uppercase;
}

.album-copy h2 {
  color: #fff;
  font-size: clamp(2rem, 4.2vw, 4rem);
  font-weight: 900;
  line-height: 1;
  text-shadow:
    0 0 12px rgba(255, 255, 255, 0.64),
    0 0 42px rgba(116, 232, 255, 0.32);
}

.album-copy p {
  color: rgba(225, 249, 255, 0.72);
  font-size: 0.95rem;
  font-weight: 700;
  line-height: 1.65;
}

.photon-scene {
  position: absolute;
  inset: 0;
  z-index: 2;
  width: 100%;
  height: 100%;
  cursor: grab;
  touch-action: none;
  transform: translate3d(0, calc((1 - var(--entry-progress, 1)) * 1.4rem), 0);
  transition: transform 0.18s linear;
}

.photon-scene:active {
  cursor: grabbing;
}

.photon-scene :deep(canvas) {
  display: block;
  width: 100%;
  height: 100%;
}

.back-button {
  position: absolute;
  right: clamp(1.25rem, 4vw, 4rem);
  bottom: clamp(1.25rem, 4vw, 3rem);
  z-index: 4;
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
  padding: 0.48rem 0.85rem;
  border: 1px solid rgba(180, 246, 255, 0.22);
  border-radius: 999px;
  background:
    linear-gradient(180deg, rgba(255, 255, 255, 0.1), rgba(255, 255, 255, 0.045));
  color: rgba(225, 249, 255, 0.76);
  font-size: 0.74rem;
  font-weight: 800;
  cursor: pointer;
  box-shadow:
    inset 0 1px 0 rgba(255, 255, 255, 0.18),
    0 10px 24px rgba(0, 0, 0, 0.26);
  backdrop-filter: blur(14px);
  transition: border-color 0.2s ease, background 0.2s ease, transform 0.15s ease;
}

.back-button:hover {
  border-color: rgba(180, 246, 255, 0.45);
  background:
    linear-gradient(180deg, rgba(255, 255, 255, 0.14), rgba(255, 255, 255, 0.06));
  transform: translateY(-1px);
}

.back-button:active {
  transform: translateY(0);
}

.back-arrow {
  font-size: 0.85rem;
  line-height: 1;
}

.back-text {
  text-transform: uppercase;
  letter-spacing: 0.08em;
}

.photo-modal {
  position: fixed;
  inset: 0;
  z-index: 1000;
  display: grid;
  grid-template-columns: 4rem minmax(0, 1fr) 4rem;
  gap: 1rem;
  align-items: center;
  padding: 2rem;
  background: rgba(0, 0, 0, 0.9);
  backdrop-filter: blur(16px);
  user-select: none;
}

.modal-figure {
  display: grid;
  gap: 1rem;
  max-width: min(82vw, 900px);
  margin: 0 auto;
  overflow: visible;
}

.modal-picture {
  display: grid;
  justify-items: center;
}

.modal-media {
  display: block;
  max-width: 100%;
  max-height: 72vh;
  margin: 0 auto;
  border: 1px solid rgba(190, 244, 255, 0.22);
  border-radius: 14px;
  object-fit: contain;
  transform-origin: center;
  transition: transform 0.16s ease;
  box-shadow:
    0 0 32px rgba(116, 232, 255, 0.14),
    0 0 80px rgba(255, 255, 255, 0.06);
}

.modal-figure figcaption {
  display: grid;
  gap: 0.35rem;
  color: #fdf9e7;
  text-align: center;
}

.modal-figure figcaption strong {
  font-size: 1.25rem;
}

.modal-figure figcaption span {
  color: rgba(255, 255, 255, 0.72);
  font-weight: 700;
}

.modal-close,
.modal-nav {
  border: 1px solid rgba(255, 255, 255, 0.14);
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.08);
  color: #fff;
  cursor: pointer;
}

.modal-close {
  position: absolute;
  top: 1.25rem;
  right: 1.25rem;
  width: 2.75rem;
  height: 2.75rem;
  font-size: 2rem;
  line-height: 1;
}

.modal-nav {
  position: relative;
  z-index: 3;
  width: 4rem;
  height: 4rem;
  font-size: 3rem;
}

.modal-close:hover,
.modal-nav:hover {
  border-color: rgba(190, 244, 255, 0.58);
  box-shadow: 0 0 22px rgba(116, 232, 255, 0.22);
}

:global(body.modal-open) {
  overflow: hidden;
}

@media (max-width: 900px) {
  .album-copy {
    width: min(34rem, 70vw);
  }
}

@media (max-width: 768px) {
  .album-copy {
    width: min(86vw, 28rem);
  }

  .scene-hint {
    left: 1rem;
    right: 1rem;
    max-width: none;
    justify-content: center;
  }

  .photo-modal {
    grid-template-columns: 1fr;
    padding: 1rem;
  }

  .modal-nav {
    position: fixed;
    top: 50%;
    width: 3rem;
    height: 3rem;
    font-size: 2.4rem;
    transform: translateY(-50%);
  }

  .modal-nav.prev {
    left: 0.75rem;
  }

  .modal-nav.next {
    right: 0.75rem;
  }
}
</style>
