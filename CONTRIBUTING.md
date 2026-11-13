# Guía de contribución

## Antes de empezar

```bash
pnpm install
pnpm dev
```

Lee `docs/arquitectura.md` (15 minutos) y `docs/contenido-y-cms.md`.

## Flujo

1. Trabaja en una rama (`feature/…`, `fix/…`) y abre un pull request hacia `main`. `main` es producción: cada push se publica.
2. Corre `pnpm check` antes de subir. GitHub Actions repite el chequeo.
3. Un cambio, un commit (o un PR) con un propósito claro.

**Mensajes de commit:** en inglés, en presente, empezando por el verbo y diciendo *qué cambia para quien usa la web* — `Contact form: privacy notice above the Send button`. El cuerpo explica el porqué cuando no es obvio.

## Cómo está escrito el código

- **Un archivo, una responsabilidad.** Una página por archivo en `src/pages`; las piezas compartidas en `src/components`; lo que no es visual (rutas, hooks, catálogos) en `src/lib`. Si un archivo pasa de ~300 líneas, pregúntate si son dos cosas.
- **Nada de texto fijo en los componentes.** Todo lo que se lee sale de `useT()` (`src/i18n`). Textos nuevos: las tres lenguas a la vez.
- **Las fotos pasan por `md()`**, para que el cliente pueda cambiarlas desde el CMS.
- **Lógica pura aparte y con prueba.** Lo que se puede probar sin navegador (rutas, validación) se escribe como funciones puras y tiene su `tools/check-*.ts` (`assert` y `node`, sin librerías). Añade la prueba junto con la regla.
- **TypeScript estricto.** `noUnusedLocals` y `noUnusedParameters` están activos: lo que no se usa se borra, no se comenta. Evita `any`; si es inevitable, deja un comentario con el motivo.
- **Estilos con las clases de Tailwind y los colores del tema** (`bg-surface`, `text-ink`, `bg-accent-solid`…, definidos en `src/index.css`). Así el modo oscuro funciona solo. No pongas colores en hexadecimal dentro de un componente.
- **Comentarios solo para el porqué.** El qué lo dice el código. Una regla que no se ve (un fallback, un límite, una trampa del navegador) lleva una línea que la explique.
- **No rompas lo accesible.** Enlaces y botones con nombre, foco visible, contraste, `alt` en fotos con contenido, teclado en menús y listas. Mira la sección de accesibilidad en `docs/arquitectura.md`.
- **Seguridad:** nada de claves en el código; lo que escribe el visitante nunca se interpreta como HTML; el servidor revalida lo que el navegador ya validó.
- **Archivos generados no se editan a mano:** `src/data/*` (los produce `tools/map`) y `pnpm-lock.yaml`.

## Imágenes y archivos pesados

Todo lo de `public/` se publica: nada de originales de cámara, RAW ni PSD (van en `originals/`, fuera de `public/`). Las botellas, en WebP; las fotos, hasta ~2000 px de ancho.

## Dependencias

Antes de añadir una, mira si el navegador o lo que ya está instalado lo resuelve. Cada paquete nuevo pesa en el JavaScript que descarga el visitante.
