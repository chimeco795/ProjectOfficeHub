# Fase 7 — Revisión del cronograma

Incremento 0.7.0. Cronograma con escala temporal, responsables, progreso y color de alerta. Panel por trabajo con fechas, predecesores, acceso a edición y filtro «Solo con alertas».

El análisis considera todos los trabajos del proyecto, incluso los ocultos por filtros. Detecta fechas incompletas, compromisos vencidos y precedencias cuyo compromiso es igual o posterior al inicio de la tarea. Supuesto explícito: fin-inicio al día siguiente, en días naturales. Se advierte cuando faltan predecesores o están archivados. Los trabajos archivados quedan fuera del análisis; cerrados, resueltos y retirados no cuentan como vencidos.

No aplica fechas automáticamente ni infiere avances. La fecha compatible mostrada depende únicamente de compromisos guardados de predecesores; no es una simulación propagada ni ruta crítica. No cambia el esquema ni las publicaciones. Continúan los pendientes avanzados y la migración real de fase 5.

Verificación: 13 pruebas frontend, incluidas cuatro de precedencias, fin de año, datos incompletos/archivados, vencimiento y preservación del input. Build TypeScript/Vite correcto. Navegador en base temporal: tarea con inicio 10 de octubre y predecesor que termina el 15; muestra conflicto y fecha compatible 16 de octubre, conservando el diagnóstico al filtrar y ocultar el predecesor. Pruebas backend de regresión: 50 correctas.
