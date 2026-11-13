# altamira-de-los-andes-web

React 19 + Vite + Tailwind CSS v4 (sitio de la bodega Altamira de los Andes), con contenido en Sanity y una función de Vercel para el formulario de contacto. Empieza por `README.md` y `docs/arquitectura.md`.

## Development Server

Un servidor Vite ya está corriendo en `$PORT` (por defecto 8443); no hace falta arrancarlo. Los cambios se ven al instante.

## Comandos

- `pnpm check` — tipos + pruebas + compilación. Córrelo antes de dar una tarea por terminada.
- `pnpm typecheck` · `pnpm test` · `pnpm build`

## Project Structure

Empieza por los archivos de la tarea; sigue imports solo si hace falta.

- `src/App.tsx` — punto de entrada (idioma + `SiteRoot`)
- `src/app/SiteRoot.tsx` — rutas, aviso de edad, títulos, foco
- `src/pages/` — una pantalla por archivo (`Home`, `Vinos`, `WineDetail`, `Vinedos`, `Galeria`, `Novedades`, `Contacto`, `Privacidad`)
- `src/components/` — piezas compartidas (`Header`, `Footer`, `UcoMap`, `Gallery`, `AgeGate`…); `contact/` = buscadores de país/prefijo y anti-robots
- `src/lib/` — `routing.ts` (puro, con prueba), `hooks.ts`, `assets.ts` (rutas de imágenes y catálogo de vinos), `countries.ts`
- `src/i18n/` — textos: `es.ts` es la fuente de verdad, `en.ts` y `pt.ts` igual de claves; `index.tsx` = proveedor de idioma
- `src/cms/` — lectura de Sanity; `live.tsx` solo se carga dentro del Studio
- `src/data/` — datos del mapa **generados** por `tools/map` (no editar a mano)
- `api/contact.ts` — función de Vercel del formulario
- `tools/check-*.ts` — pruebas; `tools/map` — generación del mapa
- `index.html`, `vite.config.ts`, `vercel.json` — shell, build y cabeceras/rutas de Vercel

## Reglas

- Sin texto fijo en componentes: todo por `useT()`, en los tres idiomas a la vez.
- Fotos por `md()`; colores por las clases del tema (`bg-surface`, `text-ink`…), nunca hexadecimales.
- Lógica sin DOM en funciones puras con su `tools/check-*.ts`.
- TypeScript estricto con `noUnusedLocals`: lo que no se usa se borra.
- Convenciones completas en `CONTRIBUTING.md`.

## Styling

Tailwind v4 vía `@tailwindcss/vite`. `src/index.css` importa Tailwind, define los tokens de color (claro/oscuro) y las fuentes propias (`public/fonts`). No hay `tailwind.config` ni PostCSS.
