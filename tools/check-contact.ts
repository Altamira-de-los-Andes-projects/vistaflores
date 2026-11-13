// Self-check for the contact function's rules: node --experimental-strip-types tools/check-contact.ts
import assert from 'node:assert/strict';
import { rateLimited, validate } from '../api/contact.ts';

const ok = { email: 'ana@bodega.com', phone: '2614299962', prefix: '54', name: 'Ana', country: 'Argentina', message: 'Hola' };
assert.equal(validate(ok).ok, true);
assert.equal(validate({ ...ok, email: 'ana@bodega' }).ok, false);
assert.equal(validate({ ...ok, phone: '26-14' }).ok, false);
assert.equal(validate({ ...ok, phone: '12345' }).ok, false);
assert.equal(validate({ ...ok, prefix: '+54' }).ok, false);
const r = validate({ ...ok, name: 'Ana\r\nBcc: x@y.com' });
assert.ok(r.ok && !/[\r\n]/.test(r.fields.name), 'line breaks removed from one-line fields');

const t = 1_000_000;
for (let i = 0; i < 5; i++) assert.equal(rateLimited('1.2.3.4', t + i), false);
assert.equal(rateLimited('1.2.3.4', t + 10), true, '6th message within 10 minutes is refused');
assert.equal(rateLimited('5.6.7.8', t + 10), false, 'other visitors are not affected');
assert.equal(rateLimited('1.2.3.4', t + 10 * 60_000 + 10), false, 'allowed again after the window');
console.log('contact checks passed');
