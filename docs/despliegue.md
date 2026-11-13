# Despliegue y operación

## Cómo se publica

Cada push a `main` en GitHub (`Altamira-de-los-andes-projects/vistaflores`) lo construye y publica Vercel (proyecto `altamira`) en https://altamiradelosandes.com. Vercel instala con **pnpm** (`pnpm-lock.yaml`; no hay `package-lock.json`) y ejecuta `npm run build`.

Antes de subir: `pnpm check` (tipos, pruebas y compilación). El mismo chequeo corre en GitHub Actions en cada push y pull request.

## Variables de entorno (Vercel → Settings → Environment Variables)

Solo hacen falta para el **formulario de contacto**. Sin ellas la web funciona, y el formulario avisa al visitante que escriba directamente al correo.

| Variable | Valor |
|---|---|
| `SMTP_HOST` | `a0200992.ferozo.com` |
| `SMTP_PORT` | `465` |
| `SMTP_USER` | `inquiries@altamiradelosandes.com` |
| `SMTP_PASS` | contraseña de ese buzón (secreto) |
| `MAIL_TO` | (opcional) destino de los mensajes; por defecto `SMTP_USER` |
| `TURNSTILE_SECRET_KEY` | clave secreta de Cloudflare Turnstile (secreto) |
| `VITE_TURNSTILE_SITE_KEY` | clave pública de Turnstile (va en el navegador) |

Turnstile es gratis: https://dash.cloudflare.com → Turnstile → añadir el sitio `altamiradelosandes.com`. Cambiar una variable exige un nuevo despliegue.

## Dominio y correo

El DNS está en Ferozo (HostMar). El sitio apunta a Vercel con un `A` para el dominio raíz, `CNAME` para `www` y `cms`, y un `TXT` `_vercel` de verificación. **No toques** los registros MX, SPF, DKIM, DMARC ni SRV: son el correo de la bodega.

## Cabeceras de seguridad

Están en `vercel.json`. `Content-Security-Policy` solo protege contra incrustaciones ajenas (`frame-ancestors`: la propia web y el Studio). La política completa viaja como `Content-Security-Policy-Report-Only` (avisa en la consola, no bloquea).

Para activarla: abre la web en producción con la consola del navegador, recorre las páginas, el formulario (con Turnstile) y "Editar sobre la web" desde el Studio; si no aparece ningún aviso, pasa el valor de `Content-Security-Policy-Report-Only` a `Content-Security-Policy` (uniendo los `frame-ancestors`). Si el aviso lista un origen legítimo, añádelo a la política.

## Lista antes de publicar un cambio grande

- [ ] `pnpm check` pasa.
- [ ] Recorrido en escritorio y móvil, en claro y oscuro, en los tres idiomas.
- [ ] Entrar directo a `/vinos`, `/wine/dama` y recargar (la regla de rutas de `vercel.json`).
- [ ] Formulario: un mensaje real llega al buzón.
- [ ] "Editar sobre la web" en el Studio sigue cargando la web.
- [ ] Sin avisos nuevos en la consola.

## Cuentas (traspaso)

GitHub (organización del cliente), Vercel (equipo `altamira-de-los-andes`), Sanity (organización `altamiradelosandes`), Figma, Cloudflare (Turnstile) y Ferozo (DNS y correo). Vercel necesita plan **Pro** para uso comercial. El repositorio `altamira-cms` se despliega como un segundo proyecto de Vercel en `cms.altamiradelosandes.com`.
