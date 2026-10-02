# Contexto de Project Office Hub

## Estado al 2026-10-02

Fases 0 y 1 completadas. Repositorio privado chimeco795/ProjectOfficeHub, master. Base React/TypeScript/Vite + FastAPI + SQLite funcional. Proyecto maestro con metodología, prioridad y fechas independientes; portafolio, resumen y acceso a Seguimiento Ejecutivo. Start.ps1 permite iniciar la app local.

Baseline: 10 tests semanales originales correctos, builds de ambos orígenes correctos con advertencias en PMO HTML. Producto nuevo: 19 tests backend correctos y build frontend correcto. Creación, edición, recarga de proyecto/corte y aislamiento entre dos proyectos comprobados en navegador con base temporal.

## Reglas

Project Office Hub es el producto maestro. Seguimiento Ejecutivo es un módulo por proyecto. Un solo catálogo de proyectos. No duplicar futuros catálogos de personas, riesgos, hitos y actividades. Importar genera propuestas; conservar originales, trazabilidad e histórico. Publicados inmutables; no insertar datos de muestra automáticamente.

## Implementación actual

- backend/app/api, domain y repositories: separación inicial del dominio Project.
- backend/app/migrations.py: migración aditiva v2 → v3 con respaldo previo de bases pobladas. Nuevos campos: methodology, priority, target_date, updated_at.
- frontend/src/modules/projects: resumen y campos comunes de la ficha.
- Código semanal heredado y sus tres archivos de pruebas preservados. El test de migración v1 espera ahora esquema final 3.
- La URL guarda project, view y cut y restaura el contexto al cargar; usa replaceState, sin historial por pantalla.
- Las tablas semanales y auditorías siguen con el modelo heredado. La conciliación con maestros y snapshots de entidades aún no está implementada.
- No están migrados Board, Gantt, Roadmap, RAID, presupuesto, personas ni equipos del PMO antiguo.

## Datos

Los ZIP originales permanecen intactos. Las copias de consulta .reference/ están ignoradas. No se importaron datos reales del usuario. data/ es la base normal; .test-data/browser es exclusivamente la verificación visual. Ambas se excluyen de Git.

Fuentes: D:/Archivos/Downloads/project-office-hub-v3-1-0 (1).zip y D:/Archivos/ChatGPT/ResumenEjecutivoSemana.zip. Raíz del segundo código: ResumenEjecutivoSemana/ResumenEjecutivoSemanal/.

## Continuación

Iniciar fase 2 cuando se solicite: consolidar el flujo semanal dentro del producto y verificar de extremo a extremo importación Word/Excel, revisión, edición, publicación e histórico. Conservar los tests y componentes existentes. No confundir su incorporación en fase 1 con aceptación completa de fase 2. Después ejecutar conciliación de maestros/snapshots de fase 3, reporte de fase 4 y migración del resto de PMO en fase 5.

Consultar docs/INTEGRATION_PLAN.md, ARCHITECTURE.md, DATA_MODEL.md y VERIFICATION.md antes del siguiente incremento. El servidor se mantiene local y sin autenticación en esta fase.
