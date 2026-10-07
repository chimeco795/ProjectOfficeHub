# Incremento 13 — dashboard y planificación adaptativa

2026-10-07 · master · versión 0.13.0 · SQLite 9.

## Continuidad

Se partió de master a683e3e y de los cambios locales del incremento 12. Se conservaron ContextField, SearchPicker, WorkDetails, ScheduleSimulation, captura PMO, auditoría y snapshots. No se rehízo la arquitectura ni se cambió el modelo de dependencias. La migración aditiva v9 corresponde al incremento 12.

Se cerró la revisión de exportaciones: el PDF generado previamente estaba en Descargas pese al timeout de la espera del navegador. pypdf confirmó una página A3 horizontal y Poppler permitió inspeccionarla. Se exportó PNG desde la app y se revisó su imagen completa, 3072 × 2146. Captura PMO, títulos y secciones permanecen dentro de la lámina. Esta comprobación usa un borrador QA sin registros aceptados; no certifica textos de longitud arbitraria.

## Implementado

- Portafolio mantiene su organización y añade indicadores basados en datos: fecha objetivo vencida en proyecto no cerrado, compromisos abiertos vencidos, bloqueos, riesgos abiertos de prioridad Alta/Crítica y avance real menor que planeado en el último corte. No inventa indicadores cuando faltan cifras.
- Crear proyecto tiene dos pasos. Identidad/metodología y prioridad/estado/fechas. Nombre obligatorio; descripción, objetivo y fechas opcionales. Volver al paso anterior conserva los valores. Stakeholders iniciales no añaden un tercer paso: se administran desde Equipo.
- Vista general tiene ocho widgets del resumen existente. Lectura oculta controles; Diseño muestra grid de doce columnas, tiradores para mover/redimensionar, tamaños en columnas/filas, ocultar/agregar y restaurar. Snap a unidades, mínimos según widget y desplazamiento de colisiones hacia abajo. También se puede mover con flechas y cambiar tamaño con botones. Contenido mayor que el tamaño elegido tiene scroll dentro del widget.
- Layout y visibilidad se guardan en localStorage por persona local + proyecto. Cambiar persona remonta las preferencias sin sobrescribir las de la anterior. Es una preferencia del navegador, no una cuenta autenticada ni sincronización entre equipos.
- Tablero y Lista comparten dataset, nivel y filtros; selector compacto dentro de Trabajo. Por defecto muestran trabajo operativo. El Gantt y Roadmap incluyen todos los niveles, conservando búsqueda/responsable/estado/tipo/archivo. Recargar vuelve a los filtros iniciales; cambiar vista conserva el contexto mientras se permanece en Planificación.
- Filtros inicialmente ocultos en las cuatro vistas, badge de cantidad, limpiar/cerrar. Acciones principales agrupadas a la derecha. Columnas con checklist, cuatro por defecto, última columna protegida contra ocultación, extremos contraíbles y preferencias persistentes. Un contador identifica trabajos en columnas ocultas. Estados heredados desconocidos continúan en Otros.
- Agile: Trabajo, Cronograma y Sprints y releases con los periodos existentes. Waterfall: Cronograma primero y Fases y entregables, con vistas de Phase, Deliverable e hitos reales y relaciones a los entregables; no presenta Sprint. Hybrid: Iteraciones y entregas conserva periodos y añade Entregables e hitos. No se renombra iteration_id ni se convierten periodos anteriores en fases automáticamente.
- Gantt: día/semana/mes/trimestre cambia ancho y horizonte temporal; ticks de calendario UTC, timeline horizontal, Hoy, jerarquía, conexiones, colores, progreso, estado, responsable, prioridad y tooltip. Conserva propuesta simulada y contorno crítico; aplicar sigue siendo una acción explícita del scheduler existente.

## Pruebas

- 76 tests backend correctos: incluidos los existentes de aislamiento, historial, publicación, migraciones, dependencias y aplicación transaccional, captura ejecutiva y nuevo test de señales de portafolio por proyecto. Comprobación adicional de proyectos/captura: 13 tests correctos tras los ajustes finales.
- 25 tests frontend correctos: colisiones/mínimos/restauración de widgets, calendario mensual/trimestral cruzando año, etiquetas/prioridades de metodología y pruebas existentes de jerarquía, selectores, reportes y proporción de exportación.
- TypeScript y Vite correctos. Aviso existente de deprecación Starlette/TestClient/httpx; no se cambió la dependencia durante este incremento.

## Validación visual en escritorio

Navegador integrado, viewport observado de 1265 px, servidor 8015 y datos sintéticos en .test-data/phase5-browser. Los proyectos de prueba UX13 Agile y UX13 Cascada no pertenecen a la base normal.

| Pantalla / interacción | Comprobación real |
|---|---|
| Portafolio | Cards conservadas, señal compacta Bloqueados · 1 en QA, proyecto paralelo sin alerta |
| Crear proyecto | Dos pasos inspeccionados, Anterior conserva nombre/metodología; creación Waterfall sin descripción/objetivo/fechas |
| Vista general | Ocho widgets, métricas y enlaces, controles solo en Diseño |
| Diseño | Arrastre cambia columna/fila; resize por tirador cambia 3 × 2 a 4 × 3; botón de tamaño y ocultación persisten tras reload; agregar/restaurar funcionan; cambiar persona muestra ocho widgets y volver recupera los siete del usuario anterior |
| Tablero | Cuatro columnas caben en el área disponible sin scroll horizontal; checklist cambia columnas, extremo ocupa 44 px al colapsar; persistencia al recargar; tarjeta T-01 arrastrada a En ejecución y restaurada con Enter |
| Lista | Búsqueda UX-T y badge conservados al cambiar desde Tablero; una fila coherente; valores inline preservados. Tabla ancha usa scroll para evitar palabras/fechas cortadas |
| Cronograma | Escalas diaria/semanal/mensual/trimestral; barra de 61 días medida en 2196/732/244/91.5 px según zoom; jerarquía, fechas, prioridad, progreso y Hoy visibles |
| Roadmap | Agile con sprint/release y tarea realmente asignada; Waterfall con fase, entregable, actividad hija e hito relacionado; Hybrid con entregable real en su vista adicional |

Evidencia local: .test-data/phase13-dashboard.jpg. Las preferencias QA se restauraron al finalizar las comprobaciones.

## Conservación de datos

La base normal conserva APS (Waterfall) y Migracion Maui (Agile), esquema 9 y cero violaciones de claves externas. Se observaron cambios en cinco tablas respecto del respaldo previo de fase 12; no se revirtieron ni se atribuyeron a esta implementación. Las acciones de creación/edición para validar este incremento se hicieron exclusivamente en 8015. Se tomó una nueva copia de consulta pre-phase13-normal.sqlite3 antes de reiniciar el servidor normal. Tras el reinicio, las 24 tablas coinciden con esa copia, sin cambios de datos; /api/health confirma 0.13.0 en 8011. Bases, descargas y evidencia QA están fuera de Git.

## Pendientes reales

- Arrastrar/redimensionar barras del Gantt y ordenar manualmente dentro de la jerarquía. Las barras abren la ficha para cambiar inicio/fin; el modelo de simulación conserva sus restricciones. No se implementó una modificación silenciosa del scheduler.
- Calendarios laborables, festivos, agregación de duración de padres, recursos y baseline del cronograma siguen fuera del cálculo.
- Widgets adicionales de avance ponderado, riesgo, ruta crítica, capacidad, presupuesto e hitos del PMO anterior siguen registrados para incrementos posteriores; los ocho widgets del resumen actual sí son configurables.
- No se probó móvil completo, arrastre de agenda semanal ni estrés con cientos de conexiones. Persistencia de preferencias solo en este navegador.
- Migración real .pohub y paridad legacy siguen pendientes del archivo del usuario. No se sustituyen por los ZIP de código.
