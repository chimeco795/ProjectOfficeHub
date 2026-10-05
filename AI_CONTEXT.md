# Contexto de Project Office Hub

## Estado al 2026-10-05

Fases 0–4 completadas. Repositorio privado chimeco795/ProjectOfficeHub, master. Base React/TypeScript/Vite + FastAPI + SQLite funcional. Proyecto maestro con metodología, prioridad y fechas independientes; portafolio, resumen y acceso a Seguimiento Ejecutivo. Start.ps1 permite iniciar la app local.

Baseline: 10 tests semanales originales correctos, builds de ambos orígenes correctos con advertencias en PMO HTML. Producto nuevo: 50 tests backend, 6 tests frontend y build correctos (versión 0.5.0). Creación, edición, recarga de proyecto/corte y aislamiento entre dos proyectos comprobados en navegador con base temporal.

## Reglas

Project Office Hub es el producto maestro. Seguimiento Ejecutivo es un módulo por proyecto. Un solo catálogo de proyectos. No duplicar futuros catálogos de personas, riesgos, hitos y actividades. Importar genera propuestas; conservar originales, trazabilidad e histórico. Publicados inmutables; no insertar datos de muestra automáticamente.

## Implementación actual

- backend/app/api, domain y repositories: separación inicial del dominio Project.
- backend/app/migrations.py: migraciones aditivas v2 → v3 → v4 → v5 → v6 con respaldos. Esquema 4 protege cortes publicados, registros y fuentes con triggers; las modificaciones de contenido incrementan la versión del corte. La publicación congela también la serie histórica oficial.
- frontend/src/modules/projects: resumen y campos comunes de la ficha.
- frontend/src/modules/executive: histórico filtrable, avances, pendientes y trazabilidad con valores antes/después. Creación de cortes con periodo explícito y copia desde una semana anterior.
- Código semanal heredado y sus tres archivos de pruebas preservados. Los tests de migración esperan ahora esquema final 6 y se conservaron sus garantías.
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
