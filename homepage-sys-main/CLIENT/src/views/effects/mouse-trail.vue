<template>
  <main class="mouse-trail-demo">
    <HomeHeroSection
      :fade-style="heroFadeStyle"
      :scroll-progress="heroProgress"
      @scroll-hint="scrollToFade"
    />
    <div class="dawn-transition-shell">
      <ExperienceSection
        :dawn-progress="heroProgress"
        :album-transition-progress="0"
      />
    </div>
    <CloudDissolveTransition :progress="dissolveProgress" />
    <div
      ref="albumShellRef"
      class="album-transition-shell"
      :class="{ 'is-album-ready': albumVisualReady }"
      :style="albumShellStyle"
    >
      <div
        ref="albumSentinelRef"
        class="album-load-sentinel"
        aria-hidden="true"
      ></div>
      <AlbumSection
        v-if="shouldLoadAlbum"
        :story-progress="dissolveProgress"
        @ready="handleAlbumReady"
      />
    </div>
    <footer class="site-beian-footer" aria-label="网站备案信息">
      <a
        class="site-beian-link"
        href="https://beian.miit.gov.cn/"
        rel="noreferrer"
        target="_blank"
      >
        蜀ICP备2026021532号
      </a>
      <a
        class="site-beian-link police-beian-link"
        href="https://beian.mps.gov.cn/#/query/webSearch?code=51012402001673"
        rel="noreferrer"
        target="_blank"
      >
        <img src="/beian/beian-police.png" alt="" aria-hidden="true">
        <span>川公网安备51012402001673号</span>
      </a>
    </footer>
  </main>
</template>

<script setup>
import { computed, defineAsyncComponent, onBeforeUnmount, onMounted, ref } from 'vue';
import HomeHeroSection from './modules/hero/HomeHeroSection.vue';

const heroProgress = ref(0);
const shouldLoadAlbum = ref(false);
const albumVisualReady = ref(false);
const albumShellRef = ref(null);
const albumSentinelRef = ref(null);
const albumStoryProgress = ref(0);

const clamp = (value, min, max) => Math.min(max, Math.max(min, value));
const smoothstep = (value) => value * value * (3 - 2 * value);
const getRangeProgress = (value, start, end) => (
  smoothstep(clamp((value - start) / Math.max(end - start, 0.001), 0, 1))
);

const heroFadeStyle = computed(() => {
  const exit = getRangeProgress(heroProgress.value, 0.84, 0.9);

  return {
    opacity: 1 - exit,
    filter: `blur(${exit * 8}px)`,
    transform: `translate3d(0, ${exit * -22}px, 0) scale(${1 - exit * 0.025})`
  };
});

const dissolveProgress = computed(() => clamp(
  (albumStoryProgress.value - 0.28) / 0.72,
  0,
  1
));

const albumShellStyle = computed(() => ({
  '--album-shell-opacity': `${getRangeProgress(dissolveProgress.value, 0.08, 0.2)}`
}));

let scrollFrame = 0;
let scrollAnimationFrame = 0;
let albumLoadTimer = 0;
let albumPreloadTimer = 0;
let albumObserver = null;
let albumModulePromise = null;

const preloadAlbumSection = () => {
  if (!albumModulePromise) {
    albumModulePromise = import('./modules/album/AlbumSection.vue')
      .then((module) => module);
  }

  return albumModulePromise;
};

const AlbumSection = defineAsyncComponent({
  loader: preloadAlbumSection,
  delay: 0
});

const CloudDissolveTransition = defineAsyncComponent({
  loader: () => import('./modules/experience/CloudDissolveTransition.vue'),
  delay: 0
});

const ExperienceSection = defineAsyncComponent({
  loader: () => import('./modules/experience/ExperienceSection.vue'),
  delay: 0
});

const updateHeroProgress = () => {
  scrollFrame = 0;

  const fadeDistance = Math.max(1, window.innerHeight);
  heroProgress.value = clamp(window.scrollY / fadeDistance, 0, 1);

  const albumTrigger = albumShellRef.value || albumSentinelRef.value;
  if (albumTrigger) {
    const sectionTop = window.scrollY + albumTrigger.getBoundingClientRect().top;
    const viewportHeight = window.innerHeight;
    const preludeDistance = viewportHeight * 1.55;
    const storyStart = sectionTop - preludeDistance;
    albumStoryProgress.value = clamp(
      (window.scrollY - storyStart) / Math.max(preludeDistance, 1),
      0,
      1
    );
  }
};

const requestHeroProgressUpdate = () => {
  if (scrollFrame) return;
  scrollFrame = requestAnimationFrame(updateHeroProgress);
};

const slowScrollTo = (targetY, duration = 1600) => {
  cancelAnimationFrame(scrollAnimationFrame);

  const startY = window.scrollY;
  const distance = targetY - startY;
  const startedAt = performance.now();
  const root = document.documentElement;
  const previousBehavior = root.style.scrollBehavior;

  root.style.scrollBehavior = 'auto';

  const tick = (time) => {
    const progress = clamp((time - startedAt) / duration, 0, 1);
    const eased = progress < 0.5
      ? 4 * progress * progress * progress
      : 1 - ((-2 * progress + 2) ** 3) / 2;

    window.scrollTo(0, startY + distance * eased);

    if (progress < 1) {
      scrollAnimationFrame = requestAnimationFrame(tick);
      return;
    }

    root.style.scrollBehavior = previousBehavior;
    scrollAnimationFrame = 0;
  };

  scrollAnimationFrame = requestAnimationFrame(tick);
};

const scrollToFade = () => {
  const section = document.getElementById('experience-section');
  if (!section) return;

  const sectionTop = window.scrollY + section.getBoundingClientRect().top;
  const targetY = Math.max(sectionTop, window.innerHeight);
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    window.scrollTo(0, targetY);
    return;
  }

  slowScrollTo(targetY);
};

const preloadAlbumPreviews = () => {
  ['/gallery/preview/photo-1.jpg', '/gallery/preview/photo-2.jpg', '/gallery/preview/photo-3.jpg']
    .forEach((src) => {
      const image = new Image();
      image.decoding = 'async';
      image.src = src;
    });
};

const loadAlbumSection = () => {
  if (shouldLoadAlbum.value) return;

  shouldLoadAlbum.value = true;
  void preloadAlbumSection();
  albumObserver?.disconnect();
  albumObserver = null;
  window.clearTimeout(albumLoadTimer);
  window.clearTimeout(albumPreloadTimer);
};

const handleAlbumReady = () => {
  albumVisualReady.value = true;
  requestHeroProgressUpdate();
};

const scheduleAlbumLoad = () => {
  if (shouldLoadAlbum.value) return;

  void preloadAlbumSection();
  albumPreloadTimer = window.setTimeout(preloadAlbumPreviews, 320);
  albumLoadTimer = window.setTimeout(loadAlbumSection, 1400);

  const sentinel = albumShellRef.value || albumSentinelRef.value;
  if (!sentinel || !('IntersectionObserver' in window)) {
    albumLoadTimer = window.setTimeout(loadAlbumSection, 2800);
    return;
  }

  albumObserver = new IntersectionObserver((entries) => {
    if (entries.some((entry) => entry.isIntersecting)) {
      loadAlbumSection();
    }
  }, {
    rootMargin: '3600px 0px'
  });
  albumObserver.observe(sentinel);
};

onMounted(() => {
  updateHeroProgress();
  scheduleAlbumLoad();
  window.addEventListener('scroll', requestHeroProgressUpdate, { passive: true });
  window.addEventListener('resize', requestHeroProgressUpdate);
});

onBeforeUnmount(() => {
  window.removeEventListener('scroll', requestHeroProgressUpdate);
  window.removeEventListener('resize', requestHeroProgressUpdate);
  cancelAnimationFrame(scrollFrame);
  cancelAnimationFrame(scrollAnimationFrame);
  clearTimeout(albumLoadTimer);
  clearTimeout(albumPreloadTimer);
  albumObserver?.disconnect();
  document.documentElement.style.scrollBehavior = '';
});
</script>

<style scoped>
:global(html) {
  scroll-behavior: smooth;
  scrollbar-width: none;
}

@media (prefers-reduced-motion: reduce) {
  :global(html) {
    scroll-behavior: auto;
  }
}

:global(html),
:global(body) {
  width: 100%;
  margin: 0;
  overflow-x: clip;
  -ms-overflow-style: none;
  background: #02070c;
  color-scheme: dark;
}

:global(body) {
  scrollbar-width: none;
}

:global(#app) {
  min-height: 100svh;
  background: #02070c;
}

:global(html::-webkit-scrollbar),
:global(body::-webkit-scrollbar) {
  width: 0;
  height: 0;
  display: none;
}

.mouse-trail-demo {
  --section-fade-duration: 420ms;
  --section-fade-ease: cubic-bezier(0.22, 1, 0.36, 1);
  width: 100%;
  min-height: 100svh;
  background: #02070c;
  overflow-x: clip;
}

.album-transition-shell {
  position: relative;
  z-index: 2;
  min-height: 100svh;
  margin-top: -28svh;
  overflow: visible;
  opacity: var(--album-shell-opacity, 0);
  background:
    radial-gradient(circle at 50% 60%, rgba(85, 222, 255, 0.045), transparent 38%),
    radial-gradient(circle at 18% 18%, rgba(132, 229, 255, 0.03), transparent 26%),
    linear-gradient(
      180deg,
      #020a12 0%,
      #02070c 36%,
      #010305 70%,
      #000 100%
    );
  will-change: opacity;
}

@media (prefers-reduced-motion: reduce) {
  .album-transition-shell {
    margin-top: 0;
    opacity: 1;
  }
}

.dawn-transition-shell {
  position: relative;
  z-index: 1;
  margin-top: -106svh;
}

.dawn-transition-shell::before {
  position: absolute;
  right: 0;
  bottom: 100%;
  left: 0;
  height: 20svh;
  content: '';
  background: linear-gradient(180deg, #02070c 0%, rgba(3, 8, 14, 0.99) 46%, #0a0f1b 100%);
  pointer-events: none;
}

.album-load-sentinel {
  position: absolute;
  inset: 0;
  z-index: 8;
  min-height: 100%;
  overflow: hidden;
  background:
    radial-gradient(circle at 50% 60%, rgba(85, 222, 255, 0.045), transparent 38%),
    radial-gradient(circle at 18% 18%, rgba(132, 229, 255, 0.03), transparent 26%),
    linear-gradient(
      180deg,
      #020a12 0%,
      #02070c 36%,
      #010305 70%,
      #000 100%
    );
  opacity: 1;
  pointer-events: none;
  transform: translateZ(0);
  transition:
    opacity var(--section-fade-duration) var(--section-fade-ease),
    visibility var(--section-fade-duration) linear;
}

.album-transition-shell.is-album-ready .album-load-sentinel {
  visibility: hidden;
  opacity: 0;
}

.album-load-sentinel::before {
  position: absolute;
  inset: 0;
  content: "";
  background:
    radial-gradient(circle at 50% 44%, rgba(180, 248, 255, 0.07), transparent 18%),
    linear-gradient(180deg, transparent 0%, rgba(0, 0, 0, 0.26) 100%);
}

.site-beian-footer {
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 0.75rem 1.1rem;
  flex-wrap: wrap;
  padding: 1.2rem 1rem 1.4rem;
  color: rgba(219, 248, 255, 0.58);
  background: linear-gradient(180deg, #02070c 0%, #010305 100%);
  font-size: 0.86rem;
}

.site-beian-link {
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
  color: inherit;
  text-decoration: none;
  transition: color 0.2s ease, opacity 0.2s ease;
}

.site-beian-link:hover {
  color: #9ff3ff;
  opacity: 0.88;
}

.police-beian-link img {
  width: 1rem;
  height: 1rem;
  flex: 0 0 auto;
}

@media (max-width: 768px) {
  .mouse-trail-demo {
    min-height: 100svh;
  }

  .site-beian-footer {
    align-items: center;
    flex-direction: column;
    gap: 0.45rem;
    font-size: 0.78rem;
    text-align: center;
  }
}
</style>
