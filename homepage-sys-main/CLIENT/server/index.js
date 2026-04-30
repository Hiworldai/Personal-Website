import dotenv from 'dotenv';
import express from 'express';

dotenv.config();

const toPositiveInteger = (value, fallback) => {
  const number = Number(value);
  return Number.isInteger(number) && number > 0 ? number : fallback;
};

const app = express();
const port = toPositiveInteger(process.env.GUESTBOOK_SERVER_PORT, 5177);
const host = process.env.GUESTBOOK_SERVER_HOST || '127.0.0.1';
const guestbookDailyLimit = toPositiveInteger(process.env.GUESTBOOK_DAILY_LIMIT, 3);
const guestbookMessageMaxLength = toPositiveInteger(process.env.GUESTBOOK_MESSAGE_MAX_LENGTH, 1200);
const guestbookDailyCounters = new Map();
const resendApiUrl = 'https://api.resend.com/emails';

app.set('trust proxy', true);
app.use(express.json({ limit: '16kb' }));

const getRequiredConfig = () => {
  const resendApiKey = process.env.RESEND_API_KEY;
  const from = process.env.RESEND_FROM_EMAIL;
  const to = process.env.GUESTBOOK_TO_EMAIL;

  if (!resendApiKey || !from || !to) {
    return null;
  }

  return {
    resendApiKey,
    from,
    to
  };
};

const escapeHtml = (value) => value
  .replaceAll('&', '&amp;')
  .replaceAll('<', '&lt;')
  .replaceAll('>', '&gt;')
  .replaceAll('"', '&quot;')
  .replaceAll("'", '&#39;');

const getDayKey = () => {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');

  return `${year}-${month}-${day}`;
};

const getClientAddress = (req) => {
  const forwarded = req.headers['x-forwarded-for'];

  if (typeof forwarded === 'string' && forwarded.trim()) {
    return forwarded.split(',')[0].trim();
  }

  if (Array.isArray(forwarded) && forwarded.length > 0) {
    return String(forwarded[0]).trim();
  }

  return req.ip || req.socket?.remoteAddress || 'unknown';
};

const purgeOldGuestbookCounters = (dayKey) => {
  for (const key of guestbookDailyCounters.keys()) {
    if (!key.endsWith(`:${dayKey}`)) {
      guestbookDailyCounters.delete(key);
    }
  }
};

const getGuestbookCounterKey = (req, dayKey) => `${getClientAddress(req)}:${dayKey}`;
const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const sendGuestbookEmail = async ({ resendApiKey, from, to, email, message }) => {
  const response = await fetch(resendApiUrl, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${resendApiKey}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      from,
      to: [to],
      reply_to: email,
      subject: '个人网站留言板新消息',
      text: `留言人邮箱：${email}\n\n留言内容：\n${message}`,
      html: `
        <div style="font-family: Arial, sans-serif; line-height: 1.7; color: #17384d;">
          <h2 style="margin: 0 0 12px;">个人网站留言板新消息</h2>
          <p style="margin: 0 0 10px;"><strong>留言人邮箱：</strong>${escapeHtml(email)}</p>
          <p style="margin: 0 0 8px;"><strong>留言内容：</strong></p>
          <div style="padding: 12px 14px; border-radius: 12px; background: #f4fbff; border: 1px solid #dbeef8; white-space: pre-wrap;">${escapeHtml(message)}</div>
        </div>
      `
    })
  });

  const result = await response.json().catch(() => ({}));

  if (!response.ok) {
    const resendMessage = result?.message || result?.error || 'Resend 邮件接口请求失败。';
    throw new Error(resendMessage);
  }

  return result;
};

app.get('/api/health', (_req, res) => {
  const config = getRequiredConfig();

  res.json({
    ok: true,
    resendConfigured: Boolean(config),
    guestbookDailyLimit,
    guestbookMessageMaxLength,
    mailProvider: 'resend-http-api'
  });
});

app.post('/api/guestbook', async (req, res) => {
  const config = getRequiredConfig();

  if (!config) {
    res.status(500).json({
      ok: false,
      message: 'Resend 尚未配置，请先填写 RESEND_API_KEY、RESEND_FROM_EMAIL 和 GUESTBOOK_TO_EMAIL。'
    });
    return;
  }

  const email = String(req.body?.email || '').trim();
  const message = String(req.body?.message || '').trim();
  const dayKey = getDayKey();

  purgeOldGuestbookCounters(dayKey);

  if (!email || !message) {
    res.status(400).json({
      ok: false,
      message: '请先填写邮箱和留言内容。'
    });
    return;
  }

  if (!emailPattern.test(email)) {
    res.status(400).json({
      ok: false,
      message: '请填写正确的邮箱地址。'
    });
    return;
  }

  if (email.length > 254) {
    res.status(400).json({
      ok: false,
      message: '邮箱地址太长了，请检查后再发送。'
    });
    return;
  }

  if (message.length > guestbookMessageMaxLength) {
    res.status(400).json({
      ok: false,
      message: `留言内容太长了，请控制在 ${guestbookMessageMaxLength} 个字以内。`
    });
    return;
  }

  const counterKey = getGuestbookCounterKey(req, dayKey);
  const currentCount = guestbookDailyCounters.get(counterKey) || 0;

  // Simple in-memory protection for a personal site. Use Redis or a database after deploying to multiple servers.
  if (currentCount >= guestbookDailyLimit) {
    res.status(429).json({
      ok: false,
      message: `今天的留言次数已达到上限，每位访客每天最多发送 ${guestbookDailyLimit} 封。`
    });
    return;
  }

  try {
    await sendGuestbookEmail({
      ...config,
      email,
      message
    });

    guestbookDailyCounters.set(counterKey, currentCount + 1);

    res.json({
      ok: true,
      message: '留言已经发送到你的邮箱。'
    });
  } catch (error) {
    const messageText = error instanceof Error ? error.message : '发送失败，请稍后再试。';

    res.status(500).json({
      ok: false,
      message: messageText
    });
  }
});

app.use((error, _req, res, next) => {
  if (!error) {
    next();
    return;
  }

  res.status(400).json({
    ok: false,
    message: '请求格式不正确，请刷新页面后再试。'
  });
});

app.listen(port, host, () => {
  console.log(`Guestbook mail server running on http://${host}:${port}`);
});
