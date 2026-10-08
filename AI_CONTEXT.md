# Contexto de Project Office Hub

## Checkpoint activo — solicitud UX del 2026-10-08

Solicitud: attachments/30adff68-f038-499b-92c5-305f87b5790c/Texto pegado.txt. Sus fases 1–3 NO renumeran fases/versiones oficiales. Continuar en orden, sin reiniciar ni revertir. Base master 47dfd41.

COMPLETADO: fase 1 de la solicitud implementada sobre el código actual: dashboard sin scroll interno, límites por widget, columnas máximo cuatro/reordenables, alta en Nuevo, ficha ancha en bloques, Sprints como etiqueta Agile, matriz por equipo/responsable/agrupación, zoom por botones, pan y movimiento horizontal de barra con validación/confirmación, orden visual de hermanos. Pruebas focalizadas y revisión desktop realizadas; límites y evidencia en docs/VERIFICATION_UX_CONTINUATION.md. Versión oficial permanece 0.13.0 en este checkpoint, esquema 9.

PENDIENTE: fase 2 (roles independientes/asignaciones/contactos/organigrama/disponibilidad/horario, scope usuario de agenda/documentos, relaciones múltiples, semana compartida) y fase 3 (minutas TXT/DOCX, propuestas revisadas sin IA externa, matriz de suficiencia). Resize de duración del Gantt pendiente permitido por solicitud. Suite global al final de las tres fases.

SIGUIENTE PASO EXACTO: leer backend/app/db.py, migrations.py, domain/master.py y frontend/src/modules/operations/TeamWorkspace.tsx; diseñar migración aditiva para catálogo de roles y disponibilidad, conservando people.role/leader_id heredados sin convertir datos reales automáticamente. Reutilizar memberships para dedicación por proyecto. QA en .test-data/phase5-browser, 8015; nunca escribir fixtures en data/pmo.sqlite3.

## Estado al 2026-10-07

Fases 0–4 completadas. Repositorio privado chimeco795/ProjectOfficeHub, master. Base React/TypeScript/Vite + FastAPI + SQLite funcional. Proyecto maestro con metodología, prioridad y fechas independientes; portafolio, resumen y acceso a Seguimiento Ejecutivo. Start.ps1 permite iniciar la app local.

Baseline histórica: 10 tests semanales originales correctos, builds de ambos orígenes correctos con advertencias en PMO HTML. La entrega 0.10.0 tuvo 68 tests backend y 16 frontend. Estado vigente: 0.13.0, 76 backend, 25 frontend y build correctos. Creación, edición, recarga de proyecto/corte y aislamiento entre proyectos comprobados con base temporal.

## Reglas

Project Office Hub es el producto maestro. Seguimiento Ejecutivo es un módulo por proyecto. Un solo catálogo de proyectos. No duplicar futuros catálogos de personas, riesgos, hitos y actividades. Importar genera propuestas; conservar originales, trazabilidad e histórico. Publicados inmutables; no insertar datos de muestra automáticamente.

## Implementación actual

- backend/app/api, domain y repositories: separación inicial del dominio Project.
- backend/app/migrations.py: migraciones aditivas v2 → v3 → v4 → v5 → v6 con respaldos. Esquema 4 protege cortes publicados, registros y fuentes con triggers; las modificaciones de contenido incrementan la versión del corte. La publicación congela también la serie histórica oficial.
- frontend/src/modules/projects: resumen y campos comunes de la ficha.
- frontend/src/modules/executive: histórico filtrable, avances, pendientes y trazabilidad con valores antes/después. Creación de cortes con periodo explícito y copia desde una semana anterior.
- Código semanal heredado y sus tres archivos de pruebas preservados. Los tests de migración esperan ahora esquema final 9 y se conservaron sus garantías.
- La URL guarda project, view y cut y restaura el contexto al cargar; usa replaceState, sin historial por pantalla.
- Catálogo maestro compartido de RAID, hitos y actividades; personas globales asignadas a proyectos; conciliación explícita, snapshots por registro y auditoría agregada. Ver VERIFICATION_PHASE3.md.
- Fase 5 implementa planificación sobre master_items, equipos, presupuesto, agenda, documentos e importador schemaVersion 3. No se importaron datos reales. Ver docs/VERIFICATION_PHASE5.md para límites y paridad pendiente.

## Datos

Los ZIP originales permanecen intactos. Las copias de consulta .reference/ están ignoradas. No se importaron datos reales del usuario. data/ es la base normal; .test-data/browser y .test-data/phase2-browser son exclusivamente verificaciones visuales con datos sintéticos. Ambas se excluyen de Git.

Fuentes: D:/Archivos/Downloads/project-office-hub-v3-1-0 (1).zip y D:/Archivos/ChatGPT/ResumenEjecutivoSemana.zip. Raíz del segundo código: ResumenEjecutivoSemana/ResumenEjecutivoSemanal/.

## Continuación

Fase actual: 13, continuación UX/dashboard/planificación adaptativa sobre el incremento 12. Ver docs/VERIFICATION_PHASE13.md; las limitaciones anteriores no comprobadas siguen registradas. La migracion real y paridad legacy de fase 5 siguen pendientes. El usuario confirmó que todavía no tiene la exportación .pohub. Fase 3 cerrada con catálogo actual, corte desde maestros, conciliación y snapshots inmutables. Las actividades incorporan WorkItem, jerarquía y precedencias; no crear otro catálogo.

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

### Requisito registrado en fases 10–11

**Dashboard personalizable con widgets redimensionables y arrastrables, heredado del PMO anterior.** En fase 13 se implementó la cuadrícula para los ocho widgets del resumen actual. Los widgets adicionales de avance, riesgos, ruta crítica, equipo, presupuesto e hitos siguen registrados para posteriores incrementos; no omitirlos. El usuario autorizó implementar el dashboard en la continuación 13.

## Entrega anterior 2026-10-07: 0.11.0, esquema 8

Ficha de lectura display-to-edit; responsable/predecesores buscables; lista jerarquica; rol/dedicacion inline; usuario local elegido del catalogo. Agenda con duracion, estado, relacion, notas/documentos, movimiento confirmado y deshacer. Documentos con descripcion/autor y referencia a bytes de fuentes. Reporte dentro del workspace, Full Screen opcional y PDF/PNG proporcionales. 72 tests backend, 17 frontend y TypeScript/Vite correctos. Migracion normal: respaldo y 23 tablas con valores anteriores intactos.

Ver docs/VERIFICATION_PHASE11.md para alcance y comprobaciones visuales pendientes por bloqueo de la pestaña interna de error. Dashboard sigue pendiente: arrastrar, redimensionar, reordenar, ocultar/configurar tamaño; incluir estado general y proximos hitos. Drag/resize del Gantt pendiente. No dar por cerrada la migracion real .pohub ni la paridad legacy. Las secciones anteriores describen entregas historicas.

## Entrega base 2026-10-07: 0.12.0, esquema 9

ContextField: lectura sin borde, hover sutil, editor del valor; Enter/blur guarda si válido, Escape cancela, errores retienen borrador y guardado impide doble envío. Confirmación explícita para textarea, múltiples y archivo. Persona predictiva por nombre/correo/acentos: ocho resultados flotantes, iniciales y chips; no desplegar catálogo vacío. Proyecto, trabajo, backlog, roadmap y rol/dedicación usan el patrón común.

Agile muestra Sprint; Hybrid Iteración / Sprint; Waterfall Periodo. No renombrar campos internos ni datos existentes. Gantt tiene jerarquía contraíble y vínculos visibles; recibe fechas/holgura/ruta crítica de ScheduleSimulation, con estado simulado claramente indicado. No cambiar scheduler ni aplicar fechas sin acción explícita.

Estrategia PMO → ejecutivo: inventario previo en docs/EXECUTIVE_SOURCE_MAP.md. Desde PMO captura hechos/versiones en project_snapshot.pmo atómicamente; propone avance solo con cobertura completa de hojas operativas, media sin ponderar. No inventar planeado, baseline, semáforos, exposición o narrativa. La publicación conserva la captura del proyecto y evidencia; copiar cortes/importar sigue compatible. Reuniones con propose_executive proponen related_id sin duplicarlo ni copiar notas. Esquema 9 aditivo, respaldo automático v8.

75 pruebas backend, 21 frontend, TypeScript/Vite y revisión real de ocho pantallas correctos; detalles/límites en docs/VERIFICATION_PHASE12.md. El dashboard y la inspección real PDF/PNG se cerraron en fase 13. Baseline, decisiones estructuradas, migración real, paridad legacy, móvil completo y agenda semanal por arrastre siguen pendientes.

## Estado vigente 2026-10-07: 0.13.0, esquema 9

Se conservaron y completaron los cambios locales anteriores, sin reiniciar arquitectura. Portafolio añade señales objetivas de atraso, vencidos, bloqueos, riesgos relevantes y desviación del último corte cuando hay cifras. Wizard Crear proyecto: identidad/metodología y prioridad/estado/fechas; solo nombre obligatorio.

Dashboard configurable: ocho widgets existentes, Lectura/Diseño, doce columnas, arrastre y resize por puntero, snap, mínimos, colisiones desplazadas hacia abajo, flechas/botones accesibles, ocultar/agregar/restaurar. Posición/tamaño/visibilidad en localStorage por usuario local + proyecto; useLocalPersonId notifica cambios de persona y separa sus preferencias. No es autenticación ni sincronización de cuenta.

Planificación: Tablero/Lista como vistas de Trabajo, mismo dataset/nivel/filtros. Filtros colapsables inicialmente ocultos con badge/limpiar/cerrar en las cuatro vistas. Columnas configurables (cuatro iniciales) y extremos colapsables; preferencias persistentes y contador de trabajo oculto. Agile: Sprints y releases; Waterfall: Cronograma primero y Fases y entregables con Phase/Deliverable/hitos reales, sin Sprint; Hybrid: Iteraciones y entregas con periodos y vista de entregables/hitos. Modelo iteration_id/release_id sin cambios; no convertir periodos automáticamente.

Gantt evoluciona con zoom día/semana/mes/trimestre, horizonte/ancho reales y ticks UTC; conserva Hoy, jerarquía, conexiones, avance, responsable, estado, prioridad, tooltip y propuesta/ruta crítica simulada. Sin cambios en scheduler, transacciones ni snapshots. Orden manual y drag/resize de barras pendientes; click abre ficha para modificar fechas explícitamente.

76 pruebas backend, 25 frontend y TypeScript/Vite correctos. Ocho pantallas revisadas en escritorio, con arrastre/resize/persistencia/cambio de persona reales y contenido por las tres metodologías. PDF A3 de una página renderizado con Poppler y PNG 3072 × 2146 inspeccionados. Ver docs/VERIFICATION_PHASE13.md para evidencia, límites y conservación de datos normales. No se declara cerrada la migración real ni la paridad legacy.
