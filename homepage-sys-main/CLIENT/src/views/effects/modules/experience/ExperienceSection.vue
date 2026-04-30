<template>
  <section id="experience-section" class="experience-section" aria-labelledby="experience-title">
    <div class="experience-shell">
      <nav class="experience-nav" aria-label="Profile sections">
        <a href="#experience-title" class="brand-mark"><span>Bejoy</span></a>
        <div class="nav-links">
          <a href="#experience-title">{{ experienceCopy.nav.home }}</a>
          <a href="#about-card">{{ experienceCopy.nav.intro }}</a>
          <a href="#skills-card">{{ experienceCopy.nav.skills }}</a>
          <a href="#contact-card">{{ experienceCopy.nav.contact }}</a>
        </div>
      </nav>

      <div class="experience-grid">
        <article id="experience-title" class="experience-card hero-card">
          <h2><span>To</span>{{ experienceCopy.brand }}</h2>
          <p class="hero-summary">
            {{ experienceCopy.heroSummary.before }}
            <a class="hero-summary-link" :href="experienceCopy.heroSummary.linkHref">
              {{ experienceCopy.heroSummary.linkText }}
            </a>
            {{ experienceCopy.heroSummary.after }}
          </p>
          <span class="blue-dot" aria-hidden="true"></span>
        </article>

        <article id="skills-card" class="experience-card skills-card">
          <h3>{{ experienceCopy.skillsTitle }}</h3>
          <p class="skills-note">{{ experienceCopy.skillsNote }}</p>
          <div class="skill-list">
            <span
              v-for="(skill, index) in skillItems"
              :key="skill"
              :style="{ '--float-delay': `${index * 0.45}s` }"
            >{{ skill }}</span>
          </div>
        </article>

        <article id="about-card" class="experience-card profile-card">
          <div class="profile-picture-frame">
            <img :src="profileAvatarSrc" alt="Profile avatar">
          </div>
          <div class="profile-copy">
            <p class="profile-role">{{ experienceCopy.role }}</p>
            <p class="profile-text">{{ experienceCopy.profileText }}</p>
          </div>
        </article>

        <article class="experience-card timeline-card">
          <h3>{{ experienceCopy.recentTitle }}</h3>
          <div class="recent-list-shell">
            <ul ref="recentListRef" class="recent-list" aria-label="近期动态" @scroll.passive="handleRecentScroll">
              <li v-for="item in recentItems" :key="item.label" class="recent-item">
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
        </article>

        <article id="contact-card" class="experience-card contact-card">
          <h3>{{ experienceCopy.contactTitle }}</h3>
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
              :aria-label="`${item.label}：${item.value || item.href}`"
            >
              <strong>{{ item.label }}</strong>
              <small>{{ item.value || item.href }}</small>
            </component>
          </div>
        </article>
      </div>

      <div id="guestbook-card" class="guestbook-section" aria-labelledby="guestbook-title">
        <div class="experience-card guestbook-card">
          <div class="guestbook-copy">
            <h2 id="guestbook-title">{{ guestbookCopy.title }}</h2>
            <p>{{ guestbookCopy.description }}</p>
            <div class="guestbook-image">
              <img src="/gallery/guestbook-photo.jpg" alt="Guestbook image">
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
                {{ isSubmitting ? '发送中...' : guestbookCopy.submit }}
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
        </div>
      </div>
    </div>
  </section>
</template>

<script setup>
import { computed, onBeforeUnmount, onMounted, ref } from 'vue';
import {
  contactLinkItems,
  experienceCopy,
  guestbookCopy,
  profileAvatarSrc,
  recentItems,
  skillItems
} from '../../content/siteContent';

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

const recentScrollbarThumbStyle = computed(() => ({
  height: `${recentScrollbar.value.thumbHeight}px`,
  transform: `translate3d(0, ${recentScrollbar.value.thumbOffset}px, 0)`
}));

let recentScrollbarTimer = 0;

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
  }, 2000);
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
const handleWindowResize = () => {
  updateRecentScrollbar();
};

onMounted(() => {
  updateRecentScrollbar();
  window.addEventListener('resize', handleWindowResize);
});

onBeforeUnmount(() => {
  window.removeEventListener('resize', handleWindowResize);
  clearTimeout(recentScrollbarTimer);
});
</script>

<style scoped>
.experience-section {
  --accent-blue: #40dfff;
  --accent-cream: #f7eead;
  position: relative;
  min-height: 100svh;
  padding: 5rem 1.25rem 4rem;
  overflow-x: hidden;
  overflow-y: visible;
  color: #193a53;
  background:
    radial-gradient(circle at 50% -10%, rgba(255, 242, 174, 0.56), transparent 28%),
    radial-gradient(circle at 84% 14%, rgba(64, 223, 255, 0.24), transparent 22%),
    radial-gradient(circle at 18% 20%, rgba(255, 208, 137, 0.22), transparent 20%),
    linear-gradient(
      180deg,
      rgba(2, 7, 12, 0) 0%,
      rgba(4, 9, 15, 0.92) 9%,
      rgba(17, 34, 54, 0.62) 17%,
      rgba(72, 105, 140, 0.28) 24%,
      rgba(247, 238, 173, 0.28) 36%,
      rgba(223, 245, 255, 0.94) 58%,
      rgba(236, 249, 255, 0.98) 100%
    ),
    repeating-linear-gradient(90deg, rgba(24, 70, 101, 0.05) 0 1px, transparent 1px 74px);
}

.experience-section::before {
  position: absolute;
  inset: 0;
  content: '';
  background-image:
    linear-gradient(180deg, rgba(38, 97, 133, 0.08) 0 1px, transparent 1px 100%),
    linear-gradient(90deg, rgba(38, 97, 133, 0.05) 0 1px, transparent 1px 100%);
  background-size: 56px 56px;
  opacity: 0.26;
  pointer-events: none;
}

.experience-section::after {
  position: absolute;
  inset: 0 auto auto 0;
  width: 100%;
  height: 16rem;
  content: '';
  background:
    linear-gradient(180deg, rgba(2, 7, 12, 0.88) 0%, rgba(6, 14, 24, 0.58) 26%, rgba(17, 36, 57, 0.18) 62%, transparent 100%);
  pointer-events: none;
}

.experience-shell {
  position: relative;
  z-index: 1;
  width: min(100%, 1120px);
  margin: 0 auto;
}

.experience-nav {
  display: flex;
  align-items: center;
  justify-content: space-between;
  min-height: 4.5rem;
  margin-bottom: 1.7rem;
  padding: 0.95rem 1.6rem;
  border: 1px solid rgba(255, 255, 255, 0.45);
  border-radius: 8px;
  background:
    linear-gradient(135deg, rgba(255, 248, 238, 0.74), rgba(237, 248, 255, 0.54)),
    linear-gradient(180deg, rgba(255, 255, 255, 0.28), rgba(255, 255, 255, 0.08));
  box-shadow:
    0 24px 48px rgba(82, 122, 150, 0.12),
    inset 0 1px 0 rgba(255, 255, 255, 0.62);
  backdrop-filter: blur(18px);
}

.brand-mark,
.nav-links a {
  color: #24445f;
  text-decoration: none;
}

.brand-mark {
  font-size: 1.24rem;
  font-weight: 900;
}

.brand-mark span,
.nav-links a:first-child {
  color: var(--accent-blue);
}

.nav-links {
  display: flex;
  align-items: center;
  gap: 0.6rem;
  font-size: 0.88rem;
  font-weight: 800;
}

.nav-links a {
  padding: 0.58rem 0.9rem;
  border-radius: 999px;
  transition: background-color 0.2s ease, color 0.2s ease, transform 0.2s ease;
}

.nav-links a:hover {
  background: rgba(64, 223, 255, 0.12);
  color: #1d4562;
  transform: translateY(-1px);
}

.experience-grid {
  position: relative;
  display: grid;
  grid-template-columns: repeat(12, minmax(0, 1fr));
  grid-template-rows: auto auto auto;
  grid-auto-rows: minmax(0, auto);
  gap: 1.35rem;
  align-items: stretch;
}

.experience-grid::before {
  position: absolute;
  inset: -0.7rem 14% auto auto;
  width: 12rem;
  height: 12rem;
  border-radius: 50%;
  background: radial-gradient(circle, rgba(247, 238, 173, 0.42) 0%, rgba(247, 238, 173, 0) 72%);
  content: '';
  pointer-events: none;
  filter: blur(10px);
}

.experience-card {
  position: relative;
  overflow: hidden;
  min-height: 7rem;
  padding: 1.3rem;
  border: 1px solid rgba(255, 255, 255, 0.52);
  border-radius: 8px;
  background:
    linear-gradient(135deg, rgba(255, 249, 242, 0.78), rgba(237, 248, 255, 0.58)),
    linear-gradient(180deg, rgba(255, 255, 255, 0.2), rgba(255, 255, 255, 0));
  box-shadow:
    0 22px 48px rgba(84, 118, 143, 0.14),
    inset 0 1px 0 rgba(255, 255, 255, 0.65);
  backdrop-filter: blur(18px);
}

.experience-card::after {
  position: absolute;
  inset: 0;
  background: linear-gradient(135deg, rgba(255, 255, 255, 0.28), transparent 38%, transparent 72%, rgba(64, 223, 255, 0.08));
  content: '';
  pointer-events: none;
}

.experience-card h2,
.experience-card h3,
.experience-card p {
  position: relative;
  z-index: 1;
  margin: 0;
}

.hero-card {
  grid-column: 1 / span 7;
  grid-row: 1;
  display: grid;
  align-content: start;
  gap: 0.8rem;
  min-height: 8.6rem;
  padding-right: 5.6rem;
  background:
    linear-gradient(135deg, rgba(255, 248, 230, 0.84), rgba(231, 247, 255, 0.62)),
    linear-gradient(180deg, rgba(255, 255, 255, 0.26), rgba(255, 255, 255, 0));
}

.hero-card::before {
  position: absolute;
  top: -2.2rem;
  right: -2.3rem;
  width: 8.8rem;
  height: 8.8rem;
  border-radius: 50%;
  background: radial-gradient(circle, rgba(255, 183, 122, 0.62) 0%, rgba(255, 217, 156, 0.26) 45%, rgba(255, 255, 255, 0) 72%);
  content: '';
  filter: blur(6px);
}

.hero-card h2 {
  color: #1e435f;
  font-size: clamp(1.95rem, 3vw, 2.5rem);
  font-weight: 900;
  line-height: 1.02;
}

.hero-card h2 span {
  color: var(--accent-blue);
}

.hero-summary {
  max-width: 35rem;
  color: rgba(35, 67, 92, 0.86);
  font-size: 0.96rem;
  font-weight: 700;
  line-height: 1.68;
}

.hero-summary-link {
  color: var(--accent-blue);
  font-weight: 900;
  text-decoration: none;
}

.hero-summary-link:hover {
  text-decoration: underline;
}

.blue-dot {
  position: absolute;
  top: 1.2rem;
  right: 1.35rem;
  width: 2.8rem;
  height: 2.8rem;
  border-radius: 50%;
  background: radial-gradient(circle at 35% 30%, #fffbe0, #ffd48f 36%, #ffb37a 68%, #ff8f6a 100%);
  box-shadow: 0 0 20px rgba(255, 183, 122, 0.36);
}

.skills-card {
  grid-column: 8 / span 5;
  grid-row: 1;
  display: grid;
  align-content: start;
  gap: 0.8rem;
  min-height: 8.6rem;
}

.skills-card h3,
.timeline-card h3,
.contact-card h3 {
  color: #234560;
  font-size: 1.18rem;
  font-weight: 900;
}

.skills-note,
.contact-text,
.recent-item p,
.profile-text {
  color: rgba(35, 67, 92, 0.82);
  font-size: 0.92rem;
  font-weight: 700;
  line-height: 1.62;
}

.skill-list {
  display: flex;
  flex-wrap: wrap;
  gap: 0.7rem;
}

.skill-list span {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-height: 2.4rem;
  padding: 0 0.95rem;
  border: 1px solid rgba(92, 150, 184, 0.16);
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.44);
  color: #25516d;
  font-size: 0.82rem;
  font-weight: 800;
  box-shadow: 0 10px 20px rgba(84, 118, 143, 0.08);
  animation: skill-float 4.8s ease-in-out infinite;
  animation-delay: var(--float-delay, 0s);
  will-change: transform;
}

.profile-card {
  grid-column: 1 / span 4;
  grid-row: 2 / span 2;
  display: grid;
  align-content: start;
  gap: 1rem;
  min-height: 25.4rem;
}

.profile-picture-frame {
  width: 100%;
  aspect-ratio: 1 / 1.02;
  padding: 0.4rem;
  border: 1px solid rgba(255, 255, 255, 0.62);
  border-radius: 8px;
  background: linear-gradient(135deg, rgba(255, 248, 236, 0.84), rgba(234, 247, 255, 0.72));
  box-shadow: 0 20px 36px rgba(85, 126, 153, 0.12);
  transform: rotate(-1.6deg);
}

.profile-picture-frame img,
.guestbook-image img {
  display: block;
  width: 100%;
  height: 100%;
  object-fit: cover;
  object-position: 58% center;
  border-radius: 6px;
}

.profile-copy {
  display: grid;
  gap: 0.55rem;
}

.profile-role {
  color: #1f4863;
  font-size: 1.06rem;
  font-weight: 900;
}

.timeline-card {
  grid-column: 5 / span 4;
  grid-row: 2 / span 2;
  display: grid;
  align-content: start;
  gap: 1rem;
  min-height: 25.4rem;
}

.recent-list-shell {
  position: relative;
}

.recent-list {
  display: grid;
  grid-template-columns: 1fr;
  gap: 0.95rem;
  max-height: 24.7rem;
  margin: 0;
  padding: 0 0.2rem 0 0;
  overflow-y: auto;
  overflow-x: hidden;
  list-style: none;
  scrollbar-width: none;
  -ms-overflow-style: none;
}

.recent-item {
  display: grid;
  gap: 0.35rem;
  min-height: 7.6rem;
  padding: 0.9rem 1rem;
  border: 1px solid rgba(255, 255, 255, 0.46);
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.36);
}

.recent-year {
  color: #3284a5;
  font-size: 0.74rem;
  font-weight: 900;
  letter-spacing: 0.1em;
  text-transform: uppercase;
}

.recent-list::-webkit-scrollbar {
  width: 0;
  height: 0;
}

.recent-scrollbar {
  position: absolute;
  top: 0;
  right: 0.05rem;
  width: 0.35rem;
  height: 100%;
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
  background: rgba(255, 255, 255, 0.18);
  content: '';
}

.recent-scrollbar-thumb {
  position: absolute;
  left: 0;
  width: 100%;
  min-height: 2.25rem;
  border-radius: 999px;
  background: linear-gradient(180deg, rgba(64, 223, 255, 0.86), rgba(247, 238, 173, 0.92));
  box-shadow:
    0 0 14px rgba(64, 223, 255, 0.24),
    0 0 12px rgba(247, 238, 173, 0.2);
}

.contact-card {
  grid-column: 9 / span 4;
  grid-row: 2 / span 2;
  display: grid;
  align-content: start;
  gap: 1rem;
  min-height: 25.4rem;
}

.contact-links {
  display: grid;
  gap: 0.85rem;
  margin-top: auto;
}

.contact-link {
  position: relative;
  z-index: 1;
  display: grid;
  gap: 0.15rem;
  align-items: start;
  min-height: 4rem;
  padding: 0.9rem 1rem;
  border: 1px solid rgba(96, 154, 187, 0.18);
  border-radius: 8px;
  background: linear-gradient(135deg, rgba(255, 255, 255, 0.58), rgba(232, 245, 255, 0.6));
  color: #224966;
  text-decoration: none;
  box-shadow: 0 12px 24px rgba(83, 123, 151, 0.1);
}

.contact-link:hover {
  transform: translateY(-1px);
  box-shadow: 0 16px 28px rgba(83, 123, 151, 0.14);
}

.contact-link strong {
  font-size: 0.92rem;
  font-weight: 900;
}

.contact-link small {
  color: rgba(35, 67, 92, 0.7);
  font-size: 0.72rem;
  font-weight: 700;
  line-height: 1.45;
  word-break: break-all;
}

.guestbook-section {
  position: relative;
  margin-top: 4.2rem;
  margin-bottom: 2.1rem;
}

.guestbook-card {
  display: grid;
  grid-template-columns: minmax(0, 17rem) minmax(0, 1fr);
  gap: 1rem;
  padding: 1rem 1.05rem;
  align-items: start;
}

.guestbook-copy {
  display: grid;
  align-content: start;
  gap: 0.55rem;
  justify-items: start;
}

.guestbook-image {
  width: 100%;
  max-width: 15.5rem;
  aspect-ratio: 1 / 1;
  margin-top: 0.15rem;
  overflow: hidden;
  border: 1px solid rgba(255, 255, 255, 0.58);
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.38);
  box-shadow:
    0 16px 30px rgba(84, 118, 143, 0.12),
    inset 0 1px 0 rgba(255, 255, 255, 0.65);
}

.guestbook-copy h2 {
  color: #20445f;
  font-size: clamp(1.28rem, 2.2vw, 1.68rem);
  line-height: 1.06;
}

.guestbook-copy p,
.guestbook-note,
.guestbook-status {
  color: rgba(35, 67, 92, 0.82);
  font-size: 0.92rem;
  font-weight: 700;
  line-height: 1.62;
}

.guestbook-form {
  display: grid;
  gap: 0.75rem;
  width: min(100%, 45rem);
  justify-self: end;
}

.guestbook-field {
  display: grid;
  gap: 0.35rem;
}

.guestbook-field span {
  color: #295570;
  font-size: 0.82rem;
  font-weight: 800;
}

.guestbook-field input,
.guestbook-field textarea {
  width: 100%;
  min-width: 0;
  max-width: 100%;
  box-sizing: border-box;
  padding: 0.78rem 0.95rem;
  border: 1px solid rgba(96, 154, 187, 0.18);
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.56);
  color: #224966;
  font: inherit;
  outline: none;
  transition: border-color 0.2s ease, box-shadow 0.2s ease, background-color 0.2s ease;
}

.guestbook-field textarea {
  min-height: 5.4rem;
  resize: vertical;
}

.guestbook-field input:focus,
.guestbook-field textarea:focus {
  border-color: rgba(64, 223, 255, 0.48);
  box-shadow: 0 0 0 4px rgba(64, 223, 255, 0.12);
  background: rgba(255, 255, 255, 0.8);
}

.guestbook-actions {
  display: grid;
  gap: 0.4rem;
}

.guestbook-submit {
  justify-self: start;
  min-height: 2.55rem;
  padding: 0 1rem;
  border: 0;
  border-radius: 999px;
  background: linear-gradient(135deg, #40dfff, #8be7ff 52%, #f7eead 100%);
  color: #16384f;
  font: inherit;
  font-weight: 900;
  cursor: pointer;
  box-shadow: 0 14px 28px rgba(79, 149, 187, 0.18);
}

.guestbook-submit:hover {
  transform: translateY(-1px);
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

.guestbook-submit:disabled {
  opacity: 0.72;
  cursor: wait;
  transform: none;
}

@keyframes skill-float {
  0%,
  100% {
    transform: translate3d(0, 0, 0);
  }

  50% {
    transform: translate3d(0, -0.35rem, 0);
  }
}

@media (max-width: 900px) {
  .experience-shell {
    width: min(100%, 900px);
  }

  .experience-grid {
    grid-template-columns: 1fr;
    grid-template-rows: auto;
  }

  .hero-card,
  .skills-card,
  .profile-card,
  .timeline-card,
  .contact-card {
    grid-column: auto;
    grid-row: auto;
  }

  .profile-card,
  .timeline-card {
    min-height: auto;
  }
}

@media (max-width: 768px) {
  .experience-section {
    padding: 3rem 0.9rem 2.7rem;
  }

  .experience-shell {
    width: min(100%, 34rem);
  }

  .experience-nav {
    justify-content: center;
    min-height: auto;
    padding: 0.75rem;
  }

  .brand-mark {
    display: none;
  }

  .nav-links {
    width: 100%;
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(4.8rem, 1fr));
    gap: 0.45rem;
    font-size: 0.76rem;
  }

  .nav-links a {
    display: grid;
    min-height: 2.35rem;
    place-items: center;
    padding: 0;
    border: 1px solid rgba(255, 255, 255, 0.2);
    background: rgba(255, 255, 255, 0.28);
  }

  .experience-grid {
    gap: 0.85rem;
  }

  .experience-card,
  .hero-card,
  .profile-card,
  .skills-card,
  .timeline-card,
  .contact-card {
    grid-column: auto;
    grid-row: auto;
  }

  .experience-card {
    min-height: auto;
    padding: 1.05rem 1rem;
  }

  .hero-card {
    padding-right: 1rem;
    text-align: center;
  }

  .hero-summary {
    max-width: none;
  }

  .contact-links {
    justify-content: center;
  }

  .profile-card,
  .timeline-card,
  .contact-card {
    min-height: auto;
  }

  .profile-picture-frame {
    width: min(82%, 14rem);
    margin: 0 auto;
  }

  .profile-copy,
  .skills-card,
  .timeline-card,
  .contact-card {
    text-align: center;
  }

  .skill-list {
    justify-content: center;
  }

  .recent-item {
    text-align: left;
  }

  .guestbook-card {
    grid-template-columns: 1fr;
  }

  .guestbook-image {
    margin-inline: auto;
  }

  .guestbook-form {
    width: 100%;
    justify-self: stretch;
  }

  .guestbook-submit {
    justify-self: center;
  }
}

@media (max-width: 480px) {
  .experience-section {
    padding-top: 2.65rem;
  }

  .nav-links {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .profile-card {
    min-height: 20.5rem;
  }

  .profile-picture-frame {
    width: min(78%, 12.5rem);
  }

  .timeline-card,
  .contact-card {
    gap: 0.75rem;
  }

  .guestbook-section {
    margin-top: 0.95rem;
  }
}
</style>


