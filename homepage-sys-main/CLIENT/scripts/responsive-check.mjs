import { spawn } from 'node:child_process';
import { existsSync } from 'node:fs';
import { mkdir, rm, writeFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';

const chromeCandidates = [
  process.env.CHROME_PATH,
  'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
  'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
  'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe',
  'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  '/usr/bin/google-chrome',
  '/usr/bin/chromium',
  '/usr/bin/chromium-browser'
].filter(Boolean);

const chromePath = chromeCandidates.find((candidate) => existsSync(candidate));

if (!chromePath) {
  throw new Error('没有找到 Chrome 或 Edge。可以通过 CHROME_PATH 指定浏览器路径。');
}

const targetUrl = process.env.RESPONSIVE_CHECK_URL || 'http://127.0.0.1:5176/index.html';
const reportDir = resolve('responsive-report');
const userDataDir = resolve('.codex-run', 'chrome-responsive-profile');
const debuggingPort = 9223;

const viewports = [
  { name: 'iphone-se', width: 375, height: 667, deviceScaleFactor: 2, mobile: true },
  { name: 'iphone-13', width: 390, height: 844, deviceScaleFactor: 3, mobile: true },
  { name: 'android-large', width: 412, height: 915, deviceScaleFactor: 2.625, mobile: true },
  { name: 'ipad', width: 768, height: 1024, deviceScaleFactor: 2, mobile: true },
  { name: 'laptop', width: 1366, height: 768, deviceScaleFactor: 1, mobile: false },
  { name: 'desktop-wide', width: 1920, height: 1080, deviceScaleFactor: 1, mobile: false }
];

const wait = (ms) => new Promise((resolveWait) => {
  setTimeout(resolveWait, ms);
});

const waitForJson = async (url, retries = 40) => {
  let lastError;

  for (let index = 0; index < retries; index += 1) {
    try {
      const response = await fetch(url);
      if (response.ok) return response.json();
    } catch (error) {
      lastError = error;
    }

    await wait(250);
  }

  throw lastError || new Error(`无法连接到 ${url}`);
};

const createCdpClient = (webSocketUrl) => {
  const socket = new WebSocket(webSocketUrl);
  const callbacks = new Map();
  let nextId = 1;

  socket.addEventListener('message', (event) => {
    const message = JSON.parse(event.data);
    const callback = callbacks.get(message.id);

    if (!callback) return;

    callbacks.delete(message.id);

    if (message.error) {
      callback.reject(new Error(message.error.message));
      return;
    }

    callback.resolve(message.result);
  });

  const opened = new Promise((resolveOpen, rejectOpen) => {
    socket.addEventListener('open', resolveOpen, { once: true });
    socket.addEventListener('error', rejectOpen, { once: true });
  });

  return {
    async send(method, params = {}) {
      await opened;
      const id = nextId;
      nextId += 1;

      socket.send(JSON.stringify({
        id,
        method,
        params
      }));

      return new Promise((resolveSend, rejectSend) => {
        callbacks.set(id, {
          resolve: resolveSend,
          reject: rejectSend
        });
      });
    },
    async close() {
      await opened;
      socket.close();
    }
  };
};

const evaluate = async (client, expression) => {
  const result = await client.send('Runtime.evaluate', {
    expression,
    awaitPromise: true,
    returnByValue: true
  });

  if (result.exceptionDetails) {
    throw new Error(result.exceptionDetails.text || '页面脚本执行失败');
  }

  return result.result.value;
};

const runViewportCheck = async (client, viewport) => {
  await client.send('Emulation.setDeviceMetricsOverride', {
    width: viewport.width,
    height: viewport.height,
    deviceScaleFactor: viewport.deviceScaleFactor,
    mobile: viewport.mobile
  });
  await client.send('Page.navigate', { url: targetUrl });
  await wait(2400);

  const checks = await evaluate(client, `(() => {
    const selectors = {
      hero: '.home-hero-section, .hero-section, [class*="hero"]',
      experience: '#experience-section',
      contact: '#contact-card',
      guestbook: '#guestbook-card',
      album: '#album-title'
    };

    const getLink = (label) => Array
      .from(document.querySelectorAll('.contact-link'))
      .find((element) => element.textContent.includes(label));

    const github = getLink('GitHub');
    const wechat = getLink('微信');
    const email = getLink('邮箱');
    const root = document.documentElement;
    const body = document.body;
    const overflowX = Math.max(root.scrollWidth, body.scrollWidth) - window.innerWidth;

    return {
      title: document.title,
      path: location.href,
      viewport: {
        width: window.innerWidth,
        height: window.innerHeight
      },
      hasHero: Boolean(document.querySelector(selectors.hero)),
      hasExperience: Boolean(document.querySelector(selectors.experience)),
      hasContact: Boolean(document.querySelector(selectors.contact)),
      hasGuestbook: Boolean(document.querySelector(selectors.guestbook)),
      hasAlbum: Boolean(document.querySelector(selectors.album)),
      contactLinks: {
        github: github?.getAttribute('href') || '',
        githubTarget: github?.getAttribute('target') || '',
        wechat: wechat?.getAttribute('href') || '',
        email: email?.getAttribute('href') || ''
      },
      overflowX,
      bodyHeight: Math.max(root.scrollHeight, body.scrollHeight)
    };
  })()`);

  await client.send('Runtime.evaluate', {
    expression: 'document.querySelector("#experience-section")?.scrollIntoView({ block: "start" })'
  });
  await wait(500);

  const screenshot = await client.send('Page.captureScreenshot', {
    format: 'png',
    captureBeyondViewport: false
  });

  const screenshotPath = join(reportDir, `${viewport.name}.png`);
  await writeFile(screenshotPath, Buffer.from(screenshot.data, 'base64'));

  return {
    name: viewport.name,
    screenshot: screenshotPath,
    ...checks,
    passed: checks.hasExperience
      && checks.hasContact
      && checks.hasGuestbook
      && checks.hasAlbum
      && checks.contactLinks.github === 'https://github.com/Hiworlddai'
      && checks.contactLinks.githubTarget === '_blank'
      && checks.contactLinks.wechat === '/gallery/wechat-qr.png'
      && checks.contactLinks.email.startsWith('mailto:')
      && checks.overflowX <= 2
  };
};

await rm(reportDir, { recursive: true, force: true });
await mkdir(reportDir, { recursive: true });
await mkdir(userDataDir, { recursive: true });

const chrome = spawn(chromePath, [
  '--headless=new',
  `--remote-debugging-port=${debuggingPort}`,
  `--user-data-dir=${userDataDir}`,
  '--disable-gpu',
  '--hide-scrollbars',
  'about:blank'
], {
  stdio: 'ignore'
});

try {
  const browserInfo = await waitForJson(`http://127.0.0.1:${debuggingPort}/json/version`);
  const client = createCdpClient(browserInfo.webSocketDebuggerUrl);
  await client.send('Target.createTarget', { url: 'about:blank' });
  const pages = await waitForJson(`http://127.0.0.1:${debuggingPort}/json`);
  const page = pages.find((item) => item.type === 'page' && item.webSocketDebuggerUrl);
  const pageClient = createCdpClient(page.webSocketDebuggerUrl);

  await pageClient.send('Page.enable');
  await pageClient.send('Runtime.enable');

  const results = [];
  for (const viewport of viewports) {
    results.push(await runViewportCheck(pageClient, viewport));
  }

  await pageClient.close();
  await client.close();

  const wechatAssetExists = existsSync(resolve('public/gallery/wechat-qr.png'));
  const summary = {
    targetUrl,
    generatedAt: new Date().toISOString(),
    chromePath,
    wechatAssetExists,
    results
  };

  await writeFile(join(reportDir, 'responsive-summary.json'), `${JSON.stringify(summary, null, 2)}\n`, 'utf8');
  console.log(JSON.stringify(summary, null, 2));

  if (!results.every((result) => result.passed)) {
    process.exitCode = 1;
  }
} finally {
  chrome.kill();
}
