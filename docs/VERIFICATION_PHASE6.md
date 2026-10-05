# Fase 6 — Diseño y uso cotidiano

Versión 0.6.0, 2026-10-05. Incremento solicitado por el usuario para dar forma al producto y mejorar funcionalidad. No implica el cierre de los pendientes de migración real de fase 5.

## Cambios

- Navegación agrupada en ocho módulos; pestañas para planificación, equipo y seguimiento ejecutivo. Conserva rutas y guardas de cambios sin guardar existentes.
- Vista general con recuentos del catálogo actual, compromisos vencidos, elementos bloqueados, próximos compromisos, accesos operativos y estado de cortes. No mezcla estos indicadores con las cifras de reportes publicados. Datos ausentes no se completan artificialmente.
- Portafolio con búsqueda por nombre/descripción y filtro por estado.
- Tablero con tarjetas arrastrables, estado accesible también mediante selector, responsable/fecha/prioridad/progreso visibles y filtros por responsable/estado. Usa el mismo PUT versionado del catálogo.
- Agenda con calendario mensual, semanal y diario; navegación anterior/siguiente/hoy; creación desde una fecha y edición de eventos existentes. La lista sigue disponible. No envía invitaciones.
- Jerarquía visual consistente: navegación compacta, paneles, filtros, estados vacíos y adaptación móvil. Acciones de corte ocultas en módulos operativos.

## Verificación

- 50 pruebas backend correctas; 9 frontend correctas; TypeScript y build Vite correctos.
- Pruebas de calendario: año bisiesto, semanas entre años, navegación desde fin de mes sin saltar febrero y claves de fecha local.
- Navegador con base temporal: resumen y navegación; arrastrar un trabajo de En ejecución a Preparado; estado conservado tras recarga; crear evento desde 2026-10-05 y verlo en vista semanal; acceso a todas las pestañas de seguimiento ejecutivo.
- Inspección visual en escritorio y a 390 × 844: resumen y tablero. Se restauró el tamaño del navegador después de la revisión.
- Sin cambios de esquema ni importación de datos reales. Datos de prueba únicamente en .test-data/phase5-browser.

## Pendientes

La paridad completa de fase 5 sigue abierta: planificación avanzada (reprogramación/ruta crítica), organigrama, comentarios operativos heredados, formatos legacy de attachments y validación con exportación real. Board por arrastre y calendario día/semana/mes dejan de ser pendientes de la matriz anterior. Esta entrega mejora la estructura y los recorridos, sin afirmar que todos los módulos tienen paridad completa.
