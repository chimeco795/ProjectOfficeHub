# Fase 8 — Simulación y aplicación de fechas

Versión 0.8.0, 2026-10-06. En Planificación → Cronograma, «Simular antes de reprogramar» calcula una propuesta para todos los trabajos no archivados, independientemente de los filtros de pantalla.

## Modelo

- Dependencias explícitas fin-inicio al día siguiente; días naturales e intervalos inclusivos.
- Duración = compromiso − inicio + 1. Se conservan duraciones completas, incluso cuando existe avance parcial.
- La fecha elegida y cada inicio guardado actúan como límites mínimos. Nunca adelanta tareas.
- Cerrados, resueltos y retirados conservan sus fechas. Si dependen de trabajo pendiente o tienen una precedencia imposible, se exige conciliar antes de aplicar.
- La jerarquía no genera dependencias implícitas ni agrega duraciones. No se consideran capacidad, festivos, calendarios de recursos, desfases ni dependencias de otros tipos.
- Calcula orden topológico, propagación de fechas, final simulado y holgura mediante recorrido inverso. Los trabajos pendientes con holgura cero identifican las rutas críticas de este modelo simplificado.
- Requiere fechas completas y predecesores disponibles no archivados. Máximo 1000 trabajos no archivados. Errores impiden aplicar; no se omiten registros problemáticos silenciosamente.

## Integridad

Preview usa una transacción de lectura sin escrituras. Apply recalcula en el servidor dentro de BEGIN IMMEDIATE; la confirmación depende del proyecto, la fecha elegida y la huella del catálogo completo de actividades. Cualquier cambio invalida la propuesta. Se actualizan exclusivamente fechas y versión, con auditoría por trabajo, en una única transacción. Un error revierte todo el lote. Los cortes semanales y snapshots publicados no se modifican. No requiere migración de esquema (permanece en 6).

## Verificación

58 pruebas backend y 13 frontend correctas; TypeScript/Vite compila. Ocho pruebas nuevas cubren ramas paralelas y holgura, duraciones, conservación del input, fechas incompletas, archivados, ciclos, desbordamiento, trabajos fijos, preview sin escrituras, aplicación/reintento, aislamiento entre proyectos, fecha o catálogo desactualizado, rollback ante fallo durante el lote y snapshots publicados inmutables.

Navegador, exclusivamente en `.test-data/phase5-browser`: simulación con fecha 2026-10-06 propone dos cambios, final 2026-10-31, y muestra fechas actuales/propuestas, duración y holgura. Aplicar actualiza ambos trabajos, elimina la alerta de precedencia y muestra confirmación. Los datos reales del usuario no se reprogramaron.

## Pendientes

La planificación sigue siendo un modelo de días naturales sin recursos ni avance restante. La migración real .pohub, formatos legacy pendientes, organigrama y otros puntos de paridad de fase 5 continúan abiertos. No declarar paridad completa.
