# plaiground

Web de matIAs plAIground. Sitio estático servido con Cloudflare Workers.

- `public/`: todo lo que se publica (home en `public/index.html`, cada proyecto en su carpeta).
- `wrangler.jsonc`: le dice a Cloudflare que publique la carpeta `public/`.

Cada push a `main` se despliega automáticamente.
