// POST /api/contact: emails the contact form to the estate (through its own Ferozo mailbox, over SMTP).
// Before sending, in this order: same-site origin, size limit, honeypot, rate limit per IP, Cloudflare Turnstile
// ("I'm not a robot"), and the same field rules the form applies in the browser (never trust the browser).
//
// Vercel environment variables (Project → Settings → Environment Variables):
//   SMTP_HOST=a0200992.ferozo.com  SMTP_PORT=465  SMTP_USER=inquiries@altamiradelosandes.com  SMTP_PASS=<mailbox password>
//   MAIL_TO=<where messages go, defaults to SMTP_USER>   MAIL_TO_PT=<where messages from the Portuguese site go; defaults to MAIL_TO>
//   TURNSTILE_SECRET_KEY=<from Cloudflare Turnstile>      (and VITE_TURNSTILE_SITE_KEY for the browser widget)
import nodemailer from 'nodemailer';

const ALLOWED_HOSTS = /(^|\.)altamiradelosandes\.com$|\.vercel\.app$|^localhost$/;
const LIMIT = 5; // messages per IP…
const WINDOW_MS = 10 * 60_000; // …every 10 minutes
// shortcut: memory of one server instance (Vercel may run several, and restarts reset it); Turnstile is the real gate.
// If spam ever gets through, add a Vercel Firewall rate-limit rule on /api/contact.
const hits = new Map<string, number[]>();

type Fields = { lang: string; name: string; email: string; prefix: string; phone: string; country: string; message: string };
type Result = { ok: true; fields: Fields } | { ok: false; error: string };

const json = (status: number, body: object) =>
  new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json', 'cache-control': 'no-store' } });

/** one line of text: no line breaks (they could forge e-mail headers), trimmed, at most `max` characters */
const line = (v: unknown, max: number) => (typeof v === 'string' ? v.replace(/[\r\n\t]+/g, ' ').trim().slice(0, max) : '');

/** the form's rules, again on the server */
export function validate(body: Record<string, unknown>): Result {
  const fields: Fields = {
    lang: line(body.lang, 8).toLowerCase(),
    name: line(body.name, 120),
    email: line(body.email, 254),
    prefix: line(body.prefix, 4),
    phone: line(body.phone, 15),
    country: line(body.country, 60),
    message: typeof body.message === 'string' ? body.message.trim().slice(0, 5000) : '',
  };
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]{2,}$/.test(fields.email)) return { ok: false, error: 'invalid' };
  if (!/^\d{6,15}$/.test(fields.phone)) return { ok: false, error: 'invalid' };
  if (fields.prefix && !/^\d{1,4}$/.test(fields.prefix)) return { ok: false, error: 'invalid' };
  return { ok: true, fields };
}

/** Where a message goes: the Portuguese site to its own mailbox, every other language to the main one.
 *  The browser only says which language the site was in; the address itself never comes from the browser. */
export const recipientFor = (lang: string, env: { MAIL_TO?: string; MAIL_TO_PT?: string; SMTP_USER?: string }) =>
  (lang.startsWith('pt') && env.MAIL_TO_PT) || env.MAIL_TO || env.SMTP_USER;

export function rateLimited(ip: string, now = Date.now()) {
  const recent = (hits.get(ip) ?? []).filter((t) => now - t < WINDOW_MS);
  if (recent.length >= LIMIT) return true;
  recent.push(now);
  hits.set(ip, recent);
  if (hits.size > 5000) hits.clear(); // never grows without bound
  return false;
}

/** 'no-secret' = our own configuration is missing (not the visitor's fault); 'invalid' = Cloudflare refused the answer. */
async function humanCheck(token: string): Promise<'ok' | 'no-secret' | 'invalid'> {
  const secret = process.env.TURNSTILE_SECRET_KEY?.trim();
  if (!secret) return 'no-secret'; // not configured: refuse rather than send unprotected
  try {
    const res = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', { method: 'POST', body: new URLSearchParams({ secret, response: token }) });
    const out = (await res.json()) as { success?: boolean; 'error-codes'?: string[] };
    if (out.success) return 'ok';
    console.error('contact: turnstile refused the answer', out['error-codes']); // e.g. invalid-input-secret: the secret is not the one of this widget
  } catch {
    console.error('contact: turnstile could not be reached');
  }
  return 'invalid';
}

export async function POST(request: Request) {
  const origin = request.headers.get('origin');
  try {
    if (!origin || !ALLOWED_HOSTS.test(new URL(origin).hostname)) return json(403, { error: 'forbidden' });
  } catch {
    return json(403, { error: 'forbidden' });
  }
  const raw = await request.text();
  if (raw.length > 20_000) return json(413, { error: 'invalid' });
  let body: Record<string, unknown>;
  try {
    body = JSON.parse(raw);
  } catch {
    return json(400, { error: 'invalid' });
  }
  if (typeof body !== 'object' || body === null) return json(400, { error: 'invalid' });

  // a field people never see: only bots fill it. They get a normal "sent" so they don't adapt.
  if (body.website) return json(200, { ok: true });

  const ip = (request.headers.get('x-forwarded-for') ?? '').split(',')[0].trim() || 'unknown';
  if (rateLimited(ip)) return json(429, { error: 'rate' });
  const human = typeof body.token === 'string' ? await humanCheck(body.token) : 'invalid';
  if (human === 'no-secret') return json(503, { error: 'send' });
  if (human !== 'ok') return json(400, { error: 'captcha' });

  const checked = validate(body);
  if (!checked.ok) return json(400, { error: checked.error });
  const f = checked.fields;

  const { SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS } = process.env;
  if (!SMTP_HOST || !SMTP_USER || !SMTP_PASS) return json(503, { error: 'send' });
  try {
    const port = Number(SMTP_PORT || 465);
    await nodemailer
      .createTransport({ host: SMTP_HOST.trim().replace(/\.$/, ''), port, secure: port === 465, auth: { user: SMTP_USER, pass: SMTP_PASS } })
      .sendMail({
        from: `"Altamira de los Andes · web" <${SMTP_USER}>`,
        to: recipientFor(f.lang, process.env),
        replyTo: f.email,
        subject: `Consulta web${f.lang ? ` [${f.lang.toUpperCase()}]` : ''} — ${f.name || f.email}`,
        // plain text only: nothing the visitor typed is ever interpreted as HTML
        text: [
          `Nombre: ${f.name || '—'}`,
          `Email: ${f.email}`,
          `Teléfono: ${f.prefix ? `+${f.prefix} ` : ''}${f.phone}`,
          `País: ${f.country || '—'}`,
          `Idioma del sitio: ${f.lang || '—'}`,
          '',
          f.message || '(sin mensaje)',
        ].join('\n'),
      });
    return json(200, { ok: true });
  } catch (e) {
    console.error('contact: send failed', e instanceof Error ? e.message : e); // no visitor data in the logs
    return json(502, { error: 'send' });
  }
}
