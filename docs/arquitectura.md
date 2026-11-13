# Arquitectura

Aplicación de una sola página (React 19 + Vite + Tailwind v4) con una función de Vercel para el correo. No hay servidor propio ni base de datos: el contenido vive en Sanity.

## Flujo de arranque

`main.tsx` → `App.tsx` (`LangProvider` + `SiteRoot`). `LangProvider` (`src/i18n/index.tsx`) decide el idioma, descarga el contenido del CMS y entrega tres cosas a toda la app: el idioma, los textos (`useT()`) y los ajustes del sitio (`useSite()`).

## Rutas

Direcciones normales, sin `#`: `/`, `/vinos`, `/wine/dama`, `/vinedos`, `/galeria`, `/novedades`, `/contacto`, `/privacidad`.

- `src/lib/routing.ts` convierte dirección ↔ página (`parseRoute`, `pathFor`) y decide qué páginas están activas (`pageOn`). Es código puro, con su chequeo en `tools/check-routing.ts`.
- `src/app/SiteRoot.tsx` guarda la página en un estado, escucha el botón atrás (`popstate`) y actualiza `history`, el título de la pestaña, el `canonical` y el foco.
- Los enlaces antiguos `/#/vinos` se entienden y se reescriben a `/vinos`.
- `vercel.json` devuelve `index.html` para cualquier dirección que no sea un archivo, `/api/…` o `/assets/…`.
- Una página apagada en el CMS (`showGallery`, `showNews`…) no se muestra: `visiblePage` cae a la primera página activa.

## Contenido: texto, fotos y ajustes

Todo lo que ve el visitante llega por tres canales; **nunca se escribe texto a mano en un componente**.

1. **Textos** — `src/i18n/es.ts` es la fuente de verdad; `en.ts` y `pt.ts` tienen las mismas claves (el tipo `Copy` lo obliga). Cada texto se pide con `const t = useT()` y `t.seccion.clave`.
2. **Fotos** — `md('/assets/foto.jpg')` (en `src/cms`) devuelve la foto que el cliente puso en Sanity, o la incluida en `public/assets` si no hay. Las fotos de vinos van por `bottle(wine)` (`lib/assets.ts`).
3. **Ajustes** — `useSite()`: nombre, logo, video, contacto, redes y qué secciones se muestran.

`applyCms` (`src/cms/index.ts`) mezcla lo del CMS sobre lo incluido, pieza por pieza: un texto que no existe en Sanity se ve igual con la versión del código. Si Sanity no responde, la web se ve completa.

La carga: primero la última copia guardada en el navegador, luego una respuesta rápida de la CDN de Sanity, luego la respuesta en vivo (que siempre gana). Así el contenido aparece rápido y un cambio recién publicado se ve enseguida.

## Edición sobre la web (Studio)

Dentro del iframe de "Editar sobre la web" del Studio (`PREVIEW`), la web carga `src/cms/live.tsx` (solo ahí, el visitante nunca lo descarga). Muestra borradores en vivo y dibuja los puntos de clic para editar; `editAttr` marca fotos y videos y el texto lleva marcas invisibles (stega). La consulta se limita a la página en pantalla para no saturar el Studio.

## Idiomas

`es`, `en` y `pt` vienen en el código. El CMS puede activar, apagar o añadir idiomas (documentos `language`); un idioma nuevo parte del texto en inglés. La primera visita usa el idioma del navegador si la web lo tiene. `lang` del `<html>` se actualiza al cambiar.

## Mapa del Valle de Uco

`components/UcoMap.tsx` dibuja un mapa propio en SVG sobre una imagen satelital (Sentinel-2 de 2016, EOX, CC BY 4.0, con relieve). Los puntos de las fincas, el río y las zonas están en `src/data/*` y los **generan** los scripts de `tools/map` (ver `docs/historial-del-proyecto.md`, sección del mapa). No se editan a mano.

## Formulario de contacto

`pages/Contacto.tsx` valida en el navegador (email obligatorio y con forma de email; teléfono solo números, 6–15 dígitos; país de una lista) y envía a `/api/contact`.

`api/contact.ts`, en orden: origen permitido → tamaño máximo → campo trampa (honeypot) → límite de 5 envíos por IP cada 10 minutos → casilla anti-robots de Cloudflare Turnstile → las mismas reglas de campos, otra vez, en el servidor → correo en texto plano por SMTP. Nada de lo que escribe el visitante se interpreta como HTML. Los chequeos de reglas y límites están en `tools/check-contact.ts`.

## Seguridad

- Cabeceras en `vercel.json`: HSTS, `nosniff`, política de referencias y permisos, y `frame-ancestors` que solo deja incrustar la web en el Studio (necesario para "Editar sobre la web").
- La política de contenido completa (`Content-Security-Policy-Report-Only`) está en modo solo-aviso: no bloquea nada. Pasarla a modo activo es una decisión pendiente (ver `docs/despliegue.md`).
- Sin cookies ni analítica. El navegador guarda solo `vf-lang`, `vf-theme`, `vf-age-ok` y `vf-cms` (copia del contenido).
- No se publican mapas de código (`sourcemap: false`) y no hay claves en el código. Las claves viven en las variables de entorno de Vercel.
- Los enlaces de redes sociales que vienen del CMS solo se aceptan si empiezan por `https://`.

## Accesibilidad

El aviso de edad es un diálogo modal (el resto de la página queda inerte detrás), hay enlace "Saltar al contenido", el foco pasa al contenido al cambiar de página, el video tiene botón de pausa, los menús se cierran con Esc y se respeta `prefers-reduced-motion`. Mantén estas reglas al tocar esas piezas.
