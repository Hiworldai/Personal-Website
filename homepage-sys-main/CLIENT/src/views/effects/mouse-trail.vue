<template>
  <main class="mouse-trail-demo">
    <HomeHeroSection :fade-style="heroFadeStyle" @scroll-hint="scrollToFade" />
    <ExperienceSection />
    <div
      v-if="!shouldLoadAlbum"
      ref="albumSentinelRef"
      class="album-load-sentinel"
      aria-hidden="true"
    ></div>
    <AlbumSection v-if="shouldLoadAlbum" />
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
import ExperienceSection from './modules/experience/ExperienceSection.vue';
import HomeHeroSection from './modules/hero/HomeHeroSection.vue';
const AlbumSection = defineAsyncComponent(() => import('./modules/album/AlbumSection.vue'));

const heroProgress = ref(0);
const shouldLoadAlbum = ref(false);
const albumSentinelRef = ref(null);

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
let albumIdleCallback = 0;
let albumObserver = null;

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
  if (shouldLoadAlbum.value) return;

  shouldLoadAlbum.value = true;
  albumObserver?.disconnect();
  albumObserver = null;
  window.clearTimeout(albumLoadTimer);

  if (albumIdleCallback && 'cancelIdleCallback' in window) {
    window.cancelIdleCallback(albumIdleCallback);
  }

  albumIdleCallback = 0;
};

const scheduleAlbumLoad = () => {
  if (shouldLoadAlbum.value) return;

  const sentinel = albumSentinelRef.value;
  if (!sentinel || !('IntersectionObserver' in window)) {
    albumLoadTimer = window.setTimeout(loadAlbumSection, 1400);
    return;
  }

  albumObserver = new IntersectionObserver((entries) => {
    if (entries.some((entry) => entry.isIntersecting)) {
      loadAlbumSection();
    }
  }, {
    rootMargin: '800px 0px'
  });
  albumObserver.observe(sentinel);

  if ('requestIdleCallback' in window) {
    albumIdleCallback = window.requestIdleCallback(loadAlbumSection, { timeout: 2200 });
  } else {
    albumLoadTimer = window.setTimeout(loadAlbumSection, 1800);
  }
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
  if (albumIdleCallback && 'cancelIdleCallback' in window) {
    window.cancelIdleCallback(albumIdleCallback);
  }
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
  min-height: 100svh;
  background: #02070c;
  overflow-x: hidden;
}

.album-load-sentinel {
  min-height: 26svh;
  background: linear-gradient(180deg, #02070c 0%, #dbefff 100%);
}

.site-beian-footer {
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 0.75rem 1.1rem;
  flex-wrap: wrap;
  padding: 1.2rem 1rem 1.4rem;
  color: rgba(25, 58, 83, 0.76);
  background: linear-gradient(180deg, #eef8fb 0%, #e8f6ff 100%);
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
  color: #0a6178;
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
