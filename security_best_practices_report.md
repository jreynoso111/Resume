# Auditoría de Seguridad

## Resumen ejecutivo

No encontré secretos privados evidentes en el árbol actual ni en un barrido rápido del historial Git con patrones de credenciales comunes. Sí encontré tres riesgos relevantes:

1. El sitio puede hidratar HTML almacenado en Supabase y escribirlo directamente con `document.write()` en producción, pero el repositorio actual ya no versiona las políticas RLS/migraciones que deberían proteger `cms_pages` y `storage`. Eso deja un punto ciego serio: cualquier drift o mala configuración fuera del repo puede convertirse en XSS persistente y toma de control del sitio.
2. No hay una CSP ni otros headers de endurecimiento visibles en el repositorio, mientras se cargan scripts críticos desde CDN sin SRI. Eso aumenta el impacto de XSS y de un incidente de supply chain.
3. La higiene del repositorio para secretos es débil: `.gitignore` no protege archivos `.env` ni otros artefactos con credenciales, aunque varios scripts sí esperan `SUPABASE_SERVICE_ROLE_KEY` y `SUPABASE_ADMIN_PASSWORD`.

## Hallazgos críticos y altos

### SEC-01
- Severidad: Alta
- Ubicación:
  - `js/editor-auth.js:1090-1116`
  - `js/editor-auth.js:1250-1252`
  - `js/supabase-config.js:21-28`
  - Evidencia histórica: commit `47a83f9`, archivo `db/supabase-secure.sql` (ya no existe en el repo actual)
- Evidencia:
  - `js/editor-auth.js` lee `html` desde `cms_pages`:
    - `.from(table).select('path,html,updated_at')`
  - Luego lo inserta con:
    - `document.write(patchSnapshotShell(html, resolvedPagePath));`
  - En `js/supabase-config.js`, `cms.autoHydrate` queda activo fuera de `localhost`.
  - En el historial, `db/supabase-secure.sql` definía RLS/policies para `cms_pages` y `storage.objects`, pero ese archivo fue eliminado del repo.
- Impacto:
  - Si las políticas RLS reales en Supabase se relajan, se eliminan o divergen del diseño original, un atacante que consiga escribir en `cms_pages` puede inyectar HTML/JS persistente para visitantes, robar sesiones y alterar el contenido público.
- Recomendación:
  - Volver a versionar todas las migraciones y políticas de Supabase en el repositorio.
  - Tratar `cms_pages.html` como contenido de alto riesgo: idealmente sanitizarlo en backend antes de publicarlo o limitarlo a un subconjunto seguro.
  - Deshabilitar `autoHydrate` por defecto hasta que las políticas RLS estén auditadas y versionadas.
- Mitigación inmediata:
  - Verificar en Supabase que `cms_pages` y `storage.objects` tengan RLS habilitado y políticas admin-only vigentes.
  - Revisar si el bucket `resume-cms` permite escritura solo al rol esperado.
- Nota:
  - El riesgo final depende de la configuración actual de Supabase, que no es visible en este repo.

## Hallazgos medios

### SEC-02
- Severidad: Media
- Ubicación:
  - `admin/dashboard.html:635`
  - `index.html:294`
  - `pages/blog.html:58`
  - `pages/projects.html:141`
  - `assets/js/auth.js:184-189`
  - `js/editor-auth.js:654-659`
- Evidencia:
  - Se carga `@supabase/supabase-js` desde `https://cdn.jsdelivr.net/...` en múltiples entrypoints.
  - No encontré `Content-Security-Policy`, `frame-ancestors`, `Permissions-Policy`, `Referrer-Policy` ni archivos de configuración de headers en el repositorio.
  - Las sesiones de Supabase se persisten en navegador con `persistSession: true`.
- Impacto:
  - Un XSS o un compromiso del CDN tendría un radio de impacto mayor, porque no hay una defensa visible que limite ejecución de scripts y las sesiones quedan persistidas en el cliente.
- Recomendación:
  - Definir CSP en el hosting/CDN o en headers del edge.
  - Preferir assets autoalojados o añadir SRI donde aplique.
  - Añadir al menos `Referrer-Policy`, `X-Content-Type-Options`, `Permissions-Policy` y una política explícita de framing.
- Mitigación inmediata:
  - Empezar con una CSP restrictiva para scripts first-party y revisar qué inline scripts requieren nonce o refactor.
- Nota:
  - Si estos headers existen en la plataforma de despliegue y no en el repo, hay que validarlos en runtime.

### SEC-03
- Severidad: Media
- Ubicación:
  - `.gitignore:1-3`
  - `scripts/sync_pages_to_supabase.py:244-253`
  - `scripts/migrate_images_to_supabase.py:231-242`
- Evidencia:
  - `.gitignore` actual solo ignora `.DS_Store`, `*.log` y `scripts/supabase_images_manifest.json`.
  - Los scripts operativos consumen `SUPABASE_SERVICE_ROLE_KEY` y `SUPABASE_ADMIN_PASSWORD` desde variables de entorno.
- Impacto:
  - El repo no tiene barreras básicas contra commits accidentales de `.env`, dumps, claves de Supabase o archivos locales de configuración. El riesgo principal aquí es filtración futura, no una exposición ya confirmada.
- Recomendación:
  - Ignorar al menos: `.env`, `.env.*`, `supabase/.env*`, `*.pem`, `*.key`, `.secrets*`, artefactos locales de CLI y salidas temporales.
  - Añadir un escaneo de secretos en pre-commit/CI.
- Mitigación inmediata:
  - Rotar cualquier secreto que haya sido manejado en archivos locales no ignorados aunque no esté actualmente versionado.

## Hallazgos bajos

### SEC-04
- Severidad: Baja
- Ubicación:
  - `js/supabase-config.js:14-17`
  - `admin/dashboard.html:666-689`
  - `js/editor-auth.js:792-797`
  - `supabase/functions/cms-upload/index.ts:4`
  - `supabase/functions/cms-upload/index.ts:55-57`
- Evidencia:
  - El correo y `userId` administrativos están expuestos en el cliente.
  - La Edge Function autoriza uploads verificando email fijo del usuario autenticado.
- Impacto:
  - No es una filtración de secreto por sí sola, pero sí facilita enumeración del admin, phishing dirigido y una lógica de autorización frágil acoplada a identidad estática.
- Recomendación:
  - Mover la autorización a roles/claims o a una tabla protegida por RLS consultada solo en backend.
  - Quitar `adminEmail` y `adminUserId` del bundle cliente si ya no son estrictamente necesarios.

## Revisión de secretos visibles

### Resultado

- No encontré `SUPABASE_SERVICE_ROLE_KEY`, claves privadas PEM, tokens de GitHub, OpenAI, AWS, Slack o similares en el árbol actual.
- Tampoco encontré esos patrones en un barrido rápido del historial Git usando `git log -G`.
- Sí está expuesto un `anonKey` JWT de Supabase en `js/supabase-config.js:10-11`. Eso es normal para un frontend de Supabase y no debe tratarse como secreto, pero su seguridad depende de RLS correcto.
- También están visibles `adminEmail` y `adminUserId` en `js/supabase-config.js:14-15`; no son secretos, pero sí metadatos sensibles.

### Recomendaciones sobre secretos

1. Endurecer `.gitignore`.
2. Añadir un scanner de secretos en CI/pre-commit.
3. Mantener `service_role` solo en backend/entorno de despliegue.
4. Revisar el historial completo con una herramienta especializada como `gitleaks` o `trufflehog` si este repo va a hacerse público o ya se compartió externamente.

## Próximos pasos recomendados

1. Recuperar y versionar las migraciones/policies de Supabase que hoy faltan en el repo.
2. Añadir hardening del despliegue: CSP y demás headers.
3. Fortalecer `.gitignore` y activar escaneo de secretos.
4. Revisar y simplificar el modelo de autorización admin para no depender de identidad fija en frontend.
