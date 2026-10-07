# Incremento 12 — edición rápida, Gantt y captura ejecutiva

2026-10-07 · master · versión 0.12.0 · SQLite 9.

## Alcance

ContextField unifica lectura/hover/edición: Enter o salida del campo guarda valores simples válidos; Escape cancela; selección predictiva confirma el valor escogido. Guardado bloquea envíos dobles. Error conserva el borrador. Texto largo, predecesores múltiples y archivo conservan confirmación explícita. Aplicado a ficha/lista de trabajos, periodos de roadmap, rol/dedicación y campos simples del proyecto.

Personas usan SearchPicker: nombre/correo, búsqueda tolerante a acentos, ocho resultados como máximo, lista flotante con scroll, iniciales y chips removibles. Sin consulta no se presenta el catálogo completo. Incluye responsables, organizador, invitados, usuario local, autor, líder, asignaciones y reutilización de personas.

Etiquetas: Agile = Sprint; Hybrid = Iteración / Sprint; Waterfall = Periodo. Se conserva iteration_id. Gantt muestra jerarquía contraíble, escala de fechas, duración, avance, responsable/estado, Hoy, conexiones entre filas visibles y tooltips. ScheduleSimulation mantiene cálculo y aplicación transaccional; su resultado alimenta barras propuestas y contorno de ruta crítica. Simulación inválida conserva fechas actuales y no afirma una ruta crítica calculada.

La [matriz de fuentes](EXECUTIVE_SOURCE_MAP.md) se escribió antes de modificar la generación ejecutiva. Desde PMO se captura project_snapshot.pmo en la misma transacción del corte. Incluye hechos, versiones de origen, presupuesto por moneda, asignaciones vigentes, periodos, referencias documentales y propuestas de reuniones. El avance solo se propone con cobertura completa, mediante media simple de trabajos hoja, sin contar padres. No deriva avance planeado ni semáforos. Los registros siguen pendientes y vinculados al maestro. Publicar conserva la captura completa, incluidas las fechas/nombre del proyecto al crear ese corte. Copias e importaciones conservan su comportamiento anterior; publicaciones antiguas no se modifican.

Una reunión puede proponer su trabajo/RAID relacionado: sin copiar notas, sin crear otro catálogo ni duplicar el registro si varias reuniones apuntan al mismo elemento. Requiere relación del mismo proyecto; reuniones canceladas/archivadas o posteriores al corte no se consideran. Decisiones y narrativa siguen manuales. Reporte agrupa estados PMO e importados; “Terminadas al corte” no afirma que se terminaron durante la semana.

## Validación automatizada

- Backend: 75 pruebas correctas. Nuevas pruebas de cobertura de avance, dinero exacto, aislamiento, congelación tras cambios PMO/proyecto, propuestas deduplicadas sin notas y migración v9 con respaldo e idempotencia.
- Frontend: 21 pruebas correctas. Incluyen búsqueda por correo/acentos, límite de resultados, jerarquía contraída con padres filtrados y escala al cambiar de año. Se conservan tests de snapshots, gráfico, calendario, scheduler visual y exportación proporcional.
- TypeScript y Vite build correctos.
- git diff --check sin errores de espacios. Advertencia existente: Starlette recomienda httpx2 en TestClient; no falla las pruebas.

Base normal: respaldo .test-data/pre-phase12-normal.sqlite3 y respaldo automático v8 antes de migrar; comparación de las columnas previas en las 23 tablas de contenido sin cambios, esquema 9, PRAGMA foreign_key_check vacío. Servidor normal 8011 responde versión 0.12.0.

## Revisión visual real

Navegador integrado, servidor 8015, base sintética .test-data/phase5-browser; separado de los proyectos normales.

| Pantalla / comportamiento | Resultado observado |
|---|---|
| Proyecto | Prioridad: Escape restaura, Enter guarda, Tab muestra Guardando y persiste |
| Ficha de trabajo | Lectura con tipo/código, fechas, avance y periodo; persona por teclado; Escape cancela selector y mantiene ficha abierta |
| Responsable | Resultados QA flotantes con iniciales; Enter selecciona/guarda, chip permite retirar |
| Equipo | Rol/dedicación en lectura; 101% conserva borrador y muestra error, Escape devuelve 60% |
| Backlog | Valores informativos, responsables predictivos y estado/tipo/prioridad/fecha inline |
| Gantt | Barras coloreadas, progreso, Hoy, vínculos; contraer Epic oculta descendientes; fechas incompletas bloquean aplicación; simulación válida muestra cambios y ruta crítica |
| Evento | Selector compacto y marca habilitada solo con relación; guardado conserva organizador y duración |
| Nuevo corte | PMO seleccionado como origen; corte 2026-10-07 abre actualización, muestra cobertura 2/4, no inventa avance y deja siete registros pendientes |
| Reporte | Captura PMO visible, registros pendientes solo con opción de revisión; estados PMO en terminadas/ejecución/próximos pasos y bloqueos; pantalla completa sin desplazar secciones |

Evidencia local: .test-data/phase12-gantt.jpg. No se aplicó la simulación a los datos normales. Las fechas añadidas para ejercitar la simulación pertenecen exclusivamente al proyecto QA.

## Límites y pendientes reales

Drag/resize de barras sigue pendiente. Dependencias dibujadas solo entre filas visibles; muchos vínculos pueden solaparse y el usuario puede ocultarlos. La ruta crítica depende del modelo existente, que incluye trabajos superiores, usa días naturales y no agrega duraciones por jerarquía ni limita capacidad. No equivale a una línea base de cronograma.

La media de avance es una propuesta sin ponderación: no sustituye una baseline ejecutiva. Evaluación de alcance/calidad, semáforos, decisiones, confianza y comentarios son manuales. Asignaciones capturadas describen este proyecto; la vista Capacidad mantiene el análisis entre proyectos. Referencias documentales no analizan automáticamente su contenido.

Cierre en la continuación 13: se localizó el PDF real descargado (una hoja A3 horizontal, captura PMO incluida) y se renderizó con Poppler; PNG exportado de nuevo desde el navegador, 3072 × 2146, e inspeccionado. Sin recorte ni deformación observados. La espera de evento download había agotado su plazo, pero el PDF sí estaba en Descargas. No se realizó prueba móvil específica, arrastre de agenda semanal ni estrés con cientos de dependencias. Esos comportamientos no se declaran certificados.

Dashboard configurable entregado en la continuación 13. Exportación real .pohub/paridad legacy continúan pendientes. Los importadores Word/Excel permanecen disponibles.
