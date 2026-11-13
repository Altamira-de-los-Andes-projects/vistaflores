// Self-check for the address ↔ page rules: node --experimental-strip-types tools/check-routing.ts
import assert from 'node:assert/strict';
import { parseRoute, pathFor } from '../src/lib/routing.ts';

assert.deepEqual(parseRoute('/'), { page: 'home' });
assert.deepEqual(parseRoute('/vinos'), { page: 'vinos' });
assert.deepEqual(parseRoute('/vinos/'), { page: 'vinos' }, 'trailing slash');
assert.deepEqual(parseRoute('/VINEDOS'), { page: 'vinedos' }, 'case');
assert.deepEqual(parseRoute('/wine/navigato'), { page: 'wine-detail', wineId: 'navigato' });
assert.deepEqual(parseRoute('/wine'), { page: 'home' }, 'a wine address needs the wine');
assert.deepEqual(parseRoute('/', '#/contacto'), { page: 'contacto' }, 'old #/ link');
assert.deepEqual(parseRoute('/nope'), { page: 'home' }, 'unknown page');
assert.deepEqual(parseRoute('/wine-detail'), { page: 'home' }, '"wine-detail" is not an address');
for (const p of ['home', 'vinos', 'vinedos', 'galeria', 'novedades', 'contacto', 'privacidad'] as const) assert.equal(parseRoute(pathFor(p)).page, p, `round trip ${p}`);
assert.equal(parseRoute(pathFor('wine-detail', 'tres-fincas')).wineId, 'tres-fincas');
console.log('routing checks passed');
