<template>
  <section class="mouse-trail-scroll-stage">
    <MouseTrailEffect
      class="mouse-trail-sticky"
      :style="[fadeStyle, heroUiStyle]"
      :show-scroll-hint="true"
      :show-copy="true"
      :dissolve-on-scroll="false"
      @scroll-hint="$emit('scroll-hint')"
    >
      <template #default>
        <div class="center-avatar-shell">
          <div class="hero-stage-copy">
            <h1 class="hero-title" :style="heroTitleStyle">
              <span>Hi!</span>
              <span>Welcome to Chen Kanghong's Tech Blog</span>
            </h1>
          </div>

          <div class="avatar-stage" :style="avatarStageStyle">
            <div
              class="center-avatar"
              :class="{ 'is-empty': avatarMissing }"
              :style="avatarCoinStyle"
            >
              <picture v-show="!avatarMissing">
                <source :srcset="avatarWebpSrc" type="image/webp">
                <img
                  :src="avatarSrc"
                  alt="Profile"
                  width="256"
                  height="256"
                  fetchpriority="high"
                  decoding="async"
                  @load="handleAvatarLoad"
                  @error="handleAvatarError"
                >
              </picture>

              <div v-if="avatarMissing" class="center-avatar-placeholder">
                <span>Upload Image</span>
                <small>public/avatar/profile-photo.jpg</small>
              </div>
            </div>

            <div class="stage-platform" aria-hidden="true"></div>
          </div>
        </div>
      </template>
    </MouseTrailEffect>
  </section>
</template>

<script setup>
import { computed, onBeforeUnmount, onMounted, ref } from 'vue';
import MouseTrailEffect from '../../../../components/MouseTrailEffect.vue';
import {
  profileAvatarSrc as avatarSrc,
  profileAvatarWebpSrc as avatarWebpSrc
} from '../../content/assetContent';

const props = defineProps({
  fadeStyle: {
    type: Object,
    default: () => ({})
  },
  scrollProgress: {
    type: Number,
    default: 0
  }
});

defineEmits(['scroll-hint']);

const avatarMissing = ref(false);
const titlePointer = ref({ x: 0, y: 0 });

const handleAvatarLoad = () => {
  avatarMissing.value = false;
};

const handleAvatarError = () => {
  avatarMissing.value = true;
};

const handleTitlePointerMove = (event) => {
  const width = window.innerWidth || 1;
  const height = window.innerHeight || 1;

  titlePointer.value = {
    x: clamp((event.clientX / width - 0.5) * 2, -1, 1),
    y: clamp((event.clientY / height - 0.5) * 2, -1, 1)
  };
};

const clamp = (value, min, max) => Math.min(max, Math.max(min, value));
const smoothstep = (value) => value * value * (3 - 2 * value);

const avatarCoinStyle = computed(() => {
  const progress = clamp(props.scrollProgress, 0, 1);
  const fadeProgress = clamp((progress - 0.68) / 0.18, 0, 1);
  const motion = smoothstep(fadeProgress);

  return {
    transform: `translate3d(0, 0, ${motion * 4}rem) rotateX(${motion * 1080}deg) scale(${1 - motion * 0.32})`
  };
});

const avatarStageStyle = computed(() => {
  const progress = clamp(props.scrollProgress, 0, 1);
  const motion = smoothstep(clamp((progress - 0.68) / 0.18, 0, 1));

  return {
    opacity: 1 - motion,
    transform: `translate3d(0, ${motion * 32}vh, 0) scale(${1 - motion * 0.18})`
  };
});

const heroTitleStyle = computed(() => {
  const { x, y } = titlePointer.value;
  const progress = clamp(props.scrollProgress, 0, 1);
  const exit = smoothstep(clamp((progress - 0.55) / 0.17, 0, 1));

  return {
    opacity: 1 - exit,
    transform: [
      `translate3d(${x * 18}px, ${y * 8 - exit * 12}px, 0)`,
      `rotateX(${y * -2.5}deg)`,
      `rotateY(${x * 4.5}deg)`
    ].join(' '),
    textShadow: [
      `${x * -6}px ${y * -3}px 10px rgba(255, 255, 255, 0.95)`,
      '0 0 16px rgba(168, 245, 255, 0.5)'
    ].join(', ')
  };
});

const heroUiStyle = computed(() => {
  const effectsExit = smoothstep(clamp((props.scrollProgress - 0.55) / 0.17, 0, 1));
  const surfaceExit = smoothstep(clamp((props.scrollProgress - 0.55) / 0.31, 0, 1));
  return {
    '--hero-hint-opacity': `${1 - effectsExit}`,
    '--hero-effects-opacity': `${1 - effectsExit * 0.55}`,
    '--hero-surface-opacity': `${1 - surfaceExit * 0.92}`
  };
});

onMounted(() => {
  window.addEventListener('pointermove', handleTitlePointerMove, { passive: true });
});

onBeforeUnmount(() => {
  window.removeEventListener('pointermove', handleTitlePointerMove);
});
</script>

<style scoped>
.mouse-trail-scroll-stage {
  position: relative;
  z-index: 2;
  height: 186svh;
  min-height: 186svh;
}

.mouse-trail-sticky {
  position: sticky;
  top: 0;
  transition: opacity 0.12s linear, transform 0.12s linear;
  will-change: opacity, transform;
  background: rgba(2, 7, 12, var(--hero-surface-opacity, 1)) !important;
}

.mouse-trail-sticky :deep(.trail-canvas) {
  opacity: var(--hero-effects-opacity, 1);
  transition: opacity 0.12s linear;
}

.mouse-trail-sticky :deep(.trail-copy) {
  top: 48%;
  width: min(88vw, 30rem);
}

.mouse-trail-sticky :deep(.trail-scroll-hint) {
  bottom: clamp(18px, 4vh, 28px);
  opacity: var(--hero-hint-opacity, 1);
  transition: opacity 0.16s linear, box-shadow 0.2s ease;
}

.center-avatar-shell {
  display: grid;
  place-items: center;
  gap: clamp(0.35rem, 1.1vh, 0.75rem);
  width: min(88vw, 30rem);
  margin: 0 auto;
  overflow: visible;
  contain: layout;
  perspective: 64rem;
}

.hero-stage-copy {
  display: grid;
  justify-items: center;
  gap: 0.25rem;
  width: 100%;
  text-align: center;
}

.hero-title {
  display: grid;
  gap: 0.18rem;
  width: min(100%, 28rem);
  margin: 0;
  color: #ffffff;
  font-family: 'Inter', 'Noto Sans SC', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
  font-size: clamp(2.05rem, 4.2vw, 3.45rem);
  font-weight: 800;
  line-height: 1.02;
  letter-spacing: 0;
  transform-style: preserve-3d;
  transition: opacity 0.12s linear, transform 0.12s ease-out, text-shadow 0.12s ease-out;
  text-shadow:
    0 0 8px rgba(255, 255, 255, 0.95),
    0 0 20px rgba(168, 245, 255, 0.45);
  will-change: transform, text-shadow;
}

@media (prefers-reduced-motion: reduce) {
  .hero-title,
  .center-avatar {
    transition: none;
  }
}

.hero-title span {
  display: block;
  max-width: 100%;
}

.hero-title span:last-child {
  color: #c9fbff;
  font-size: clamp(0.86rem, 1.45vw, 1.06rem);
  font-weight: 700;
  line-height: 1.24;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  text-shadow:
    0 0 6px rgba(168, 245, 255, 0.75),
    0 0 14px rgba(64, 223, 255, 0.3);
}

.avatar-stage {
  position: relative;
  display: grid;
  place-items: center;
  width: clamp(9.5rem, 16vw, 12.5rem);
  height: clamp(8rem, 14vw, 10.8rem);
  isolation: isolate;
  perspective: 58rem;
  transform-style: preserve-3d;
  will-change: opacity, transform;
}

.avatar-stage::before {
  position: absolute;
  inset: 42% 10% 4%;
  z-index: 0;
  content: '';
  border-radius: 50%;
  background:
    radial-gradient(ellipse at 50% 26%, rgba(255, 255, 255, 0.28), transparent 26%),
    radial-gradient(ellipse at 50% 52%, rgba(182, 244, 255, 0.18), transparent 40%),
    radial-gradient(ellipse at 50% 78%, rgba(105, 226, 255, 0.14), transparent 64%);
  filter: blur(12px);
  pointer-events: none;
}

.center-avatar {
  position: relative;
  z-index: 2;
  width: clamp(4.9rem, 7.5vw, 6.2rem);
  aspect-ratio: 1;
  overflow: hidden;
  box-sizing: border-box;
  padding: clamp(0.24rem, 0.45vw, 0.35rem);
  border: 1px solid rgba(220, 252, 255, 0.78);
  border-radius: 50%;
  background:
    radial-gradient(circle at 33% 25%, rgba(255, 255, 255, 0.5), transparent 28%),
    radial-gradient(circle at 70% 82%, rgba(122, 243, 255, 0.16), transparent 44%),
    rgba(255, 255, 255, 0.08);
  isolation: isolate;
  box-shadow:
    inset 0 1px 0 rgba(255, 255, 255, 0.82),
    inset 5px 7px 16px rgba(255, 255, 255, 0.22),
    inset -7px -9px 18px rgba(0, 18, 28, 0.38),
    0 1px 0 rgba(255, 255, 255, 0.64),
    0 9px 20px rgba(0, 18, 28, 0.34),
    0 0 16px rgba(255, 255, 255, 0.2),
    0 0 30px rgba(122, 243, 255, 0.24);
  backdrop-filter: blur(10px) saturate(1.18);
  transform-origin: 50% 50%;
  transform-style: preserve-3d;
  will-change: opacity, transform;
}

.center-avatar::before {
  position: absolute;
  inset: 3px 4px auto;
  z-index: 2;
  height: 42%;
  content: '';
  border-radius: 50% 50% 42% 42%;
  background: linear-gradient(180deg, rgba(255, 255, 255, 0.62), rgba(255, 255, 255, 0.08) 72%, transparent);
  filter: blur(0.2px);
  opacity: 0.58;
  pointer-events: none;
}

.center-avatar::after {
  position: absolute;
  inset: 0;
  z-index: 3;
  content: '';
  border-radius: inherit;
  background:
    radial-gradient(circle at 30% 24%, rgba(255, 255, 255, 0.88) 0 2px, transparent 3px),
    radial-gradient(circle at 72% 76%, rgba(255, 255, 255, 0.2), transparent 28%),
    linear-gradient(145deg, rgba(255, 255, 255, 0.5), transparent 18% 66%, rgba(255, 255, 255, 0.26)),
    linear-gradient(180deg, rgba(255, 255, 255, 0.18), rgba(255, 255, 255, 0.03) 44%, rgba(0, 24, 34, 0.18));
  box-shadow:
    inset 0 0 0 1px rgba(255, 255, 255, 0.6),
    inset 0 -4px 0 rgba(255, 255, 255, 0.55),
    inset 0 4px 9px rgba(255, 255, 255, 0.24);
  mix-blend-mode: screen;
  pointer-events: none;
}

.center-avatar picture,
.center-avatar img {
  display: block;
  width: 100%;
  height: 100%;
}

.center-avatar picture {
  position: relative;
  z-index: 1;
  overflow: hidden;
  border-radius: inherit;
  box-shadow:
    0 0 0 1px rgba(255, 255, 255, 0.16),
    inset 0 0 0 1px rgba(255, 255, 255, 0.18);
}

.center-avatar img {
  border-radius: inherit;
  object-fit: cover;
  object-position: 60% center;
}

.stage-platform {
  position: absolute;
  bottom: clamp(0.28rem, 0.9vw, 0.62rem);
  left: 50%;
  z-index: 1;
  width: 62%;
  height: clamp(0.72rem, 1.9vw, 1.22rem);
  border: 1px solid rgba(216, 252, 255, 0.32);
  border-radius: 50%;
  background:
    radial-gradient(ellipse at 50% 36%, rgba(245, 254, 255, 0.5), transparent 26%),
    radial-gradient(ellipse at 50% 60%, rgba(87, 226, 255, 0.26), rgba(2, 17, 25, 0.48) 64%, transparent 73%);
  box-shadow:
    inset 0 1px 0 rgba(255, 255, 255, 0.45),
    0 0 16px rgba(92, 232, 255, 0.3),
    0 12px 22px rgba(0, 0, 0, 0.36);
  transform: translateX(-50%) perspective(18rem) rotateX(58deg);
}

.center-avatar-placeholder {
  position: absolute;
  inset: 0;
  display: grid;
  place-items: center;
  gap: 0.45rem;
  padding: 1.4rem;
  color: rgba(232, 252, 255, 0.95);
  text-align: center;
}

.center-avatar-placeholder span {
  font-size: clamp(1rem, 1.8vw, 1.35rem);
  font-weight: 700;
  line-height: 1.2;
}

.center-avatar-placeholder small {
  display: block;
  max-width: 16rem;
  font-size: clamp(0.72rem, 1.2vw, 0.85rem);
  line-height: 1.45;
  white-space: normal;
  word-break: break-word;
  opacity: 0.78;
}

@media (max-width: 768px) {
  .center-avatar-shell {
    gap: 0.45rem;
    width: min(86vw, 18rem);
  }

  .hero-title {
    width: min(100%, 17rem);
    font-size: clamp(1.48rem, 6.4vw, 1.95rem);
    line-height: 1.04;
  }

  .hero-title span:last-child {
    font-size: clamp(0.64rem, 2.65vw, 0.82rem);
    line-height: 1.35;
  }

  .avatar-stage {
    width: min(52vw, 10.2rem);
    height: 7.9rem;
  }

  .center-avatar {
    width: clamp(4.7rem, 21vw, 5.6rem);
  }

  .mouse-trail-sticky :deep(.trail-copy) {
    top: 46%;
    width: min(86vw, 18rem);
  }
}

@media (max-width: 480px) {
  .center-avatar-shell {
    width: min(92vw, 20rem);
  }

  .avatar-stage {
    height: 13.4rem;
  }

  .center-avatar {
    width: 9.2rem;
  }
}
</style>
