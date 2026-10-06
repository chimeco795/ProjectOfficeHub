# Contexto de Project Office Hub

## Estado al 2026-10-06

Fases 0–4 completadas. Repositorio privado chimeco795/ProjectOfficeHub, master. Base React/TypeScript/Vite + FastAPI + SQLite funcional. Proyecto maestro con metodología, prioridad y fechas independientes; portafolio, resumen y acceso a Seguimiento Ejecutivo. Start.ps1 permite iniciar la app local.

Baseline: 10 tests semanales originales correctos, builds de ambos orígenes correctos con advertencias en PMO HTML. Producto nuevo: 68 tests backend, 16 tests frontend y build correctos (versión 0.10.0). Creación, edición, recarga de proyecto/corte y aislamiento entre dos proyectos comprobados en navegador con base temporal.

## Reglas

Project Office Hub es el producto maestro. Seguimiento Ejecutivo es un módulo por proyecto. Un solo catálogo de proyectos. No duplicar futuros catálogos de personas, riesgos, hitos y actividades. Importar genera propuestas; conservar originales, trazabilidad e histórico. Publicados inmutables; no insertar datos de muestra automáticamente.

## Implementación actual

- backend/app/api, domain y repositories: separación inicial del dominio Project.
- backend/app/migrations.py: migraciones aditivas v2 → v3 → v4 → v5 → v6 con respaldos. Esquema 4 protege cortes publicados, registros y fuentes con triggers; las modificaciones de contenido incrementan la versión del corte. La publicación congela también la serie histórica oficial.
- frontend/src/modules/projects: resumen y campos comunes de la ficha.
- frontend/src/modules/executive: histórico filtrable, avances, pendientes y trazabilidad con valores antes/después. Creación de cortes con periodo explícito y copia desde una semana anterior.
- Código semanal heredado y sus tres archivos de pruebas preservados. Los tests de migración esperan ahora esquema final 7 y se conservaron sus garantías.
- La URL guarda project, view y cut y restaura el contexto al cargar; usa replaceState, sin historial por pantalla.
- Catálogo maestro compartido de RAID, hitos y actividades; personas globales asignadas a proyectos; conciliación explícita, snapshots por registro y auditoría agregada. Ver VERIFICATION_PHASE3.md.
- Fase 5 implementa planificación sobre master_items, equipos, presupuesto, agenda, documentos e importador schemaVersion 3. No se importaron datos reales. Ver docs/VERIFICATION_PHASE5.md para límites y paridad pendiente.

## Datos

Los ZIP originales permanecen intactos. Las copias de consulta .reference/ están ignoradas. No se importaron datos reales del usuario. data/ es la base normal; .test-data/browser y .test-data/phase2-browser son exclusivamente verificaciones visuales con datos sintéticos. Ambas se excluyen de Git.

Fuentes: D:/Archivos/Downloads/project-office-hub-v3-1-0 (1).zip y D:/Archivos/ChatGPT/ResumenEjecutivoSemana.zip. Raíz del segundo código: ResumenEjecutivoSemana/ResumenEjecutivoSemanal/.

## Continuación

Fase actual: 5, incremento funcional implementado; falta validar datos reales y completar paridad indicada en VERIFICATION_PHASE5.md. El usuario confirmó que todavía no tiene la exportación .pohub. Fase 3 cerrada con catálogo actual, corte desde maestros, conciliación y snapshots inmutables. Las actividades incorporan WorkItem, jerarquía y precedencias; no crear otro catálogo.

No se migraron datos reales desde los ZIP o el navegador anterior. La base local puede contener proyectos creados por el usuario: conservarlos. Pruebas visuales de fase 3 en .test-data/phase3-browser, separadas de data/pmo.sqlite3.

Fase 4: reportModel centraliza indicadores, filtrado y snapshots. Reporte oficial separado de series de consulta; pendientes optativos en borrador. GET por proyecto/corte para histórico; otras semanas en borrador quedan excluidas. Sin cambio de esquema.

Ver docs/VERIFICATION_PHASE4.md. No actualizar retrospectivamente una publicación. El servidor se mantiene local y sin autenticación.

Fase 6 solicitada: mejorar forma visual y funcionalidad. Entrega 0.6.0: navegación WorkspaceNav/WorkspaceTabs, panel de proyecto con métricas actuales, búsqueda del portafolio, Board por arrastre y filtros, calendario día/semana/mes. Pruebas y límites en docs/VERIFICATION_PHASE6.md. Esquema permanece en 6; no cerrar paridad ni migración real de fase 5.

Incremento 0.7.0: cronograma Schedule con escala, progreso y revisión de dependencias. scheduleModel evalúa fechas incompletas, vencidos y precedencias fin-inicio al día siguiente en días naturales; analiza catálogo completo pese a filtros. No reprograma ni calcula ruta crítica. Ver VERIFICATION_PHASE7.md.

Fase 8 (0.8.0): simulación de fechas y aplicación transaccional desde Cronograma. Backend services/scheduler.py y api/schedule.py; frontend ScheduleSimulation. Conserva duraciones inclusivas, no adelanta, usa días naturales y dependencias fin-inicio. Huella ligada al proyecto/fecha/catálogo; rechazo ante cambios concurrentes. 58 pruebas backend y 13 frontend. Ver VERIFICATION_PHASE8.md para reglas, supuestos y pruebas. No reprogramar datos reales sin acción explícita del usuario.

Entrega 0.9.0: capacidad entre proyectos por vigencias, organigrama global people.leader_id/role (esquema 7, respaldo v6), comentarios append-only en audit_events con request_id idempotente, roadmap por arrastre y selector. 65 pruebas backend, 13 frontend y build correctos. docs/STATUS.md es la matriz vigente. Legacy conserva comentarios/jerarquías en original; aún no mapea esos campos operativos ni attachments. Datos reales .pohub pendientes.


## Revisión UX/UI 0.10.0 (master, esquema 7)

Alta rápida de seis campos → detalles progresivos. Código automático editable; tipos según metodología. Lista con chips y edición inline explícita; dependencias buscables y chips. Board operativo por defecto con filtros de nivel/tipo. Colores de estado compartidos con Gantt, catálogo y resumen. Gantt jerárquico, línea Hoy y detalle, conservando ScheduleSimulation. Equipo separado por personas disponibles/asignaciones/equipos compartidos/capacidad/organigrama; retirar asignación es archivar, no borrar persona. Documentos agrupa originales de proyecto y fuentes de cortes por hash, sin alterar BLOB ni snapshots; una carga repetida reutiliza el original. Controles compactos y formularios responsive de máximo dos columnas.

68 pruebas backend, 16 frontend y build correctos. Ver `docs/VERIFICATION_PHASE10.md` para decisiones, revisión visual y límites. No hay cambio de arquitectura ni esquema. No se sustituyó el estado actual por snapshots ni se modificaron publicaciones históricas. La migración real de fase 5 continúa pendiente de `.pohub`.

### Requisito pendiente que debe conservarse

**Dashboard personalizable con widgets redimensionables y arrastrables, heredado del PMO anterior.** Widgets: avance, riesgos, bloqueos, ruta crítica, equipo, presupuesto, hitos y próximo corte ejecutivo. El usuario pidió registrarlo, no implementarlo todavía. No omitir este requisito al planificar siguientes fases.
