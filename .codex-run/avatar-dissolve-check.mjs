import { chromium } from "file:///C:/Users/chen'kang'hong/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/.pnpm/playwright@1.61.1/node_modules/playwright/index.mjs";

const browser = await chromium.launch({
  headless: true,
  executablePath: 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe'
});
const errors = [];

const capture = async (viewport, name, progressValues) => {
  const page = await browser.newPage({ viewport, deviceScaleFactor: 1 });
  page.on('pageerror', (error) => errors.push(error.message));
  page.on('response', (response) => {
    if (response.status() >= 400) errors.push(`${response.status()} ${response.url()}`);
  });
  await page.goto('http://127.0.0.1:8008/index.html', { waitUntil: 'networkidle' });
  await page.waitForTimeout(1400);

  for (const progress of progressValues) {
    await page.evaluate((targetProgress) => {
      const shell = document.querySelector('.album-transition-shell');
      const viewportHeight = window.innerHeight;
      const sectionTop = window.scrollY + shell.getBoundingClientRect().top;
      const preludeDistance = viewportHeight * 1.55;
      const storyStart = sectionTop - preludeDistance;
      const storyProgress = 0.28 + targetProgress * 0.72;
      document.documentElement.style.scrollBehavior = 'auto';
      window.scrollTo(0, storyStart + storyProgress * preludeDistance);
    }, progress);
    await page.waitForTimeout(380);
    await page.screenshot({ path: `.codex-run/${name}-${String(progress).replace('.', '-')}.png` });
  }
  await page.close();
};

await capture({ width: 1440, height: 900 }, 'avatar-dissolve-desktop', [0.34, 0.46, 0.58, 0.7, 0.84, 0.94]);
await capture({ width: 390, height: 844 }, 'avatar-dissolve-mobile', [0.46, 0.7, 0.9]);
console.log(JSON.stringify({ errors }, null, 2));
await browser.close();
