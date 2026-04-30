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
          <div class="center-avatar" :class="{ 'is-empty': avatarMissing }">
            <img
              v-show="!avatarMissing"
              :src="avatarSrc"
              alt="Profile"
              @load="handleAvatarLoad"
              @error="handleAvatarError"
            >

            <div v-if="avatarMissing" class="center-avatar-placeholder">
              <span>Upload Image</span>
              <small>public/avatar/profile-photo.jpg</small>
            </div>
          </div>

          <p class="welcome-copy">
            <span class="welcome-line">Welcome, I am</span>
            <span class="welcome-name">chenkanghong</span>
          </p>
        </div>
      </template>
    </MouseTrailEffect>
  </section>
</template>

<script setup>
import { ref } from 'vue';
import MouseTrailEffect from '../../../../components/MouseTrailEffect.vue';
import { profileAvatarSrc as avatarSrc } from '../../content/siteContent';

defineProps({
  fadeStyle: {
    type: Object,
    default: () => ({})
  }
});

defineEmits(['scroll-hint']);

const avatarMissing = ref(false);

const handleAvatarLoad = () => {
  avatarMissing.value = false;
};

const handleAvatarError = () => {
  avatarMissing.value = true;
};
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
  top: 41%;
  width: min(88vw, 28rem);
}

.mouse-trail-sticky :deep(.trail-scroll-hint) {
  bottom: clamp(18px, 4vh, 28px);
}

.center-avatar-shell {
  display: grid;
  place-items: center;
  gap: 1rem;
  width: min(88vw, 28rem);
  margin: 0 auto;
  contain: layout paint;
}

.center-avatar {
  position: relative;
  width: 8rem;
  aspect-ratio: 1;
  overflow: hidden;
  border: 2px solid rgba(201, 251, 255, 0.92);
  border-radius: 50%;
  background:
    radial-gradient(circle at 35% 30%, rgba(84, 233, 255, 0.24), transparent 38%),
    rgba(4, 15, 22, 0.88);
  box-shadow:
    0 0 0 1px rgba(122, 243, 255, 0.12),
    0 0 24px rgba(43, 226, 255, 0.22);
}

.center-avatar::after {
  position: absolute;
  inset: 0;
  content: '';
  border-radius: inherit;
  background: linear-gradient(180deg, rgba(255, 255, 255, 0.12), transparent 28%, transparent 72%, rgba(88, 227, 255, 0.14));
  pointer-events: none;
}

.center-avatar img {
  display: block;
  width: 100%;
  height: 100%;
  object-fit: cover;
  object-position: 60% center;
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

.welcome-copy {
  margin: 0;
  color: #fff;
  font-family: 'Trebuchet MS', 'Segoe UI', Arial, sans-serif;
  font-size: 1.55rem;
  font-weight: 800;
  line-height: 1.2;
  letter-spacing: 0;
  text-align: center;
  text-shadow:
    0 0 8px rgba(255, 255, 255, 0.82),
    0 0 20px rgba(112, 235, 255, 0.58),
    0 0 42px rgba(41, 229, 255, 0.26);
  white-space: nowrap;
}

.welcome-line,
.welcome-name {
  display: inline;
}

.welcome-name {
  margin-left: 0.32em;
}

@media (max-width: 768px) {
  .center-avatar-shell {
    gap: 0.8rem;
    width: min(88vw, 19rem);
  }

  .center-avatar {
    width: clamp(7.6rem, 29vw, 8.9rem);
  }

  .mouse-trail-sticky :deep(.trail-copy) {
    top: 42%;
    width: min(88vw, 19rem);
  }

  .welcome-copy {
    width: min(88vw, 12ch);
    margin-inline: auto;
    font-size: clamp(1.55rem, 6vw, 1.95rem);
    line-height: 1.08;
    white-space: normal;
  }

  .welcome-line,
  .welcome-name {
    display: block;
  }

  .welcome-name {
    margin-left: 0;
  }
}

@media (max-width: 480px) {
  .center-avatar-shell {
    width: min(90vw, 17rem);
  }

  .center-avatar {
    width: 7.35rem;
  }

  .welcome-copy {
    width: min(90vw, 11ch);
    font-size: 1.48rem;
  }
}
</style>
