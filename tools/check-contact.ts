// Self-check for the contact function's rules: node --experimental-strip-types tools/check-contact.ts
import assert from 'node:assert/strict';
import { rateLimited, recipientFor, validate } from '../api/contact.ts';
import { renderEmail } from '../api/_email.ts';

const ok = { email: 'ana@bodega.com', phone: '2614299962', prefix: '54', name: 'Ana', country: 'Argentina', message: 'Hola' };
assert.equal(validate(ok).ok, true);
assert.equal(validate({ ...ok, email: 'ana@bodega' }).ok, false);
assert.equal(validate({ ...ok, phone: '26-14' }).ok, false);
assert.equal(validate({ ...ok, phone: '12345' }).ok, false);
assert.equal(validate({ ...ok, prefix: '+54' }).ok, false);
const r = validate({ ...ok, name: 'Ana\r\nBcc: x@y.com' });
assert.ok(r.ok && !/[\r\n]/.test(r.fields.name), 'line breaks removed from one-line fields');

const env = { MAIL_TO: 'es@x.com', MAIL_TO_PT: 'pt@x.com', SMTP_USER: 'smtp@x.com' };
assert.equal(recipientFor('es', env), 'es@x.com');
assert.equal(recipientFor('en', env), 'es@x.com', 'English goes to the same mailbox as Spanish');
assert.equal(recipientFor('pt', env), 'pt@x.com');
assert.equal(recipientFor('pt-br', env), 'pt@x.com');
assert.equal(recipientFor('pt', { MAIL_TO: 'es@x.com' }), 'es@x.com', 'no Portuguese mailbox set: main one');
assert.equal(recipientFor('fr', env), 'es@x.com', 'any other language: main one');
assert.equal(recipientFor('pt', { SMTP_USER: 'smtp@x.com' }), 'smtp@x.com', 'nothing set: the sending mailbox');
assert.equal(validate({ ...ok, lang: 'PT' }).ok && (validate({ ...ok, lang: 'PT' }) as { ok: true; fields: { lang: string } }).fields.lang, 'pt', 'language is normalised');

const mail = renderEmail({ lang: 'pt', name: 'Ana <b>Silva</b>', email: 'ana@bodega.com', prefix: '55', phone: '11987654321', country: 'Brasil', message: 'Olá\n<script>alert(1)</script> & mais' }, new Date('2026-11-16T15:00:00Z'));
assert.ok(!mail.html.includes('<script>') && !mail.html.includes('<b>Silva'), 'visitor text is escaped in the HTML');
assert.ok(mail.html.includes('&lt;script&gt;') && mail.html.includes('Olá<br>'), 'escaped text and line breaks kept');
assert.ok(mail.html.includes('href="tel:+5511987654321"') && mail.html.includes('href="mailto:ana@bodega.com"'));
assert.equal(mail.subject, 'Mensagem do site [PT] — Ana <b>Silva</b>', 'subject is plain text, in the recipient language');
assert.ok(mail.text.includes('Telefone: +55 11987654321') && !mail.text.includes('<td'), 'plain-text version');
assert.ok(renderEmail({ ...ok, lang: 'en', prefix: '', message: '' }).html.includes('Nueva consulta desde la web'), 'Spanish and English go to the Spanish-speaking mailbox');

const t = 1_000_000;
for (let i = 0; i < 5; i++) assert.equal(rateLimited('1.2.3.4', t + i), false);
assert.equal(rateLimited('1.2.3.4', t + 10), true, '6th message within 10 minutes is refused');
assert.equal(rateLimited('5.6.7.8', t + 10), false, 'other visitors are not affected');
assert.equal(rateLimited('1.2.3.4', t + 10 * 60_000 + 10), false, 'allowed again after the window');
console.log('contact checks passed');
