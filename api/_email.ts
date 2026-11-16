// The e-mail the bodega receives for each contact-form message: a plain-text version and a quiet HTML one.
// Mail clients only render tables and inline styles reliably, so that is all this uses. Everything the visitor
// typed is escaped before it goes into the HTML: nothing they write is ever interpreted as markup.
// (The leading underscore keeps Vercel from publishing this file as a route.)

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
