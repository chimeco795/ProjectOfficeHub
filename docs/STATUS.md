# Estado actual y pendientes

Actualizado: 2026-10-07 · versión 0.13.0 · esquema SQLite 9.

| Área | Disponible | Pendiente o límite |
|---|---|---|
| Proyectos y portafolio | Ficha única, indicadores objetivos y wizard de dos pasos | Sin datos reales antiguos importados |
| Vista general | Ocho widgets, lectura/diseño, arrastre/resize, ocultar/agregar/restaurar, preferencias por persona/proyecto | LocalStorage del navegador; widgets adicionales legacy pendientes |
| Seguimiento ejecutivo | Importación/revisión, conciliación, cortes y snapshots publicados | Mantener publicaciones históricas independientes |
| Planificación | Tablero/Lista comparten contexto, filtros ocultos, columnas configurables/colapsables, inline, Gantt con cuatro zooms y simulación atómica | Orden manual/drag de barras pendientes; días naturales sin festivos/capacidad |
| Roadmap | Agile sprints/releases, Waterfall fases/entregables/hitos, Hybrid periodos + entregables, catálogo compartido | Arrastre de periodos asigna trabajo, no mueve fechas; no convierte periodos heredados en fases |
| Personas y equipos | Personas compartidas, organigrama, equipos, roles y vigencias | La estructura se configura explícitamente |
| Capacidad | Asignaciones por fechas y entre proyectos, alertas sobre 100% | No redistribuye tareas automáticamente |
| Comentarios | Notas por trabajo, fecha y auditoría, reintentos sin duplicados | Comentarios legacy todavía solo en original importado |
| Agenda | Calendario mes/semana/día y lista | Sin invitaciones externas |
| Presupuesto | Importes exactos por moneda, costos y base explícita | Sin conversión automática |
| Documentos | Biblioteca agrupada por contenido, originales del proyecto y fuentes ejecutivas, iconos y asociaciones | Formato de adjuntos legacy por verificar |
| Migración | Preview, mapa de proyectos, aplicación atómica e identidades | Exportación real pendiente; no retirar datos anteriores |

Los números de fase describen incrementos entregados, no un compromiso de cierre total de paridad. Ver VERIFICATION_PHASE5 a VERIFICATION_PHASE13 para alcance y pruebas. La migración real necesita el archivo del usuario; no sustituirlo por los ZIP de código.

Dashboard personalizable entregado para los ocho widgets actuales. Widgets adicionales de avance ponderado, riesgos, ruta crítica, equipo, presupuesto e hitos del PMO anterior continúan registrados para posteriores incrementos.

Fase vigente: 13. Dashboard configurable, wizard, planificación adaptativa y zoom del Gantt; conserva edición inline, personas predictivas, dependencias/simulación y captura PMO para el corte. 76 pruebas backend, 25 frontend y TypeScript/Vite correctos; ocho pantallas desktop y PDF/PNG reales revisados. Ver VERIFICATION_PHASE13.md, VERIFICATION_PHASE12.md y EXECUTIVE_SOURCE_MAP.md para reglas y límites.

Drag/resize de barras y orden manual del Gantt pendientes. Móvil completo, agenda semanal por arrastre y estrés con cientos de conexiones no se certificaron en este incremento.
