# Arquitectura implementada — fases 1–4

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
