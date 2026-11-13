# Altamira de los Andes — sitio web

Web de la bodega **Altamira de los Andes** (Valle de Uco, Mendoza). Trilingüe (español, inglés y portugués), con modo claro y oscuro, contenido editable desde un CMS y formulario de contacto que llega por correo.

- **Producción:** https://altamiradelosandes.com
- **CMS (Sanity Studio):** https://cms.altamiradelosandes.com — repositorio aparte, `altamira-cms`
- **Diseño (Figma):** archivo "ALTAMIRA DE LOS ANDES" — incluye la guía de uso para el cliente
- **Hosting:** Vercel (proyecto `altamira`, se despliega solo con cada push a `main`)

## Empezar

Requisitos: Node 22 y [pnpm](https://pnpm.io) 10 (con `corepack enable` se instala solo).

```bash
pnpm install
pnpm dev          # http://localhost:8443
```

| Comando | Qué hace |
|---|---|
| `pnpm dev` | Servidor de desarrollo con recarga en vivo |
| `pnpm typecheck` | Comprueba tipos y código sin usar (TypeScript estricto) |
| `pnpm test` | Chequeos de las reglas del formulario de contacto y de las rutas |
| `pnpm build` | Compila la web a `dist/` |
| `pnpm check` | Todo lo anterior, en orden. **Corre esto antes de cada commit.** |

La web funciona sin variables de entorno: el contenido viene de Sanity (lectura pública) y, si no responde, se ve el contenido incluido en el código. Para probar el **formulario de contacto** en local hacen falta las variables de [`docs/despliegue.md`](docs/despliegue.md).

## Estructura

```
src/
  App.tsx            punto de entrada: idioma + raíz del sitio
  app/SiteRoot.tsx   rutas, aviso de edad, títulos de página, foco al navegar
  pages/             una pantalla por archivo (Home, Vinos, WineDetail, Vinedos, Contacto…)
  components/        piezas compartidas (Header, Footer, UcoMap, Gallery, AgeGate…)
    contact/         buscadores de país y prefijo, y la casilla anti-robots
  lib/               rutas, hooks, rutas de imágenes y catálogo de vinos, países
  i18n/              textos: es.ts (fuente de verdad), en.ts, pt.ts + proveedor de idioma
  cms/               lectura de Sanity y vista previa con clic para editar (live.tsx)
  data/              datos del mapa (generados: no se editan a mano)
api/contact.ts       función de Vercel: valida, limita envíos y manda el correo
tools/               chequeos (test), scripts del mapa (tools/map) y del video de portada
public/              imágenes, video, PDFs de fichas, fuentes propias, robots y sitemap
docs/                documentación (ver abajo)
```

## Documentación

- [`docs/arquitectura.md`](docs/arquitectura.md) — cómo funciona: rutas, contenido, idioma, mapa, formulario y seguridad
- [`docs/contenido-y-cms.md`](docs/contenido-y-cms.md) — de dónde sale cada texto y foto, y cómo añadir páginas, vinos e idiomas
- [`docs/despliegue.md`](docs/despliegue.md) — Vercel, variables de entorno, dominio y lista de comprobación antes de publicar
- [`CONTRIBUTING.md`](CONTRIBUTING.md) — convenciones de código y de commits
- [`docs/historial-del-proyecto.md`](docs/historial-del-proyecto.md) — traspaso original, decisiones del cliente y regeneración del mapa
