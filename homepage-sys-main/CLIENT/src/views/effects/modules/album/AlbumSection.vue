<template>
  <section
    ref="sectionRef"
    class="album-section"
    :class="{ 'is-static': !isMotionEnabled }"
    aria-labelledby="album-title"
  >
    <div class="album-shell">
      <div class="section-heading">
        <p class="eyebrow">Photo Album</p>
        <h2 id="album-title">{{ albumCopy.title }}</h2>
        <p>{{ albumCopy.descriptionStart }} {{ albumCopy.descriptionEnd }}</p>
      </div>

      <div class="album-flow" aria-label="Photo album flow">
        <div
          v-for="(row, rowIndex) in albumRows"
          :key="row.id"
          class="album-track"
          :class="row.directionClass"
          @mouseenter="setTrackPaused(rowIndex, true)"
          @mouseleave="setTrackPaused(rowIndex, false)"
        >
          <div class="album-mask-frame">
            <div class="album-viewport">
              <div
                :ref="(element) => setRailRef(element, rowIndex)"
                class="album-rail"
                :style="getRailStyle(rowIndex)"
              >
                <div
                  :ref="(element) => setBaseGroupRef(element, rowIndex)"
                  class="album-group"
                >
                  <button
                    v-for="item in row.baseItems"
                    :key="`base-${item.originalIndex}`"
                    class="album-card"
                    type="button"
                    @mouseenter="primeMediaForItem(item)"
                    @focus="primeMediaForItem(item)"
                    @click="openPhoto(item.originalIndex)"
                  >
                    <picture class="album-media-frame">
                      <source :srcset="getCardPreviewWebpSrc(item)" type="image/webp">
                      <img
                        :src="getCardPreviewSrc(item)"
                        :alt="item.title"
                        class="album-media"
                        loading="lazy"
                        decoding="async"
                        fetchpriority="low"
                        @load="handleMediaLoad"
                      >
                    </picture>
                    <span v-if="isVideoItem(item)" class="album-video-badge">Video</span>
                    <span class="album-card-copy">
                      <strong>{{ item.title }}</strong>
                      <small>{{ item.description }}</small>
                    </span>
                  </button>
                </div>

                <div
                  v-if="isMotionEnabled"
                  class="album-group album-group-clone"
                >
                  <button
                    v-for="item in row.baseItems"
                    :key="`clone-${item.originalIndex}`"
                    class="album-card"
                    type="button"
                    tabindex="-1"
                    @mouseenter="primeMediaForItem(item)"
                    @click="openPhoto(item.originalIndex)"
                  >
                    <picture class="album-media-frame">
                      <source :srcset="getCardPreviewWebpSrc(item)" type="image/webp">
                      <img
                        :src="getCardPreviewSrc(item)"
                        :alt="item.title"
                        class="album-media"
                        loading="lazy"
                        decoding="async"
                        fetchpriority="low"
                      >
                    </picture>
                    <span v-if="isVideoItem(item)" class="album-video-badge">Video</span>
                    <span class="album-card-copy">
                      <strong>{{ item.title }}</strong>
                      <small>{{ item.description }}</small>
                    </span>
                  </button>
                </div>
              </div>
            </div>
            <span class="album-fade album-fade-left" aria-hidden="true">
              <span class="album-fade-glass"></span>
            </span>
            <span class="album-fade album-fade-right" aria-hidden="true">
              <span class="album-fade-glass"></span>
            </span>
            <span
              class="album-frame-shadow album-frame-shadow-left"
              aria-hidden="true"
            ></span>
            <span
              class="album-frame-shadow album-frame-shadow-right"
              aria-hidden="true"
            ></span>
          </div>
        </div>
      </div>
    </div>

    <teleport to="body">
      <div
        v-if="selectedPhoto"
        class="photo-modal"
        role="dialog"
        aria-modal="true"
        aria-label="Photo preview"
        :class="{ 'is-panning': isModalPanning }"
        @click.self="closePhoto"
        @contextmenu.prevent
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
            @mousedown="startModalPan"
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
              @mousedown="startModalPan"
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
import { computed, nextTick, onBeforeUnmount, onBeforeUpdate, onMounted, ref } from 'vue';
import { albumCopy, galleryItems } from '../../content/albumContent';

const ROW_SPEEDS = [34, 28];
const MIN_MODAL_ZOOM = 0.6;
const MAX_MODAL_ZOOM = 3;
const MODAL_ZOOM_STEP = 0.12;
const selectedPhotoIndex = ref(-1);
const modalZoom = ref(1);
const modalPan = ref({ x: 0, y: 0 });
const isModalPanning = ref(false);
const isMotionEnabled = ref(false);
const isSectionVisible = ref(false);
const sectionRef = ref(null);
const railElements = ref([]);
const baseGroupElements = ref([]);
const primedMediaSources = new Set();

let animationFrameId = 0;
let lastFrameTime = 0;
let mediaLoadTimer = 0;
let lastPanPoint = { x: 0, y: 0 };
let trackStates = [];
let sectionObserver = null;
let resizeObserver = null;
const selectedPhoto = computed(() => {
  if (selectedPhotoIndex.value < 0) return null;
  return galleryItems[selectedPhotoIndex.value];
});

const albumRows = computed(() => {
  const midpoint = Math.ceil(galleryItems.length / 2);

  return [
    {
      id: 'album-row-top',
      direction: 'left',
      directionClass: 'to-left',
      baseItems: galleryItems.slice(0, midpoint)
    },
    {
      id: 'album-row-bottom',
      direction: 'right',
      directionClass: 'to-right',
      baseItems: galleryItems.slice(midpoint)
    }
  ]
    .filter((row) => row.baseItems.length)
    .map((row, rowIndex) => ({
      ...row,
      baseItems: row.baseItems.map((item, index) => ({
        ...item,
        originalIndex: rowIndex === 0 ? index : midpoint + index
      }))
    }));
});

const modalMediaStyle = computed(() => ({
  transform: `translate3d(${modalPan.value.x}px, ${modalPan.value.y}px, 0) scale(${modalZoom.value})`
}));

const isVideoItem = (item) => /\.mp4$/i.test(item?.src || '');

const getGalleryFileBaseName = (src = '') => {
  const fileName = src.split('/').pop() || '';
  return fileName.replace(/\.[^.]+$/, '');
};

const getPreviewSrc = (src) => `/gallery/preview/${getGalleryFileBaseName(src)}.jpg`;
const getPreviewWebpSrc = (src) => `/gallery/preview/${getGalleryFileBaseName(src)}.webp`;
const getDisplaySrc = (src) => `/gallery/display/${getGalleryFileBaseName(src)}.jpg`;
const getDisplayWebpSrc = (src) => `/gallery/display/${getGalleryFileBaseName(src)}.webp`;

const getCardPreviewSrc = (item) => getPreviewSrc(isVideoItem(item) ? item.poster : item.src);
const getCardPreviewWebpSrc = (item) => getPreviewWebpSrc(isVideoItem(item) ? item.poster : item.src);

const clampValue = (value, min, max) => Math.min(max, Math.max(min, value));

const primeMediaForItem = (item) => {
  const source = item?.src || '';
  if (!source || primedMediaSources.has(source)) return;

  primedMediaSources.add(source);

  if (isVideoItem(item)) {
    const video = document.createElement('video');
    video.preload = 'metadata';
    video.src = source;
    video.load();
    return;
  }

  const picture = new Image();
  picture.decoding = 'async';
  picture.src = getDisplaySrc(source);
};

const shouldAnimateAlbum = () => {
  if (typeof window === 'undefined') return false;
  if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return false;
  return true;
};

const resetModalZoom = () => {
  modalZoom.value = 1;
  modalPan.value = { x: 0, y: 0 };
};

const stopModalPan = () => {
  isModalPanning.value = false;
  window.removeEventListener('mousemove', moveModalPan);
  window.removeEventListener('mouseup', stopModalPan);
};

const setRailRef = (element, rowIndex) => {
  if (element) {
    railElements.value[rowIndex] = element;
  }
};

const setBaseGroupRef = (element, rowIndex) => {
  if (element) {
    baseGroupElements.value[rowIndex] = element;
  }
};

const resetTrackRefs = () => {
  railElements.value = [];
  baseGroupElements.value = [];
};

const getTrackState = (rowIndex) => trackStates[rowIndex] || null;

const getTrackTransform = (state) => {
  if (!state?.baseWidth) return 'translate3d(0, 0, 0)';

  if (state.direction === 'right') {
    return `translate3d(${state.offset - state.baseWidth}px, 0, 0)`;
  }

  return `translate3d(${-state.offset}px, 0, 0)`;
};

const applyTrackTransforms = () => {
  trackStates.forEach((state) => {
    if (!state?.rail) return;
    state.rail.style.transform = getTrackTransform(state);
  });
};

const syncAlbumTrackMetrics = async () => {
  if (!isMotionEnabled.value) return;

  await nextTick();

  trackStates = albumRows.value.map((row, rowIndex) => {
    const rail = railElements.value[rowIndex];
    const baseGroup = baseGroupElements.value[rowIndex];
    const previousState = trackStates[rowIndex];
    const computedRailStyle = rail ? window.getComputedStyle(rail) : null;
    const groupGap = computedRailStyle ? Number.parseFloat(computedRailStyle.columnGap || computedRailStyle.gap || '0') || 0 : 0;
    const baseWidth = Math.round((baseGroup?.getBoundingClientRect().width || 0) + groupGap);

    if (!rail || !baseGroup || !baseWidth) {
      return {
        baseWidth: 0,
        direction: row.direction,
        offset: 0,
        paused: previousState?.paused || false,
        rail: rail || null,
        speed: ROW_SPEEDS[rowIndex] || ROW_SPEEDS[0]
      };
    }

    const previousOffset = previousState?.offset || 0;
    const normalizedOffset = ((previousOffset % baseWidth) + baseWidth) % baseWidth;

    return {
      baseWidth,
      direction: row.direction,
      offset: normalizedOffset,
      paused: previousState?.paused || false,
      rail,
      speed: ROW_SPEEDS[rowIndex] || ROW_SPEEDS[0]
    };
  });

  applyTrackTransforms();
};

const getRailStyle = (rowIndex) => {
  const state = getTrackState(rowIndex);

  if (!isMotionEnabled.value || !state) {
    return {};
  }

  return {
    transform: getTrackTransform(state)
  };
};

const setTrackPaused = (rowIndex, paused) => {
  const state = trackStates[rowIndex];
  if (!state) return;
  state.paused = paused;
};

const renderAlbumTracks = (timestamp) => {
  if (!isMotionEnabled.value) {
    animationFrameId = 0;
    return;
  }

  if (!lastFrameTime) {
    lastFrameTime = timestamp;
  }

  const elapsedSeconds = Math.min((timestamp - lastFrameTime) / 1000, 0.05);
  lastFrameTime = timestamp;

  if (!isSectionVisible.value || document.hidden || selectedPhoto.value) {
    animationFrameId = requestAnimationFrame(renderAlbumTracks);
    return;
  }

  trackStates.forEach((state) => {
    if (!state?.baseWidth || state.paused) return;

    state.offset += state.speed * elapsedSeconds;

    if (state.offset >= state.baseWidth) {
      state.offset -= state.baseWidth;
    }
  });

  applyTrackTransforms();
  animationFrameId = requestAnimationFrame(renderAlbumTracks);
};

const handleMediaLoad = () => {
  if (!isMotionEnabled.value) return;

  window.clearTimeout(mediaLoadTimer);
  mediaLoadTimer = window.setTimeout(syncAlbumTrackMetrics, 80);
};

const openPhoto = (index) => {
  const item = galleryItems[index];
  if (item) {
    primeMediaForItem(item);
  }

  resetModalZoom();
  selectedPhotoIndex.value = index;
  document.body.classList.add('modal-open');
};

const closePhoto = () => {
  selectedPhotoIndex.value = -1;
  resetModalZoom();
  stopModalPan();
  document.body.classList.remove('modal-open');
};

const showPrevPhoto = () => {
  resetModalZoom();
  selectedPhotoIndex.value = (selectedPhotoIndex.value - 1 + galleryItems.length) % galleryItems.length;
};

const showNextPhoto = () => {
  resetModalZoom();
  selectedPhotoIndex.value = (selectedPhotoIndex.value + 1) % galleryItems.length;
};

const handleModalWheel = (event) => {
  if (!event.ctrlKey) return;

  event.preventDefault();
  const direction = event.deltaY > 0 ? -1 : 1;
  const nextZoom = modalZoom.value + direction * MODAL_ZOOM_STEP;
  modalZoom.value = Number(clampValue(nextZoom, MIN_MODAL_ZOOM, MAX_MODAL_ZOOM).toFixed(2));

  if (modalZoom.value <= 1) {
    modalPan.value = { x: 0, y: 0 };
  }
};

function moveModalPan(event) {
  if (!isModalPanning.value) return;

  const deltaX = event.clientX - lastPanPoint.x;
  const deltaY = event.clientY - lastPanPoint.y;
  lastPanPoint = { x: event.clientX, y: event.clientY };
  modalPan.value = {
    x: modalPan.value.x + deltaX,
    y: modalPan.value.y + deltaY
  };
}

const startModalPan = (event) => {
  if (event.button !== 2 || modalZoom.value <= 1) return;

  event.preventDefault();
  isModalPanning.value = true;
  lastPanPoint = { x: event.clientX, y: event.clientY };
  window.addEventListener('mousemove', moveModalPan);
  window.addEventListener('mouseup', stopModalPan);
};

const handleKeydown = (event) => {
  if (!selectedPhoto.value) return;

  if (event.key === 'Escape') closePhoto();
  if (event.key === 'ArrowLeft') showPrevPhoto();
  if (event.key === 'ArrowRight') showNextPhoto();
};

const handleResize = () => {
  syncAlbumTrackMetrics();
};

onBeforeUpdate(() => {
  resetTrackRefs();
});

onMounted(() => {
  window.addEventListener('keydown', handleKeydown);
  isMotionEnabled.value = shouldAnimateAlbum();

  if ('IntersectionObserver' in window && sectionRef.value) {
    sectionObserver = new IntersectionObserver((entries) => {
      isSectionVisible.value = entries.some((entry) => entry.isIntersecting);
    }, {
      rootMargin: '240px 0px'
    });
    sectionObserver.observe(sectionRef.value);
  } else {
    isSectionVisible.value = true;
  }

  if ('ResizeObserver' in window) {
    resizeObserver = new ResizeObserver(() => {
      syncAlbumTrackMetrics();
    });
  }

  nextTick(() => {
    if (!isMotionEnabled.value) return;

    baseGroupElements.value.forEach((element) => {
      if (element && resizeObserver) {
        resizeObserver.observe(element);
      }
    });

    syncAlbumTrackMetrics();
    animationFrameId = requestAnimationFrame(renderAlbumTracks);
  });

  window.addEventListener('resize', handleResize);
});

onBeforeUnmount(() => {
  window.removeEventListener('keydown', handleKeydown);
  window.removeEventListener('resize', handleResize);
  cancelAnimationFrame(animationFrameId);
  window.clearTimeout(mediaLoadTimer);
  resizeObserver?.disconnect();
  sectionObserver?.disconnect();
  stopModalPan();
  document.body.classList.remove('modal-open');
});
</script>

<style scoped>
.album-section {
  --accent-blue: #40dfff;
  --album-gap: 0.9rem;
  position: relative;
  padding: 2.25rem 1.25rem 6rem;
  overflow-x: hidden;
  overflow-y: visible;
  color: #193a53;
  background:
    radial-gradient(circle at 14% 10%, rgba(247, 238, 173, 0.22), transparent 22%),
    radial-gradient(circle at 84% 12%, rgba(64, 223, 255, 0.2), transparent 18%),
    linear-gradient(
      180deg,
      rgba(234, 248, 255, 0.98) 0%,
      rgba(228, 246, 255, 0.98) 42%,
      rgba(240, 250, 243, 0.98) 72%,
      rgba(251, 247, 220, 0.95) 100%
    ),
    repeating-linear-gradient(90deg, rgba(32, 84, 116, 0.04) 0 1px, transparent 1px 74px);
}

.album-section::before {
  position: absolute;
  inset: 0;
  content: '';
  background-image:
    linear-gradient(180deg, rgba(38, 97, 133, 0.08) 0 1px, transparent 1px 100%),
    linear-gradient(90deg, rgba(38, 97, 133, 0.05) 0 1px, transparent 1px 100%);
  background-size: 56px 56px;
  opacity: 0.26;
  pointer-events: none;
}

.album-shell {
  position: relative;
  z-index: 1;
  width: min(100%, 1120px);
  margin: 0 auto;
}

.section-heading {
  display: grid;
  gap: 0.45rem;
  max-width: 45rem;
  margin-bottom: 1.45rem;
}

.eyebrow,
.section-heading h2,
.section-heading p {
  margin: 0;
}

.eyebrow {
  color: #2a6489;
  font-size: 0.8rem;
  font-weight: 900;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

.section-heading h2 {
  color: #214261;
  font-size: clamp(1.7rem, 4vw, 2.7rem);
  line-height: 1.1;
  text-shadow:
    0 0 14px rgba(255, 255, 255, 0.18),
    0 0 24px rgba(247, 238, 173, 0.14),
    0 0 32px rgba(64, 223, 255, 0.18);
}

.section-heading p {
  color: rgba(36, 70, 96, 0.76);
  font-size: 0.95rem;
  font-weight: 700;
  line-height: 1.7;
}

.album-flow {
  display: grid;
  gap: 1rem;
  min-width: 0;
}

.album-track {
  position: relative;
  width: 100%;
  min-width: 0;
  overflow: hidden;
}

.album-mask-frame {
  position: relative;
  width: 100%;
  min-width: 0;
  max-width: 100%;
  overflow: hidden;
  isolation: isolate;
}

.album-viewport {
  position: relative;
  width: 100%;
  min-width: 0;
  max-width: 100%;
  overflow: hidden;
  padding: 0.2rem 0;
  mask-image: linear-gradient(
    90deg,
    transparent 0%,
    rgba(0, 0, 0, 0.12) 2.5%,
    rgba(0, 0, 0, 0.72) 8.5%,
    #000 16%,
    #000 84%,
    rgba(0, 0, 0, 0.72) 91.5%,
    rgba(0, 0, 0, 0.12) 97.5%,
    transparent 100%
  );
  -webkit-mask-image: linear-gradient(
    90deg,
    transparent 0%,
    rgba(0, 0, 0, 0.12) 2.5%,
    rgba(0, 0, 0, 0.72) 8.5%,
    #000 16%,
    #000 84%,
    rgba(0, 0, 0, 0.72) 91.5%,
    rgba(0, 0, 0, 0.12) 97.5%,
    transparent 100%
  );
}

.album-fade,
.album-frame-shadow {
  position: absolute;
  top: 0;
  bottom: 0;
  pointer-events: none;
}

.album-fade {
  display: none;
}

.album-fade-glass {
  display: none;
}

.album-fade-left {
  left: 0;
}

.album-fade-left .album-fade-glass {
  display: none;
}

.album-fade-right {
  right: 0;
}

.album-fade-right .album-fade-glass {
  display: none;
}

.album-frame-shadow {
  display: none;
}

.album-frame-shadow-left {
  left: 0;
}

.album-frame-shadow-right {
  right: 0;
}

.album-rail {
  position: relative;
  z-index: 1;
  display: flex;
  width: max-content;
  gap: var(--album-gap);
  transform: translate3d(0, 0, 0);
  will-change: transform;
}

.album-group {
  display: flex;
  gap: var(--album-gap);
}

.album-card {
  position: relative;
  overflow: hidden;
  flex: 0 0 auto;
  display: grid;
  width: clamp(10.5rem, 17vw, 12rem);
  min-height: 12.4rem;
  padding: 0;
  border: 1px solid rgba(140, 199, 220, 0.26);
  border-radius: 8px;
  background:
    linear-gradient(135deg, rgba(247, 238, 173, 0.36), transparent 44%),
    linear-gradient(145deg, rgba(64, 223, 255, 0.16), transparent 68%),
    linear-gradient(145deg, rgba(255, 251, 238, 0.84), rgba(228, 245, 255, 0.78));
  box-shadow:
    0 18px 36px rgba(55, 95, 126, 0.12),
    0 0 20px rgba(64, 223, 255, 0.08),
    0 0 18px rgba(247, 238, 173, 0.08),
    inset 0 1px 0 rgba(255, 255, 255, 0.45);
  color: #1f3d58;
  text-align: left;
  cursor: pointer;
}

.album-card:hover {
  border-color: rgba(247, 238, 173, 0.4);
  box-shadow:
    0 18px 36px rgba(0, 0, 0, 0.18),
    0 0 24px rgba(64, 223, 255, 0.12),
    0 0 18px rgba(247, 238, 173, 0.12);
  transform: translateY(-2px);
}

.album-media-frame,
.album-media {
  display: block;
  width: 100%;
  height: 8.75rem;
}

.album-media {
  object-fit: cover;
  object-position: center;
  background:
    linear-gradient(135deg, rgba(247, 238, 173, 0.38), transparent 42%),
    linear-gradient(145deg, rgba(64, 223, 255, 0.18), transparent 70%),
    #edf8ff;
}

.album-video-badge {
  position: absolute;
  top: 0.55rem;
  right: 0.55rem;
  z-index: 1;
  padding: 0.22rem 0.48rem;
  border: 1px solid rgba(255, 255, 255, 0.46);
  border-radius: 999px;
  background: rgba(15, 31, 44, 0.64);
  color: #fdf9e7;
  font-size: 0.62rem;
  font-weight: 900;
  letter-spacing: 0.02em;
  backdrop-filter: blur(8px);
}

.album-card-copy {
  display: grid;
  gap: 0.2rem;
  padding: 0.72rem 0.8rem 0.9rem;
}

.album-card-copy strong {
  font-size: 0.92rem;
  line-height: 1.15;
  color: #23415b;
}

.album-card-copy small {
  display: -webkit-box;
  overflow: hidden;
  color: rgba(38, 71, 97, 0.74);
  font-size: 0.7rem;
  font-weight: 700;
  line-height: 1.35;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
}

.album-section.is-static .album-rail {
  display: flex;
  width: max-content;
  gap: var(--album-gap);
  transform: none !important;
}

.album-section.is-static .album-viewport {
  overflow-x: auto;
  overflow-y: hidden;
  -webkit-overflow-scrolling: touch;
  scrollbar-width: none;
  overscroll-behavior-x: contain;
}

.album-section.is-static .album-viewport::-webkit-scrollbar {
  display: none;
}

.album-section.is-static .album-group {
  display: flex;
  gap: var(--album-gap);
}

.album-section.is-static .album-card {
  width: clamp(10.5rem, 17vw, 12rem);
  scroll-snap-align: start;
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
  background: rgba(2, 5, 8, 0.88);
  backdrop-filter: blur(14px);
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
  border: 1px solid rgba(247, 238, 173, 0.34);
  border-radius: 8px;
  object-fit: contain;
  transform-origin: center;
  transition: transform 0.16s ease;
  cursor: zoom-in;
  box-shadow:
    0 0 38px rgba(64, 223, 255, 0.12),
    0 0 24px rgba(247, 238, 173, 0.1);
}

.photo-modal.is-panning .modal-media {
  cursor: grabbing;
  transition: none;
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
  border: 1px solid rgba(255, 255, 255, 0.12);
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.06);
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
  border-color: rgba(247, 238, 173, 0.52);
  box-shadow:
    0 0 18px rgba(64, 223, 255, 0.16),
    0 0 18px rgba(247, 238, 173, 0.16);
}

:global(body.modal-open) {
  overflow: hidden;
}

@media (max-width: 900px) {
  .album-video-badge,
  .photo-modal {
    backdrop-filter: none;
  }

  .album-shell {
    width: min(100%, 900px);
  }
}

@media (max-width: 768px) {
  .album-section {
    padding: 1rem 0 4rem;
  }

  .album-shell {
    width: min(100%, 34rem);
  }

  .album-flow {
    padding: 0 0.9rem;
  }

  .album-card {
    width: min(70vw, 15rem);
    min-height: 11.9rem;
  }

  .album-section.is-static .album-viewport {
    scroll-snap-type: x proximity;
    padding-bottom: 0.35rem;
  }

  .album-media {
    height: 9rem;
  }

  .album-card-copy {
    gap: 0.12rem;
    padding: 0.7rem 0.78rem 0.82rem;
  }

  .photo-modal {
    grid-template-columns: 1fr;
    grid-template-rows: 1fr auto;
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

  .modal-figure {
    max-width: 100%;
  }
}

@media (max-width: 480px) {
  .album-flow {
    padding: 0 0.8rem;
  }

  .album-card {
    width: min(74vw, 14rem);
    min-height: 11.6rem;
  }

  .album-section.is-static .album-viewport {
    scroll-snap-type: x mandatory;
  }

  .album-media {
    height: 8.75rem;
  }

  .album-card-copy small {
    display: none;
  }

  .photo-modal {
    padding: 0.8rem;
  }
}
</style>
