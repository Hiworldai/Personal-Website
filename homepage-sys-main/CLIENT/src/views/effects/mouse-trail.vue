<template>
  <main class="mouse-trail-demo">
    <HomeHeroSection
      :fade-style="heroFadeStyle"
      :scroll-progress="heroProgress"
      @scroll-hint="scrollToFade"
    />
    <ExperienceSection />
    <div
      v-if="!shouldLoadAlbum"
      ref="albumSentinelRef"
      class="album-load-sentinel"
      aria-hidden="true"
    ></div>
    <AlbumSection
      v-if="shouldLoadAlbum"
      :story-progress="albumStoryProgress"
    />
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
const albumStoryProgress = ref(0);

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
let albumObserver = null;

const updateHeroProgress = () => {
  scrollFrame = 0;

  const fadeDistance = Math.max(1, window.innerHeight * 0.85);
  heroProgress.value = clamp(window.scrollY / fadeDistance, 0, 1);

  const albumTrigger = document.querySelector('.album-section') || albumSentinelRef.value;
  if (albumTrigger) {
    const sectionTop = albumTrigger.offsetTop;
    const viewportHeight = window.innerHeight;
    const preludeDistance = viewportHeight * 0.72;
    const avatarDistance = viewportHeight * 0.18;
    const storyStart = sectionTop - preludeDistance;
    const phaseOneEnd = sectionTop - avatarDistance;
    const phaseTwoEnd = sectionTop;
    const currentY = window.scrollY;

    if (currentY <= storyStart) {
      albumStoryProgress.value = 0;
      return;
    }

    if (currentY < phaseOneEnd) {
      const phaseOneProgress = (currentY - storyStart) / Math.max(phaseOneEnd - storyStart, 1);
      albumStoryProgress.value = phaseOneProgress * 0.3;
      return;
    }

    if (currentY < phaseTwoEnd) {
      const phaseTwoProgress = (currentY - phaseOneEnd) / Math.max(phaseTwoEnd - phaseOneEnd, 1);
      albumStoryProgress.value = 0.3 + phaseTwoProgress * 0.35;
      return;
    }

    albumStoryProgress.value = 0.65;
  }
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
};

const scheduleAlbumLoad = () => {
  if (shouldLoadAlbum.value) return;

  const sentinel = albumSentinelRef.value;
  if (!sentinel || !('IntersectionObserver' in window)) {
    albumLoadTimer = window.setTimeout(loadAlbumSection, 5000);
    return;
  }

  albumObserver = new IntersectionObserver((entries) => {
    if (entries.some((entry) => entry.isIntersecting)) {
      loadAlbumSection();
    }
  }, {
    rootMargin: '520px 0px'
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
  overflow-x: clip;
}

.album-load-sentinel {
  position: relative;
  min-height: 42svh;
  overflow: hidden;
  background:
    radial-gradient(circle at 50% 8%, rgba(78, 156, 190, 0.12), transparent 30%),
    radial-gradient(circle at 50% 28%, rgba(44, 110, 145, 0.1), transparent 40%),
    linear-gradient(
      180deg,
      rgba(28, 82, 114, 0.12) 0%,
      rgba(20, 64, 94, 0.22) 14%,
      rgba(14, 48, 74, 0.38) 28%,
      rgba(10, 36, 58, 0.56) 42%,
      rgba(7, 26, 42, 0.72) 56%,
      rgba(4, 18, 30, 0.86) 70%,
      rgba(3, 11, 19, 0.94) 84%,
      #02070c 100%
    );
}

.album-load-sentinel::before {
  content: none;
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
