# Páginas legales

Genera `public/legal/*/index.html` (ES + EN) a partir de `content_es.py` y `content_en.py`.

```bash
PLG_NIF="Y7836295W" PLG_DOM="Madrid (España). Dirección postal disponible bajo solicitud por email." PLG_DOM_EN="Madrid (Spain). Postal address available on request by email." python3 tools/legal/build.py public
```

Sin `PLG_NIF` / `PLG_DOM` aparece el marcador amarillo "pendiente de completar".
El banner de cookies está en `public/js/consent.js` (ver comentario al principio para bloquear scripts de analítica hasta que haya consentimiento).
