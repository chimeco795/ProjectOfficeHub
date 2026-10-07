# Matriz PMO → Seguimiento Ejecutivo

Inventario previo a la implementación del incremento 0.12.0, 2026-10-07. Fuentes revisadas: importers.py (Word/Excel y ALIASES), WeeklyMetadata, reportModel/ExecutiveReport, catálogo maestro, scheduler, presupuesto, asignaciones y agenda. AUTO significa cálculo con reglas visibles; PROPUESTO exige revisión; MANUAL no dispone de fuente estructurada suficiente.

| Dato ejecutivo | Fuente Word/Excel actual | Fuente PMO | Clasificación y regla |
|---|---|---|---|
| Nombre, metodología, objetivo, fechas, Go Live | Datos generales/narrativa | projects | AUTO, snapshot del proyecto |
| Trabajo, estado, responsable, fechas | Tablas de actividades y aliases | master_items + people | AUTO como valores; PROPUESTO para seleccionar relevancia y aceptar registros |
| Avance real | Real/% alcanzado/narrativa porcentual | progress de trabajos hoja operativos | PROPUESTO: media sin ponderar solo cuando todos tienen avance; no sumar padres e hijos; registrar cobertura |
| Avance planeado | Planeado/% estimado, timeline Excel | No existe baseline de avance ponderado | MANUAL; no inferirlo de días transcurridos |
| Variación porcentual | Variación declarada / real-planeado | Resumen semanal guardado | AUTO solo si planeado y real existen; no sustituir por desviación en días |
| Estado general, cronograma y PMP | Evaluación/narrativa | Métricas operativas orientan | MANUAL: no inventar semáforos ni evaluación de alcance/calidad |
| Próximos hitos | Fechas/hitos Excel | Milestones activos y fechas | AUTO, próximos por fecha de corte; selección PROPUESTA |
| Compromisos vencidos/bloqueos | Problemas/bloqueos/actividades | Estados y target_date | AUTO conteos/listas al corte; gravedad y comentario MANUAL |
| Riesgos/probabilidad/impacto/mitigación | Matriz Excel/narrativa Word | Risk | AUTO valores registrados; exposición/selección PROPUESTA; no inventar probabilidades |
| Dependencias | Predecesoras/notas | work_dependencies + Dependency | AUTO relaciones; impacto ejecutivo PROPUESTO |
| Ruta crítica/holgura/final simulado | Ruta crítica/fechas Excel | scheduler.calculate | PROPUESTO, modelo de días naturales; indisponible si hay errores; conservar errores y supuesto/fecha |
| Presupuesto | Narrativa de presupuesto; columnas no reconocidas se conservan originales | budgets + budget_entries | AUTO importes exactos por moneda/tipo; evaluación y semáforo MANUAL; no convertir monedas |
| Equipo/capacidad | Responsable/narrativa | project_people + memberships | AUTO asignaciones vigentes/dedicación; suficiencia MANUAL; no asumir que 100% significa disponibilidad efectiva |
| Sprints/releases | Categoría/fase/columnas originales | planning_periods y asignaciones | AUTO nombre/fechas, etiqueta según metodología sin cambiar iteration_id |
| Reuniones/acuerdos/decisiones | Narrativa Word | events.related_id marcado para proponer | PROPUESTO: enlazar trabajo/RAID existente; no copiar texto completo ni crear duplicados |
| Documentos | Original Word/Excel | documents/sources | AUTO referencias/metadata; contenido ejecutivo requiere revisión |
| Logros/acciones/próximos pasos | Encabezados Word y tablas | Trabajos seleccionados y estado actual | PROPUESTO; sin historia de transición no afirmar que se completó esta semana |
| Decisiones del comité/confianza/pronóstico | Narrativa | No hay decisión estructurada ni evaluación de confianza | MANUAL |

## Estrategia del nuevo corte

Solo la opción explícita «Desde PMO» captura el snapshot operativo. Incluye fuentes y reglas en project_snapshot.pmo, crea propuestas vinculadas a maestros y precarga un avance propuesto únicamente con cobertura completa. Registros permanecen pendientes de revisión. Cambios PMO posteriores no alteran ese snapshot; publicación lo conserva. Copiar una semana anterior y comenzar vacío mantienen su comportamiento.

No se eliminan importadores ni originales. Un reporte publicado consume sus propios datos. El snapshot no constituye otro catálogo editable: es evidencia histórica ligada al corte.

## Información aún no disponible

Baseline de avance ponderado, transiciones de estado por periodo como modelo ejecutivo, decisiones estructuradas del comité, semáforos interpretados, evaluación de calidad/alcance, confianza y narrativas. Permanecen manuales o como propuestas claramente etiquetadas. El dashboard configurable y drag/resize del Gantt siguen pendientes.
