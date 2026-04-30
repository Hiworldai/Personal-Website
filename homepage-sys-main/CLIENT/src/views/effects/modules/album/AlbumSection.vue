<template>
  <section class="album-section" aria-labelledby="album-title">
    <div class="album-shell">
      <div class="section-heading">
        <p class="eyebrow">Photo Album</p>
        <h2 id="album-title">{{ albumCopy.title }}</h2>
        <p>{{ albumCopy.descriptionStart }} {{ albumCopy.descriptionEnd }}</p>
      </div>

      <div class="album-flow" aria-label="Photo album flow">
        <div
          v-for="(row, rowIndex) in albumRows"
          :key="`album-row-${rowIndex}`"
          :ref="(element) => setTrackRef(element, rowIndex)"
          class="album-track"
          :class="row.directionClass"
        >
          <div class="album-track-inner">
            <button
              v-for="(item, itemIndex) in row.items"
              :key="item.originalIndex"
              :ref="(element) => setCardRef(element, rowIndex, itemIndex)"
              class="album-card"
              type="button"
              @click="openPhoto(item.originalIndex)"
            >
              <img
                :src="getCardPreviewSrc(item)"
                :alt="item.title"
                class="album-media"
                decoding="async"
                @load="handleMediaLoad"
              >
              <span v-if="isVideoItem(item)" class="album-video-badge">Video</span>
              <span class="album-card-copy">
                <strong>{{ item.title }}</strong>
                <small>{{ item.description }}</small>
              </span>
            </button>
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
            controls
            autoplay
            playsinline
            class="modal-media"
            :style="modalMediaStyle"
            @mousedown="startModalPan"
          ></video>
          <img
            v-else-if="selectedPhoto"
            :src="selectedPhoto.src"
            :alt="selectedPhoto.title"
            class="modal-media"
            :style="modalMediaStyle"
            loading="eager"
            decoding="async"
            @mousedown="startModalPan"
          >
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
import { albumCopy, galleryItems } from '../../content/siteContent';

const LEFT_ROW_SPEED = 42;
const RIGHT_ROW_SPEED = 38;
const MIN_MODAL_ZOOM = 0.6;
const MAX_MODAL_ZOOM = 3;
const MODAL_ZOOM_STEP = 0.12;

const selectedPhotoIndex = ref(-1);
const modalZoom = ref(1);
const modalPan = ref({ x: 0, y: 0 });
const isModalPanning = ref(false);
const trackElements = ref([]);
const cardElements = ref([]);
let animationFrameId = 0;
let lastFrameTime = 0;
let mediaLoadTimer = 0;
let lastPanPoint = { x: 0, y: 0 };
let trackStates = [];

const selectedPhoto = computed(() => {
  if (selectedPhotoIndex.value < 0) return null;
  return galleryItems[selectedPhotoIndex.value];
});

const albumRows = computed(() => {
  const midpoint = Math.ceil(galleryItems.length / 2);
  const rows = [
    {
      direction: 'left',
      directionClass: 'to-left',
      items: galleryItems.slice(0, midpoint)
    },
    {
      direction: 'right',
      directionClass: 'to-right',
      items: galleryItems.slice(midpoint)
    }
  ];

  return rows
    .filter((row) => row.items.length)
    .map((row, rowIndex) => ({
      ...row,
      items: row.items.map((item, index) => ({
        ...item,
        originalIndex: rowIndex === 0 ? index : midpoint + index
      }))
    }));
});

const modalMediaStyle = computed(() => ({
  transform: `translate3d(${modalPan.value.x}px, ${modalPan.value.y}px, 0) scale(${modalZoom.value})`
}));

const isVideoItem = (item) => /\.mp4$/i.test(item.src);

const getGalleryFileBaseName = (src = '') => {
  const fileName = src.split('/').pop() || '';
  return fileName.replace(/\.[^.]+$/, '');
};

const getThumbnailSrc = (src) => `/gallery/thumbs/${getGalleryFileBaseName(src)}.jpg`;

const getCardPreviewSrc = (item) => getThumbnailSrc(isVideoItem(item) ? item.poster : item.src);

const clampValue = (value, min, max) => Math.min(max, Math.max(min, value));

const resetModalZoom = () => {
  modalZoom.value = 1;
  modalPan.value = { x: 0, y: 0 };
};

const stopModalPan = () => {
  isModalPanning.value = false;
  window.removeEventListener('mousemove', moveModalPan);
  window.removeEventListener('mouseup', stopModalPan);
};

const setTrackRef = (element, rowIndex) => {
  if (element) {
    trackElements.value[rowIndex] = element;
  }
};

const setCardRef = (element, rowIndex, itemIndex) => {
  if (!element) return;

  if (!cardElements.value[rowIndex]) {
    cardElements.value[rowIndex] = [];
  }

  cardElements.value[rowIndex][itemIndex] = element;
};

const resetTrackRefs = () => {
  trackElements.value = [];
  cardElements.value = [];
};

const measureCssLength = (owner, value) => {
  const probe = document.createElement('div');
  probe.style.position = 'absolute';
  probe.style.visibility = 'hidden';
  probe.style.width = value;
  owner.appendChild(probe);
  const pixels = probe.getBoundingClientRect().width;
  probe.remove();

  return pixels;
};

const syncAlbumTrackMetrics = async () => {
  await nextTick();

  trackStates = albumRows.value
    .map((row, rowIndex) => {
      const track = trackElements.value[rowIndex];
      const cards = (cardElements.value[rowIndex] || []).filter(Boolean);
      const firstCard = cards[0];

      if (!track || !firstCard || !cards.length) {
        return null;
      }

      const trackWidth = track.getBoundingClientRect().width;
      const cardRect = firstCard.getBoundingClientRect();
      const gap = measureCssLength(track, getComputedStyle(track).getPropertyValue('--album-gap').trim());
      const step = cardRect.width + gap;
      const totalWidth = step * cards.length;
      const previousState = trackStates[rowIndex];

      if (!trackWidth || !cardRect.width || !cardRect.height || totalWidth <= trackWidth) {
        return null;
      }

      track.style.setProperty('--album-track-height', `${cardRect.height}px`);

      return {
        cardWidth: cardRect.width,
        cards,
        direction: row.direction,
        offset: previousState ? previousState.offset % totalWidth : 0,
        speed: row.direction === 'left' ? LEFT_ROW_SPEED : RIGHT_ROW_SPEED,
        step,
        totalWidth,
        track,
        trackWidth
      };
    })
    .filter(Boolean);
};

const renderAlbumTracks = (timestamp) => {
  if (!lastFrameTime) {
    lastFrameTime = timestamp;
  }

  const elapsedSeconds = Math.min((timestamp - lastFrameTime) / 1000, 0.05);
  lastFrameTime = timestamp;

  trackStates.forEach((state) => {
    if (state.track.matches(':hover')) {
      return;
    }

    state.offset = (state.offset + state.speed * elapsedSeconds) % state.totalWidth;

    state.cards.forEach((card, index) => {
      let x = index * state.step + (state.direction === 'left' ? -state.offset : state.offset);

      while (x < -state.step) {
        x += state.totalWidth;
      }

      while (x > state.trackWidth) {
        x -= state.totalWidth;
      }

      card.style.transform = `translate3d(${x}px, 0, 0)`;
    });
  });

  animationFrameId = requestAnimationFrame(renderAlbumTracks);
};

const handleMediaLoad = () => {
  window.clearTimeout(mediaLoadTimer);
  mediaLoadTimer = window.setTimeout(syncAlbumTrackMetrics, 80);
};

const openPhoto = (index) => {
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

onBeforeUpdate(() => {
  resetTrackRefs();
});

onMounted(() => {
  window.addEventListener('keydown', handleKeydown);
  window.addEventListener('load', syncAlbumTrackMetrics);
  window.addEventListener('resize', syncAlbumTrackMetrics);

  syncAlbumTrackMetrics();
  animationFrameId = requestAnimationFrame(renderAlbumTracks);
});

onBeforeUnmount(() => {
  window.removeEventListener('keydown', handleKeydown);
  window.removeEventListener('load', syncAlbumTrackMetrics);
  window.removeEventListener('resize', syncAlbumTrackMetrics);
  cancelAnimationFrame(animationFrameId);
  window.clearTimeout(mediaLoadTimer);
  stopModalPan();
  document.body.classList.remove('modal-open');
});
</script>

<style scoped>
.album-section {
  --accent-blue: #40dfff;
  position: relative;
  padding: 2rem 1.25rem 6rem;
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
  width: min(100%, 920px);
  margin: 0 auto;
}

.section-heading {
  display: grid;
  gap: 0.45rem;
  max-width: 42rem;
  margin-bottom: 1.2rem;
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

.section-heading span {
  color: var(--accent-blue);
}

.album-flow {
  --album-gap: 0.75rem;
  display: grid;
  gap: var(--album-gap);
}

.album-track {
  --album-track-height: 12.4rem;
  position: relative;
  height: var(--album-track-height);
  overflow: hidden;
  padding: 0.15rem 0;
  mask-image: linear-gradient(90deg, transparent 0, #000 10%, #000 90%, transparent 100%);
}

.album-track-inner {
  position: relative;
  width: 100%;
  height: 100%;
}

.album-card {
  position: absolute;
  top: 0;
  left: 0;
  overflow: hidden;
  flex: none;
  flex-shrink: 0;
  display: grid;
  width: clamp(10rem, 18vw, 12.1rem);
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
  transform: translate3d(0, 0, 0);
  will-change: transform;
}

.album-media {
  display: block;
  width: 100%;
  height: 8.7rem;
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
  -webkit-line-clamp: 1;
}

.album-card:hover {
  border-color: rgba(247, 238, 173, 0.4);
  box-shadow:
    0 18px 36px rgba(0, 0, 0, 0.26),
    0 0 24px rgba(64, 223, 255, 0.12),
    0 0 18px rgba(247, 238, 173, 0.12);
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
  .album-shell {
    width: min(100%, 780px);
  }
}

@media (max-width: 768px) {
  .album-section {
    padding: 0.9rem 0 4rem;
  }

  .album-shell {
    width: min(100%, 34rem);
  }

  .album-flow {
    --album-gap: 0.65rem;
    gap: 0.8rem;
    padding: 0 0.9rem;
  }

  .album-track {
    mask-image: linear-gradient(90deg, transparent 0, #000 8%, #000 92%, transparent 100%);
    padding: 0.15rem 0;
  }

  .album-card {
    width: min(68vw, 15.25rem);
    min-height: 11.9rem;
  }

  .album-media {
    height: 9rem;
  }

  .album-card-copy {
    gap: 0.12rem;
    padding: 0.7rem 0.78rem 0.82rem;
  }

  .album-card-copy small {
    -webkit-line-clamp: 1;
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
