# Arquitectura actual

Estado al 2026-10-22: versión 0.13.0, fase 13, SQLite 13. Monolito modular existente React/TypeScript/Vite + FastAPI + SQLite; no se sustituyó arquitectura ni se duplicaron catálogos. La sección histórica de abajo describe las etapas anteriores.

## Datos y contratos

`projects` es el catálogo maestro. `master_items` reúne RAID, hitos y trabajo jerárquico; planificación usa sus IDs, versiones y dependencias. Personas y Roles son catálogos independientes; `project_people` define participación, `project_teams` vincula equipos compartidos y `memberships` relaciona persona/proyecto/rol/equipo opcional/dedicación/vigencia. Un rol puede asignarse sin equipo.

`db.initialize()` conserva la cadena de migraciones en migrations.py y ejecuta `auth.migrate_access` (schema 12) y `consolidation.migrate_consolidation` (13). La última sólo añade una capacidad booleana y código/color/forma; conserva columnas/filas existentes e histórico, con respaldo de bases pobladas. El código de equipo es único, persistido y editable; no se deriva del orden de consulta.

## Autenticación y autorización

`auth.py` mantiene cuentas y sesiones separadas de Personas/roles profesionales: hash scrypt, token opaco revocable almacenado como hash, cookie HttpOnly/SameSite, CSRF y origen en escrituras, límites de intentos y auditoría sin secretos. Perfil, preferencias, contraseñas y recuperación pertenecen a cuentas. Primer Admin local; recuperación por enlace expirable/Admin o propietario local; sin SMTP/SSO/MFA activos.

El middleware autentica todas las APIs de datos/descargas. `access_scope.py` transmite la cuenta por ContextVar durante cada petición y aplica ACL con `project_people`. Admin/Gestor conservan alcance global; Miembro/Consulta requieren Persona vinculada y participación. No existe catálogo ACL paralelo. Se comprueban rutas por proyecto y alias antiguos `/cuts/{id}` y `/records/{id}/audit`; lo ajeno/no encontrado devuelve 404. Los listados de proyectos, personas, roles, equipos y proyectos de una persona se filtran; capacidad no agrega asignaciones de proyectos ocultos. Las importaciones globales y sus originales requieren Admin/Gestor porque pueden abarcar varios proyectos.

Las lecturas de catálogos relacionados se limitan a participantes/equipos del alcance y roles asignados más sus ancestros; la propia Persona vinculada puede verse para perfil. Referencias de liderazgo fuera de ese conjunto se ocultan. La auditoría global de catálogo no se incluye para cuentas restringidas, sin cambiar los registros persistidos. La capacidad multiequipo efectiva puede devolverse como dato derivado, sin exponer roles ajenos. La autorización se evalúa por petición: retirar participación afecta a sesiones existentes.

Las escrituras conservan controles/versiones existentes: Admin/Gestor gestionan PMO; Miembro modifica trabajo/eventos/documentos/comentarios y fechas individuales en proyectos participantes; Consulta sólo lee PMO y puede modificar su perfil/contraseña/preferencias. Un rol profesional multiequipo no concede permisos de acceso. Los autores de documentos escritos por Miembro deben estar en su catálogo visible. El archivo SQLite pertenece al límite de seguridad del sistema operativo.

## UX compartida

`Dialog.tsx`, `UiPatterns.tsx`, `ActionFeedback.tsx`, `ActionMenu.tsx`, `ContextField.tsx` y `CatalogView.tsx` proporcionan modal/confirmación, toolbar, estados, toast/Deshacer, menú flotante, edición display-to-edit y selector de vistas. ConfirmDialog separa header/contenido/footer, sin icono decorativo, título verbal y acción a la derecha; se usa para consecuencias como revocar sesiones. Los archivados reversibles actúan directamente y permiten Deshacer con la versión guardada; un conflicto no se pisa. Los avisos se alojan en el diálogo activo para seguir siendo accesibles en la capa modal. No hay window.confirm().

`teamRoleModel.ts` usa sólo la propiedad explícita y la jerarquía para heredar hacia superiores. `teamIdentityModel.ts` y TeamBadge comparten código/forma/color sin ordinales derivados del catálogo. Roles configura la propiedad; Equipos configura identidad. Cuenta/Persona y preferencias por cuenta se mantienen independientes.

## Operación y límites

FastAPI sirve `frontend/dist` en loopback; Vite usa proxy `/api` en desarrollo. SQLite y preferencias de cuenta son persistencia principal; localStorage sólo guarda diseño/preferencias de navegador por cuenta. La URL conserva proyecto/vista/corte con replaceState. Las rutas semanales siguen en main.py y el resto conserva API/dominio/servicios/repositorios existentes; no se declara portabilidad completa a PostgreSQL.

Publicaciones, originales, snapshots, importadores y scheduler se conservan. El reporte publicado usa su snapshot; la simulación no altera fechas sin aplicar. No hay datos de muestra automáticos. QA y backups de ensayo están fuera de Git. Cada proceso necesita reiniciarse para cargar el código nuevo; no se declaran actualizadas instancias antiguas en memoria.

Resultado y pendientes vigentes: STATUS.md y VERIFICATION_UX_CONTINUATION.md. La documentación histórica siguiente se conserva como antecedente, no como descripción del acceso o esquema actual.

---

# Historia de la arquitectura — fases 1–5

Un frontend React/TypeScript y una API FastAPI sirven Project Office Hub. El backend sirve frontend/dist en ejecución local; Vite redirige /api al puerto 8000 durante desarrollo. La navegación conserva proyecto/vista/corte en el fragmento de URL y los restaura al cargar. Actualmente los cambios de vista reemplazan la URL; no crean un historial de pantallas para el botón Atrás del navegador.

## Estructura

- frontend/src/main.tsx: shell PMO, portafolio y composición del módulo semanal heredado.
- frontend/src/modules/projects: ficha de proyecto, campos comunes de creación/edición y resumen.
- frontend/src/WeeklyEditor.tsx, Workbench.tsx, ExecutiveReport.tsx: capacidades semanales preservadas.
- backend/app/api/projects.py: catálogo maestro, alta, detalle y actualización.
- backend/app/domain/projects.py: validación del contrato de proyecto.
- backend/app/repositories/projects.py: SQL, transacciones, versiones y auditoría de proyectos.
- backend/app/main.py: arranque, rutas semanales heredadas y consulta de corte limitada al proyecto.
- backend/app/db.py y migrations.py: conexiones SQLite y evolución secuencial del esquema.
- backend/tests: tres suites heredadas y cobertura nueva de proyectos/migración.

## Decisiones

No hay un segundo catálogo de proyectos. La tabla projects es común a portafolio y cortes. Las actualizaciones usan versión esperada y transacción; conflictos devuelven 409. La ruta GET /api/projects/{project_id}/cuts/{cut_id} comprueba pertenencia y devuelve 404 si no corresponde.

El frontend no persiste datos de negocio en localStorage. El almacenamiento principal es SQLite. Los importadores y el reporte existentes se conservan, evitando sustituir capacidades probadas durante la construcción de la base.

La separación API/dominio/repositorio se inició con Project. Las rutas semanales todavía permanecen en main.py y usan SQL SQLite directo; su separación se hará progresivamente. No se afirma portabilidad completa a PostgreSQL en esta fase.

No se migraron todavía las páginas HTML del PMO antiguo. Sus ZIP permanecen como referencia; no hay iframe ni doble escritura. La aplicación nueva arranca sin datos de muestra y escucha exclusivamente en localhost mediante Start.ps1.

## Incremento de fase 2

frontend/src/modules/executive/CutHistory.tsx añade histórico filtrable y consulta de eventos del corte. Las cargas de detalle refrescan también conteos y versiones. Las tablas y revisión siguen conservando originales; los campos de publicaciones están bloqueados visualmente.

La API preserva endpoints existentes y añade timeline. El esquema 4 proporciona protección adicional en SQLite y control de versión sobre todo el contenido semanal. Las series oficiales se congelan al publicar; las series importadas siguen siendo fuentes de consulta identificadas, pendientes de la consolidación visual de fase 4.

## Incremento de fase 3

api/master.py expone catálogo, personas, conciliación y auditoría; domain/master.py valida contratos y services/master.py centraliza operaciones y SQL transaccional. modules/master contiene catálogo, edición y conciliación. Se conserva el registro semanal revisable y su original; weekly_item_snapshots lo relaciona con la identidad maestra y conserva la versión capturada.

La auditoría se consulta unificada sin reescribir las tablas heredadas. master_items comparte campos entre RAID, hitos y actividades; evita catálogos paralelos. Activity es la base de planificación, no la jerarquía completa de WorkItem. La extracción adicional de SQL a repositorios y la planificación avanzada continúan en futuras fases.

## Incremento de fase 4

modules/executive/reportModel.ts centraliza selección de registros, proyecto histórico, porcentajes y serie oficial; pruebas puras con Node y TypeScript ya instalado, sin nuevas dependencias. ExecutiveReport mantiene plantilla/marca y consulta series importadas fuera de la hoja oficial. ProgressChart valida fechas/porcentajes y usa escala 0–100, preservando huecos y ceros. El histórico dispone de ruta con pertenencia proyecto/corte validada; se conserva la ruta anterior para compatibilidad. No requiere migración de base.

## Fase 5

Planning usa los endpoints del catálogo maestro; Operations usa api/pmo.py y modelos domain/pmo.py. services/planning.py valida jerarquías y precedencias. services/legacy.py comparte la ruta transaccional entre preview (rollback) y aplicación; api/migration.py verifica el hash confirmado. Los originales y mapas de identidad se conservan en SQLite. Véase VERIFICATION_PHASE5.md para límites de paridad y validación real pendiente.
