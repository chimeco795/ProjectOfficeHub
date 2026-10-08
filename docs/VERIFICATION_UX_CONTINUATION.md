# Continuación UX — solicitud del 2026-10-08

Las fases 1–3 de esta solicitud son etapas del incremento, no una renumeración de las fases oficiales. Base master 47dfd41, versión 0.13.0, SQLite 9.

## Checkpoint de la fase 1 de la solicitud

Implementado sobre los componentes existentes:

- Dashboard: elimina scroll interno; tres compromisos prioritarios y acceso a planificación, títulos truncados con tooltip, densidad por ancho mediante container queries, límites de tamaño por tipo de widget. Lectura/Diseño, arrastre, resize, colisiones y preferencias por persona/proyecto se conservan.
- Columnas: entre una y cuatro, checks adicionales deshabilitados al llegar al máximo, orden mediante flechas y persistencia. Preferencias antiguas se deduplican/limitan conservando el orden. Nuevo trabajo dentro de Nuevo; acceso global cuando esa columna no se muestra. Responsive sin scroll horizontal.
- Ficha de trabajo: diálogo ancho, bloques abiertos en tres columnas, sin acordeones ni leyenda de teclas. Conserva ContextField y búsqueda de predecesores con chips. Corrige presentación de booleanos SQLite como Sí/No/Activo/Archivado.
- Agile muestra Sprints. Matriz de periodos con cabeceras de fecha, indicador del periodo que contiene Hoy, agrupación por equipo vigente/responsable/Epic-Feature-entregable y filas contraíbles. Usa los periodos y memberships existentes; no duplica entidades. Arrastre conserva el contrato de asignación existente.
- Gantt: botones Día/Semana/Mes/Trimestre, pan del fondo, wheel/trackpad y flechas. Orden visual local de hermanos mediante arrastre de nombres, sin cambiar prioridad de negocio; restauración disponible. Movimiento horizontal de barras abre revisión antes de persistir. Backend valida relaciones incidentes, duración, trabajo terminado/archivado, calendario y huella del catálogo completo; aplica en transacción con auditoría. Simulación original sin cambios.

Pruebas focalizadas: 10 backend (movimiento y scheduler), 4 nuevas frontend (columnas, agrupación y orden). Suite frontend antes del último test de orden: 28 correctas; TypeScript/Vite correctos después de los cambios. Suite global pendiente del cierre de las tres etapas.

Revisión real de escritorio en 1280 px, servidor QA 8015: widgets Lectura/Diseño sin scroll interno y sin botones recortados en layout predeterminado; tablero ancho 911/scrollWidth 911, cuatro checks y otros deshabilitados, reordenación persistente tras reload; ficha ampliada; matriz Hybrid y agrupación por responsable; Gantt con rechazo de precedencia y movimiento válido confirmado/restaurado de UX13-ENT. Datos sintéticos exclusivamente. Evidencia .test-data/ux-continuation-periods.jpg, fuera de Git.

Pendientes de interacción: resize de duración desde extremos de barras; orden visual persiste sólo en navegador. Waterfall conserva su vista de fases/entregables/hitos; no se convierten automáticamente en periodos. Matriz no supone que todos los periodos tengan la misma duración. Estrés y móvil completo no comprobados. Fase 2 y fase 3 de esta solicitud pendientes.


## Checkpoint etapa 2 — 2026-10-08
Esquema 10 aditivo con respaldo previo v9; conserva roles y líderes heredados y no genera roles/asignaciones ficticios. Catálogo global de personas/contactos y roles independientes; dedicación sigue en memberships. Disponibilidad global compartida por personas asignadas y calendario por proyecto/equipo, sin tocar el scheduler.

Agenda y Documentos: Proyecto actual / Todos mis proyectos derivados de project_people del usuario local; filtros explícitos y guardas contra respuestas atrasadas al cambiar alcance. Agenda usa colores por ID de proyecto, detalle al hover/foco, recordatorio configurable mientras está abierta, escala semanal compartida y bloque de eventos fuera de horas. Movimiento conserva confirmación/duración/deshacer. Documentos relaciona un original con varios elementos/eventos/cortes; adjuntos visibles desde trabajo, RAID/hito, evento y trazabilidad de corte.

Validación focalizada: 14 pruebas backend (management, operation_details, collaboration) correctas; TypeScript/Vite correctos. Desktop 1280: personas/ficha progresiva, alta de dos roles jerárquicos en QA, organigrama con líneas y aviso de asignaciones heredadas, configuración de horario, semana de agenda/scope con dos proyectos asignados, popover de evento y filtros/documentos originales. DOM comprobó un solo weekly-time-scroll y cero hour-list en semana. Captura .test-data/ux-continuation-agenda.jpg, excluida de Git.

Límites: ausencias contextualizan carga y agenda; no recalculan horas contractuales ni scheduler. En multi-proyecto el horario visible corresponde al proyecto actual; horarios de equipo quedan configurables para cálculo futuro. Recordatorios son locales mientras agenda está abierta. No se declara probado el arrastre semanal de la nueva grilla ni todas las relaciones de documentos mediante UI. Cierre global aún pendiente. La base normal no recibió fixtures ni migración 10 en este checkpoint.
