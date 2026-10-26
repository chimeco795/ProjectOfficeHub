# Project Office Hub

PMO local con un catálogo de proyectos y Seguimiento Ejecutivo por proyecto. React/TypeScript/Vite, FastAPI y SQLite; sin un segundo catálogo ni doble escritura.

## Estado actual — 22 de octubre de 2026

Versión **0.13.0**, fase oficial **13**. La autenticación real se incorporó en **schema 12**; el esquema actual **13** añade únicamente la capacidad multiequipo explícita y la identidad persistente de equipos. No es una fase o versión nueva.

- Acceso con cuentas independientes de Personas, contraseñas scrypt, sesiones revocables, CSRF, expiración, Recordarme y cierre de sesión.
- Admin/Gestor ven todos los proyectos. Miembro y Consulta sólo ven proyectos donde participa su Persona vinculada mediante `project_people`; sin vínculo/participación no reciben proyectos. Consulta es sólo lectura; Miembro conserva escritura operativa en su alcance. Las rutas directas de cortes, registros y descargas también están protegidas.
- Roles profesionales distintos de permisos de acceso. `manages_multiple_teams` configurable, heredable hacia superiores por jerarquía; ningún nombre concede capacidades en ejecución.
- Equipo compartido con código único, color y forma persistentes. La identidad se conserva al ordenar, renombrar o vincular a otros proyectos; el código puede editarse explícitamente.
- Diálogo, confirmación, menú ⋮, toolbar, estados y toast/Deshacer compartidos. Archivados reversibles se ejecutan sin confirmación nativa; Deshacer comprueba la versión guardada.
- Catálogo RAID/hitos/trabajo, planificación, agenda, equipos, documentos y cortes publicados con originales/snapshots protegidos. Importar genera propuestas revisables.

Pendientes y límites actuales: [STATUS](docs/STATUS.md), [contexto](AI_CONTEXT.md) y [última verificación](docs/VERIFICATION_UX_CONTINUATION.md). La historia de fases se consulta aparte; sus cifras y limitaciones corresponden a cada entrega.

## Inicio local

Desde la raíz:

```powershell
.\Start.ps1 -Port 8011
```

Abrir http://127.0.0.1:8011/. En una instalación vacía, el titular configura su primer Admin con su propia contraseña; no hay credenciales predeterminadas ni datos de ejemplo. En una base existente se conservan cuentas, proyectos y sesiones. Sólo el proceso que se reinicia carga el código nuevo.

Requisitos: Python 3.12+ y Node.js 22+.

```powershell
python -m venv .venv
.\.venv\Scripts\python.exe -m pip install -r backend/requirements.lock.txt
Set-Location frontend
npm ci
npm run build
Set-Location ..
.\Start.ps1 -Port 8011
```

## Acceso y recuperación

Admin administra cuentas y su vínculo opcional a una Persona existente. Cambiar permiso, vínculo o estado revoca las sesiones afectadas; el último Admin activo está protegido. No se mezclan Persona, Rol, Equipo, Asignación y Cuenta.

Sesión normal: 30 minutos sin actividad y máximo 12 horas; Recordarme: 7 días sin actividad y máximo 30 días. Cookies HttpOnly/SameSite Strict, Secure sobre HTTPS; ejecución local actual en loopback HTTP. `PMO_SESSION_COOKIE` permite separar instancias de QA.

Recuperación mediante enlace de un solo uso de 30 minutos generado por Admin. No hay proveedor de correo automático, SSO ni MFA conectados. Si el propietario local pierde el único Admin, desde `backend` puede ejecutar:

```powershell
..\.venv\Scripts\python.exe -m app.recover_account --email correo@ejemplo.com
```

El titular introduce la contraseña nueva; restablecer revoca sesiones y no inicia sesión automáticamente. El acceso web no protege el archivo SQLite frente a quien ya puede leerlo como usuario del sistema operativo.

## Datos y migraciones

`data/pmo.sqlite3` está excluido de Git; `PMO_DATA_DIR` permite elegir otra carpeta. No se importó la base legacy real del usuario. QA usa carpetas aisladas bajo `.test-data/`.

El arranque aplica migraciones aditivas hasta **13**. Schema 12 agrega tablas de acceso. Schema 13 agrega `roles.manages_multiple_teams` y `teams.code/color/shape`: una sola vez puede marcar el TechLead existente para conservar comportamiento y asigna códigos EQn persistidos a los equipos existentes. Los nombres dejan de intervenir después. Las bases pobladas reciben respaldo previo `backup-v11-*.sqlite3` o `backup-v12-*.sqlite3` según corresponda. No se reescriben publicaciones, snapshots, originales ni fechas del scheduler.

Para respaldar/restaurar, conservar la base actual y usar una copia consistente en otra carpeta mediante `PMO_DATA_DIR`; no sustituir la única copia de una base anterior.

## Verificación actual

```powershell
.\.venv\Scripts\python.exe -m pytest backend/tests -q
npm --prefix frontend test
npm --prefix frontend run build
```

Resultado del incremento: **112 backend**, **32 frontend**, TypeScript y Vite correctos. Ver [evidencia y límites](docs/VERIFICATION_UX_CONTINUATION.md). El aviso de bundle >500 kB y la advertencia Starlette/httpx se mantienen; no hubo cambio de arquitectura para eliminarlos.

## Historia y documentación

Las verificaciones históricas se conservan: [fase 2](docs/VERIFICATION_PHASE2.md), [fase 5/migración](docs/VERIFICATION_PHASE5.md), [fase 13](docs/VERIFICATION_PHASE13.md) y [continuaciones UX](docs/VERIFICATION_UX_CONTINUATION.md). Sus referencias a ausencia de autenticación, esquema 11 o usuario local describen ese momento, no el estado vigente.

- [Arquitectura actual e historia](docs/ARCHITECTURE.md)
- [Modelo de datos histórico](docs/DATA_MODEL.md), complementado por las migraciones y el estado actual
- [Plan de integración](docs/INTEGRATION_PLAN.md)
- [Inventario de fuentes](docs/SOURCE_INVENTORY.md)

Master es la rama principal. Continúan pendientes la exportación real `.pohub`, extracción automática de minutas, correo automático y paridad/widgets legacy. El calendario usa días naturales sin redistribución automática por capacidad; los recordatorios requieren Agenda abierta.
