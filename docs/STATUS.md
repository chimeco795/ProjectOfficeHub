# Estado actual y pendientes

Actualizado: 2026-10-08 · versión 0.13.0 · esquema SQLite 11. Las tres etapas UX mantienen la fase oficial 13.

| Área | Disponible | Pendiente o límite |
|---|---|---|
| Proyectos y portafolio | Ficha única, indicadores objetivos y wizard de dos pasos | Sin datos reales antiguos importados |
| Vista general | Ocho widgets, lectura/diseño, arrastre/resize, ocultar/agregar/restaurar, preferencias por persona/proyecto | LocalStorage del navegador; widgets adicionales legacy pendientes |
| Seguimiento ejecutivo | Importación/revisión, conciliación, cortes y snapshots publicados | Mantener publicaciones históricas independientes |
| Planificación | Tablero de 1–4 columnas persistentes, ficha compacta, Gantt con zoom, orden visual local y desplazamiento de fechas validado | Resize de duración pendiente; días naturales sin festivos/capacidad |
| Roadmap | Agile sprints/releases, Waterfall fases/entregables/hitos, Hybrid periodos + entregables, catálogo compartido | Arrastre de periodos asigna trabajo, no mueve fechas; no convierte periodos heredados en fases |
| Personas y equipos | Contactos progresivos, roles independientes y jerarquía, organigrama visual, asignaciones con líder/vigencia/excepción multiequipo | Roles heredados preservados sin conversión automática |
| Capacidad | Asignaciones por fechas y entre proyectos, ausencias globales y horarios por proyecto/equipo | Ausencias contextualizan; no descuentan horas ni redistribuyen tareas automáticamente |
| Comentarios | Notas por trabajo, fecha y auditoría, reintentos sin duplicados | Comentarios legacy todavía solo en original importado |
| Agenda | Mes/semana/día y lista, eje semanal común, scope por usuario local, filtros/colores por proyecto y recordatorios locales | Sin invitaciones externas; recordatorios requieren agenda abierta |
| Presupuesto | Importes exactos por moneda, costos y base explícita | Sin conversión automática |
| Documentos | Biblioteca única por proyecto y vínculos múltiples bidireccionales a trabajos/eventos/cortes, originales y fuentes ejecutivas | Formato de adjuntos legacy por verificar |
| Minutas | Original TXT/DOCX, propuestas manuales, revisión explícita, vincular/crear trabajo/decisión/ignorar, candidatura ejecutiva | Extracción automática sin proveedor conectado; narrativa sigue manual |
| Migración | Preview, mapa de proyectos, aplicación atómica e identidades | Exportación real pendiente; no retirar datos anteriores |

Los números de fase describen incrementos entregados, no un compromiso de cierre total de paridad. Ver VERIFICATION_PHASE5 a VERIFICATION_PHASE13 para alcance y pruebas. La migración real necesita el archivo del usuario; no sustituirlo por los ZIP de código.

Dashboard personalizable entregado para los ocho widgets actuales. Widgets adicionales de avance ponderado, riesgos, ruta crítica, equipo, presupuesto e hitos del PMO anterior continúan registrados para posteriores incrementos.

Fase vigente: 13. Las tres etapas UX están implementadas; 86 pruebas backend, 29 frontend y TypeScript/Vite correctos. Ver VERIFICATION_UX_CONTINUATION.md y EXECUTIVE_SUFFICIENCY.md para evidencia, reglas y límites; las verificaciones anteriores describen sus entregas históricas.

Resize de duración pendiente permitido por la solicitud. Móvil completo, arrastres HTML5 de agenda/periodos/orden de filas y estrés con cientos de conexiones no se certificaron visualmente. El movimiento horizontal de fechas del Gantt sí se comprobó mediante revisión, confirmación y restauración.
