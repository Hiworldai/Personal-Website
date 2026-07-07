<template>
  <section id="experience-section" ref="sectionRef" class="journey-section" aria-labelledby="experience-title">
    <nav class="journey-nav" aria-label="Train journey navigation">
      <a href="#experience-title" class="journey-brand">Train Journey</a>
      <div class="journey-nav-links">
        <a v-for="item in journeyNavItems" :key="item.href" :href="item.href">
          {{ item.label }}
        </a>
      </div>
    </nav>

    <div ref="runwayRef" class="journey-runway">
      <div class="journey-stage">
        <div class="journey-progress" aria-hidden="true">
          <span class="journey-progress-track"></span>
          <span class="journey-progress-fill" :style="journeyProgressStyle"></span>
        </div>

        <div class="scene-stack" aria-hidden="true">
          <div
            v-for="(scene, index) in journeyScenes"
            :key="scene.key"
            class="scene-layer"
            :class="`scene-layer-${index + 1}`"
            :style="getSceneStyle(index)"
          >
            <div class="scene-image" :style="{ backgroundImage: `url(${scene.image})` }"></div>
          </div>

          <div class="scene-night-shade" :style="nightShadeStyle"></div>
          <div class="scene-warmth" :style="warmthStyle"></div>
          <div class="scene-lift" :style="skyLiftStyle"></div>
          <div class="scene-fog"></div>
        </div>

        <div class="journey-overlay">
          <header
            :id="journeyPanels[0].id"
            class="journey-panel journey-hero-panel"
            :style="getPanelStyle(0, 0.22, -42, 18, true)"
          >
            <p class="journey-kicker">{{ journeyPanels[0].kicker }}</p>
            <h2>{{ journeyPanels[0].title }}</h2>
            <p class="journey-summary">{{ journeyPanels[0].body }}</p>
          </header>

          <section
            :id="journeyPanels[1].id"
            class="journey-panel journey-story-panel"
            :style="getPanelStyle(0.16, 0.42, -34, 22)"
          >
            <p class="journey-kicker">{{ journeyPanels[1].kicker }}</p>
            <h3>{{ journeyPanels[1].title }}</h3>
            <p>{{ journeyPanels[1].body }}</p>
          </section>

          <section
            :id="journeyPanels[2].id"
            class="journey-panel journey-day-panel"
            :style="getPanelStyle(0.36, 0.68, 34, 22)"
          >
            <div class="journey-day-copy">
              <p class="journey-kicker">{{ journeyPanels[2].kicker }}</p>
              <h3>{{ journeyPanels[2].title }}</h3>
              <p>{{ journeyPanels[2].body }}</p>
            </div>

            <div class="journey-card-grid">
              <article v-for="card in journeyCards" :key="card.index" class="journey-card">
                <span class="journey-card-index">{{ card.index }}</span>
                <h4>{{ card.title }}</h4>
                <p>{{ card.description }}</p>
              </article>
            </div>
          </section>

          <section
            :id="journeyPanels[3].id"
            class="journey-panel journey-sunset-panel"
            :style="getPanelStyle(0.62, 0.88, 0, 24)"
          >
            <p class="journey-kicker">{{ journeyPanels[3].kicker }}</p>
            <h3>{{ journeyPanels[3].title }}</h3>
            <p>{{ journeyPanels[3].body }}</p>
          </section>

          <section
            :id="journeyPanels[4].id"
            class="journey-panel journey-outro-panel"
            :style="getPanelStyle(0.8, 1, 0, 28)"
          >
            <p class="journey-kicker">{{ journeyPanels[4].kicker }}</p>
            <h3>{{ journeyPanels[4].title }}</h3>
            <p>{{ journeyPanels[4].body }}</p>
          </section>
        </div>
      </div>
    </div>

    <div class="journey-dock">
      <section class="journey-contact-panel">
        <div class="journey-contact-copy">
          <p class="journey-kicker">Contact</p>
          <h3>继续这一段旅程</h3>
          <p>如果你想交流网页叙事、前端实现、AI 应用，或者只是想聊聊这段火车旅程的视觉氛围，都可以从这里找到我。</p>
        </div>

        <div class="journey-contact-links" aria-label="Contact links">
          <component
            :is="item.href ? 'a' : 'div'"
            v-for="item in contactLinkItems"
            :key="item.label"
            class="journey-contact-link"
            :href="item.href || undefined"
            :target="getContactTarget(item.href)"
            :rel="getContactRel(item.href)"
            :aria-label="`${item.label}: ${item.value || item.href}`"
          >
            <strong>{{ item.label }}</strong>
            <small>{{ item.value || item.href }}</small>
          </component>
        </div>
      </section>

      <section id="guestbook-card" class="journey-guestbook-panel" aria-labelledby="guestbook-title">
        <div class="journey-guestbook-copy">
          <p class="journey-kicker">Guestbook</p>
          <h3 id="guestbook-title">{{ guestbookCopy.title }}</h3>
          <p>{{ guestbookCopy.description }}</p>
        </div>

        <form class="journey-guestbook-form" @submit.prevent="submitGuestbook">
          <label class="journey-field">
            <span>{{ guestbookCopy.fields.email }}</span>
            <input
              v-model.trim="guestbookForm.email"
              type="email"
              :placeholder="guestbookCopy.placeholders.email"
              required
            >
          </label>

          <label class="journey-field journey-field-message">
            <span>{{ guestbookCopy.fields.message }}</span>
            <textarea
              v-model.trim="guestbookForm.message"
              :placeholder="guestbookCopy.placeholders.message"
              :maxlength="guestbookCopy.messageMaxLength"
              rows="6"
              required
            ></textarea>
          </label>

          <div class="journey-form-actions">
            <button class="journey-button is-primary" type="submit" :disabled="isSubmitting">
              {{ isSubmitting ? '发送中...' : guestbookCopy.submit }}
            </button>
            <p v-if="guestbookCopy.note" class="journey-form-note">{{ guestbookCopy.note }}</p>
            <p
              v-if="guestbookStatus"
              class="journey-form-status"
              :class="{
                'is-success': guestbookStatusType === 'success',
                'is-error': guestbookStatusType === 'error'
              }"
            >
              {{ guestbookStatus }}
            </p>
          </div>
        </form>
      </section>
    </div>
  </section>
</template>

<script setup>
import { computed, onBeforeUnmount, onMounted, ref } from 'vue';
import {
  contactLinkItems,
  guestbookCopy,
  journeyCards,
  journeyNavItems,
  journeyPanels,
  journeyScenes
} from '../../content/experienceContent';

const guestbookForm = ref({
  email: '',
  message: ''
});

const guestbookStatus = ref('');
const guestbookStatusType = ref('');
const isSubmitting = ref(false);
const runwayRef = ref(null);
const scrollProgress = ref(0);
const prefersReducedMotion = ref(false);

const clamp = (value, min, max) => Math.min(max, Math.max(min, value));
const easeInOutCubic = (value) => (value < 0.5
  ? 4 * value * value * value
  : 1 - Math.pow(-2 * value + 2, 3) / 2);

const getSegmentProgress = (start, end, value = scrollProgress.value) => {
  if (end <= start) return value >= end ? 1 : 0;
  return clamp((value - start) / (end - start), 0, 1);
};

const getSceneOpacity = (index) => {
  const progress = scrollProgress.value;

  if (index === 0) {
    return clamp(1 - getSegmentProgress(0.16, 0.34, progress), 0, 1);
  }

  const windows = [
    { start: 0, end: 0.2 },
    { start: 0.14, end: 0.42 },
    { start: 0.34, end: 0.68 },
    { start: 0.58, end: 0.88 },
    { start: 0.8, end: 1 }
  ];
  const { start, end } = windows[index];
  const enter = getSegmentProgress(start, start + (end - start) * 0.36, progress);
  const exit = 1 - getSegmentProgress(start + (end - start) * 0.6, end, progress);

  return clamp(Math.min(enter, exit), 0, 1);
};

const getSceneStyle = (index) => {
  const opacity = prefersReducedMotion.value ? (index === 0 ? 1 : 0) : getSceneOpacity(index);
  const progress = scrollProgress.value;
  const offset = [0, -6, -3, 0, 0][index];
  const scale = [1.08, 1.12, 1.06, 1.04, 1.12][index];
  const yShift = [0, -2, -4, -3, -10][index];
  const xShift = [
    0,
    -12 * getSegmentProgress(0.16, 0.42, progress),
    -4 * getSegmentProgress(0.34, 0.68, progress),
    3 * getSegmentProgress(0.62, 0.86, progress),
    0
  ][index];
  const motionScale = scale - getSegmentProgress(0, 1, progress) * 0.03;

  return {
    opacity,
    transform: `translate3d(${offset + xShift}%, ${yShift}%, 0) scale(${motionScale})`
  };
};

const getPanelStyle = (start, end, x = 0, y = 18, immediate = false) => {
  if (prefersReducedMotion.value) {
    return {
      opacity: 1,
      transform: 'translate3d(0, 0, 0)'
    };
  }

  const enterEnd = start + (end - start) * 0.28;
  const exitStart = start + (end - start) * 0.72;
  const enter = immediate ? 1 : getSegmentProgress(start, enterEnd);
  const exit = end >= 0.995 ? 1 : 1 - getSegmentProgress(exitStart, end);
  const opacity = clamp(Math.min(enter, exit), 0, 1);
  const eased = easeInOutCubic(opacity);

  return {
    opacity,
    transform: `translate3d(${(1 - eased) * x}px, ${(1 - eased) * y}px, 0)`
  };
};

const journeyProgressStyle = computed(() => ({
  transform: `scaleY(${clamp(scrollProgress.value, 0.01, 1)})`
}));

const nightShadeStyle = computed(() => ({
  opacity: prefersReducedMotion.value ? 0.42 : 0.58 - getSegmentProgress(0.08, 0.42) * 0.5
}));

const warmthStyle = computed(() => {
  const warmth = getSegmentProgress(0.56, 0.86);
  return {
    opacity: warmth * 0.72
  };
});

const skyLiftStyle = computed(() => {
  const lift = prefersReducedMotion.value ? 0 : getSegmentProgress(0.84, 1);
  return {
    transform: `translate3d(0, ${-lift * 16}%, 0) scale(${1 + lift * 0.08})`,
    opacity: 0.18 + lift * 0.42
  };
});

const isHttpLink = (href) => /^https?:\/\//i.test(href || '');
const getContactTarget = (href) => (isHttpLink(href) ? '_blank' : undefined);
const getContactRel = (href) => (isHttpLink(href) ? 'noopener noreferrer' : undefined);

const submitGuestbook = async () => {
  const email = guestbookForm.value.email.trim();
  const message = guestbookForm.value.message.trim();

  if (!email || !message) {
    guestbookStatusType.value = 'error';
    guestbookStatus.value = '请先填写邮箱和留言内容。';
    return;
  }

  isSubmitting.value = true;
  guestbookStatusType.value = '';
  guestbookStatus.value = '正在发送留言...';

  try {
    const response = await fetch('/api/guestbook', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        email,
        message
      })
    });

    const result = await response.json();

    if (!response.ok || !result.ok) {
      guestbookStatusType.value = 'error';
      guestbookStatus.value = result.message || '发送失败，请稍后再试。';
      return;
    }

    guestbookStatusType.value = 'success';
    guestbookStatus.value = result.message || '留言已经发送成功。';
    guestbookForm.value.email = '';
    guestbookForm.value.message = '';
  } catch (error) {
    guestbookStatusType.value = 'error';
    guestbookStatus.value = error instanceof Error ? error.message : '发送失败，请稍后再试。';
  } finally {
    isSubmitting.value = false;
  }
};

let scrollFrame = 0;
let motionMediaQuery;

const updateScrollProgress = () => {
  scrollFrame = 0;

  if (!runwayRef.value) return;
  if (prefersReducedMotion.value) {
    scrollProgress.value = 0;
    return;
  }

  const rect = runwayRef.value.getBoundingClientRect();
  const total = Math.max(runwayRef.value.offsetHeight - window.innerHeight, 1);
  scrollProgress.value = clamp(-rect.top / total, 0, 1);
};

const requestScrollUpdate = () => {
  if (scrollFrame) return;
  scrollFrame = requestAnimationFrame(updateScrollProgress);
};

const updateReducedMotionPreference = () => {
  prefersReducedMotion.value = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  updateScrollProgress();
};

onMounted(() => {
  motionMediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
  updateReducedMotionPreference();
  window.addEventListener('scroll', requestScrollUpdate, { passive: true });
  window.addEventListener('resize', requestScrollUpdate);
  motionMediaQuery.addEventListener?.('change', updateReducedMotionPreference);
  updateScrollProgress();
});

onBeforeUnmount(() => {
  window.removeEventListener('scroll', requestScrollUpdate);
  window.removeEventListener('resize', requestScrollUpdate);
  motionMediaQuery?.removeEventListener?.('change', updateReducedMotionPreference);
  cancelAnimationFrame(scrollFrame);
});
</script>

<style scoped>
.journey-section {
  --text-light: #fff7ed;
  --glass-bg: rgba(255, 255, 255, 0.16);
  --glass-border: rgba(255, 255, 255, 0.28);
  position: relative;
  min-height: 100svh;
  padding: 0 0 6rem;
  background: linear-gradient(180deg, rgba(3, 8, 14, 0.98) 0%, rgba(8, 18, 28, 0.9) 100%);
  color: var(--text-light);
  overflow: visible;
}

.journey-nav {
  position: sticky;
  top: 1rem;
  z-index: 30;
  width: min(1120px, calc(100% - 2rem));
  margin: 0 auto;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  padding: 0.88rem 1.15rem;
  border: 1px solid rgba(255, 255, 255, 0.16);
  border-radius: 999px;
  background:
    linear-gradient(180deg, rgba(15, 24, 36, 0.56), rgba(15, 24, 36, 0.28)),
    linear-gradient(180deg, rgba(255, 255, 255, 0.08), transparent);
  box-shadow:
    0 18px 42px rgba(0, 0, 0, 0.18),
    inset 0 1px 0 rgba(255, 255, 255, 0.12);
  backdrop-filter: blur(18px);
}

.journey-brand,
.journey-nav-links a {
  color: rgba(255, 247, 237, 0.94);
  text-decoration: none;
}

.journey-brand {
  font-size: 0.82rem;
  font-weight: 900;
  letter-spacing: 0.16em;
  text-transform: uppercase;
}

.journey-nav-links {
  display: flex;
  align-items: center;
  gap: 0.28rem;
  flex-wrap: wrap;
}

.journey-nav-links a {
  padding: 0.55rem 0.8rem;
  border-radius: 999px;
  font-size: 0.78rem;
  font-weight: 800;
  transition: background-color 0.22s ease, transform 0.22s ease;
}

.journey-nav-links a:hover {
  background: rgba(255, 255, 255, 0.08);
  transform: translateY(-1px);
}

.journey-runway {
  position: relative;
  min-height: 420svh;
  margin-top: 0;
}

.journey-stage {
  position: sticky;
  top: 0;
  height: 100svh;
  overflow: hidden;
}

.journey-progress {
  position: absolute;
  top: 18vh;
  right: clamp(1rem, 3vw, 2.4rem);
  z-index: 12;
  width: 2px;
  height: 34vh;
}

.journey-progress-track,
.journey-progress-fill {
  position: absolute;
  inset: 0;
  border-radius: 999px;
  transform-origin: top center;
}

.journey-progress-track {
  background: rgba(255, 255, 255, 0.18);
}

.journey-progress-fill {
  background: linear-gradient(180deg, #fff1dd 0%, #f4ab78 45%, #8f86db 100%);
  box-shadow: 0 0 14px rgba(244, 171, 120, 0.34);
}

.scene-stack,
.scene-layer,
.scene-image,
.scene-night-shade,
.scene-warmth,
.scene-lift,
.scene-fog {
  position: absolute;
  inset: 0;
}

.scene-layer {
  will-change: transform, opacity;
}

.scene-image {
  background-position: center center;
  background-repeat: no-repeat;
  background-size: cover;
  filter: saturate(1.03);
}

.scene-layer-2 .scene-image {
  background-position: center 56%;
}

.scene-layer-5 .scene-image {
  background-position: center 18%;
}

.scene-night-shade {
  z-index: 5;
  background:
    linear-gradient(180deg, rgba(2, 6, 12, 0.72) 0%, rgba(2, 6, 12, 0.18) 28%, rgba(2, 6, 12, 0.22) 100%),
    radial-gradient(circle at 16% 18%, rgba(28, 16, 43, 0.46), transparent 34%);
  pointer-events: none;
}

.scene-warmth {
  z-index: 6;
  background:
    radial-gradient(circle at 50% 72%, rgba(255, 182, 116, 0.38), transparent 32%),
    linear-gradient(180deg, rgba(255, 146, 88, 0) 0%, rgba(255, 146, 88, 0.14) 66%, rgba(72, 20, 31, 0.22) 100%);
  mix-blend-mode: screen;
  pointer-events: none;
}

.scene-lift {
  z-index: 7;
  background:
    radial-gradient(circle at 78% 12%, rgba(255, 255, 255, 0.28), transparent 18%),
    linear-gradient(180deg, rgba(208, 222, 255, 0.12) 0%, rgba(208, 222, 255, 0) 48%);
  pointer-events: none;
}

.scene-fog {
  z-index: 8;
  background:
    radial-gradient(ellipse at 50% 100%, rgba(255, 220, 205, 0.18) 0%, rgba(255, 220, 205, 0.06) 22%, transparent 54%),
    linear-gradient(180deg, rgba(255, 255, 255, 0) 62%, rgba(236, 216, 235, 0.18) 78%, rgba(226, 198, 233, 0.28) 100%);
  mix-blend-mode: screen;
  opacity: 0.9;
  pointer-events: none;
}

.journey-overlay {
  position: relative;
  z-index: 10;
  width: min(1120px, calc(100% - 3rem));
  height: 100%;
  margin: 0 auto;
}

.journey-kicker,
.journey-summary,
.journey-panel p,
.journey-contact-copy p,
.journey-guestbook-copy p,
.journey-card p,
.journey-contact-link small,
.journey-form-note,
.journey-form-status {
  margin: 0;
}

.journey-kicker {
  color: rgba(255, 237, 217, 0.82);
  font-size: 0.76rem;
  font-weight: 900;
  letter-spacing: 0.18em;
  text-transform: uppercase;
}

.journey-panel {
  position: absolute;
  transition:
    opacity 0.28s linear,
    transform 0.32s cubic-bezier(0.16, 1, 0.3, 1);
  pointer-events: none;
}

.journey-hero-panel {
  top: 16vh;
  left: 0;
  display: grid;
  gap: 1.1rem;
  width: min(38rem, 58vw);
}

.journey-hero-panel h2 {
  margin: 0;
  max-width: 9ch;
  font-size: clamp(3rem, 6vw, 6rem);
  font-weight: 900;
  line-height: 0.9;
  letter-spacing: -0.02em;
}

.journey-summary,
.journey-panel p {
  color: rgba(255, 244, 233, 0.82);
  font-size: 1rem;
  font-weight: 700;
  line-height: 1.82;
}

.journey-story-panel {
  top: 24vh;
  left: 0;
  width: min(31rem, 46vw);
  display: grid;
  gap: 0.9rem;
}

.journey-panel h3,
.journey-contact-copy h3,
.journey-guestbook-copy h3 {
  margin: 0;
  font-size: clamp(2rem, 3vw, 3.2rem);
  font-weight: 900;
  line-height: 0.98;
  letter-spacing: -0.02em;
}

.journey-day-panel {
  inset: auto 0 13vh 0;
  display: grid;
  grid-template-columns: minmax(14rem, 21rem) minmax(0, 1fr);
  gap: 1.5rem;
  align-items: end;
}

.journey-day-copy {
  display: grid;
  gap: 0.8rem;
  width: min(22rem, 100%);
}

.journey-card-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 1rem;
}

.journey-card {
  min-height: 10rem;
  padding: 1.1rem 1.1rem 1.25rem;
  border: 1px solid var(--glass-border);
  border-radius: 24px;
  background: var(--glass-bg);
  box-shadow: 0 24px 80px rgba(20, 20, 40, 0.18);
  backdrop-filter: blur(18px);
}

.journey-card-index {
  display: inline-block;
  margin-bottom: 0.9rem;
  color: rgba(255, 233, 212, 0.72);
  font-size: 0.74rem;
  font-weight: 900;
  letter-spacing: 0.16em;
}

.journey-card h4 {
  margin: 0 0 0.5rem;
  font-size: 1.02rem;
  font-weight: 900;
  color: #fff3e5;
}

.journey-card p {
  color: rgba(255, 239, 223, 0.76);
  font-size: 0.92rem;
  font-weight: 700;
  line-height: 1.68;
}

.journey-sunset-panel {
  right: 0;
  bottom: 16vh;
  width: min(26rem, 42vw);
  display: grid;
  gap: 0.8rem;
  text-align: right;
}

.journey-outro-panel {
  left: 50%;
  bottom: 16vh;
  width: min(34rem, 78vw);
  display: grid;
  gap: 0.95rem;
  text-align: center;
  translate: -50% 0;
}

.journey-dock {
  position: relative;
  z-index: 4;
  width: min(1120px, calc(100% - 3rem));
  margin: -2rem auto 0;
  display: grid;
  gap: 1.35rem;
}

.journey-contact-panel,
.journey-guestbook-panel {
  display: grid;
  gap: 1.35rem;
  padding: 1.5rem;
  border: 1px solid rgba(255, 255, 255, 0.16);
  border-radius: 28px;
  background:
    linear-gradient(180deg, rgba(18, 24, 35, 0.56), rgba(18, 24, 35, 0.32)),
    linear-gradient(180deg, rgba(255, 255, 255, 0.08), transparent);
  box-shadow:
    0 24px 48px rgba(0, 0, 0, 0.18),
    inset 0 1px 0 rgba(255, 255, 255, 0.1);
  backdrop-filter: blur(20px);
}

.journey-contact-panel {
  grid-template-columns: minmax(16rem, 24rem) minmax(0, 1fr);
  align-items: start;
}

.journey-contact-copy,
.journey-guestbook-copy {
  display: grid;
  gap: 0.7rem;
}

.journey-contact-copy p,
.journey-guestbook-copy p,
.journey-contact-link small,
.journey-form-note,
.journey-form-status {
  color: rgba(255, 239, 223, 0.76);
  font-size: 0.95rem;
  font-weight: 700;
  line-height: 1.78;
}

.journey-contact-links {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 0.9rem;
}

.journey-contact-link {
  display: grid;
  gap: 0.22rem;
  min-height: 5rem;
  padding: 1rem;
  border: 1px solid rgba(255, 255, 255, 0.12);
  border-radius: 20px;
  background: rgba(255, 255, 255, 0.05);
  color: #fff3e5;
  text-decoration: none;
  transition: transform 0.18s ease, border-color 0.18s ease;
}

.journey-contact-link:hover {
  transform: translateY(-2px);
  border-color: rgba(255, 255, 255, 0.22);
}

.journey-contact-link strong {
  font-size: 0.92rem;
  font-weight: 900;
}

.journey-guestbook-panel {
  grid-template-columns: minmax(16rem, 23rem) minmax(0, 1fr);
  align-items: start;
}

.journey-guestbook-form {
  display: grid;
  gap: 0.95rem;
}

.journey-field {
  display: grid;
  gap: 0.42rem;
}

.journey-field span {
  color: rgba(255, 241, 229, 0.82);
  font-size: 0.8rem;
  font-weight: 800;
}

.journey-field input,
.journey-field textarea {
  width: 100%;
  min-width: 0;
  max-width: 100%;
  box-sizing: border-box;
  padding: 0.92rem 1rem;
  border: 1px solid rgba(255, 255, 255, 0.14);
  border-radius: 18px;
  background: rgba(255, 255, 255, 0.08);
  color: #fff4ea;
  font: inherit;
  outline: none;
  transition: border-color 0.22s ease, background-color 0.22s ease, box-shadow 0.22s ease;
}

.journey-field textarea {
  min-height: 8rem;
  resize: vertical;
}

.journey-field input:focus,
.journey-field textarea:focus {
  border-color: rgba(255, 232, 207, 0.26);
  background: rgba(255, 255, 255, 0.12);
  box-shadow: 0 0 0 4px rgba(255, 255, 255, 0.05);
}

.journey-form-actions {
  display: grid;
  gap: 0.45rem;
}

.journey-button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  justify-self: start;
  min-height: 2.85rem;
  padding: 0 1.1rem;
  border-radius: 999px;
  border: 1px solid transparent;
  background: linear-gradient(135deg, rgba(255, 240, 225, 0.96), rgba(244, 171, 120, 0.94));
  color: #26151b;
  font-size: 0.84rem;
  font-weight: 900;
  text-decoration: none;
  cursor: pointer;
  box-shadow:
    0 16px 32px rgba(0, 0, 0, 0.18),
    inset 0 1px 0 rgba(255, 255, 255, 0.56);
  transition: transform 0.18s ease;
}

.journey-button:hover {
  transform: translateY(-1px);
}

.journey-button:disabled {
  opacity: 0.68;
  cursor: wait;
  transform: none;
}

.journey-form-status.is-success {
  color: #d5ffd9;
}

.journey-form-status.is-error {
  color: #ffd2c6;
}

@media (prefers-reduced-motion: reduce) {
  .journey-runway {
    min-height: 100svh;
  }

  .journey-stage {
    position: relative;
    height: 100svh;
  }

  .journey-progress {
    display: none;
  }

  .journey-panel {
    transition: none;
  }
}

@media (max-width: 1080px) {
  .journey-hero-panel {
    width: min(34rem, 74vw);
  }

  .journey-day-panel,
  .journey-contact-panel,
  .journey-guestbook-panel {
    grid-template-columns: 1fr;
  }

  .journey-contact-links {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media (max-width: 900px) {
  .journey-nav {
    position: relative;
    top: 0;
    width: min(100%, calc(100% - 2rem));
    border-radius: 24px;
  }

  .journey-runway {
    margin-top: 0;
    min-height: 360svh;
  }

  .journey-overlay {
    width: min(100%, calc(100% - 2rem));
  }

  .journey-hero-panel,
  .journey-story-panel,
  .journey-sunset-panel {
    width: min(100%, 30rem);
  }

  .journey-day-panel {
    inset: auto 0 10vh 0;
    grid-template-columns: 1fr;
  }

  .journey-card-grid {
    grid-template-columns: 1fr;
  }

  .journey-sunset-panel {
    left: 0;
    right: auto;
    text-align: left;
  }

  .journey-dock {
    width: min(100%, calc(100% - 2rem));
  }
}

@media (max-width: 768px) {
  .journey-section {
    padding-bottom: 3rem;
  }

  .journey-nav {
    padding: 0.82rem;
  }

  .journey-nav-links {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    width: 100%;
  }

  .journey-nav-links a {
    display: grid;
    place-items: center;
  }

  .journey-brand {
    display: none;
  }

  .journey-hero-panel {
    top: 13vh;
  }

  .journey-hero-panel h2 {
    font-size: clamp(2.6rem, 10vw, 4.2rem);
  }

  .journey-contact-links {
    grid-template-columns: 1fr;
  }
}
</style>
