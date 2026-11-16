// POST /api/contact: emails the contact form to the estate (through its own Ferozo mailbox, over SMTP).
// Before sending, in this order: same-site origin, size limit, honeypot, rate limit per IP, Cloudflare Turnstile
// ("I'm not a robot"), and the same field rules the form applies in the browser (never trust the browser).
//
// Vercel environment variables (Project → Settings → Environment Variables):
//   SMTP_HOST=a0200992.ferozo.com  SMTP_PORT=465  SMTP_USER=inquiries@altamiradelosandes.com  SMTP_PASS=<mailbox password>
//   CONTACT_RATE_LIMIT=<optional, messages per IP per 10 minutes; default 5. Raise only while testing>
//   MAIL_TO=<where messages go, defaults to SMTP_USER>   MAIL_TO_PT=<where messages from the Portuguese site go; defaults to MAIL_TO>
//   TURNSTILE_SECRET_KEY=<from Cloudflare Turnstile>      (and VITE_TURNSTILE_SITE_KEY for the browser widget)
import nodemailer from 'nodemailer';

const ALLOWED_HOSTS = /(^|\.)altamiradelosandes\.com$|\.vercel\.app$|^localhost$/;
const LIMIT = Number(process.env.CONTACT_RATE_LIMIT) || 5; // messages per IP… (CONTACT_RATE_LIMIT raises it while testing; delete it afterwards)
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

// ── The e-mail the bodega receives: a plain-text version and a quiet HTML one.
// Mail clients only render tables and inline styles reliably, so that is all this uses. Everything the visitor typed is
// escaped before it goes into the HTML: nothing they write is ever interpreted as markup.
// (Kept in this file on purpose: Vercel compiles each api/ file on its own and a './x.ts' import is not found at run time.)
export type EmailFields = { lang: string; name: string; email: string; prefix: string; phone: string; country: string; message: string };

const TEXT = {
  es: { title: 'Nueva consulta desde la web', name: 'Nombre', email: 'Email', phone: 'Teléfono', country: 'País', site: 'Idioma del sitio', message: 'Mensaje', none: '(sin mensaje)', reply: (n: string) => `Responde a este correo para contestar a ${n} directamente.`, from: 'Enviado desde altamiradelosandes.com', subject: 'Consulta web', locale: 'es-AR' },
  pt: { title: 'Nova mensagem pelo site', name: 'Nome', email: 'E-mail', phone: 'Telefone', country: 'País', site: 'Idioma do site', message: 'Mensagem', none: '(sem mensagem)', reply: (n: string) => `Responda a este e-mail para falar diretamente com ${n}.`, from: 'Enviado de altamiradelosandes.com', subject: 'Mensagem do site', locale: 'pt-BR' },
};
const SITE_LANG: Record<string, string> = { es: 'Español', en: 'English', pt: 'Português' };
const COLOR = { burgundy: '#6b1f2a', ink: '#14120f', grey: '#7a7268', rule: '#e8e2d8', gold: '#d7a876', cream: '#f7f4ee' };

export const esc = (s: string) => s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);

export function renderEmail(f: EmailFields, now = new Date()) {
  const t = f.lang.startsWith('pt') ? TEXT.pt : TEXT.es;
  const phone = `${f.prefix ? `+${f.prefix} ` : ''}${f.phone}`;
  const when = new Intl.DateTimeFormat(t.locale, { dateStyle: 'long', timeStyle: 'short', timeZone: 'America/Argentina/Mendoza' }).format(now);
  const lang = SITE_LANG[f.lang] ?? (f.lang ? f.lang.toUpperCase() : '—');
  const who = f.name || f.email;
  const message = f.message || t.none;
  const rows: [string, string, string][] = [
    [t.name, f.name || '—', esc(f.name || '—')],
    [t.email, f.email, `<a href="mailto:${esc(f.email)}" style="color:${COLOR.burgundy};text-decoration:none;">${esc(f.email)}</a>`],
    [t.phone, phone, `<a href="tel:${esc(`${f.prefix ? '+' + f.prefix : ''}${f.phone}`)}" style="color:${COLOR.ink};text-decoration:none;">${esc(phone)}</a>`],
    [t.country, f.country || '—', esc(f.country || '—')],
    [t.site, lang, esc(lang)],
  ];
  const sans = "font-family:Arial,Helvetica,sans-serif;";
  const row = ([label, , html]: [string, string, string]) =>
    `<tr><td width="120" valign="top" style="padding:15px 0 11px;border-top:1px solid ${COLOR.rule};${sans}font-size:11px;letter-spacing:1px;text-transform:uppercase;color:${COLOR.grey};">${esc(label)}</td><td valign="top" style="padding:11px 0;border-top:1px solid ${COLOR.rule};${sans}font-size:15px;line-height:1.45;color:${COLOR.ink};">${html}</td></tr>`;

  const html = `<!doctype html>
<html lang="${f.lang.startsWith('pt') ? 'pt' : 'es'}"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${esc(t.title)}</title></head>
<body style="margin:0;padding:0;background:${COLOR.cream};">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${COLOR.cream};"><tr><td align="center" style="padding:32px 16px;">
<table role="presentation" width="560" cellpadding="0" cellspacing="0" style="width:100%;max-width:560px;background:#ffffff;border-top:3px solid ${COLOR.burgundy};">
<tr><td style="padding:28px 36px 0;font-family:Menlo,Consolas,'Courier New',monospace;font-size:11px;letter-spacing:3px;color:${COLOR.burgundy};">ALTAMIRA DE LOS ANDES</td></tr>
<tr><td style="padding:14px 36px 0;font-family:Georgia,'Times New Roman',serif;font-size:26px;line-height:1.25;color:${COLOR.ink};">${esc(t.title)}</td></tr>
<tr><td style="padding:6px 36px 22px;${sans}font-size:13px;color:${COLOR.grey};">${esc(when)}</td></tr>
<tr><td style="padding:0 36px;"><table role="presentation" width="100%" cellpadding="0" cellspacing="0">${rows.map(row).join('')}</table></td></tr>
<tr><td style="padding:24px 36px 0;${sans}font-size:11px;letter-spacing:1px;text-transform:uppercase;color:${COLOR.grey};">${esc(t.message)}</td></tr>
<tr><td style="padding:10px 36px 0;"><table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td style="border-left:2px solid ${COLOR.gold};padding:2px 0 2px 16px;${sans}font-size:15px;line-height:1.6;color:${COLOR.ink};">${esc(message).replace(/\r?\n/g, '<br>')}</td></tr></table></td></tr>
<tr><td style="padding:30px 36px 28px;${sans}font-size:12px;line-height:1.6;color:${COLOR.grey};">${esc(t.reply(who))}<br>${esc(t.from)}</td></tr>
</table></td></tr></table></body></html>`;

  const text = [t.title, when, '', ...rows.map(([label, plain]) => `${label}: ${plain}`), '', `${t.message}:`, message, '', '—', t.reply(who), t.from].join('\n');
  return { subject: `${t.subject}${f.lang ? ` [${f.lang.toUpperCase()}]` : ''} — ${who}`, text, html };
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
        ...renderEmail(f),
      });
    return json(200, { ok: true });
  } catch (e) {
    console.error('contact: send failed', e instanceof Error ? e.message : e); // no visitor data in the logs
    return json(502, { error: 'send' });
  }
}
