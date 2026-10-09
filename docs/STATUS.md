# Estado actual y pendientes

Actualizado: 2026-10-09 · versión 0.13.0 · esquema SQLite 11. Las tres etapas UX mantienen la fase oficial 13.

| Área | Disponible | Pendiente o límite |
|---|---|---|
| Proyectos y portafolio | Ficha única, indicadores objetivos y wizard de dos pasos | Sin datos reales antiguos importados |
| Vista general | Ocho widgets, lectura/diseño, arrastre/resize, ocultar/agregar/restaurar, preferencias por persona/proyecto | LocalStorage del navegador; widgets adicionales legacy pendientes |
| Seguimiento ejecutivo | Importación/revisión, conciliación, cortes y snapshots publicados | Mantener publicaciones históricas independientes |
| Planificación | Tablero 1–4 columnas con popover/drag/⋮ y expansión amplia; Gantt con columna de identidad fija, zoom, orden por puntero y mover/resize con Deshacer | Días naturales sin festivos/capacidad; cabecera colapsada no recertificada para reordenación por arrastre |
| RAID e hitos | Lista por defecto, Cards compactas clicables y filtros alineados | Usa el mismo catálogo y ficha contextual existente |
| Roadmap | Agile sprints/releases, Waterfall fases/entregables/hitos, Hybrid periodos + entregables, catálogo compartido | Arrastre de periodos asigna trabajo, no mueve fechas; no convierte periodos heredados en fases |
| Personas y equipos | Asignación visible desde Personas y Equipos: proyecto/equipo/rol/dedicación; líder/vigencia progresivos; contacto y catálogo de roles independientes | Roles heredados preservados sin conversión automática; asignaciones anteriores conservadas |
| Capacidad | Asignaciones por fechas y entre proyectos, ausencias globales y horarios por proyecto/equipo | Ausencias contextualizan; no descuentan horas ni redistribuyen tareas automáticamente |
| Comentarios | Notas por trabajo, fecha y auditoría, reintentos sin duplicados | Comentarios legacy todavía solo en original importado |
| Agenda | Mes/semana/día y lista, eje semanal común, scope por usuario local, filtros/colores por proyecto y recordatorios locales | Sin invitaciones externas; recordatorios requieren agenda abierta |
| Presupuesto | Importes exactos por moneda, costos y base explícita | Sin conversión automática |
| Documentos | Biblioteca única por proyecto y vínculos múltiples bidireccionales a trabajos/eventos/cortes, originales y fuentes ejecutivas | Formato de adjuntos legacy por verificar |
| Minutas | Original TXT/DOCX, propuestas manuales, revisión explícita, vincular/crear trabajo/decisión/ignorar, candidatura ejecutiva | Extracción automática sin proveedor conectado; narrativa sigue manual |
| Migración | Preview, mapa de proyectos, aplicación atómica e identidades | Exportación real pendiente; no retirar datos anteriores |

Los números de fase describen incrementos entregados, no un compromiso de cierre total de paridad. Ver VERIFICATION_PHASE5 a VERIFICATION_PHASE13 para alcance y pruebas. La migración real necesita el archivo del usuario; no sustituirlo por los ZIP de código.

Dashboard personalizable entregado para los ocho widgets actuales. Widgets adicionales de avance ponderado, riesgos, ruta crítica, equipo, presupuesto e hitos del PMO anterior continúan registrados para posteriores incrementos.

Fase vigente: 13. Refinamiento puntual sobre la entrega minimalista completado; 29 pruebas frontend y TypeScript/Vite correctos. Backend sin cambios y no reejecutado; baseline anterior de 89 pruebas correctas. Sin cambio de versión/esquema. Estado vigente en la sección de refinamiento puntual de VERIFICATION_UX_CONTINUATION.md; las verificaciones anteriores conservan el histórico.

COMPLETADO ACTUAL: Tablero y columnas flotantes, Gantt con identidad fija, Lista/Cards RAID y flujo de asignación desde Personas/Equipos. Seis vistas revisadas, controles responsive y flujos sintéticos persistidos en QA. Backend, publicaciones y datos normales no modificados por este incremento.

ENTREGA ANTERIOR: columnas minimalistas, revisión de solapamientos 1280/1024/móvil, Persona/Equipo/Rol, ficha de trabajo/RAID/Evento/Documento, organigrama contextual con pan, resize/orden del Gantt y feedback/Deshacer. Flujos A–E recorridos con datos sintéticos en QA; movimiento semanal de Agenda, orden de columnas/filas y barras/extremos del Gantt comprobados en navegador. Normal 8011 actualizado, 31 tablas idénticas al respaldo e integridad correcta.

PENDIENTE: migración real .pohub, proveedor automático de minutas y paridad legacy/widgets adicionales. Arrastre de periodos y estrés con cientos de conexiones no recertificados.

LIMITACIONES: preferencias locales, días naturales, sin redistribución automática por capacidad/ausencias, recordatorios con Agenda abierta. Móvil probado mediante viewport, sin certificar dispositivos táctiles físicos. Deshacer valida concurrencia. Narrativa y propuestas ejecutivas permanecen bajo revisión humana.
