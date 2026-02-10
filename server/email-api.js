import { createServer } from 'node:http';
import { URL } from 'node:url';
import nodemailer from 'nodemailer';

const PORT = Number(process.env.PORT || 8787);
const MAX_BODY_BYTES = 10 * 1024 * 1024;
const GMAIL_USER = process.env.GMAIL_USER || '';
const GMAIL_APP_PASSWORD = process.env.GMAIL_APP_PASSWORD || '';
const EMAIL_FROM = process.env.EMAIL_FROM || GMAIL_USER;
const EMAIL_REPLY_TO = process.env.EMAIL_REPLY_TO || '';
const allowedOrigins = new Set(
  (process.env.ALLOWED_ORIGINS || 'http://localhost:5173')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean)
);

const isAllowedOrigin = (origin) => !origin || allowedOrigins.has(origin);

const writeJson = (res, statusCode, payload, origin = '') => {
  const headers = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    Vary: 'Origin',
  };

  if (origin && isAllowedOrigin(origin)) {
    headers['Access-Control-Allow-Origin'] = origin;
  } else if (!origin && allowedOrigins.size > 0) {
    headers['Access-Control-Allow-Origin'] = Array.from(allowedOrigins)[0];
  }

  res.writeHead(statusCode, headers);
  res.end(JSON.stringify(payload));
};

const readJsonBody = (req) =>
  new Promise((resolve, reject) => {
    let rawBody = '';
    let byteLength = 0;

    req.on('data', (chunk) => {
      byteLength += chunk.length;
      if (byteLength > MAX_BODY_BYTES) {
        reject(new Error('Request body too large.'));
        req.destroy();
        return;
      }

      rawBody += chunk.toString('utf8');
    });

    req.on('end', () => {
      try {
        resolve(rawBody ? JSON.parse(rawBody) : {});
      } catch {
        reject(new Error('Invalid JSON payload.'));
      }
    });

    req.on('error', () => reject(new Error('Failed to read request body.')));
  });

const validateEmail = (value) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);

const createTransporter = () => {
  if (!GMAIL_USER) {
    throw new Error('GMAIL_USER is not configured on the server.');
  }
  if (!GMAIL_APP_PASSWORD) {
    throw new Error('GMAIL_APP_PASSWORD is not configured on the server.');
  }

  return nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: GMAIL_USER,
      pass: GMAIL_APP_PASSWORD,
    },
  });
};

const sendWithGmail = async ({ toEmail, subject, text, filename, pdfBase64 }) => {
  const transporter = createTransporter();
  await transporter.sendMail({
    from: EMAIL_FROM,
    to: toEmail,
    subject,
    text,
    ...(EMAIL_REPLY_TO ? { replyTo: EMAIL_REPLY_TO } : {}),
    attachments: [
      {
        filename,
        content: pdfBase64,
        encoding: 'base64',
        contentType: 'application/pdf',
      },
    ],
  });
};

const server = createServer(async (req, res) => {
  const origin = req.headers.origin || '';
  const requestUrl = new URL(req.url || '/', `http://${req.headers.host}`);

  if (!isAllowedOrigin(origin)) {
    writeJson(res, 403, { error: 'Origin not allowed.' }, origin);
    return;
  }

  if (req.method === 'OPTIONS' && requestUrl.pathname === '/api/send-plan-email') {
    writeJson(res, 204, {}, origin);
    return;
  }

  if (req.method === 'GET' && requestUrl.pathname === '/api/health') {
    writeJson(res, 200, { ok: true }, origin);
    return;
  }

  if (req.method === 'POST' && requestUrl.pathname === '/api/send-plan-email') {
    try {
      const body = await readJsonBody(req);
      const toEmail = String(body.toEmail || '').trim();
      const subject = String(body.subject || '').trim();
      const text = String(body.text || '').trim();
      const filename = String(body.filename || 'plan.pdf').trim();
      const pdfBase64 = String(body.pdfBase64 || '').trim();

      if (!validateEmail(toEmail)) {
        writeJson(res, 400, { error: 'A valid recipient email is required.' }, origin);
        return;
      }
      if (!subject) {
        writeJson(res, 400, { error: 'Email subject is required.' }, origin);
        return;
      }
      if (!pdfBase64) {
        writeJson(res, 400, { error: 'PDF payload is required.' }, origin);
        return;
      }

      const base64Content = pdfBase64.includes(',') ? pdfBase64.split(',').pop() : pdfBase64;
      await sendWithGmail({
        toEmail,
        subject,
        text: text || 'Please find your generated high school plan attached.',
        filename: filename || 'plan.pdf',
        pdfBase64: base64Content || '',
      });

      writeJson(res, 200, { ok: true }, origin);
      return;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unable to send email.';
      writeJson(res, 500, { error: message }, origin);
      return;
    }
  }

  writeJson(res, 404, { error: 'Not found.' }, origin);
});

server.listen(PORT, () => {
  console.log(`Email API listening on http://localhost:${PORT}`);
});
