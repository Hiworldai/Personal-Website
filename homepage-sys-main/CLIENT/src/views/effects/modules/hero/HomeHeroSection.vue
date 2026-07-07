<template>
  <section class="mouse-trail-scroll-stage">
    <MouseTrailEffect
      class="mouse-trail-sticky"
      :style="fadeStyle"
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

          <div class="avatar-stage">
            <div class="stage-light-rig" aria-hidden="true"></div>

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
  const motion = smoothstep(progress);
  const fadeProgress = clamp((progress - 0.62) / 0.38, 0, 1);
  const fade = smoothstep(fadeProgress);

  return {
    opacity: 1 - fade,
    transform: [
      `translate3d(0, ${motion * 42}vh, ${motion * 4}rem)`,
      `rotateX(${motion * 1080}deg)`,
      `scale(${1 - fade * 0.56})`
    ].join(' ')
  };
});

const heroTitleStyle = computed(() => {
  const { x, y } = titlePointer.value;

  return {
    transform: [
      `translate3d(${x * 18}px, ${y * 8}px, 0)`,
      `rotateX(${y * -2.5}deg)`,
      `rotateY(${x * 4.5}deg)`
    ].join(' '),
    textShadow: [
      `${x * -6}px ${y * -3}px 10px rgba(255, 255, 255, 0.95)`,
      '0 0 16px rgba(168, 245, 255, 0.5)'
    ].join(', ')
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
  height: 100svh;
  min-height: 100svh;
}

.mouse-trail-sticky {
  position: sticky;
  top: 0;
  transition: opacity 0.08s linear, filter 0.08s linear, transform 0.08s linear;
  will-change: opacity, filter, transform;
}

.mouse-trail-sticky :deep(.trail-copy) {
  top: 50%;
  width: min(92vw, 42rem);
}

.mouse-trail-sticky :deep(.trail-scroll-hint) {
  bottom: clamp(18px, 4vh, 28px);
}

.center-avatar-shell {
  display: grid;
  place-items: center;
  gap: clamp(0.8rem, 2vh, 1.25rem);
  width: min(92vw, 42rem);
  margin: 0 auto;
  overflow: visible;
  contain: layout;
  perspective: 64rem;
}

.hero-stage-copy {
  display: grid;
  justify-items: center;
  gap: 0.5rem;
  width: 100%;
  text-align: center;
}

.hero-title {
  display: grid;
  gap: 0.32rem;
  width: min(100%, 40rem);
  margin: 0;
  color: #ffffff;
  font-family: 'Inter', 'Noto Sans SC', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
  font-size: clamp(2.05rem, 4.2vw, 3.45rem);
  font-weight: 800;
  line-height: 1.02;
  letter-spacing: 0;
  transform-style: preserve-3d;
  transition: transform 0.12s ease-out, text-shadow 0.12s ease-out;
  text-shadow:
    0 0 8px rgba(255, 255, 255, 0.95),
    0 0 20px rgba(168, 245, 255, 0.45);
  will-change: transform, text-shadow;
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
  width: clamp(18rem, 31vw, 24rem);
  height: clamp(15.5rem, 27vw, 21rem);
  isolation: isolate;
  perspective: 58rem;
  transform-style: preserve-3d;
}

.avatar-stage::before {
  position: absolute;
  inset: 38% 8% 2%;
  z-index: 0;
  content: '';
  border-radius: 50%;
  background:
    radial-gradient(ellipse at 50% 26%, rgba(255, 255, 255, 0.28), transparent 26%),
    radial-gradient(ellipse at 50% 52%, rgba(182, 244, 255, 0.18), transparent 40%),
    radial-gradient(ellipse at 50% 78%, rgba(105, 226, 255, 0.14), transparent 64%);
  filter: blur(20px);
  pointer-events: none;
}

.stage-light-rig {
  position: absolute;
  top: -46vh;
  left: 50%;
  z-index: 1;
  width: min(132vw, 88rem);
  height: 70vh;
  pointer-events: none;
  overflow: visible;
  background:
    radial-gradient(ellipse at 50% 0%, rgba(255, 255, 255, 0.34), transparent 15%),
    linear-gradient(103deg, transparent 0 30%, rgba(160, 236, 255, 0.08) 42%, rgba(255, 255, 255, 0.3) 50%, rgba(160, 236, 255, 0.1) 58%, transparent 70%),
    linear-gradient(77deg, transparent 0 31%, rgba(160, 236, 255, 0.06) 43%, rgba(255, 255, 255, 0.22) 51%, rgba(160, 236, 255, 0.08) 59%, transparent 72%);
  clip-path: polygon(36% 0, 64% 0, 82% 100%, 18% 100%);
  filter: blur(10px);
  mix-blend-mode: screen;
  opacity: 0.82;
  transform: translateX(-50%);
}

.stage-light-rig::before {
  position: absolute;
  top: 0;
  left: 50%;
  width: 20%;
  height: 100%;
  content: '';
  background:
    radial-gradient(ellipse at 50% 0%, rgba(255, 255, 255, 0.56), transparent 13%),
    linear-gradient(180deg, rgba(255, 255, 255, 0.34), rgba(210, 250, 255, 0.2) 34%, rgba(255, 255, 255, 0.07) 74%, transparent);
  clip-path: polygon(44% 0, 56% 0, 100% 100%, 0 100%);
  filter: blur(8px);
  mix-blend-mode: screen;
  opacity: 0.96;
  transform: translateX(-50%);
}

.stage-light-rig::after {
  position: absolute;
  right: 28%;
  bottom: -4vh;
  left: 28%;
  height: 16vh;
  content: '';
  border-radius: 50%;
  background: radial-gradient(ellipse at 50% 50%, rgba(255, 255, 255, 0.3), rgba(161, 241, 255, 0.16) 34%, transparent 68%);
  filter: blur(12px);
  mix-blend-mode: screen;
  opacity: 0.74;
}

.center-avatar {
  position: relative;
  z-index: 2;
  width: clamp(9.8rem, 15vw, 12.4rem);
  aspect-ratio: 1;
  overflow: hidden;
  box-sizing: border-box;
  padding: clamp(0.48rem, 0.9vw, 0.7rem);
  border: 1px solid rgba(220, 252, 255, 0.78);
  border-radius: 50%;
  background:
    radial-gradient(circle at 33% 25%, rgba(255, 255, 255, 0.5), transparent 28%),
    radial-gradient(circle at 70% 82%, rgba(122, 243, 255, 0.16), transparent 44%),
    rgba(255, 255, 255, 0.08);
  isolation: isolate;
  box-shadow:
    inset 0 1px 0 rgba(255, 255, 255, 0.82),
    inset 10px 14px 30px rgba(255, 255, 255, 0.22),
    inset -14px -18px 34px rgba(0, 18, 28, 0.38),
    0 1px 0 rgba(255, 255, 255, 0.64),
    0 18px 38px rgba(0, 18, 28, 0.36),
    0 0 28px rgba(255, 255, 255, 0.22),
    0 0 52px rgba(122, 243, 255, 0.28);
  backdrop-filter: blur(14px) saturate(1.18);
  transform-origin: 50% 50%;
  transform-style: preserve-3d;
  will-change: opacity, transform;
}

.center-avatar::before {
  position: absolute;
  inset: 5px 7px auto;
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
  bottom: clamp(0.55rem, 1.8vw, 1.25rem);
  left: 50%;
  z-index: 1;
  width: 66%;
  height: clamp(1.45rem, 3.8vw, 2.45rem);
  border: 1px solid rgba(216, 252, 255, 0.32);
  border-radius: 50%;
  background:
    radial-gradient(ellipse at 50% 36%, rgba(245, 254, 255, 0.5), transparent 26%),
    radial-gradient(ellipse at 50% 60%, rgba(87, 226, 255, 0.26), rgba(2, 17, 25, 0.48) 64%, transparent 73%);
  box-shadow:
    inset 0 1px 0 rgba(255, 255, 255, 0.45),
    0 0 28px rgba(92, 232, 255, 0.34),
    0 24px 42px rgba(0, 0, 0, 0.4);
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
    gap: 0.9rem;
    width: min(90vw, 24rem);
  }

  .hero-title {
    width: min(100%, 20rem);
    font-size: clamp(1.62rem, 7vw, 2.2rem);
    line-height: 1.04;
  }

  .hero-title span:last-child {
    font-size: clamp(0.64rem, 2.65vw, 0.82rem);
    line-height: 1.35;
  }

  .avatar-stage {
    width: min(90vw, 19.5rem);
    height: 15.2rem;
  }

  .center-avatar {
    width: clamp(9.4rem, 42vw, 11.2rem);
  }

  .mouse-trail-sticky :deep(.trail-copy) {
    top: 47%;
    width: min(90vw, 24rem);
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
