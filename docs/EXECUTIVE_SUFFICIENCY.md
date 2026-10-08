# Suficiencia para un reporte ejecutivo desde PMO

Revisión del 2026-10-08. Esta solicitud tiene tres etapas de trabajo; no renumera las fases ni versiones oficiales. Fuentes examinadas: WeeklyMetadata/PMP en backend/app/main.py, importers.py, services/master.py, services/executive.py, scheduler.py y el modelo operativo vigente. La UI ejecutiva y los importadores Word/Excel se conservan.

AUTO significa dato objetivo registrado o calculado con regla visible, no publicación automática. PROPUESTO exige revisar selección, interpretación y periodo. MANUAL significa que falta una fuente suficiente. Una ausencia de dato se muestra como tal; cero y «sin definir» no son equivalentes.

| Campo ejecutivo | Fuente Word/Excel actual | Fuente PMO interna | Clasificación | Dato faltante / condición |
|---|---|---|---|---|
| Proyecto, objetivo, descripción, metodología | Datos generales y narrativa de origen | projects capturado al crear/publicar | AUTO | Campos no registrados permanecen vacíos |
| Marca, logo, título, subtítulo | Encabezado o configuración de reporte | WeeklyMetadata vigente | MANUAL | Identidad editorial; no inferir desde una minuta |
| Fecha de corte, intervalo | Fecha del resumen, hoja o selección manual | cuts.report_date/start_date/end_date | AUTO | Intervalo debe ser elegido por el usuario |
| Inicio, compromiso, cierre y Go Live | Fechas/tablas de origen | projects y master_items | AUTO | Fecha comprometida y pronóstico son conceptos diferentes |
| Trabajo, responsable, estado y compromiso | Actividades y aliases de columnas | master_items, people, jerarquía | AUTO / PROPUESTO | Hechos disponibles; relevancia y aceptación requieren revisión |
| Avance real | Porcentajes/tablas de avance | progress explícito de hojas operativas | PROPUESTO | Cobertura completa; media simple sin sumar padres e hijos. Falta ponderación acordada |
| Avance planeado | Planeado/estimado en Excel o resumen | No existe baseline de avance ponderado | MANUAL | Línea base con pesos y calendario. No usar días transcurridos como porcentaje |
| Variación de avance | Real menos planeado o cifra declarada | WeeklyMetadata actual y planned | AUTO | Solo cuando ambas cifras existen; no sustituir por atraso en días |
| Cronograma, duración, final simulado | Timeline/predecesoras de origen | Gantt, fechas y scheduler | AUTO / PROPUESTO | Fechas guardadas son hechos; final calculado es simulación. No hay baseline comparativa |
| Retrasos y compromisos vencidos | Problemas/fechas/actividades | target_date frente a fecha del corte, excluyendo finalizados | AUTO | Gravedad y explicación del atraso necesitan revisión |
| Ruta crítica y holgura | Ruta crítica o planificación externa | scheduler.calculate y work_dependencies | PROPUESTO | No usar resultados con errores. Modelo de días naturales; PTO/horarios no alteran el scheduler |
| Dependencias y bloqueos | Dependencias/predecesoras y narrativa | work_dependencies, Dependency, estados Blocked | AUTO / PROPUESTO | Relación y estado son hechos; impacto ejecutivo requiere interpretación |
| Sprints, iteraciones, fases y entregas | Fases/categorías/columnas de origen | planning_periods, iteration_id/release_id | AUTO | Seleccionar el periodo relevante; etiquetas adaptadas sin convertir datos |
| RAID | Tablas riesgos/supuestos/problemas/dependencias | Risk/Assumption/Issue/Dependency vigentes | AUTO / PROPUESTO | Valores registrados disponibles; priorización y aceptación humanas |
| Riesgos, probabilidad, impacto, respuesta | Matriz Excel y narrativa Word | Campos explícitos de Risk | AUTO / PROPUESTO | Exposición monetaria/probabilística carece de método uniforme; no inventar puntajes |
| Hitos y próximos compromisos | Tablas de hitos | Milestone y fechas, ventana de 30 días en evidencia | AUTO / PROPUESTO | Clasificar importancia; hechos y selección se distinguen |
| Presupuesto aprobado, contingencia, planeado, comprometido, real, forecast | Valores y columnas originales; no todo se mapea automáticamente | budgets/budget_entries en centavos por moneda/tipo | AUTO | No mezclar monedas ni asumir conversión/cobertura completa |
| Semáforo y comentario de presupuesto | Evaluación/narrativa | budget_status/budget_comment | MANUAL | Faltan umbrales y criterio acordados; importes no justifican color por sí solos |
| Equipo, rol, dedicación y vigencia | Responsables/narrativa | project_people, roles, teams, memberships | AUTO | No convertir el rol global heredado ni duplicar dedicación en la persona |
| Capacidad y disponibilidad | Narrativa de recursos | Asignaciones vigentes entre proyectos, availability, working_calendars | AUTO / PROPUESTO | Porcentajes y ausencias disponibles; suficiencia y horas netas no se calculan todavía |
| Reuniones y compromisos | Narrativa y notas Word | events, organizador/invitados, related_id | AUTO / PROPUESTO | Evento registrado no prueba asistencia ni cumplimiento |
| Documentos y evidencia | Original Word/Excel | documents/sources, hash, document_links | AUTO | Referencia al original; el contenido no es un hecho validado automáticamente |
| Decisiones, acuerdos, acciones y próximos pasos | Narrativa Word/minuta externa | meeting_minutes, minute_proposals y meeting_decisions | PROPUESTO | Revisión explícita, enlace existente o alta validada. Candidatos aceptados se capturan en futuros cortes; su narrativa aún se incorpora manualmente en la UI actual |
| Logros y cambios relevantes de la semana | Narrativa/tablas Word | Propuestas revisadas, estados y auditoría | PROPUESTO | Definir ventana y evidencia de transición. Un estado Closed actual no prueba logro en esta semana |
| Alcance, comentario ejecutivo, riesgos, exposición, hitos y desviación | Texto del reporte | scope_comment/executive_comment/risks_comment/exposure_comment/milestones_comment/deviation_comment | MANUAL / PROPUESTO | Hechos permiten proponer texto, pero no hay síntesis IA ni criterio editorial automático |
| PMP y su comentario | Evaluación de dimensiones en el reporte | WeeklyMetadata.pmp y pmp_comment | MANUAL | Falta evaluación humana/criterios por dimensión; no derivar todos los semáforos del avance |
| Semáforo general | Evaluación del autor | WeeklyMetadata.semaphore | MANUAL | Umbrales y criterio de alcance, calidad, costo y tiempo no definidos |
| Confianza, porcentaje de confianza | Evaluación/narrativa | confidence_level/confidence_percent | MANUAL | No existe modelo de probabilidad validado |
| Pronóstico y comentario Go Live | Fecha estimada y explicación | forecast_date/go_live_comment y evidencia del cronograma | MANUAL / PROPUESTO | Simulación puede orientar; no reemplaza automáticamente compromiso o pronóstico aprobado |
| Serie histórica | Cortes anteriores/Excel | Cortes publicados y history_snapshot | AUTO | Solo datos históricos publicados; mantener la serie congelada en cada publicación |

## Flujo de minutas disponible

Evento → documento original TXT/DOCX → minuta con fecha/participantes al adjuntar → propuestas manuales pendientes → revisión humana → vincular o crear PMO / registrar decisión / ignorar. La candidatura ejecutiva se decide durante revisión. Una minuta puede relacionarse con varios elementos usando el mismo documento; no se duplican bytes ni se modifica el original de un corte.

El endpoint minute-contract declara provider=null y automatic_extraction=false. Una extensión futura puede generar ProposalInput con tipo, texto, fragmento de evidencia, responsable y compromiso propuestos; utiliza el mismo almacén pendiente y el mismo endpoint de revisión. No puede omitir la revisión ni publicar. No se instaló ni contrató un proveedor externo.

Al crear explícitamente un nuevo corte «Desde PMO», el snapshot captura minute_candidates aceptados, marcados y revisados a más tardar en la fecha del corte. Los elementos vinculados elegidos como candidatos participan en el flujo PMO existente. Las decisiones/narrativas capturadas no se convierten automáticamente en filas ni comentarios de la UI actual. Este es un punto de extensión preparado, no paridad declarada de un generador ejecutivo sin Word/Excel.

## Garantía histórica

PMO representa estado actual; Seguimiento Ejecutivo conserva un snapshot revisado e inmutable. Las propuestas pendientes o ignoradas nunca actualizan maestros. Una aceptación transaccional crea/enlaza solo lo elegido, audita la decisión y conserva el documento. Una nueva revisión no cambia publicaciones, snapshots ni cronogramas anteriores.
