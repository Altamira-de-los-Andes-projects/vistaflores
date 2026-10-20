# Altamira de los Andes — sitio web (documento de traspaso)

> Este README resume **todo el proyecto y todo lo trabajado en el chat** con una IA anterior. Su objetivo es que
> cualquier persona o IA que continúe entienda qué es el sitio, cómo está hecho, qué se decidió y por qué, qué
> falta y qué reglas de trabajo hay que respetar. Fecha del resumen: **12 de octubre de 2026**.

---

## 1. Contexto del proyecto

| | |
|---|---|
| **Desarrollador** | John (GitHub `johnmartte`), freelancer; su marca es **TEKO**. Habla español. Es el único diseñador/desarrollador. |
| **Cliente** | **Andrew Sinclair Dunlop** ("Sinclair"), dueño de la bodega. Escribe en inglés. |
| **Equipo del cliente** | **Gabriel** (gerente), **Facundo** (jefe de ventas en EE. UU.), **Leonardo**. |
| **Marca** | **Altamira de los Andes**: bodega boutique en el **Valle de Uco, Mendoza, Argentina**. Antes se llamaba "Vista Flores Estate" (sitio viejo: vistafloresestate.com). |
| **Viñedos** | Tres: **Altamira**, **Vista Flores** y **La Consulta**. Coinciden con tres Indicaciones Geográficas oficiales del INV (ver §6). |
| **Idea de marca acordada** | El sitio gira en torno a **Altamira como un lugar privilegiado**: los tres viñedos están juntos en una zona excepcional del Valle de Uco, a gran altura (1.077 m s. n. m.), con los suelos pedregosos de Altamira. Concepto visual "Altamira / altura": la cordillera, la perspectiva desde lo alto. |

El sitio nació como exportación de **Figma Make** y se reconstruyó casi por completo a mano.

---

## 2. Dónde está todo

- **Código:** `C:\wamp64\www\vistaflores`, repo privado **github.com/johnmartte/vistaflores**.
- **Producción:** **https://altamira-de-los-andes.vercel.app/**. Cada push a `main` lo despliega Vercel automáticamente.
  - El dominio propuesto es `altamiradelosandes.com` y aún no está conectado.
  - Proyecto Vercel `prj_1pqz7aZdF8QUMZg9R5P45GwpVLHP`.
  - El viejo `vistaflores.vercel.app` redirige a la URL de producción.
- **Ramas:**
  - `main`: el sitio real. **Es la única rama en la que se trabaja ahora.**
  - `redisign1`: rediseño alternativo v2, "Alta mira" (futurista y elegante, cobre, Jost + Bodoni Moda). Está publicado aparte en **https://altamira-redesign.vercel.app/**. Ese proyecto Vercel (`altamira-redesign`) no está conectado a git: se publicó con la CLI de Vercel desde un `git archive` de la rama. **Nunca** hay que ejecutar `vercel` dentro de la carpeta del repo, porque está enlazada al proyecto principal.
  - `redisign2`: rediseño alternativo v3, "Cava" (oscuro, animado). No está publicado.
  - El cliente siguió con el diseño de `main`. Las otras dos ramas quedan como referencia.
- **Fotos del cliente:** `C:\Users\omail\Pictures\Altamira - Imagenes`. Son 55 fotos de WhatsApp. Las llamamos C01–C55 en el orden en que se enviaron (por la hora del nombre de archivo, no por orden alfabético):
  - **C02–C04** son fotos de mapas de terceros. **No usar.**
  - **C51** y **C55** muestran malla antigranizo negra, que el cliente no quiere ver.
  - **C45** son uvas tintas.
  - **C46–C49** y **C38** son viñas con montañas detrás.
  - **C52–C53** son troncos viejos, pensados para una subpágina que está por definir.
- **Material de referencia del cliente (solo referencia, NUNCA copiar ni calcar):** PDFs de **Zuccardi** en `C:\Users\omail\Downloads` (guía del Valle de Uco y presentación institucional) y `MAP.docx`. Sinclair los mandó para mostrar ideas (mapa de "villages", perfiles de suelo). No se copia nada de otra bodega.

---

## 3. Stack y estructura

- **React 19 + Vite 8 + TypeScript + Tailwind CSS v4** (tokens en `@theme inline`; también se usan container queries). No hay router: es una SPA con **hash routing**.
- **Vercel instala con `pnpm --frozen-lockfile`.** Si agregas una dependencia, actualiza también `pnpm-lock.yaml` (`npx pnpm@10 install --lockfile-only`); si no, el build falla.
- Nota: `CLAUDE.md` (instrucciones de Laravel Boost) **no aplica**, porque esto no es Laravel. `AGENTS.md` es la plantilla de Figma Make y está desactualizada (no hay ningún servidor corriendo).

```
src/
  App.tsx      ~1.700 líneas: TODO el sitio (componentes, páginas, router por hash)
  i18n.tsx     todos los textos en ES / EN / PT (el tipo Copy se deriva de `es`:
               cada clave nueva debe existir en los 3 idiomas o TypeScript falla)
  index.css    tokens de color (claro/oscuro), fuentes, animaciones (reveal, hero, mapa)
  mapdata.ts   geometría real de Argentina/Mendoza/Chile (se usa en el mini-mapa del mapa)
  ucomap.ts    datos del mapa del Valle de Uco (zonas IG, río, etiquetas). Generado; no editar a mano.
public/assets/ imágenes, botellas (PNG transparentes), video del hero, mapa satelital
tools/map/     scripts que generan el mapa (ver §6)
tools/hero/    script ffmpeg que arma el video del hero (ver §5)
```

### Páginas (hash)

- `#/`: **Inicio**.
  - Hero de video con el logotipo **ALTAMIRA** (grande) y **DE LOS ANDES** (más pequeño) debajo.
  - Viñedos, vinos destacados, cifras, premios.
  - La sección de Noticias está oculta.
- `#/vinos`: **Nuestros vinos**.
  - Hero con foto.
  - Filtros por línea: TODOS, RESERVA, VAV, DAMA, NAVIGATO.
  - Grilla de 6 botellas sobre una **foto compartida semitransparente**.
- `#/wine/<id>`: **ficha de cada vino**. Botella "flotante" sobre un panel oscuro.
- `#/vinedos`: **Viñedos**.
  - Hero con la foto C38 del cliente (`vinedos-hero.jpg`).
  - Tres tarjetas, una por viñedo.
  - **Mapa interactivo** (§6).
- `#/contacto`: **Contacto**. Formulario (nombre, email, teléfono, país, mensaje) y el mismo **mapa interactivo**.
- `#/novedades`: **oculta**. Con `SHOW_NEWS = false` en `App.tsx` redirige al inicio y desaparece del menú y del Inicio. Para mostrarla de nuevo, poner `true`.

### Otros comportamientos

- **Verificación de edad** al entrar. Se guarda en `localStorage` con la clave `vf-age-ok`.
- **Idiomas:** ES / EN / PT, guardado en `vf-lang`.
- **Tema claro/oscuro:** guardado en `vf-theme`. Por defecto sigue al sistema (en `index.html`). El modo oscuro va por `[data-theme='dark']` en `<html>`.
- **Animaciones "reveal":** `useReveal()` se ejecuta **una sola vez al montar la página**. El contenido que aparece después (por ejemplo, al cambiar un filtro) necesita que se le agregue `.visible` a mano. Ya está hecho en la grilla de vinos.
- **Aviso legal de alcohol:** el texto está vacío (`''`) a pedido del cliente, y el componente solo lo muestra si hay texto.

---

## 4. Datos e imágenes: qué es real y qué no

### Reales del cliente (prioridad absoluta)

- **`vinedos-hero.jpg`:** foto C38 del cliente (4032 px: cordillera nevada, mar de nubes, hileras abajo). Es el hero de Viñedos desde el 12/10/2026, a pedido de John porque la anterior se veía con poca calidad.
- **`andes-real.jpg`:** foto real de la finca en invierno bajo los Andes (convertida de HEIC). Fue el hero de Viñedos hasta el 12/10/2026; ya no se usa, pero `la-consulta-real.jpg` sale de ella. **No reemplazar fotos del cliente por stock.**
- **`la-consulta-real.jpg`:** recorte de la anterior.
- **`vinos-hero.jpg`:** foto C48 del cliente (viñas, cordillera y cielo). Es el hero de Nuestros vinos desde el 12/10/2026. `mza-altamira.jpg` sigue en la verificación de edad, el Inicio y Viñedos.
- **`wbg-<id>.jpg` (14/10/2026):** fondo distinto detrás de cada botella en la ficha de vino (6 archivos: dama, navigato, reserva-malbec, reserva-cf, vav-malbec, tres-fincas). Cuatro son fotos nuevas que envió John (imágenes 9-12, posiblemente del anuncio original); `wbg-vav-malbec` = C26 y `wbg-tres-fincas` = C13 son rellenos nuestros hasta que John mande 2 más. El código usa `${A}/wbg-${wine.id}.jpg`.
- **`wine-bg.jpg`:** foto C26 del cliente (montañas con luz dorada). En la ficha de cada vino ocupa la parte superior izquierda y se funde con un degradado hacia la columna de texto ("Montaña integrada"); la botella lleva sombra de piso y la ficha técnica va en grilla de 2 columnas.
- **`vinos-row-c39.jpg`:** foto C39 del cliente (cordillera entre nubes, álamos amarillos, viña), ya desenfocada y algo desaturada en el archivo. Desde el 12/10/2026 la grilla de Nuestros vinos es "Horizonte": cada fila de botellas apoya sobre una franja de esta foto que se funde con el fondo en la base de las botellas. En escritorio la foto es fija (`bg-fixed`), así que cada franja es una ventana al mismo paisaje al hacer scroll. Las filas se arman según las columnas (1/2/3) con `useGridCols()`.
- **`vinos-bg.jpg`** (ya no se usa; queda en el repo por si se quiere volver): foto del cliente (12/10/2026) con viñas adelante y la cordillera atrás. Es el fondo de la grilla de Nuestros vinos.
  - Velo: `bg-surface/[0.6]` en modo claro y `dark:bg-surface/[0.42]` en oscuro.
  - En modo oscuro los enlaces son rosa claro y el texto lleva sombra.
  - **A John le gustó así.**
- **Botellas oficiales** del sitio viejo del cliente: `reserva-cf.png` y `reserva-malbec.png`.
  - Otras botellas actuales: `5c918.png` (Dama), `3d3ec.png` (Navigato), `4600e.png` (VAV Malbec), `73703.png` (Tres Fincas).
  - Hay más renders oficiales en `vistafloresestate.com/wp-content/uploads/2025/05/propuesta2-NN-834x1536.png`. El de Dama (14‑1) trae una sombra gris incrustada.

### Stock (temporales)

- ~~**`mza-*.jpg`:** fotos de Pexels de Tunuyán y Potrerillos.~~ **Eliminadas el 14/10/2026** y reemplazadas por fotos reales del cliente: verificación de edad → `gate-bg.jpg` (C38); sección estate del Inicio → `estate-wide.jpg` (C46); banda de la cita → `quote-bg.jpg` (C21); viñedo Altamira → `altamira-vy.jpg` (C49); viñedo Vista Flores → `vistaflores-vy.jpg` (C47); La Consulta → `la-consulta-real.jpg`. (La asignación por viñedo es criterio nuestro; falta que Sinclair confirme cuál foto es de cuál finca.) La imagen de la página de **Contacto** (antes un Unsplash de bodega, `CELLAR`) ahora es `contact-bg.jpg` (C06, viña con cartel de Altamira). La sección Noticias (oculta) todavía usa URLs de Unsplash en el objeto `IMG`.
- **Video del hero:** montaje propio con clips de **Mixkit** (licencia libre, sin atribución).
- **Regla:** nunca usar fotos o videos de otras bodegas, ni carteles, marcas o caras identificables.
  - Ya se descartó el video promocional de la bodega Bianchini.
  - También se quitó una foto con el cartel "Staphyle", que el cliente dijo que no era de Mendoza.

### Textos provisionales

- **Suelos de las tarjetas** ("Pedregoso", "Franco-arenoso", "Mineral"): faltan datos reales del cliente.
- **Altitudes:** Altamira 1.077 m y Vista Flores 1.050 m vienen del cliente (se mantienen en las fichas de cada viñedo). La Consulta no tiene altitud. **Desde el 14/10/2026 la cifra principal del sitio es el promedio 1.050 m (3.445 ft)**, según el "written narrative" del cliente (ver §11).

---

## 5. Video del hero (Inicio)

- **Archivos:** `public/assets/hero-andes.mp4` y `hero-andes.jpg` (póster).
- **Script:** `tools/hero/build_hero.sh` (ffmpeg). Normaliza a 1600×900 a 25 fps, aplica un etalonaje común (eq + colorbalance) y une los clips con fundidos `xfade`.
- **Secuencia:** cumbres → vuelo → viñedo → uvas → manos → copa → atardecer en la montaña → cumbres (cierra en bucle).
- Los clips fuente de Mixkit no están en el repo; estaban en una carpeta temporal `hd/`. Se identifican por su número de Mixkit: 4396, 51689, 8292, 29340, 17782, 24754, 22734 y 4695.
- **Uvas tintas (12/10/2026):** el clip **24754** (manos con uvas **verdes**) se tapó con la foto C45 del cliente (racimo tinto) con un zoom lento, usando `tools/hero/swap_grapes.sh` sobre el video publicado (tramo 14,5–18,1 s). El recorte está en `tools/hero/c45-red-grapes.jpg`. Si algún día se regenera el video desde los clips con `build_hero.sh`, hay que volver a correr `swap_grapes.sh` después.
- **Uvas en movimiento de vuelta (19/10/2026):** Sinclair aclaró que solo quería quitar la foto fija/primer plano (C45), no el clip de uvas. Se partió del video anterior a `16974bd` y se cortó solo el tramo de C45 (14,5–18,1 s): el clip 17782 (racimo tinto entre hojas) vuelve y funde directo al servido de la copa. Duración 22,5 s.

---

## 6. El mapa del Valle de Uco (`UcoMap` en `App.tsx`)

Está en **Viñedos** (reemplazó al mapa satelital de Leaflet; la librería se quitó) y en **Contacto**.

### Qué muestra

- **Fondo:** imagen satelital natural **Sentinel‑2 cloudless 2016** de EOX con un sombreado de relieve suave (`public/assets/uco-sat.webp`, 2400×1629).
  - Licencia **CC BY 4.0**. **El crédito visible es obligatorio** y ya está en letra pequeña al pie del mapa.
  - ⚠️ Las versiones 2018 en adelante de EOX son **no comerciales**: **no usarlas.**
- **Tres zonas clicables**, una por Indicación Geográfica, dibujadas con los **límites oficiales del INV**:
  - **Paraje Altamira** (Res. INV 82‑E/2017).
    - Oeste: río Tunuyán. Este: curva de nivel de 1.000 m.
    - Norte: calle La Superiora.
    - Sur: 25 coordenadas más la calle El Indio.
    - Legalmente está **dentro** de La Consulta, así que se dibuja encima. Color dorado `#c9a063`, un poco más intenso porque es el foco de la marca.
  - **La Consulta** (Res. INV 19/2014).
    - Oeste: río Tunuyán. Este: Ruta Nacional 40. Norte: el cruce de ambos.
    - Sur: calle Los Indios más 4 coordenadas.
    - Color salvia `#8f9b66`.
  - **Vista Flores** (Res. INV C.11/2012). Son los límites administrativos del distrito (OSM, relación 3030379). Color vino `#8c3044`.
- **Al hacer clic en una zona:**
  - Se resalta y las demás se atenúan.
  - Se abre una tarjeta con el texto del viñedo, tomado de `t.vinedos.cards`.
  - En celular la tarjeta sale abajo, como una hoja.
  - Se cierra con la ✕, con Esc o haciendo clic fuera.
- **También muestra:**
  - El río Tunuyán.
  - Los pueblos Tunuyán y San Carlos.
  - "Cordillera de los Andes" y la flecha hacia la Ciudad de Mendoza.
  - Un mini-mapa de Argentina con Mendoza resaltada.
  - La cifra **1.077 m s. n. m.**, la escala de 5 km y el norte.
- **Encuadre por tamaño de pantalla:** el escritorio y el celular tienen recortes distintos (`UCO_VB_DESKTOP` y `UCO_VB_MOBILE`).

### Historia del mapa

1. **Primera versión:** silueta de Argentina con una lupa sobre el Valle de Uco, según un concepto del sitio viejo. A Sinclair **no le gustó.**
2. **Segunda versión:** relieve cobre sobre negro, al estilo de una infografía de la India que mandó John, con marcadores de los viñedos. John pidió **más zoom, marcar zonas como el mapa de "villages" de Zuccardi y un look más natural, menos cobre.**
3. **Tercera versión (la actual):** satélite natural más las zonas IG oficiales.

### Cómo regenerarlo

Usar los scripts de `tools/map/` (Python con numpy y Pillow):

1. `fetch_dem.py`: descarga los tiles de elevación de AWS Terrain Tiles y genera `elev.npy`.
2. `build_v2.py`: descarga los tiles de Sentinel‑2, arma `uco-sat.webp` y lee las líneas de OSM.
   - Las líneas vienen de `ov5.json` (río, RN40, La Superiora) y `vf.json` (Vista Flores).
   - Escribe `v2_lines.json`.
3. `zones_v2.py`: rellena cada zona entre sus límites legales, traza el contorno y genera `zones_v2.json`.
4. `gen_v2.py`: escribe `src/ucomap.ts`.

Después hay que copiar `uco-sat.webp` a `public/assets/`.

- Overpass (la API de OSM) suele estar caído. El espejo que funcionó fue `https://maps.mail.ru/osm/tools/overpass/api/interpreter`.
- Las zonas muestran la **región oficial**, no la finca exacta. **Faltan las coordenadas reales de cada finca**: hay que pedírselas al cliente si quiere marcarlas.

---

## 7. Lo que pidió el cliente (historial)

- **Diseño base y ajustes (septiembre de 2026):**
  - Cambio de nombre de Vista Flores a **Altamira de los Andes**.
  - Hero con logotipo y video de los Andes.
  - Verificación de edad con foto en lugar de negro con líneas.
  - Fotos reales de Mendoza.
  - Sitio adaptado a celular y tableta.
  - Historial del navegador (atrás/adelante y enlaces directos).
- **Correo de Sinclair con 16 cambios (10 de octubre):**
  - Nombres de los tres viñedos.
  - Filtros por línea.
  - Textos: "At the heart of the Uco Valley", altitud de 1.077 m (3.530 ft).
  - Formulario de contacto con teléfono.
  - Botella correcta del Cabernet Franc.
  - Atardecer en el video y nubes más lentas.
  - Mapa estilizado, entre otros.
  - Quedó todo hecho **menos el n.º 9 (perfiles de vino)**, que espera contenido del cliente.
- **Reunión del 11 de octubre:**
  - Mapa más realista con los tres viñedos juntos en Altamira.
  - Fondo con imagen en "Our Wines" en vez del color sólido.
  - Agregar "las piedras de Altamira" (suelos pedregosos).
  - Terminar el diseño esa semana.
  - Ese mismo día Sinclair mandó las 55 fotos.

### Plan por fases (acordado con John)

**Fase 1: cambios directos**

1. ✅ Ocultar Noticias.
2. ⏸ "More details" de Dama y Navigato debe ir directo a la ficha, quitando la "página intermedia de media pantalla". **No está claro qué es esa página**, porque en el código todos los botones ya van directo. Hay que pedirle a John una captura antes de tocar nada.
3. ✅ Video del hero: el clip de uvas verdes se cambió por la foto C45 (racimo tinto) con zoom lento.
4. ✅ Hero de `/vinos` (hecho con **C48**, solo en `/vinos`): más luminoso y natural, con viñas adelante y montañas atrás, sin malla negra.
   - Candidatas: C47, C48, C49, C46, C38.
   - Hay que preguntar si se cambia solo ahí, porque `mza-altamira.jpg` también se usa en la verificación de edad, en el Inicio y en Viñedos.
   - Ojo: John aclaró que la foto del 12 de octubre era **para el fondo de las botellas, no para el hero**.
5. ✅ Ficha de vino (hecho con **C26**): mantener la botella flotante y probar un fondo tenue de montaña detrás. Candidatas: C21, C22, C26.

**Fase 2: definir antes con Sinclair**

- **Perfiles de suelo/terroir** con fotos reales de calicatas y datos.
- **Imagen de "perspectiva":** una persona mirando desde la montaña. Hace falta la foto.
- **Tomas aéreas de dron:** stock temporal hasta que la finca grabe las suyas.
- **Subpágina de troncos viejos** (C52, C53).
- **Perfiles de vino** (el n.º 9).
- Posible **logo nuevo**.

### Decisiones de infraestructura (tomadas en correos y reuniones)

- **Hosting:** se eligió **Ferozo** tras una reunión con Facundo. Hoy el sitio está en Vercel; queda pendiente migrarlo o configurarlo.
- **Correo:** se habló de M365, Google y Zoho. Sinclair enviará credenciales cuando toque configurar los correos.
- **Modalidad de trabajo y precio:** John quiere hablarlo con el cliente después de terminar el diseño. El tema del contrato quedó en pausa por decisión de John.

---

## 8. Reglas de trabajo (MUY importantes)

1. **Trabajar solo en `main`.** Ojo: `main` publica a producción automáticamente.
2. **No hacer push sin que John lo diga.** Los commits se quedan locales hasta que él los publique (ver §9).
3. **No improvisar ni inventar contenido.** Si una tarea necesita una imagen, un texto o un dato, **hay que pedírselo a John**. Para tareas grandes, primero se propone un plan y John da el visto bueno.
4. **Nada de Zuccardi ni de otras bodegas:** se usan como referencia de ideas, nunca se copian, recortan ni calcan.
5. **John no revisa en local:** no le levantes `npm run dev` para que mire; él revisa el sitio publicado. Para verificar por tu cuenta, haz un build en una carpeta temporal y saca capturas con Chrome sin interfaz (es lo que se hizo en todo el chat).
6. **Responder a John en español.** Los correos al cliente van en inglés, con un tono profesional y cercano, y sin sonar necesitado.
7. **Probar los tres idiomas y los dos temas.** Todo texto nuevo va en `i18n.tsx` en ES, EN y PT.
8. Los commits terminan con la línea `Co-Authored-By` que indique la herramienta.

---

## 9. Estado al 12 de octubre de 2026

**Publicado en producción** (hasta `d459617`, subido por John el 12 de octubre):

- Ocultar Noticias (flag `SHOW_NEWS`).
- Nuestros vinos: foto del cliente detrás de las botellas, con velo oscuro y enlaces legibles en modo oscuro.
- Mapa: satélite natural con las zonas IG oficiales, en Viñedos y en Contacto.

**Sin subir:** solo el commit que agrega este README y `tools/`. Se publica con `git push origin main` cuando John lo indique.

**Pendientes inmediatos:**

- Recibir las coordenadas de cada finca para marcarlas en el mapa.
- Recibir los datos reales de suelos y la altitud de La Consulta.
- Fase 1: puntos 3, 4 y 5 hechos (commit local, sin subir). Solo queda el punto 2, que espera una captura de John.

---

## 10. Trampas técnicas conocidas

- **Cambiar de filtro dejaba la grilla en blanco:** las tarjetas nuevas no recibían `.visible`. Ya está resuelto con un efecto que la agrega.
- **Ramas de rediseño:** el `clip-path` va en los hijos, no en el elemento que observa el IntersectionObserver; si no, las imágenes desaparecen.
- **Pillow:** una imagen creada con `Image.fromarray()` es de solo lectura para `floodfill`. Hay que hacer `.copy()` antes.
- **Consola de Windows (cp1252):** usar `PYTHONIOENCODING=utf-8` al imprimir caracteres como "→".
- **PDFs:** la herramienta de lectura de PDF falla sin poppler. Usar PyMuPDF (`import pymupdf`).
- **Capturas sin interfaz:** para saltar la verificación de edad, inyectar `localStorage.setItem('vf-age-ok','1')` antes de cargar la página.

---

## 11. "Written narrative" del cliente (14/10/2026)

Sinclair envió `written narrative for new website.docx` (en `C:\Users\omail\Downloads`) con el texto definitivo, que **reemplaza** la copy descriptiva anterior. Insertado en los 3 idiomas (EN textual de Sinclair; ES/PT traducción fiel, sin cambiar datos):

- **Inicio:** `heroSubtitle` = tagline; sección oscura de viñedos (`vyIntro`) = párrafo "The Uco Valley" (río Tunuyán, +250 días de sol); sección "estate" (`estatePara1/2`) = párrafo "Altamira de los Andes" (altitud media, clima 14 °C).
- **Viñedos (`Vinedos` en `App.tsx`):** `intro1/2` = párrafo "Three high-altitude vineyards"; y **3 secciones nuevas** al final de la página: Suelo (`narrative.soil*`), Viñas viejas (`narrative.vines*`), Artesanía (`narrative.craft*`). Las claves `vinedos.narrative.*` están en `i18n.tsx`.

Decisiones tomadas (confirmadas con John):
- **Altitud:** cifra principal del sitio = **1.050 m (3.445 ft)** promedio. Fichas de cada viñedo mantienen Altamira 1.077 / Vista Flores 1.050.
- **Viñas viejas:** **La Consulta pasó a "+85 años"** (y el Malbec viejo de Navigato); **Altamira se mantiene en "+70 años"** (el narrativo no menciona su edad).
- **Se quitó** la línea de fundación "Bill Navigato y Janett, 2007", que no está en el narrativo y no estaba verificada.

Imágenes (sin subir aún):
- `vinedos-hands.jpg` (artesanía): foto de manos cosechando uva tinta que **envió John; proviene del anuncio inmobiliario original de la finca**. Conviene reemplazarla luego por una foto propia de la bodega.
- `vinedos-vines-1/2.jpg`: troncos viejos reales del cliente (C52/C53).
- `vinedos-soil.jpg`: **recorte temporal** del suelo pedregoso de C47. Falta foto real de suelo/calicata.

Pendiente con Sinclair: foto real de suelo; confirmar de qué viñedo son los troncos viejos; traducción de los textos aprobada.
