# Contexto de Project Office Hub

## Estado al 2026-10-02

Fases 0, 1 y 2 completadas. Repositorio privado chimeco795/ProjectOfficeHub, master. Base React/TypeScript/Vite + FastAPI + SQLite funcional. Proyecto maestro con metodología, prioridad y fechas independientes; portafolio, resumen y acceso a Seguimiento Ejecutivo. Start.ps1 permite iniciar la app local.

Baseline: 10 tests semanales originales correctos, builds de ambos orígenes correctos con advertencias en PMO HTML. Producto nuevo: 31 tests backend correctos y build frontend correcto (versión 0.2.0). Creación, edición, recarga de proyecto/corte y aislamiento entre dos proyectos comprobados en navegador con base temporal.

## Reglas

Project Office Hub es el producto maestro. Seguimiento Ejecutivo es un módulo por proyecto. Un solo catálogo de proyectos. No duplicar futuros catálogos de personas, riesgos, hitos y actividades. Importar genera propuestas; conservar originales, trazabilidad e histórico. Publicados inmutables; no insertar datos de muestra automáticamente.

## Implementación actual

- backend/app/api, domain y repositories: separación inicial del dominio Project.
- backend/app/migrations.py: migraciones aditivas v2 → v3 → v4 con respaldos. Esquema 4 protege cortes publicados, registros y fuentes con triggers; las modificaciones de contenido incrementan la versión del corte. La publicación congela también la serie histórica oficial.
- frontend/src/modules/projects: resumen y campos comunes de la ficha.
- frontend/src/modules/executive: histórico filtrable, avances, pendientes y trazabilidad con valores antes/después. Creación de cortes con periodo explícito y copia desde una semana anterior.
- Código semanal heredado y sus tres archivos de pruebas preservados. Los tests de migración esperan ahora esquema final 4 y se conservaron sus garantías.
- La URL guarda project, view y cut y restaura el contexto al cargar; usa replaceState, sin historial por pantalla.
- Las tablas semanales y auditorías siguen con el modelo heredado. La conciliación con maestros y snapshots de entidades aún no está implementada.
- No están migrados Board, Gantt, Roadmap, RAID, presupuesto, personas ni equipos del PMO antiguo.

## Datos

Los ZIP originales permanecen intactos. Las copias de consulta .reference/ están ignoradas. No se importaron datos reales del usuario. data/ es la base normal; .test-data/browser y .test-data/phase2-browser son exclusivamente verificaciones visuales con datos sintéticos. Ambas se excluyen de Git.

Fuentes: D:/Archivos/Downloads/project-office-hub-v3-1-0 (1).zip y D:/Archivos/ChatGPT/ResumenEjecutivoSemana.zip. Raíz del segundo código: ResumenEjecutivoSemana/ResumenEjecutivoSemanal/.

## Continuación

Siguiente fase: 3, conciliación entre RAID, riesgos, hitos, responsables y actividades maestras con snapshots semanales. La fase 2 ya verificó en navegador Word + Excel → revisión/corrección → publicación → histórico/trazabilidad y copia a la semana siguiente con edición en tabla, sin modificar el corte anterior.

Pendientes: creación de corte desde estado maestro (cuando existan las entidades de fase 3), migración de datos reales con mapa de identidad, auditoría global unificada, consolidación del reporte en fase 4 y módulos PMO en fase 5. No se incorporaron datos reales del usuario.

Ver docs/VERIFICATION_PHASE2.md para pruebas, límites y advertencia sobre históricos anteriores a esquema 4. No actualizar retrospectivamente una publicación. El servidor se mantiene local y sin autenticación.
