# Contenido y CMS

El cliente edita desde **Sanity** (https://cms.altamiradelosandes.com, repositorio `altamira-cms`). Esta página explica el modelo para quien toque el código. Para el cliente, la guía de uso está en el archivo de Figma y en el propio Studio (página de inicio).

## Qué hay en Sanity (proyecto `65z18eah`, dataset `production`, lectura pública)

| Documento | Para qué |
|---|---|
| `siteSettings` (uno solo) | Logo, video y foto de portada, contacto, redes, y los interruptores de secciones (`showGallery`, `showNews`, `showAwards`…) |
| `uiText` (uno por texto) | Cada texto suelto del sitio. `key` = la misma clave del código (`home.heroTitle1`), con una versión por idioma |
| `wine` | Los vinos: nombres, textos, ficha, notas de cata, botella, fondo y PDF de ficha técnica por idioma |
| `siteMedia` (uno por foto) | Fotos del sitio, identificadas por el nombre del archivo que la web usa de respaldo |
| `language` | Idiomas activos del sitio (código, nombre, bandera) |

Reglas del dataset: es **público**, así que nunca guardes ahí datos personales (los mensajes del formulario van por correo, no a Sanity); los ids **no llevan punto** (los ids con punto son privados y la web no los vería).

## Cómo se junta con el código

El código siempre trae su propia versión de todo (`src/i18n/*.ts`, `public/assets`). Lo de Sanity **reemplaza pieza por pieza** y lo que no está en Sanity se ve con la versión del código. Ver `docs/arquitectura.md`.

## Tareas habituales

**Añadir o cambiar un texto**
1. Añade la clave en `src/i18n/es.ts`, `en.ts` y `pt.ts` (el tipo `Copy` avisa si falta alguna).
2. Úsalo con `const t = useT()` → `t.seccion.clave`. Nunca escribas texto fijo en un componente.
3. Para que sea editable en el CMS, crea su documento `uiText` con los scripts de `altamira-cms/scripts` (`import-content.ts` crea lo que falta sin pisar lo que el cliente ya editó). Hasta entonces se ve el texto del código.

**Añadir una foto editable**
Usa `md('/assets/archivo.jpg')` en el `<img src>` (o `{...md('/assets/archivo.jpg')}` para tener también el clic para editar). Crea su documento `siteMedia` con el mismo nombre de archivo.

**Añadir un vino nuevo**
Lo puede crear el cliente en el CMS sin tocar el código: aparece solo en el catálogo y su ficha usa la misma plantilla. Si quieres uno "de fábrica", añade la entrada en `wineCatalog` de los tres idiomas y su botella en `WINE_META` (`src/lib/assets.ts`). Las botellas van en WebP de unos 1100 px de alto.

**Añadir una página**
1. Crea `src/pages/Nombre.tsx` y exporta el componente.
2. Añade el nombre a `Page` y `PAGES` en `src/lib/routing.ts` (y al interruptor `pageOn` si debe poder apagarse).
3. Añádela en el `switch` de `src/app/SiteRoot.tsx`, al menú de `components/Header.tsx` y al `sitemap.xml`.
4. Textos: sección nueva en `es.ts` / `en.ts` / `pt.ts`; título de pestaña en `SiteRoot`.
5. Si el CMS debe cargar sus textos en la vista previa, añade su nombre a `PAGE_OF_HASH` y `ALL_PAGES` en `src/cms/index.ts`.

**Añadir un idioma**
Lo activa el cliente creando un documento `language` en el CMS (empieza con los textos en inglés). Para uno "de fábrica", crea `src/i18n/xx.ts` con el tipo `Copy` y regístralo en `COPY` y `LANGS` (`src/i18n/index.tsx`).

**Fichas técnicas (PDF)**
Una por vino e idioma, en el campo "Ficha técnica" del vino en el CMS. Las de respaldo están en `public/assets/fichas/{es,en,pt}/`.

## Imágenes: reglas

- Fotos de la web: JPG/WebP, no más de ~2000 px de ancho; botellas WebP con fondo transparente.
- Lo que se sube al CMS lo sirve el CDN de Sanity al tamaño pedido (`?auto=format&w=…`); no hace falta optimizarlo a mano.
- Las fotos originales de cámara **no van en `public/`** (todo lo de `public/` se publica). Están en `originals/`.
