# Arquitectura implementada — fase 1

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
