<template>
  <section id="experience-section" class="experience-section" aria-labelledby="experience-title">
    <div class="experience-shell">
      <nav class="experience-nav" aria-label="Profile sections">
        <a href="#experience-title" class="brand-mark"><span>Bejoy</span></a>
        <div class="nav-links">
          <a href="#experience-title">{{ experienceCopy.nav.home }}</a>
          <a href="#about-panel">{{ experienceCopy.nav.intro }}</a>
          <a href="#skills-panel">{{ experienceCopy.nav.skills }}</a>
          <a href="#contact-panel">{{ experienceCopy.nav.contact }}</a>
          <a class="nav-plate-link" href="https://car.chenkanghong.top" target="_blank" rel="noopener noreferrer">AI识别车牌项目</a>
        </div>
      </nav>

      <div class="experience-stage">
        <header id="experience-title" class="intro-panel animate-on-scroll" data-animation-delay="0ms" data-enter="up">
          <div class="intro-copy">
            <p class="section-kicker">Profile</p>
            <h2>{{ experienceCopy.brand }}</h2>
            <p class="hero-summary">
              {{ experienceCopy.heroSummary.before }}
              <a class="hero-summary-link" :href="experienceCopy.heroSummary.linkHref">
                {{ experienceCopy.heroSummary.linkText }}
              </a>
              {{ experienceCopy.heroSummary.after }}
            </p>
          </div>

          <div class="intro-side">
            <div class="breathing-loader" aria-hidden="true">
              <span class="loader-core"></span>
              <span class="loader-ring loader-ring-a"></span>
              <span class="loader-ring loader-ring-b"></span>
              <span class="loader-line"></span>
              <span class="loader-label">CHEN KANGHONG</span>
            </div>

            <div class="intro-metrics" aria-label="Profile highlights">
              <div v-for="item in experienceStats" :key="item.label" class="intro-metric">
                <span class="intro-metric-value">{{ item.value }}</span>
                <span class="intro-metric-label">{{ item.label }}</span>
              </div>
            </div>
          </div>
        </header>

        <section id="about-panel" class="profile-panel animate-on-scroll" data-animation-delay="120ms" data-enter="left">
          <div class="profile-visual">
            <div class="profile-picture-frame">
              <picture>
                <source :srcset="profileAvatarWebpSrc" type="image/webp">
                <img
                  :src="profileAvatarSrc"
                  alt="Profile avatar"
                  width="471"
                  height="480"
                  loading="lazy"
                  decoding="async"
                >
              </picture>
            </div>
          </div>

          <div class="profile-copy">
            <p class="section-kicker">About</p>
            <p class="profile-role">{{ experienceCopy.role }}</p>
            <p class="profile-text">{{ experienceCopy.profileText }}</p>
          </div>
        </section>

        <section id="skills-panel" class="skills-panel animate-on-scroll" data-animation-delay="180ms" data-enter="up">
          <div class="panel-heading">
            <p class="section-kicker">Toolkit</p>
            <h3>{{ experienceCopy.skillsTitle }}</h3>
            <p class="skills-note">{{ experienceCopy.skillsNote }}</p>
          </div>

          <div class="skill-marquee-shell">
            <div class="skill-track skill-track-forward">
              <span v-for="skill in marqueeSkills" :key="`forward-${skill}`" class="skill-chip">{{ skill }}</span>
            </div>
            <div class="skill-track skill-track-reverse">
              <span v-for="skill in marqueeSkillsReverse" :key="`reverse-${skill}`" class="skill-chip">{{ skill }}</span>
            </div>
          </div>
        </section>

        <div class="detail-grid">
          <section class="timeline-panel animate-on-scroll" data-animation-delay="220ms" data-enter="left">
            <div class="panel-heading">
              <p class="section-kicker">Recent Notes</p>
              <h3>{{ experienceCopy.recentTitle }}</h3>
            </div>

            <div class="recent-list-shell">
              <ul ref="recentListRef" class="recent-list" aria-label="杩戞湡鍔ㄦ€?" @scroll.passive="handleRecentScroll">
                <li v-for="item in recentItems" :key="item.label + item.text" class="recent-item">
                  <span class="recent-year">{{ item.label }}</span>
                  <p>{{ item.text }}</p>
                </li>
              </ul>
              <div
                v-if="recentScrollbar.enabled"
                class="recent-scrollbar"
                :class="{ 'is-visible': recentScrollbarVisible }"
                aria-hidden="true"
              >
                <span class="recent-scrollbar-thumb" :style="recentScrollbarThumbStyle"></span>
              </div>
            </div>
          </section>

          <section id="contact-panel" class="contact-panel animate-on-scroll" data-animation-delay="280ms" data-enter="right">
            <div class="panel-heading">
              <p class="section-kicker">Contact</p>
              <h3>{{ experienceCopy.contactTitle }}</h3>
            </div>

            <p class="contact-text">{{ experienceCopy.contactText }}</p>

            <div class="contact-links" aria-label="Contact links">
              <component
                :is="item.href ? 'a' : 'div'"
                v-for="item in contactLinkItems"
                :key="item.label"
                class="contact-link"
                :href="item.href || undefined"
                :target="getContactTarget(item.href)"
                :rel="getContactRel(item.href)"
                :aria-label="`${item.label}锛?{item.value || item.href}`"
              >
                <strong>{{ item.label }}</strong>
                <small>{{ item.value || item.href }}</small>
              </component>
            </div>
          </section>
        </div>

        <section id="guestbook-card" class="guestbook-panel animate-on-scroll" data-animation-delay="320ms" data-enter="up" aria-labelledby="guestbook-title">
          <div class="guestbook-copy">
            <p class="section-kicker">Guestbook</p>
            <h2 id="guestbook-title">{{ guestbookCopy.title }}</h2>
            <p>{{ guestbookCopy.description }}</p>
            <div class="guestbook-image">
              <picture>
                <source srcset="/gallery/display/guestbook-photo.webp" type="image/webp">
                <img
                  src="/gallery/display/guestbook-photo.jpg"
                  alt="Guestbook image"
                  width="248"
                  height="250"
                  loading="lazy"
                  decoding="async"
                >
              </picture>
            </div>
          </div>

          <form class="guestbook-form" @submit.prevent="submitGuestbook">
            <label class="guestbook-field">
              <span>{{ guestbookCopy.fields.email }}</span>
              <input
                v-model.trim="guestbookForm.email"
                type="email"
                :placeholder="guestbookCopy.placeholders.email"
                required
              >
            </label>

            <label class="guestbook-field guestbook-field-message">
              <span>{{ guestbookCopy.fields.message }}</span>
              <textarea
                v-model.trim="guestbookForm.message"
                :placeholder="guestbookCopy.placeholders.message"
                :maxlength="guestbookCopy.messageMaxLength"
                rows="6"
                required
              ></textarea>
            </label>

            <div class="guestbook-actions">
              <button class="guestbook-submit" type="submit" :disabled="isSubmitting">
                {{ isSubmitting ? '鍙戦€佷腑...' : guestbookCopy.submit }}
              </button>
              <p v-if="guestbookCopy.note" class="guestbook-note">{{ guestbookCopy.note }}</p>
              <p
                v-if="guestbookStatus"
                class="guestbook-status"
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
    </div>

    <div class="experience-section-bottom-haze" aria-hidden="true"></div>
  </section>
</template>

<script setup>
import { computed, onBeforeUnmount, onMounted, ref } from 'vue';
import {
  contactLinkItems,
  experienceCopy,
  guestbookCopy,
  recentItems,
  skillItems
} from '../../content/experienceContent';
import { profileAvatarSrc, profileAvatarWebpSrc } from '../../content/assetContent';

const guestbookForm = ref({
  email: '',
  message: ''
});

const guestbookStatus = ref('');
const guestbookStatusType = ref('');
const isSubmitting = ref(false);
const recentListRef = ref(null);
const recentScrollbarVisible = ref(false);
const recentScrollbar = ref({
  enabled: false,
  thumbHeight: 0,
  thumbOffset: 0
});

const experienceStats = computed(() => ([
  {
    label: 'Tool Stack',
    value: String(skillItems.length).padStart(2, '0')
  },
  {
    label: 'Recent Notes',
    value: String(recentItems.length).padStart(2, '0')
  },
  {
    label: 'Links',
    value: String(contactLinkItems.length).padStart(2, '0')
  }
]));

const marqueeSkills = computed(() => [...skillItems, ...skillItems]);
const marqueeSkillsReverse = computed(() => [...skillItems].reverse().concat([...skillItems].reverse()));

const recentScrollbarThumbStyle = computed(() => ({
  height: `${recentScrollbar.value.thumbHeight}px`,
  transform: `translate3d(0, ${recentScrollbar.value.thumbOffset}px, 0)`
}));

let recentScrollbarTimer = 0;
let animationObserver = null;

const updateRecentScrollbar = () => {
  const element = recentListRef.value;
  if (!element) return;

  const maxScroll = Math.max(element.scrollHeight - element.clientHeight, 0);
  const enabled = maxScroll > 1;

  if (!enabled) {
    recentScrollbar.value = {
      enabled: false,
      thumbHeight: 0,
      thumbOffset: 0
    };
    return;
  }

  const visibleRatio = element.clientHeight / element.scrollHeight;
  const thumbHeight = Math.max(element.clientHeight * visibleRatio, 36);
  const trackTravel = Math.max(element.clientHeight - thumbHeight, 0);
  const thumbOffset = maxScroll > 0
    ? (element.scrollTop / maxScroll) * trackTravel
    : 0;

  recentScrollbar.value = {
    enabled: true,
    thumbHeight,
    thumbOffset
  };
};

const showRecentScrollbar = () => {
  recentScrollbarVisible.value = true;

  if (recentScrollbarTimer) {
    clearTimeout(recentScrollbarTimer);
  }

  recentScrollbarTimer = window.setTimeout(() => {
    recentScrollbarVisible.value = false;
  }, 1600);
};

const handleRecentScroll = () => {
  updateRecentScrollbar();
  showRecentScrollbar();
};

const isHttpLink = (href) => /^https?:\/\//i.test(href || '');
const getContactTarget = (href) => (isHttpLink(href) ? '_blank' : undefined);
const getContactRel = (href) => (isHttpLink(href) ? 'noopener noreferrer' : undefined);

const submitGuestbook = async () => {
  const email = guestbookForm.value.email.trim();
  const message = guestbookForm.value.message.trim();

  if (!email || !message) {
    guestbookStatusType.value = 'error';
    guestbookStatus.value = '璇峰厛濉啓閭鍜岀暀瑷€鍐呭銆?';
    return;
  }

  isSubmitting.value = true;
  guestbookStatusType.value = '';
  guestbookStatus.value = '姝ｅ湪鍙戦€佺暀瑷€...';

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
      guestbookStatus.value = result.message || '鍙戦€佸け璐ワ紝璇风◢鍚庡啀璇曘€?';
      return;
    }

    guestbookStatusType.value = 'success';
    guestbookStatus.value = result.message || '鐣欒█宸茬粡鍙戦€佹垚鍔熴€?';
    guestbookForm.value.email = '';
    guestbookForm.value.message = '';
  } catch (error) {
    guestbookStatusType.value = 'error';
    guestbookStatus.value = error instanceof Error ? error.message : '鍙戦€佸け璐ワ紝璇风◢鍚庡啀璇曘€?';
  } finally {
    isSubmitting.value = false;
  }
};

const initScrollAnimations = () => {
  const elements = document.querySelectorAll('.animate-on-scroll');
  if (!elements.length || !('IntersectionObserver' in window)) return;

  animationObserver = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) return;

      const delay = entry.target.getAttribute('data-animation-delay') || '0ms';
      entry.target.style.setProperty('--enter-delay', delay);
      entry.target.classList.add('animate-in');
      animationObserver?.unobserve(entry.target);
    });
  }, {
    rootMargin: '0px 0px -10% 0px',
    threshold: 0.12
  });

  elements.forEach((el) => animationObserver?.observe(el));
};

onMounted(() => {
  updateRecentScrollbar();
  initScrollAnimations();
  window.addEventListener('resize', updateRecentScrollbar);
});

onBeforeUnmount(() => {
  clearTimeout(recentScrollbarTimer);
  animationObserver?.disconnect();
  window.removeEventListener('resize', updateRecentScrollbar);
});
</script>

<style scoped>
.experience-section {
  --accent-blue: #76c7d7;
  --accent-gold: #d3cb9a;
  --ink-strong: #142c3f;
  --ink-soft: rgba(20, 44, 63, 0.72);
  position: relative;
  min-height: 100svh;
  padding: 5.8rem 1.5rem 5.4rem;
  overflow-x: hidden;
  color: var(--ink-strong);
  font-family: 'Outfit', 'Noto Sans SC', 'Segoe UI', sans-serif;
  background:
    linear-gradient(180deg, rgba(3, 8, 14, 0.98) 0%, rgba(8, 18, 28, 0.82) 11%, rgba(213, 228, 236, 0.28) 25%, rgba(244, 247, 248, 0.98) 43%, rgba(247, 249, 250, 0.98) 60%, rgba(221, 232, 238, 0.84) 79%, rgba(33, 58, 76, 0.42) 93%, rgba(7, 15, 23, 0.94) 100%),
    radial-gradient(circle at 14% 24%, rgba(118, 199, 215, 0.14), transparent 24%),
    radial-gradient(circle at 84% 18%, rgba(211, 203, 154, 0.12), transparent 22%),
    repeating-linear-gradient(90deg, rgba(19, 58, 82, 0.03) 0 1px, transparent 1px 118px);
}

.experience-section::before {
  position: absolute;
  inset: 0;
  content: '';
  background-image:
    linear-gradient(180deg, rgba(32, 76, 104, 0.05) 0 1px, transparent 1px 100%),
    linear-gradient(90deg, rgba(32, 76, 104, 0.03) 0 1px, transparent 1px 100%);
  background-size: 72px 72px;
  opacity: 0.2;
  pointer-events: none;
}

.experience-section::after {
  position: absolute;
  inset: 0 auto auto 0;
  width: 100%;
  height: 18rem;
  content: '';
  background: linear-gradient(180deg, rgba(3, 8, 14, 0.98) 0%, rgba(8, 16, 24, 0.4) 42%, transparent 100%);
  pointer-events: none;
}

.experience-section-bottom-haze {
  position: absolute;
  inset: auto 0 0;
  height: 42vh;
  min-height: 18rem;
  pointer-events: none;
  background:
    radial-gradient(ellipse at 50% 100%, rgba(10, 28, 40, 0.62) 0%, rgba(10, 28, 40, 0.24) 36%, transparent 78%),
    linear-gradient(180deg, transparent 0%, rgba(10, 32, 48, 0.12) 22%, rgba(7, 24, 38, 0.46) 66%, rgba(4, 12, 22, 0.92) 100%);
  filter: blur(10px);
}

.experience-shell {
  position: relative;
  z-index: 1;
  width: min(100%, 1220px);
  margin: 0 auto;
}

.experience-nav {
  position: sticky;
  top: 1rem;
  z-index: 12;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  margin-bottom: 2.4rem;
  padding: 0.92rem 1.28rem 0.92rem 1.46rem;
  border: 1px solid rgba(255, 255, 255, 0.14);
  border-radius: 999px;
  background:
    linear-gradient(180deg, rgba(255, 255, 255, 0.62), rgba(237, 243, 245, 0.34)),
    linear-gradient(180deg, rgba(255, 255, 255, 0.18), transparent);
  box-shadow:
    0 18px 48px rgba(8, 24, 36, 0.1),
    inset 0 1px 0 rgba(255, 255, 255, 0.66);
  backdrop-filter: blur(18px) saturate(1.08);
}

.brand-mark,
.nav-links a {
  color: #24445f;
  text-decoration: none;
}

.brand-mark {
  flex: 0 0 auto;
  font-size: 1rem;
  font-weight: 900;
  letter-spacing: 0.05em;
  text-transform: uppercase;
}

.brand-mark span {
  color: var(--accent-blue);
}

.nav-links {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 0.38rem;
  flex-wrap: wrap;
  font-size: 0.8rem;
  font-weight: 800;
}

.nav-links a {
  padding: 0.62rem 0.88rem;
  border-radius: 999px;
  transition: background-color 0.28s ease, color 0.28s ease, transform 0.28s ease;
}

.nav-links a:hover {
  background: rgba(118, 199, 215, 0.1);
  color: #17324a;
  transform: translateY(-1px);
}

.nav-links .nav-plate-link {
  color: #102837;
  background: linear-gradient(135deg, rgba(118, 199, 215, 0.96), rgba(211, 203, 154, 0.94));
  box-shadow:
    0 12px 28px rgba(118, 199, 215, 0.18),
    inset 0 1px 0 rgba(255, 255, 255, 0.7);
  white-space: nowrap;
}

.nav-links .nav-plate-link:hover {
  color: #0d202c;
  background: linear-gradient(135deg, rgba(118, 199, 215, 1), rgba(218, 210, 160, 1));
}

.experience-stage {
  display: grid;
  gap: 3.8rem;
}

.section-kicker,
.panel-heading h3,
.panel-heading p,
.profile-copy p,
.intro-copy p,
.contact-panel p,
.guestbook-copy p {
  margin: 0;
}

.section-kicker {
  color: rgba(26, 94, 124, 0.82);
  font-size: 0.76rem;
  font-weight: 900;
  letter-spacing: 0.16em;
  text-transform: uppercase;
}

.intro-panel {
  display: grid;
  grid-template-columns: minmax(0, 1.1fr) minmax(18rem, 0.86fr);
  gap: 3rem;
  align-items: center;
  min-height: 70svh;
  padding: 0 0 1rem;
}

.intro-copy {
  display: grid;
  gap: 1.2rem;
  align-content: start;
}

.intro-copy h2 {
  margin: 0;
  max-width: 9ch;
  color: #152d40;
  font-size: clamp(3.2rem, 6vw, 6.2rem);
  font-weight: 900;
  line-height: 0.92;
  letter-spacing: -0.05em;
}

.hero-summary {
  max-width: 34rem;
  color: var(--ink-soft);
  font-size: 1.02rem;
  font-weight: 700;
  line-height: 1.86;
}

.hero-summary-link {
  color: #1b89a8;
  font-weight: 900;
  text-decoration: none;
}

.hero-summary-link:hover {
  text-decoration: underline;
}

.intro-side {
  display: grid;
  gap: 2rem;
  justify-items: center;
}

.breathing-loader {
  position: relative;
  display: grid;
  place-items: center;
  width: min(100%, 22rem);
  aspect-ratio: 1 / 1;
}

.loader-core,
.loader-ring,
.loader-line {
  position: absolute;
  inset: 0;
  border-radius: 50%;
}

.loader-core {
  inset: 25%;
  background: radial-gradient(circle, rgba(255, 255, 255, 0.92) 0%, rgba(235, 242, 245, 0.72) 48%, rgba(118, 199, 215, 0.08) 100%);
  box-shadow:
    0 24px 48px rgba(28, 64, 86, 0.1),
    inset 0 1px 0 rgba(255, 255, 255, 0.8);
  animation: breathe-core 5.8s ease-in-out infinite;
}

.loader-ring {
  border: 1px solid rgba(22, 70, 96, 0.12);
}

.loader-ring-a {
  inset: 10%;
  animation: breathe-ring 6.4s ease-in-out infinite;
}

.loader-ring-b {
  inset: 0;
  border-color: rgba(22, 70, 96, 0.08);
  animation: breathe-ring 6.4s ease-in-out infinite reverse;
}

.loader-line {
  inset: 6% 50%;
  width: 1px;
  border-radius: 999px;
  background: linear-gradient(180deg, rgba(118, 199, 215, 0), rgba(118, 199, 215, 0.62), rgba(118, 199, 215, 0));
  animation: loader-scan 5.6s cubic-bezier(0.16, 1, 0.3, 1) infinite;
}

.loader-label {
  position: relative;
  z-index: 1;
  color: rgba(20, 44, 63, 0.68);
  font-size: 0.82rem;
  font-weight: 900;
  letter-spacing: 0.22em;
  text-transform: uppercase;
}

.intro-metrics {
  display: grid;
  width: min(100%, 24rem);
  gap: 0.7rem;
}

.intro-metric {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 1rem;
  padding-top: 0.9rem;
  border-top: 1px solid rgba(18, 54, 78, 0.12);
}

.intro-metric:first-child {
  padding-top: 0;
  border-top: 0;
}

.intro-metric-value {
  color: #142c3f;
  font-size: clamp(1.8rem, 3vw, 2.7rem);
  font-weight: 900;
  line-height: 1;
  letter-spacing: -0.04em;
}

.intro-metric-label {
  color: rgba(20, 44, 63, 0.62);
  font-size: 0.78rem;
  font-weight: 800;
  letter-spacing: 0.1em;
  text-transform: uppercase;
}

.profile-panel {
  display: grid;
  grid-template-columns: minmax(18rem, 23rem) minmax(0, 1fr);
  gap: 4rem;
  align-items: center;
  padding: 1rem 0;
}

.profile-picture-frame {
  position: relative;
  width: 100%;
  aspect-ratio: 1 / 1.06;
  padding: 0.52rem;
  border: 1px solid rgba(255, 255, 255, 0.36);
  border-radius: 24px;
  background:
    linear-gradient(180deg, rgba(255, 255, 255, 0.82), rgba(234, 242, 245, 0.66)),
    linear-gradient(180deg, rgba(255, 255, 255, 0.18), transparent);
  box-shadow:
    0 24px 56px rgba(28, 64, 86, 0.08),
    inset 0 1px 0 rgba(255, 255, 255, 0.86);
}

.profile-picture-frame::after {
  position: absolute;
  inset: 0;
  content: '';
  border-radius: inherit;
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.66);
  pointer-events: none;
}

.profile-picture-frame picture,
.guestbook-image picture,
.profile-picture-frame img,
.guestbook-image img {
  display: block;
  width: 100%;
  height: 100%;
}

.profile-picture-frame img,
.guestbook-image img {
  border-radius: 18px;
  object-fit: cover;
  object-position: 58% center;
}

.profile-copy {
  display: grid;
  gap: 1rem;
}

.profile-role {
  color: #142c3f;
  font-size: clamp(1.5rem, 2vw, 2rem);
  font-weight: 900;
  line-height: 1.08;
}

.profile-text,
.skills-note,
.contact-text,
.guestbook-copy p,
.guestbook-note,
.guestbook-status,
.recent-item p {
  color: var(--ink-soft);
  font-size: 1rem;
  font-weight: 700;
  line-height: 1.82;
}

.skills-panel {
  display: grid;
  gap: 1.6rem;
  padding: 1.1rem 0;
}

.panel-heading {
  display: grid;
  gap: 0.6rem;
}

.panel-heading h3,
.guestbook-copy h2 {
  margin: 0;
  color: #142c3f;
  font-size: clamp(1.65rem, 2vw, 2.25rem);
  font-weight: 900;
  line-height: 1.04;
}

.skill-marquee-shell {
  display: grid;
  gap: 0.9rem;
  overflow: hidden;
}

.skill-track {
  display: inline-flex;
  width: max-content;
  min-width: 100%;
  gap: 0.88rem;
}

.skill-track-forward {
  animation: marquee-forward 24s linear infinite;
}

.skill-track-reverse {
  animation: marquee-reverse 28s linear infinite;
}

.skill-marquee-shell:hover .skill-track {
  animation-play-state: paused;
}

.skill-chip {
  display: inline-flex;
  align-items: center;
  min-height: 2.85rem;
  padding: 0 1.12rem;
  border: 1px solid rgba(27, 90, 120, 0.1);
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.52);
  color: #1a4662;
  font-size: 0.84rem;
  font-weight: 800;
  letter-spacing: 0.03em;
  box-shadow:
    inset 0 1px 0 rgba(255, 255, 255, 0.76),
    0 12px 24px rgba(26, 64, 88, 0.04);
}

.detail-grid {
  display: grid;
  grid-template-columns: minmax(0, 1.15fr) minmax(18rem, 0.78fr);
  gap: 3rem;
  align-items: start;
}

.timeline-panel,
.contact-panel {
  display: grid;
  gap: 1.4rem;
}

.recent-list-shell {
  position: relative;
}

.recent-list-shell::before {
  position: absolute;
  inset: 0 auto 0 0.82rem;
  width: 1px;
  content: '';
  background: linear-gradient(180deg, rgba(118, 199, 215, 0.34), rgba(118, 199, 215, 0.08) 78%, rgba(118, 199, 215, 0));
  pointer-events: none;
}

.recent-list {
  display: grid;
  gap: 1.35rem;
  max-height: 30rem;
  margin: 0;
  padding: 0 0.75rem 0 0;
  overflow-y: auto;
  overflow-x: hidden;
  list-style: none;
  scrollbar-width: none;
  -ms-overflow-style: none;
}

.recent-list::-webkit-scrollbar {
  width: 0;
  height: 0;
}

.recent-item {
  position: relative;
  display: grid;
  gap: 0.42rem;
  padding-left: 2rem;
}

.recent-item::before {
  position: absolute;
  top: 0.52rem;
  left: 0.63rem;
  width: 0.42rem;
  height: 0.42rem;
  border-radius: 50%;
  background: linear-gradient(135deg, var(--accent-blue), #a1dde7);
  box-shadow: 0 0 0 0.34rem rgba(118, 199, 215, 0.08);
  content: '';
}

.recent-item + .recent-item {
  padding-top: 1.18rem;
  border-top: 1px solid rgba(20, 54, 76, 0.08);
}

.recent-year {
  color: #1d88a4;
  font-size: 0.76rem;
  font-weight: 900;
  letter-spacing: 0.11em;
  text-transform: uppercase;
}

.recent-scrollbar {
  position: absolute;
  inset: 0 0 0 auto;
  width: 0.3rem;
  opacity: 0;
  transition: opacity 0.24s ease;
  pointer-events: none;
}

.recent-scrollbar.is-visible {
  opacity: 1;
}

.recent-scrollbar::before {
  position: absolute;
  inset: 0;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.12);
  content: '';
}

.recent-scrollbar-thumb {
  position: absolute;
  left: 0;
  width: 100%;
  min-height: 2.2rem;
  border-radius: 999px;
  background: linear-gradient(180deg, rgba(118, 199, 215, 0.92), rgba(211, 203, 154, 0.92));
  box-shadow: 0 0 12px rgba(118, 199, 215, 0.2);
}

.contact-links {
  display: grid;
  gap: 1rem;
  margin-top: 0.3rem;
}

.contact-link {
  display: grid;
  gap: 0.22rem;
  padding-top: 1rem;
  border-top: 1px solid rgba(20, 54, 76, 0.1);
  color: #173f5b;
  text-decoration: none;
  transition: transform 0.24s ease, color 0.24s ease;
}

.contact-link:first-child {
  padding-top: 0;
  border-top: 0;
}

.contact-link:hover {
  transform: translateX(4px);
  color: #103248;
}

.contact-link strong {
  font-size: 0.96rem;
  font-weight: 900;
}

.contact-link small {
  color: rgba(35, 67, 92, 0.7);
  font-size: 0.76rem;
  font-weight: 700;
  line-height: 1.58;
  word-break: break-all;
}

.guestbook-panel {
  display: grid;
  grid-template-columns: minmax(16rem, 21rem) minmax(0, 1fr);
  gap: 2.4rem;
  padding: 1.6rem 1.65rem;
  border: 1px solid rgba(255, 255, 255, 0.28);
  border-radius: 24px;
  background:
    linear-gradient(180deg, rgba(255, 255, 255, 0.8), rgba(234, 242, 245, 0.62)),
    linear-gradient(180deg, rgba(255, 255, 255, 0.16), transparent);
  box-shadow:
    0 26px 54px rgba(18, 48, 66, 0.08),
    inset 0 1px 0 rgba(255, 255, 255, 0.82);
}

.guestbook-copy {
  display: grid;
  gap: 0.72rem;
  align-content: start;
}

.guestbook-image {
  width: min(100%, 16rem);
  aspect-ratio: 1 / 1;
  margin-top: 0.15rem;
  overflow: hidden;
  border: 1px solid rgba(255, 255, 255, 0.3);
  border-radius: 20px;
  background: rgba(255, 255, 255, 0.5);
  box-shadow:
    0 16px 34px rgba(24, 55, 76, 0.08),
    inset 0 1px 0 rgba(255, 255, 255, 0.82);
}

.guestbook-form {
  display: grid;
  gap: 1rem;
  width: min(100%, 48rem);
  justify-self: end;
}

.guestbook-field {
  display: grid;
  gap: 0.45rem;
}

.guestbook-field span {
  color: #295570;
  font-size: 0.8rem;
  font-weight: 800;
  letter-spacing: 0.04em;
}

.guestbook-field input,
.guestbook-field textarea {
  width: 100%;
  min-width: 0;
  max-width: 100%;
  box-sizing: border-box;
  padding: 0.92rem 1rem;
  border: 1px solid rgba(112, 178, 207, 0.16);
  border-radius: 18px;
  background: rgba(255, 255, 255, 0.7);
  color: #224966;
  font: inherit;
  outline: none;
  transition: border-color 0.24s ease, box-shadow 0.24s ease, background-color 0.24s ease;
}

.guestbook-field textarea {
  min-height: 8rem;
  resize: vertical;
}

.guestbook-field input:focus,
.guestbook-field textarea:focus {
  border-color: rgba(118, 199, 215, 0.4);
  box-shadow: 0 0 0 4px rgba(118, 199, 215, 0.12);
  background: rgba(255, 255, 255, 0.86);
}

.guestbook-actions {
  display: grid;
  gap: 0.45rem;
}

.guestbook-submit {
  justify-self: start;
  min-height: 2.9rem;
  padding: 0 1.16rem;
  border: 0;
  border-radius: 999px;
  background: linear-gradient(135deg, rgba(118, 199, 215, 0.96), rgba(211, 203, 154, 0.96));
  color: #16384f;
  font: inherit;
  font-weight: 900;
  cursor: pointer;
  box-shadow:
    0 14px 30px rgba(118, 199, 215, 0.16),
    inset 0 1px 0 rgba(255, 255, 255, 0.7);
  transition: transform 0.18s ease, box-shadow 0.18s ease;
}

.guestbook-submit:hover {
  transform: translateY(-1px);
}

.guestbook-submit:active {
  transform: translateY(0);
}

.guestbook-submit:disabled {
  opacity: 0.72;
  cursor: wait;
  transform: none;
}

.guestbook-status {
  color: #2d7d9f;
}

.guestbook-status.is-success {
  color: #1f7a5a;
}

.guestbook-status.is-error {
  color: #b65454;
}

.animate-on-scroll {
  --enter-delay: 0ms;
  opacity: 0;
  filter: blur(10px);
  transform: translate3d(0, 28px, 0) scale(0.988);
  transition:
    opacity 0.76s cubic-bezier(0.16, 1, 0.3, 1),
    transform 0.82s cubic-bezier(0.16, 1, 0.3, 1),
    filter 0.76s cubic-bezier(0.16, 1, 0.3, 1);
  transition-delay: var(--enter-delay);
}

.animate-on-scroll[data-enter='left'] {
  transform: translate3d(-48px, 18px, 0) scale(0.988);
}

.animate-on-scroll[data-enter='right'] {
  transform: translate3d(48px, 18px, 0) scale(0.988);
}

.animate-on-scroll.animate-in {
  opacity: 1;
  filter: blur(0);
  transform: translate3d(0, 0, 0) scale(1);
}

@keyframes breathe-core {
  0%,
  100% {
    transform: scale(0.92);
    opacity: 0.92;
  }

  50% {
    transform: scale(1);
    opacity: 1;
  }
}

@keyframes breathe-ring {
  0%,
  100% {
    transform: scale(0.96);
    opacity: 0.34;
  }

  50% {
    transform: scale(1.04);
    opacity: 0.72;
  }
}

@keyframes loader-scan {
  0% {
    transform: translateY(-32%);
    opacity: 0;
  }

  12% {
    opacity: 0.72;
  }

  50% {
    transform: translateY(32%);
    opacity: 0.82;
  }

  100% {
    transform: translateY(40%);
    opacity: 0;
  }
}

@keyframes marquee-forward {
  from {
    transform: translate3d(0, 0, 0);
  }

  to {
    transform: translate3d(-50%, 0, 0);
  }
}

@keyframes marquee-reverse {
  from {
    transform: translate3d(-50%, 0, 0);
  }

  to {
    transform: translate3d(0, 0, 0);
  }
}

@media (max-width: 1080px) {
  .intro-panel,
  .profile-panel,
  .detail-grid,
  .guestbook-panel {
    grid-template-columns: 1fr;
  }

  .intro-copy h2 {
    max-width: none;
  }

  .intro-side {
    justify-items: start;
  }

  .guestbook-form {
    width: 100%;
    justify-self: stretch;
  }
}

@media (max-width: 900px) {
  .experience-section {
    padding-inline: 1rem;
  }

  .experience-nav {
    position: relative;
    top: 0;
    border-radius: 22px;
  }

  .experience-stage {
    gap: 2.4rem;
  }
}

@media (max-width: 768px) {
  .experience-section {
    padding: 3rem 0.9rem 3rem;
  }

  .experience-nav {
    justify-content: center;
    margin-bottom: 1.4rem;
    padding: 0.8rem;
  }

  .brand-mark {
    display: none;
  }

  .nav-links {
    width: 100%;
    justify-content: center;
  }

  .intro-panel {
    min-height: auto;
  }

  .intro-copy h2 {
    font-size: clamp(2.6rem, 11vw, 4rem);
  }

  .skill-chip {
    min-height: 2.55rem;
  }
}

@media (max-width: 540px) {
  .nav-links {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 0.45rem;
  }

  .nav-links a {
    justify-content: center;
  }

  .nav-links .nav-plate-link {
    grid-column: 1 / -1;
  }
}
</style>
