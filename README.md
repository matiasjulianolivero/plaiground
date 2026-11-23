# plaiground

Web de matIAs plAIground. Sitio estático servido con Cloudflare Workers.

- `public/`: todo lo que se publica (home en `public/index.html`, cada proyecto en su carpeta).
- `wrangler.jsonc`: le dice a Cloudflare que publique la carpeta `public/`.

Cada push a `main` se despliega automáticamente.

## Entornos

- Producción (rama `main`): https://plaigroundmarketing.com
- Staging (rama `staging`): https://staging-plaiground.matiasjulianolivero.workers.dev

## Prototipos de clientes

- VAEM Aberturas: `public/vaem/` → https://plaigroundmarketing.com/vaem/ (fuera de Google con `noindex`).

## Data plaiground (servidor)

`src/index.js` es un Worker que solo atiende `/api/*`; el resto de la web se sirve tal cual desde `public/`.

- **Acceso con enlace mágico**: `POST /api/auth/request` envía el email (Resend) y `POST /api/auth/verify` abre la sesión (cookie `plg_session`, 30 días).
- **Dashboards por usuario**: `GET/POST /api/dashboards`, `DELETE /api/dashboards/:id`.
- **Cuenta**: `GET /api/me`, `DELETE /api/me` (borra la cuenta y todos sus datos).
- **Base de datos**: D1 `plaiground-data` (binding `DB`), creada automáticamente en el primer despliegue. Las tablas se crean solas.
- **Secreto necesario**: `RESEND_API_KEY` en Cloudflare → Workers → plaiground → Settings → Variables and Secrets.
- Sin el secreto o sin la base de datos, `/data/app/` funciona en **modo demo** (todo en el navegador).
