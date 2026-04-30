<template>
  <main class="mouse-trail-demo">
    <HomeHeroSection :fade-style="heroFadeStyle" @scroll-hint="scrollToFade" />
    <ExperienceSection />
    <AlbumSection v-if="shouldLoadAlbum" />
  </main>
</template>

<script setup>
import { computed, onBeforeUnmount, onMounted, ref } from 'vue';
import AlbumSection from './modules/album/AlbumSection.vue';
import ExperienceSection from './modules/experience/ExperienceSection.vue';
import HomeHeroSection from './modules/hero/HomeHeroSection.vue';

const heroProgress = ref(0);
const shouldLoadAlbum = ref(false);

const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

const heroFadeStyle = computed(() => {
  const eased = heroProgress.value * heroProgress.value * (3 - 2 * heroProgress.value);
  const opacity = clamp(1 - eased, 0, 1);

  return {
    opacity,
    filter: `blur(${eased * 8}px)`,
    transform: `translate3d(0, ${eased * -22}px, 0) scale(${1 - eased * 0.025})`
  };
});

let scrollFrame = 0;
let scrollAnimationFrame = 0;
let albumLoadTimer = 0;
let albumIdleId = 0;

const updateHeroProgress = () => {
  scrollFrame = 0;

  const fadeDistance = Math.max(1, window.innerHeight * 0.85);
  heroProgress.value = clamp(window.scrollY / fadeDistance, 0, 1);
};

const requestHeroProgressUpdate = () => {
  if (scrollFrame) return;
  scrollFrame = requestAnimationFrame(updateHeroProgress);
};

const slowScrollTo = (targetY, duration = 1800) => {
  if (scrollAnimationFrame) {
    cancelAnimationFrame(scrollAnimationFrame);
    scrollAnimationFrame = 0;
  }

  const startY = window.scrollY;
  const distance = targetY - startY;
  const startTime = performance.now();
  const root = document.documentElement;
  const previousScrollBehavior = root.style.scrollBehavior;

  root.style.scrollBehavior = 'auto';

  const tick = (time) => {
    const progress = clamp((time - startTime) / duration, 0, 1);
    const eased = progress < 0.5
      ? 4 * progress * progress * progress
      : 1 - ((-2 * progress + 2) ** 3) / 2;

    window.scrollTo(0, startY + distance * eased);

    if (progress < 1) {
      scrollAnimationFrame = requestAnimationFrame(tick);
      return;
    }

    root.style.scrollBehavior = previousScrollBehavior;
    scrollAnimationFrame = 0;
  };

  scrollAnimationFrame = requestAnimationFrame(tick);
};

const scrollToFade = () => {
  const section = document.getElementById('experience-section');
  if (!section) return;
  slowScrollTo(section.offsetTop, 1800);
};

const loadAlbumSection = () => {
  shouldLoadAlbum.value = true;
};

const requestDeferredAlbumLoad = () => {
  if (shouldLoadAlbum.value) return;

  if ('requestIdleCallback' in window) {
    albumIdleId = window.requestIdleCallback(loadAlbumSection, { timeout: 1800 });
    return;
  }

  albumLoadTimer = window.setTimeout(loadAlbumSection, 900);
};

const scheduleAlbumLoad = () => {
  if (document.readyState === 'complete') {
    requestDeferredAlbumLoad();
    return;
  }

  window.addEventListener('load', requestDeferredAlbumLoad, { once: true });
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
  window.removeEventListener('load', requestDeferredAlbumLoad);
  cancelAnimationFrame(scrollFrame);
  cancelAnimationFrame(scrollAnimationFrame);
  clearTimeout(albumLoadTimer);
  if (albumIdleId && 'cancelIdleCallback' in window) {
    window.cancelIdleCallback(albumIdleId);
  }
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
  overflow-x: hidden;
  -ms-overflow-style: none;
}

:global(body) {
  scrollbar-width: none;
}

:global(html::-webkit-scrollbar),
:global(body::-webkit-scrollbar) {
  width: 0;
  height: 0;
  display: none;
}

.mouse-trail-demo {
  width: 100%;
  min-height: 180svh;
  background: #02070c;
  overflow-x: hidden;
}

@media (max-width: 768px) {
  .mouse-trail-demo {
    min-height: 100svh;
  }
}
</style>
