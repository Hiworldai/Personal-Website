<template>
  <section
    id="experience-section"
    ref="sectionRef"
    class="journey-section"
    :class="{ 'is-section-visible': isSectionVisible }"
    :style="[dawnStyle, albumHandoffStyle]"
    aria-labelledby="experience-title"
  >
    <div ref="runwayRef" class="journey-runway">
      <div class="journey-stage">
        <div class="journey-progress" aria-hidden="true">
          <span class="journey-progress-track"></span>
          <span class="journey-progress-fill" :style="journeyProgressStyle"></span>
        </div>

        <div class="scene-stack" aria-hidden="true">
          <TrainCloudShaderCanvas
            class="scene-shader-canvas"
            :scenes="journeyScenes"
            :progress="scrollProgress"
            :warmth="shaderWarmth"
            :reduced-motion="shouldPauseShader"
            :intensity="0.82"
            :cloud-speed="0.72"
            :smoke-speed="0.58"
          />

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

        <div class="journey-dawn-atmosphere" aria-hidden="true">
          <span class="journey-dawn-blue"></span>
          <span class="journey-dawn-violet"></span>
          <span class="journey-dawn-warmth"></span>
          <span class="journey-dawn-fog"></span>
          <span class="journey-dawn-night"></span>
        </div>

        <div class="journey-album-handoff" aria-hidden="true">
          <span class="journey-handoff-violet"></span>
          <span class="journey-handoff-blue"></span>
          <span class="journey-handoff-night"></span>
        </div>

        <div class="journey-overlay">
          <header
            id="experience-title"
            class="journey-panel journey-letter-panel"
            :style="getPanelStyle(0, 0.22, -18, 24, true)"
          >
            <article class="journey-letter" aria-label="给访客的一封信">
              <p class="journey-kicker">{{ journeyLetter.kicker }}</p>
              <h2>{{ journeyLetter.title }}</h2>
              <p v-for="paragraph in journeyLetter.paragraphs" :key="paragraph">{{ paragraph }}</p>
              <strong>{{ journeyLetter.sign }}</strong>
            </article>
          </header>

          <section
            id="journey-story"
            class="journey-panel journey-tech-panel"
            :style="getPanelStyle(0.16, 0.46, -24, 18)"
          >
            <div class="journey-tech-copy">
              <h3>技术栈</h3>
            </div>
            <div class="tech-cloud-field" aria-label="技术栈">
              <span
                v-for="item in techCloudItems"
                :key="item.label"
                class="tech-cloud"
                :style="{
                  '--cloud-row': item.row,
                  '--cloud-delay': item.delay,
                  '--cloud-duration': item.duration
                }"
              >
                {{ item.label }}
              </span>
            </div>
            <div class="message-wall-field" aria-label="留言墙">
              <span
                v-for="item in messageWallItems"
                :key="item.text"
                class="tech-cloud message-wall-note"
                :style="{
                  '--cloud-row': item.row,
                  '--cloud-delay': item.delay,
                  '--cloud-duration': item.duration
                }"
              >
                {{ item.text }}
              </span>
            </div>
          </section>

          <section
            id="journey-scenes"
            class="journey-panel journey-experience-panel"
            :style="experiencePanelStyle"
          >
            <div
              ref="experienceRailRef"
              class="experience-rail-window"
              :class="{ 'is-dragging': isExperienceRailDragging }"
              aria-label="经历横向车厢"
              @wheel="handleExperienceRailWheel"
              @pointermove="handleExperienceRailPointerMove"
              @pointerup="handleExperienceRailPointerUp"
              @pointercancel="handleExperienceRailPointerUp"
              @pointerleave="handleExperienceRailPointerUp"
            >
              <div class="experience-track-line" aria-hidden="true"></div>
              <div class="experience-carriages">
                <article
                  v-for="(stop, index) in experienceStops"
                  :key="stop.station"
                  class="experience-car"
                  :style="{
                    '--car-column': index + 1,
                    '--car-row': (index % 2) + 1
                  }"
                  @pointerdown="handleExperienceRailPointerDown"
                >
                  <span>{{ stop.tag }}</span>
                  <time>{{ stop.date }}</time>
                  <h4>{{ stop.station }}</h4>
                  <strong>{{ stop.role }}</strong>
                  <p>{{ stop.summary }}</p>
                </article>
              </div>
            </div>
          </section>

          <section
            id="contact-card"
            class="journey-panel journey-sky-contact-panel"
            :style="contactPanelStyle"
          >
            <div class="journey-contact-overview">
              <div class="journey-contact-copy">
                <p class="journey-kicker">Contact & guestbook</p>
                <h3>联系方式</h3>
                <p>如果你想交流技术、合作，或者交个朋友，都可以在这里找到我。</p>
              </div>

              <div class="journey-contact-links" aria-label="Contact links">
                <component
                  :is="item.href ? 'a' : 'div'"
                  v-for="item in contactLinkItems"
                  :key="item.label"
                  class="journey-contact-link contact-link"
                  :href="item.href || undefined"
                  :target="getContactTarget(item.href)"
                  :rel="getContactRel(item.href)"
                  :aria-label="`${item.label}: ${item.value || item.href}`"
                >
                  <strong>{{ item.label }}</strong>
                  <small>{{ getContactDisplay(item) }}</small>
                </component>
              </div>
            </div>

            <form id="guestbook-card" class="journey-guestbook-form" @submit.prevent="submitGuestbook">
              <div class="guestbook-note-head">
                <p class="journey-kicker">Cloud note</p>
                <h4>把想说的话留在这片天空</h4>
              </div>

              <label class="journey-field journey-field-message">
                <span>{{ guestbookCopy.fields.message }}</span>
                <textarea
                  v-model.trim="guestbookForm.message"
                  :placeholder="guestbookCopy.placeholders.message"
                  :maxlength="guestbookCopy.messageMaxLength"
                  rows="4"
                  required
                ></textarea>
              </label>

              <div class="guestbook-note-foot">
                <label class="journey-field journey-field-email">
                  <span>{{ guestbookCopy.fields.email }}</span>
                  <input
                    v-model.trim="guestbookForm.email"
                    type="email"
                    :placeholder="guestbookCopy.placeholders.email"
                    required
                  >
                </label>

                <div class="journey-form-actions">
                  <button class="journey-button is-primary" type="submit" :disabled="isSubmitting">
                    {{ isSubmitting ? '发送中...' : guestbookCopy.submit }}
                  </button>
                </div>
              </div>

              <div class="guestbook-status-row">
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

          <section
            id="journey-outro"
            class="journey-panel journey-outro-panel"
            :style="journeyOutroStyle"
          >
            <p class="journey-kicker">{{ journeyOutroPanel.kicker }}</p>
            <h3>{{ journeyOutroPanel.title }}</h3>
            <p>{{ journeyOutroPanel.body }}</p>
          </section>
        </div>
      </div>
    </div>
  </section>
</template>

<script setup>
import { computed, onBeforeUnmount, onMounted, ref } from 'vue';
import {
  contactLinkItems,
  experienceStops,
  guestbookCopy,
  journeyLetter,
  journeyPanels,
  journeyScenes,
  messageWallItems,
  techCloudItems
} from '../../content/experienceContent';
import TrainCloudShaderCanvas from './TrainCloudShaderCanvas.vue';

const props = defineProps({
  dawnProgress: {
    type: Number,
    default: 1
  },
  albumTransitionProgress: {
    type: Number,
    default: 0
  }
});

const guestbookForm = ref({
  email: '',
  message: ''
});

const guestbookStatus = ref('');
const guestbookStatusType = ref('');
const isSubmitting = ref(false);
const sectionRef = ref(null);
const runwayRef = ref(null);
const experienceRailRef = ref(null);
const scrollProgress = ref(0);
const prefersReducedMotion = ref(false);
const isExperienceRailDragging = ref(false);
const isSectionVisible = ref(false);

const clamp = (value, min, max) => Math.min(max, Math.max(min, value));
const smoothstep = (value) => value * value * (3 - 2 * value);
const easeInOutCubic = (value) => (value < 0.5
  ? 4 * value * value * value
  : 1 - Math.pow(-2 * value + 2, 3) / 2);

const getDawnRange = (start, end) => (
  smoothstep(clamp((props.dawnProgress - start) / Math.max(end - start, 0.001), 0, 1))
);

const getAlbumRange = (start, end) => (
  smoothstep(clamp((props.albumTransitionProgress - start) / Math.max(end - start, 0.001), 0, 1))
);

const dawnStyle = computed(() => {
  const nightLift = getDawnRange(0.55, 0.84);
  const violetIn = getDawnRange(0.58, 0.76);
  const violetOut = 1 - getDawnRange(0.86, 1);
  const morning = getDawnRange(0.72, 1);
  const copy = getDawnRange(0.86, 1);

  return {
    '--dawn-night-opacity': `${1 - nightLift}`,
    '--dawn-blue-opacity': `${0.9 - morning * 0.68}`,
    '--dawn-violet-opacity': `${violetIn * violetOut * 0.54}`,
    '--dawn-warmth-opacity': `${morning * 0.34}`,
    '--dawn-fog-opacity': `${0.92 - getDawnRange(0.55, 1) * 0.62}`,
    '--journey-copy-entry': `${copy}`
  };
});

const albumHandoffStyle = computed(() => {
  const copyExit = getAlbumRange(0, 0.18);
  const violetIn = getAlbumRange(0.15, 0.34);
  const violetOut = 1 - getAlbumRange(0.42, 0.62);
  const blue = getAlbumRange(0.22, 0.58);
  const night = getAlbumRange(0.38, 0.72);

  return {
    '--handoff-ui-opacity': `${1 - copyExit}`,
    '--handoff-violet-opacity': `${violetIn * violetOut * 0.56}`,
    '--handoff-blue-opacity': `${blue * (1 - night * 0.36) * 0.7}`,
    '--handoff-night-opacity': `${night}`
  };
});

const getSegmentProgress = (start, end, value = scrollProgress.value) => {
  if (end <= start) return value >= end ? 1 : 0;
  return clamp((value - start) / (end - start), 0, 1);
};

const getSceneOpacity = (index) => {
  const sceneCount = Math.max(journeyScenes.length, 1);
  const scaledProgress = clamp(scrollProgress.value, 0, 1) * Math.max(sceneCount - 1, 0);
  const currentIndex = Math.min(Math.floor(scaledProgress), sceneCount - 1);
  const nextIndex = Math.min(currentIndex + 1, sceneCount - 1);
  const localProgress = scaledProgress - currentIndex;
  const sceneMix = localProgress * localProgress * (3 - 2 * localProgress);

  if (index === currentIndex) return 1 - sceneMix;
  if (index === nextIndex) return sceneMix;
  return 0;
};

const getSceneStyle = (index) => {
  const opacity = prefersReducedMotion.value ? (index === 0 ? 1 : 0) : getSceneOpacity(index);
  const progress = scrollProgress.value;
  const offset = [0, -6, -3, 0, 0][index];
  const scale = [1.08, 1.12, 1.04, 1.12, 1.12][index];
  const yShift = [0, -2, -4, -1, -10][index];
  const trainZoom = index === 2 ? easeInOutCubic(getSegmentProgress(0.5, 0.64, progress)) : 0;
  const trainSettle = index === 2 ? easeInOutCubic(getSegmentProgress(0.72, 0.84, progress)) : 0;
  const xShift = [
    0,
    -12 * getSegmentProgress(0.16, 0.42, progress),
    -5 * getSegmentProgress(0.42, 0.64, progress),
    3 * getSegmentProgress(0.62, 0.86, progress),
    0
  ][index];
  const motionScale = scale
    + trainZoom * 0.46
    - trainSettle * 0.22
    - getSegmentProgress(0, 1, progress) * 0.03;
  const axisLift = index === 2 ? trainZoom * -12 + trainSettle * 5 : 0;

  return {
    opacity,
    transform: `translate3d(${offset + xShift}%, ${yShift + axisLift}%, 0) scale(${motionScale})`
  };
};

const getPanelStyle = (start, end, x = 0, y = 18, immediate = false) => {
  const copyEntry = immediate ? getDawnRange(0.86, 1) : 1;
  if (prefersReducedMotion.value) {
    return {
      opacity: copyEntry,
      transform: 'translate3d(0, 0, 0)'
    };
  }

  const enterEnd = start + (end - start) * 0.28;
  const exitStart = start + (end - start) * 0.72;
  const enter = immediate ? 1 : getSegmentProgress(start, enterEnd);
  const exit = end >= 0.995 ? 1 : 1 - getSegmentProgress(exitStart, end);
  const opacity = clamp(Math.min(enter, exit, copyEntry), 0, 1);
  const eased = easeInOutCubic(opacity);

  return {
    opacity,
    transform: `translate3d(${(1 - eased) * x}px, ${(1 - eased) * y}px, 0)`
  };
};

const journeyOutroStyle = computed(() => {
  const base = getPanelStyle(0.9, 1, 0, 28);
  const exit = getAlbumRange(0, 0.18);
  return {
    ...base,
    opacity: Number(base.opacity ?? 1) * (1 - exit),
    filter: `blur(${exit * 4}px)`,
    transform: `${base.transform} translate3d(0, ${exit * -24}px, 0)`
  };
});

const journeyProgressStyle = computed(() => ({
  transform: `scaleY(${clamp(scrollProgress.value, 0.01, 1)})`
}));

const experiencePanelStyle = computed(() => {
  const style = getPanelStyle(0.48, 0.74, 0, 22);
  const opacity = Number(style.opacity ?? 1);
  return {
    ...style,
    pointerEvents: opacity > 0.16 ? 'auto' : 'none'
  };
});

const contactPanelStyle = computed(() => {
  const style = getPanelStyle(0.72, 0.94, 0, 22);
  const opacity = Number(style.opacity ?? 1);
  return {
    ...style,
    pointerEvents: opacity > 0.18 ? 'auto' : 'none'
  };
});

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

const shaderWarmth = computed(() => {
  const morning = getSegmentProgress(0, 0.32) * 0.22;
  const noon = getSegmentProgress(0.32, 0.55) * 0.18;
  const sunset = getSegmentProgress(0.55, 1) * 0.72;
  return clamp(0.12 + morning + noon + sunset, 0.12, 1);
});
const shouldPauseShader = computed(() => (
  prefersReducedMotion.value || isExperienceRailDragging.value || !isSectionVisible.value
));
const journeyOutroPanel = computed(() => (
  journeyPanels.find((panel) => panel.key === 'outro') || {
    kicker: 'Next stop',
    title: '',
    body: ''
  }
));

const isHttpLink = (href) => /^https?:\/\//i.test(href || '');
const getContactTarget = (href) => (isHttpLink(href) ? '_blank' : undefined);
const getContactRel = (href) => (isHttpLink(href) ? 'noopener noreferrer' : undefined);
const getContactDisplay = (item) => (item.value || item.href || '')
  .replace(/^mailto:/i, '')
  .replace(/^https?:\/\//i, '')
  .replace(/\/$/u, '');

const railDragState = {
  active: false,
  pointerId: null,
  startX: 0,
  startY: 0,
  startScrollLeft: 0,
  maxScroll: 0,
  nextScrollLeft: 0,
  animationFrame: 0
};

const getExperienceRailMaxScroll = (rail) => Math.max(rail.scrollWidth - rail.clientWidth, 0);

const applyExperienceRailScroll = () => {
  railDragState.animationFrame = 0;

  const rail = experienceRailRef.value;
  if (!rail) return;

  const maxScroll = railDragState.maxScroll || getExperienceRailMaxScroll(rail);
  rail.scrollLeft = clamp(railDragState.nextScrollLeft, 0, maxScroll);
};

const scheduleExperienceRailScroll = (scrollLeft) => {
  railDragState.nextScrollLeft = scrollLeft;
  if (railDragState.animationFrame) return;

  railDragState.animationFrame = requestAnimationFrame(applyExperienceRailScroll);
};

const scrollExperienceRailBy = (delta) => {
  const rail = experienceRailRef.value;
  if (!rail) return false;

  const maxScroll = getExperienceRailMaxScroll(rail);
  if (maxScroll <= 0) return false;

  railDragState.maxScroll = maxScroll;
  const currentScrollLeft = railDragState.animationFrame ? railDragState.nextScrollLeft : rail.scrollLeft;
  const nextScrollLeft = clamp(currentScrollLeft + delta, 0, maxScroll);
  if (Math.abs(nextScrollLeft - currentScrollLeft) <= 0.5) return false;

  scheduleExperienceRailScroll(nextScrollLeft);
  return true;
};

const handleExperienceRailWheel = (event) => {
  if (!event.target?.closest?.('.experience-car')) return;

  const delta = Math.abs(event.deltaX) > Math.abs(event.deltaY) ? event.deltaX : event.deltaY;
  if (!delta) return;

  if (scrollExperienceRailBy(delta)) {
    event.preventDefault();
    event.stopPropagation();
  }
};

const handleExperienceRailPointerDown = (event) => {
  if (event.pointerType === 'mouse' && event.button !== 0) return;
  if (!event.currentTarget?.classList?.contains('experience-car')) return;

  const rail = experienceRailRef.value;
  if (!rail || getExperienceRailMaxScroll(rail) <= 0) return;

  railDragState.active = true;
  railDragState.pointerId = event.pointerId;
  railDragState.startX = event.clientX;
  railDragState.startY = event.clientY;
  railDragState.startScrollLeft = rail.scrollLeft;
  railDragState.maxScroll = getExperienceRailMaxScroll(rail);
  railDragState.nextScrollLeft = rail.scrollLeft;
  isExperienceRailDragging.value = true;
  rail.setPointerCapture?.(event.pointerId);
};

const handleExperienceRailPointerMove = (event) => {
  const rail = experienceRailRef.value;
  if (!railDragState.active || !rail) return;
  if (railDragState.pointerId !== null && event.pointerId !== railDragState.pointerId) return;

  const deltaX = event.clientX - railDragState.startX;
  scheduleExperienceRailScroll(clamp(
    railDragState.startScrollLeft - deltaX,
    0,
    railDragState.maxScroll || getExperienceRailMaxScroll(rail)
  ));
  event.preventDefault();
};

const handleExperienceRailPointerUp = (event) => {
  const rail = experienceRailRef.value;
  if (!railDragState.active) return;

  try {
    rail?.releasePointerCapture?.(railDragState.pointerId ?? event.pointerId);
  } catch {
    // Pointer capture may already be released by the browser.
  }
  railDragState.active = false;
  railDragState.pointerId = null;
  isExperienceRailDragging.value = false;
};

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
let sectionObserver;

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
  sectionObserver = new IntersectionObserver(([entry]) => {
    isSectionVisible.value = entry.isIntersecting;
  }, { threshold: 0.01 });
  sectionObserver.observe(sectionRef.value);
});

onBeforeUnmount(() => {
  window.removeEventListener('scroll', requestScrollUpdate);
  window.removeEventListener('resize', requestScrollUpdate);
  motionMediaQuery?.removeEventListener?.('change', updateReducedMotionPreference);
  sectionObserver?.disconnect();
  cancelAnimationFrame(scrollFrame);
  cancelAnimationFrame(railDragState.animationFrame);
});
</script>

<style scoped>
.journey-section {
  --ink: #1e2f47;
  --paper: rgba(255, 247, 232, 0.82);
  --paper-edge: rgba(255, 255, 255, 0.72);
  --text-light: #fff7ed;
  --glass-bg: rgba(255, 248, 233, 0.15);
  --glass-border: rgba(255, 250, 238, 0.28);
  position: relative;
  min-height: 100svh;
  background: linear-gradient(180deg, rgba(6, 12, 20, 0.98) 0%, rgba(9, 18, 28, 0.94) 100%);
  color: var(--text-light);
  overflow: visible;
}

.journey-runway {
  position: relative;
  min-height: 350svh;
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
  top: 16vh;
  right: clamp(1rem, 3vw, 2.4rem);
  z-index: 16;
  width: 2px;
  height: 38vh;
  opacity: calc(var(--journey-copy-entry, 1) * var(--handoff-ui-opacity, 1));
  transition: opacity 0.12s linear;
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

.scene-stack {
  transform: translateZ(0);
  transform-origin: center;
}

.journey-dawn-atmosphere,
.journey-dawn-atmosphere span {
  position: absolute;
  inset: 0;
}

.journey-dawn-atmosphere {
  z-index: 9;
  overflow: hidden;
  pointer-events: none;
}

.journey-dawn-atmosphere span {
  display: block;
  pointer-events: none;
  will-change: opacity;
}

.journey-dawn-blue {
  z-index: 1;
  background:
    radial-gradient(ellipse at 50% 74%, rgba(30, 48, 76, 0.46), transparent 56%),
    linear-gradient(180deg, rgba(2, 8, 16, 0.94) 0%, rgba(8, 20, 36, 0.88) 48%, rgba(28, 38, 66, 0.76) 100%);
  opacity: var(--dawn-blue-opacity, 0.22);
}

.journey-dawn-violet {
  z-index: 2;
  background:
    radial-gradient(ellipse at 34% 78%, rgba(151, 119, 160, 0.42), transparent 48%),
    linear-gradient(180deg, rgba(48, 46, 78, 0.12), rgba(107, 77, 121, 0.38) 72%, rgba(160, 117, 139, 0.24));
  opacity: var(--dawn-violet-opacity, 0);
}

.journey-dawn-warmth {
  z-index: 3;
  background:
    radial-gradient(ellipse at 15% 88%, rgba(255, 223, 164, 0.9) 0%, rgba(246, 180, 125, 0.44) 24%, transparent 58%),
    linear-gradient(180deg, transparent 48%, rgba(246, 188, 139, 0.2) 100%);
  mix-blend-mode: screen;
  opacity: var(--dawn-warmth-opacity, 0.34);
}

.journey-dawn-fog {
  z-index: 4;
  background:
    radial-gradient(ellipse at 18% 82%, rgba(113, 130, 153, 0.5), transparent 42%),
    radial-gradient(ellipse at 72% 68%, rgba(67, 78, 101, 0.44), transparent 52%),
    linear-gradient(180deg, rgba(3, 8, 14, 0.54) 0%, rgba(13, 21, 34, 0.3) 48%, rgba(53, 54, 74, 0.28) 100%);
  opacity: var(--dawn-fog-opacity, 0.3);
}

.journey-dawn-night {
  z-index: 5;
  background:
    radial-gradient(ellipse at 50% 78%, rgba(8, 15, 24, 0.82), rgba(2, 7, 12, 0.96) 66%),
    linear-gradient(180deg, #02070c 0%, rgba(2, 7, 12, 0.98) 62%, rgba(5, 10, 17, 0.96) 100%);
  opacity: var(--dawn-night-opacity, 0);
}

.journey-album-handoff,
.journey-album-handoff span {
  position: absolute;
  inset: 0;
}

.journey-album-handoff {
  z-index: 10;
  overflow: hidden;
  pointer-events: none;
}

.journey-album-handoff span {
  display: block;
  pointer-events: none;
  will-change: opacity;
}

.journey-handoff-violet {
  z-index: 1;
  background:
    radial-gradient(ellipse at 34% 76%, rgba(118, 82, 137, 0.48), transparent 48%),
    linear-gradient(180deg, rgba(52, 38, 76, 0.16), rgba(87, 54, 105, 0.46) 70%, rgba(112, 72, 102, 0.34));
  opacity: var(--handoff-violet-opacity, 0);
}

.journey-handoff-blue {
  z-index: 2;
  background:
    radial-gradient(ellipse at 50% 68%, rgba(18, 39, 65, 0.3), transparent 52%),
    linear-gradient(180deg, rgba(3, 11, 21, 0.32), rgba(6, 18, 34, 0.72) 58%, rgba(10, 16, 31, 0.84));
  opacity: var(--handoff-blue-opacity, 0);
}

.journey-handoff-night {
  z-index: 3;
  background:
    radial-gradient(ellipse at 50% 54%, rgba(5, 13, 22, 0.84), rgba(1, 4, 8, 0.98) 72%),
    linear-gradient(180deg, rgba(2, 7, 12, 0.9), #010305 74%, #000 100%);
  opacity: var(--handoff-night-opacity, 0);
}

.scene-layer {
  z-index: 1;
  will-change: transform, opacity;
}

.scene-shader-canvas {
  position: absolute;
  inset: 0;
  z-index: 4;
  width: 100%;
  height: 100%;
  display: block;
  pointer-events: none;
  opacity: 0.94;
}

.scene-image {
  background-position: center center;
  background-repeat: no-repeat;
  background-size: cover;
  filter: saturate(1.04) contrast(1.01);
}

.scene-layer-2 .scene-image {
  background-position: center 56%;
}

.scene-layer-3 .scene-image {
  background-position: center 61%;
}

.scene-layer-4 .scene-image {
  background-position: center 58%;
}

.scene-layer-5 .scene-image {
  background-position: center 18%;
}

.scene-night-shade {
  z-index: 5;
  background:
    linear-gradient(180deg, rgba(2, 6, 12, 0.5) 0%, rgba(2, 6, 12, 0.12) 30%, rgba(2, 6, 12, 0.2) 100%),
    radial-gradient(circle at 18% 16%, rgba(42, 24, 58, 0.3), transparent 34%);
  pointer-events: none;
}

.scene-warmth {
  z-index: 6;
  background:
    radial-gradient(circle at 52% 70%, rgba(255, 182, 116, 0.32), transparent 32%),
    linear-gradient(180deg, rgba(255, 146, 88, 0) 0%, rgba(255, 146, 88, 0.12) 66%, rgba(72, 20, 31, 0.18) 100%);
  mix-blend-mode: screen;
  pointer-events: none;
}

.scene-lift {
  z-index: 7;
  background:
    radial-gradient(circle at 78% 12%, rgba(255, 255, 255, 0.2), transparent 18%),
    linear-gradient(180deg, rgba(208, 222, 255, 0.1) 0%, rgba(208, 222, 255, 0) 48%);
  pointer-events: none;
}

.scene-fog {
  z-index: 8;
  background:
    radial-gradient(ellipse at 50% 100%, rgba(255, 220, 205, 0.16) 0%, rgba(255, 220, 205, 0.05) 22%, transparent 54%),
    linear-gradient(180deg, rgba(255, 255, 255, 0) 62%, rgba(236, 216, 235, 0.12) 78%, rgba(226, 198, 233, 0.18) 100%);
  mix-blend-mode: screen;
  opacity: 0.86;
  pointer-events: none;
}

.journey-overlay {
  position: relative;
  z-index: 12;
  width: min(1180px, calc(100% - 3rem));
  height: 100%;
  margin: 0 auto;
}

.journey-kicker,
.journey-panel p,
.journey-contact-copy p,
.journey-contact-link small,
.journey-form-status,
.experience-car p {
  margin: 0;
}

.journey-kicker {
  color: rgba(255, 240, 218, 0.78);
  font-size: 0.72rem;
  font-weight: 900;
  letter-spacing: 0.18em;
  text-transform: uppercase;
}

.journey-panel {
  position: absolute;
  transition:
    opacity var(--section-fade-duration, 420ms) var(--section-fade-ease, cubic-bezier(0.22, 1, 0.36, 1)),
    transform var(--section-fade-duration, 420ms) var(--section-fade-ease, cubic-bezier(0.22, 1, 0.36, 1));
  pointer-events: none;
}

.journey-panel h3,
.journey-contact-copy h3 {
  margin: 0;
  font-size: clamp(1.9rem, 3vw, 3.1rem);
  font-weight: 900;
  line-height: 0.98;
  letter-spacing: -0.02em;
  text-wrap: balance;
}

.journey-panel p,
.journey-contact-copy p,
.journey-contact-link small,
.journey-form-status {
  color: rgba(255, 244, 233, 0.82);
  font-size: 0.96rem;
  font-weight: 700;
  line-height: 1.72;
}

.journey-letter-panel {
  top: 16vh;
  left: clamp(-0.2rem, 1vw, 0.75rem);
  width: min(37rem, 48vw);
}

.journey-letter {
  position: relative;
  display: grid;
  gap: 0.82rem;
  padding: 0;
  border: 0;
  border-radius: 0;
  background: transparent;
  color: var(--ink);
  box-shadow: none;
  backdrop-filter: none;
  filter: drop-shadow(0 20px 36px rgba(87, 68, 120, 0.18));
}

.journey-letter::before {
  content: none;
}

.journey-letter::after {
  content: none;
}

.journey-letter .journey-kicker {
  color: rgba(35, 57, 87, 0.58);
  text-shadow: 0 1px 0 rgba(255, 255, 255, 0.28);
}

.journey-letter h2 {
  position: relative;
  z-index: 1;
  margin: 0 0 0.35rem;
  color: rgba(24, 42, 68, 0.92);
  font-size: clamp(2.4rem, 5.2vw, 6rem);
  font-weight: 900;
  line-height: 0.9;
  letter-spacing: -0.035em;
  text-wrap: balance;
  text-shadow:
    0 1px 0 rgba(255, 255, 255, 0.38),
    0 18px 48px rgba(73, 58, 104, 0.18);
}

.journey-letter p:not(.journey-kicker) {
  position: relative;
  z-index: 1;
  max-width: 58ch;
  color: rgba(29, 45, 68, 0.76);
  font-size: clamp(0.92rem, 1vw, 1.04rem);
  font-weight: 700;
  line-height: 1.78;
  text-shadow:
    0 1px 0 rgba(255, 255, 255, 0.2),
    0 10px 30px rgba(45, 35, 74, 0.16);
}

.journey-letter strong {
  position: relative;
  z-index: 1;
  justify-self: end;
  margin-top: 0.25rem;
  color: rgba(31, 50, 78, 0.66);
  font-size: 1.18rem;
  font-weight: 900;
  letter-spacing: 0.08em;
  text-shadow: 0 1px 0 rgba(255, 255, 255, 0.22);
}

.journey-tech-panel {
  inset: 0;
}

.journey-tech-copy {
  position: absolute;
  top: 12vh;
  left: clamp(0rem, 3vw, 2rem);
  display: grid;
  gap: 1.2rem;
  width: min(26rem, 38vw);
  padding: 0;
  border: 0;
  border-radius: 0;
  background: transparent;
  box-shadow: none;
  backdrop-filter: none;
  text-shadow: 0 12px 36px rgba(73, 48, 79, 0.22);
}

.journey-tech-copy h3 {
  font-size: clamp(2.7rem, 5vw, 5.4rem);
  letter-spacing: -0.035em;
}

.tech-cloud-field {
  position: absolute;
  top: 26vh;
  left: 0;
  right: 0;
  height: 42vh;
  overflow: hidden;
  pointer-events: none;
  mask-image: linear-gradient(90deg, transparent 0%, #000 12%, #000 88%, transparent 100%);
}

.message-wall-field {
  position: absolute;
  top: 58vh;
  left: 0;
  right: 0;
  height: 25vh;
  overflow: hidden;
  pointer-events: none;
  mask-image: linear-gradient(90deg, transparent 0%, #000 14%, #000 86%, transparent 100%);
}

.tech-cloud {
  position: absolute;
  top: var(--cloud-row);
  right: -12rem;
  z-index: 1;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: auto;
  min-height: 0;
  padding: 0;
  border: 0;
  border-radius: 0;
  background: transparent;
  color: rgba(255, 244, 223, 0.64);
  font-size: clamp(0.9rem, 1.35vw, 1.32rem);
  font-weight: 900;
  letter-spacing: 0.04em;
  white-space: nowrap;
  box-shadow: none;
  text-shadow:
    0 0 18px rgba(255, 238, 209, 0.28),
    0 12px 34px rgba(77, 48, 88, 0.36);
  animation: cloudDrift var(--cloud-duration) linear infinite;
  animation-delay: var(--cloud-delay);
  animation-play-state: paused;
  backdrop-filter: none;
}

.journey-section.is-section-visible .tech-cloud {
  animation-play-state: running;
}

.tech-cloud::before,
.tech-cloud::after {
  content: none;
}

.message-wall-note {
  right: -22rem;
  color: rgba(255, 241, 220, 0.56);
  font-size: clamp(0.82rem, 1vw, 1.02rem);
  letter-spacing: 0.08em;
  text-shadow:
    0 0 14px rgba(255, 224, 190, 0.18),
    0 12px 30px rgba(32, 22, 54, 0.32);
}

@keyframes cloudDrift {
  from {
    transform: translate3d(22vw, 0, 0);
  }

  to {
    transform: translate3d(-128vw, 0, 0);
  }
}

.journey-experience-panel {
  inset: 0;
}

.experience-rail-window {
  position: absolute;
  left: -1.4rem;
  right: -1.4rem;
  top: 16vh;
  height: 70vh;
  overflow-x: auto;
  overflow-y: hidden;
  padding: 1.6rem 1.4rem 1.4rem;
  scrollbar-width: none;
  touch-action: pan-y pinch-zoom;
  scroll-snap-type: none;
  overscroll-behavior-x: contain;
  -webkit-overflow-scrolling: touch;
  -webkit-user-select: none;
  user-select: none;
  contain: layout paint;
  isolation: isolate;
}

.experience-rail-window.is-dragging {
  scroll-snap-type: none;
}

.experience-rail-window::-webkit-scrollbar {
  display: none;
}

.experience-track-line {
  position: absolute;
  left: 1rem;
  right: 1rem;
  top: 49%;
  height: 2px;
  background: linear-gradient(90deg, transparent, rgba(255, 244, 216, 0.64), transparent);
  box-shadow: 0 0 18px rgba(255, 211, 165, 0.26);
}

.experience-carriages {
  position: relative;
  z-index: 1;
  display: grid;
  grid-auto-columns: clamp(21rem, 31vw, 32rem);
  grid-template-rows: repeat(2, minmax(11.25rem, 1fr));
  column-gap: clamp(1.8rem, 4.8vw, 5rem);
  row-gap: 1.35rem;
  width: max-content;
  min-width: max-content;
  padding: 0 42vw 0 10vw;
  transform: translateZ(0);
  will-change: transform;
}

.experience-car {
  position: relative;
  grid-column: var(--car-column);
  grid-row: var(--car-row);
  width: auto;
  min-height: 11.25rem;
  padding: 1.08rem 1.18rem 1.18rem;
  border: 1px solid rgba(255, 247, 226, 0.24);
  border-radius: 20px 20px 24px 24px;
  background:
    linear-gradient(180deg, rgba(35, 53, 84, 0.74), rgba(35, 43, 70, 0.58)),
    radial-gradient(circle at 18% 20%, rgba(255, 229, 178, 0.18), transparent 28%);
  box-shadow:
    0 16px 36px rgba(19, 26, 48, 0.22),
    inset 0 1px 0 rgba(255, 255, 255, 0.18);
  cursor: grab;
  touch-action: pan-x pinch-zoom;
  -webkit-user-select: none;
  user-select: none;
  contain: layout paint;
  will-change: transform;
}

.experience-rail-window.is-dragging .experience-car {
  cursor: grabbing;
}

.experience-car:nth-child(2n) {
  transform: translate3d(0, 0.55rem, 0);
}

.experience-car:nth-child(2n + 1) {
  transform: translate3d(0, -0.35rem, 0);
}

.experience-car::before {
  content: "";
  position: absolute;
  left: 1.2rem;
  right: 1.2rem;
  top: 0.92rem;
  height: 0.35rem;
  border-radius: 999px;
  background: linear-gradient(90deg, rgba(255, 218, 137, 0.92), rgba(255, 218, 137, 0.22));
}

.experience-car::after {
  content: "";
  position: absolute;
  left: 1.6rem;
  right: 1.6rem;
  bottom: -0.38rem;
  height: 0.72rem;
  border-radius: 999px;
  background: radial-gradient(circle, rgba(21, 25, 42, 0.74) 0 32%, transparent 34%) left/4rem 100% repeat-x;
  opacity: 0.78;
}

.experience-car span,
.experience-car time {
  display: inline-flex;
  margin-top: 0.52rem;
  color: rgba(255, 232, 202, 0.74);
  font-size: 0.72rem;
  font-weight: 900;
  letter-spacing: 0.14em;
  text-transform: uppercase;
}

.experience-car time {
  margin-left: 0.55rem;
}

.experience-car h4 {
  margin: 0.85rem 0 0.4rem;
  color: #fff3df;
  font-size: 1.18rem;
  font-weight: 900;
  line-height: 1.15;
}

.experience-car strong {
  display: block;
  margin-bottom: 0.55rem;
  color: rgba(255, 221, 156, 0.92);
  font-size: 0.92rem;
}

.experience-car p {
  color: rgba(255, 245, 231, 0.78);
  font-size: 0.9rem;
  font-weight: 700;
  line-height: 1.68;
}

.journey-sky-contact-panel {
  top: 8vh;
  left: 50%;
  translate: -50% 0;
  display: grid;
  grid-template-columns: minmax(19rem, 0.78fr) minmax(26rem, 1.22fr);
  gap: clamp(1.5rem, 3vw, 2.7rem);
  align-items: stretch;
  width: min(74rem, calc(100vw - 4rem));
  padding: 0;
}

.journey-contact-overview,
.journey-guestbook-form {
  position: relative;
  overflow: hidden;
  border: 1px solid rgba(255, 226, 190, 0.06);
  border-radius: 28px;
  background:
    radial-gradient(circle at 86% 10%, rgba(255, 204, 145, 0.035), transparent 32%),
    linear-gradient(160deg, rgba(92, 66, 124, 0.035), rgba(91, 55, 82, 0.028) 48%, rgba(122, 76, 55, 0.025));
  box-shadow:
    0 16px 42px rgba(60, 38, 70, 0.07),
    inset 0 1px 0 rgba(255, 242, 224, 0.045);
  backdrop-filter: blur(6px) saturate(1.02);
}

.journey-contact-overview::before,
.journey-guestbook-form::before {
  content: "";
  position: absolute;
  inset: 0;
  background:
    linear-gradient(135deg, rgba(255, 246, 226, 0.018), transparent 34%),
    radial-gradient(circle at 14% 92%, rgba(166, 138, 219, 0.022), transparent 34%);
  pointer-events: none;
}

.journey-contact-overview {
  display: grid;
  gap: clamp(1.1rem, 2vw, 1.7rem);
  align-content: start;
  padding: clamp(1.35rem, 2.7vw, 2.05rem);
}

.journey-contact-copy {
  position: relative;
  z-index: 1;
  display: grid;
  gap: 0.72rem;
  width: min(32rem, 100%);
}

.journey-contact-copy h3 {
  font-size: clamp(1.8rem, 2.5vw, 2.75rem);
}

.journey-contact-copy p {
  max-width: 30rem;
  font-size: 0.9rem;
  line-height: 1.66;
}

.journey-contact-links {
  position: relative;
  z-index: 1;
  display: grid;
  grid-template-columns: 1fr;
  gap: 0.78rem;
}

.journey-contact-link {
  display: grid;
  grid-template-columns: minmax(4.2rem, 0.34fr) 1fr;
  gap: 0.8rem;
  align-items: center;
  min-height: 3.45rem;
  padding: 0.76rem 0.9rem;
  border: 1px solid rgba(255, 230, 205, 0.055);
  border-radius: 18px;
  background:
    linear-gradient(180deg, rgba(255, 238, 214, 0.018), rgba(89, 63, 101, 0.025));
  color: #fff0df;
  text-decoration: none;
  transition: transform 0.18s ease, border-color 0.18s ease, background-color 0.18s ease;
}

.journey-contact-link:hover {
  transform: translateY(-2px);
  border-color: rgba(255, 221, 178, 0.13);
  background:
    linear-gradient(180deg, rgba(255, 238, 214, 0.035), rgba(125, 74, 95, 0.045));
}

.journey-contact-link strong {
  font-size: 0.9rem;
  font-weight: 900;
}

.journey-contact-link small {
  display: block;
  min-width: 0;
  font-size: 0.82rem;
  line-height: 1.42;
  overflow-wrap: anywhere;
  word-break: break-word;
}

.journey-guestbook-form {
  display: grid;
  grid-template-columns: 1fr;
  gap: 0.95rem;
  align-self: stretch;
  align-content: start;
  padding: clamp(1.25rem, 2.5vw, 1.9rem);
}

.guestbook-note-head {
  position: relative;
  z-index: 1;
  display: grid;
  gap: 0.35rem;
}

.guestbook-note-head h4 {
  margin: 0;
  color: rgba(255, 243, 226, 0.94);
  font-size: clamp(1.35rem, 2.2vw, 2.15rem);
  font-weight: 900;
  line-height: 1.04;
  letter-spacing: -0.02em;
}

.journey-field {
  position: relative;
  z-index: 1;
  display: grid;
  gap: 0.38rem;
}

.journey-field span {
  color: rgba(255, 241, 229, 0.82);
  font-size: 0.78rem;
  font-weight: 800;
}

.journey-field input,
.journey-field textarea {
  width: 100%;
  min-width: 0;
  max-width: 100%;
  box-sizing: border-box;
  padding: 0.82rem 0;
  border: 0;
  border-bottom: 1px solid rgba(255, 226, 204, 0.16);
  border-radius: 0;
  background: transparent;
  color: #fff4ea;
  font: inherit;
  outline: none;
  transition: border-color 0.22s ease, background-color 0.22s ease, box-shadow 0.22s ease;
}

.journey-field textarea {
  min-height: 9rem;
  padding: 0.95rem 0;
  border-top: 1px solid rgba(255, 226, 204, 0.08);
  resize: vertical;
}

.journey-field input::placeholder,
.journey-field textarea::placeholder {
  color: rgba(255, 246, 232, 0.5);
}

.journey-field input:focus,
.journey-field textarea:focus {
  border-color: rgba(255, 218, 174, 0.42);
  background: transparent;
  box-shadow: none;
}

.journey-field-message {
  grid-row: auto;
}

.guestbook-note-foot {
  position: relative;
  z-index: 1;
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  gap: 1rem;
  align-items: end;
}

.journey-field-email {
  min-width: 0;
}

.journey-form-actions {
  display: flex;
  align-items: flex-end;
}

.guestbook-status-row {
  position: relative;
  z-index: 1;
  min-height: 1.4rem;
}

.journey-button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  justify-self: start;
  min-height: 2.75rem;
  padding: 0 1.25rem;
  border: 1px solid rgba(255, 226, 195, 0.28);
  border-radius: 14px;
  background: rgba(255, 231, 204, 0.13);
  color: #fff0df;
  font-size: 0.84rem;
  font-weight: 900;
  text-decoration: none;
  cursor: pointer;
  box-shadow:
    0 14px 30px rgba(52, 31, 55, 0.14),
    inset 0 1px 0 rgba(255, 255, 255, 0.12);
  backdrop-filter: blur(8px);
  transition: transform 0.18s ease, background-color 0.18s ease, border-color 0.18s ease;
}

.journey-button:hover {
  transform: translateY(-1px);
  border-color: rgba(255, 226, 195, 0.42);
  background: rgba(255, 231, 204, 0.2);
}

.journey-button:disabled {
  opacity: 0.68;
  cursor: wait;
  transform: none;
}

.journey-form-status.is-success {
  color: #e3ffd8;
}

.journey-form-status.is-error {
  color: #ffd0bd;
}

.journey-outro-panel {
  left: 50%;
  bottom: 32vh;
  width: min(34rem, 78vw);
  display: grid;
  gap: 0.85rem;
  text-align: center;
  translate: -50% 0;
}

@media (prefers-reduced-motion: reduce) {
  .journey-runway {
    min-height: 100svh;
  }

  .journey-stage {
    position: relative;
    height: auto;
    min-height: 100svh;
  }

  .journey-progress {
    display: none;
  }

  .journey-panel,
  .experience-carriages,
  .tech-cloud {
    transition: none;
    animation: none;
  }
}

@media (max-width: 1080px) {
  .journey-letter-panel {
    width: min(34rem, 72vw);
  }

  .journey-tech-copy {
    width: min(27rem, 58vw);
  }

  .journey-sky-contact-panel,
  .journey-guestbook-form {
    grid-template-columns: 1fr;
  }

  .journey-field-message {
    grid-row: auto;
  }
}

@media (max-width: 820px) {
  .journey-runway {
    min-height: 340svh;
  }

  .journey-overlay {
    width: min(100%, calc(100% - 2rem));
  }

  .journey-letter-panel {
    top: 12vh;
    left: 0;
    width: min(100%, 32rem);
  }

  .journey-letter h2 {
    font-size: clamp(2rem, 9vw, 3.4rem);
  }

  .journey-tech-copy {
    left: 0;
    right: auto;
    width: min(100%, 28rem);
  }

  .tech-cloud-field {
    top: 30vh;
    height: 38vh;
  }

  .message-wall-field {
    top: 62vh;
    height: 20vh;
  }

  .experience-rail-window {
    top: 24vh;
    height: 62vh;
  }

  .experience-carriages {
    grid-auto-columns: minmax(17.5rem, 74vw);
    column-gap: 1rem;
    padding: 0 30vw 0 12vw;
  }

  .journey-sky-contact-panel {
    top: 5vh;
    width: min(100%, calc(100vw - 2rem));
    max-height: 90vh;
    overflow-y: auto;
  }

  .journey-contact-links {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 560px) {
  .journey-panel p,
  .journey-contact-copy p,
  .journey-contact-link small,
  .journey-form-status,
  .experience-car p {
    font-size: 0.88rem;
    line-height: 1.62;
  }

  .journey-letter {
    padding: 1.1rem;
    max-height: 82svh;
    overflow-y: auto;
    gap: 0.65rem;
  }

  .journey-letter h2 {
    font-size: clamp(1.85rem, 8.4vw, 2.8rem);
  }

  .journey-letter p:not(.journey-kicker) {
    font-size: 0.82rem;
    line-height: 1.56;
  }

  .journey-letter strong {
    font-size: 1rem;
  }

  .journey-letter::after {
    width: 3.25rem;
    height: 3.25rem;
  }

  .journey-tech-copy {
    top: 6vh;
  }

  .journey-sky-contact-panel {
    max-height: 90vh;
    overflow-y: auto;
  }
}
</style>
