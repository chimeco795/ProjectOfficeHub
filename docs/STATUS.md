# Estado actual y pendientes

Actualizado: 2026-10-22 · versión 0.13.0 · esquema SQLite 13 (autenticación en 12, propiedades explícitas en 13). Las etapas UX mantienen la fase oficial 13.

ACTUAL: consolidación UX y reglas explícitas sobre 5027f0a. Full backend 112, frontend 32 y TypeScript/Vite correctos. Patrones de confirmación/Deshacer/toolbar/estados compartidos, ACL por proyecto, capacidad multiequipo explícita e identidad persistente de equipo. Versión 0.13.0/fase 13 conservadas; schema 13 aditivo, 36 tablas con columnas anteriores intactas. Antecedentes anteriores se mantienen como historia.


| Área | Disponible | Pendiente o límite |
|---|---|---|
| Acceso | Login/Recordarme/sesiones/expiración/logout, perfil/preferencias, cuentas y permisos, cambio de contraseña y recuperación por enlace temporal/propietario local | Correo automático sin proveedor; SSO/MFA no implementados; ACL de lectura por project_people; sólo instancias reiniciadas cargan el acceso nuevo |
| Proyectos y portafolio | Ficha única, indicadores objetivos y wizard de dos pasos | Sin datos reales antiguos importados |
| Vista general | Ocho widgets, lectura/diseño, arrastre/resize, ocultar/agregar/restaurar, preferencias por cuenta/proyecto | LocalStorage del navegador; widgets adicionales legacy pendientes |
| Seguimiento ejecutivo | Importación/revisión, conciliación, cortes y snapshots publicados | Mantener publicaciones históricas independientes |
| Planificación | Tablero 1–4 columnas con popover/drag/⋮ y expansión amplia; Gantt con columna de identidad fija, zoom, orden por puntero y mover/resize con Deshacer | Días naturales sin festivos/capacidad; cabecera colapsada no recertificada para reordenación por arrastre |
| RAID e hitos | Lista por defecto, Cards compactas clicables y filtros alineados | Usa el mismo catálogo y ficha contextual existente |
| Roadmap | Agile sprints/releases, Waterfall fases/entregables/hitos, Hybrid periodos + entregables, catálogo compartido | Arrastre de periodos asigna trabajo, no mueve fechas; no convierte periodos heredados en fases |
| Personas y equipos | Asignación desde Personas y Equipos: proyecto/rol/dedicación, equipo opcional; inline seguro, líder/vigencia progresivos; capacidad multiequipo explícita heredable; código/color/forma de equipo persistentes; organigrama con integrantes opcionales | Roles heredados preservados sin conversión automática; asignaciones anteriores conservadas |
| Capacidad | Asignaciones por fechas y entre proyectos, ausencias globales y horarios por proyecto/equipo | Ausencias contextualizan; no descuentan horas ni redistribuyen tareas automáticamente |
| Comentarios | Notas por trabajo, fecha y auditoría, reintentos sin duplicados | Comentarios legacy todavía solo en original importado |
| Agenda | Mes/semana/día y lista, eje semanal común, scope por Persona vinculada a la cuenta, filtros/colores por proyecto y recordatorios locales | Sin invitaciones externas; recordatorios requieren agenda abierta |
| Presupuesto | Importes exactos por moneda, costos y base explícita | Sin conversión automática |
| Documentos | Biblioteca única por proyecto y vínculos múltiples bidireccionales a trabajos/eventos/cortes, originales y fuentes ejecutivas | Formato de adjuntos legacy por verificar |
| Minutas | Original TXT/DOCX, propuestas manuales, revisión explícita, vincular/crear trabajo/decisión/ignorar, candidatura ejecutiva | Extracción automática sin proveedor conectado; narrativa sigue manual |
| Migración | Preview, mapa de proyectos, aplicación atómica e identidades | Exportación real pendiente; no retirar datos anteriores |

Los números de fase describen incrementos entregados, no un compromiso de cierre total de paridad. Ver VERIFICATION_PHASE5 a VERIFICATION_PHASE13 para alcance y pruebas. La migración real necesita el archivo del usuario; no sustituirlo por los ZIP de código.

Dashboard personalizable entregado para los ocho widgets actuales. Widgets adicionales de avance ponderado, riesgos, ruta crítica, equipo, presupuesto e hitos del PMO anterior continúan registrados para posteriores incrementos.

Fase vigente: 13. Autenticación real completada en este incremento; versión 0.13.0 conservada, SQLite 12 para acceso y 13 para capacidades/identidad explícitas. Ver la sección del 2026-10-14 de VERIFICATION_UX_CONTINUATION.md. Las verificaciones UX anteriores permanecen históricas.

REFINAMIENTO UX ANTERIOR DEL 2026-10-09: Tablero y columnas flotantes, Gantt con identidad fija, Lista/Cards RAID y flujo de asignación desde Personas/Equipos. Seis vistas revisadas, controles responsive y flujos sintéticos persistidos en QA. Backend, publicaciones y datos normales no modificados por este incremento.

ENTREGA ANTERIOR: columnas minimalistas, revisión de solapamientos 1280/1024/móvil, Persona/Equipo/Rol, ficha de trabajo/RAID/Evento/Documento, organigrama contextual con pan, resize/orden del Gantt y feedback/Deshacer. Flujos A–E recorridos con datos sintéticos en QA; movimiento semanal de Agenda, orden de columnas/filas y barras/extremos del Gantt comprobados en navegador. Normal 8011 actualizado, 31 tablas idénticas al respaldo e integridad correcta.

PENDIENTE: migración real .pohub, proveedor automático de minutas y paridad legacy/widgets adicionales. Arrastre de periodos y estrés con cientos de conexiones no recertificados.

LIMITACIONES: vistas Lista/Cards por cuenta en servidor; diseño de dashboard/tablero/Gantt en navegador por cuenta. Admin/Gestor leen todos los proyectos; Miembro/Consulta sólo proyectos participantes de su Persona vinculada, sin ACL por campo o documento individual. Sin proveedor de correo automático/SSO/MFA. Se conservan días naturales, sin redistribución automática por capacidad/ausencias, recordatorios con Agenda abierta. Móvil probado mediante viewport, sin certificar dispositivos táctiles físicos. Deshacer valida concurrencia. Narrativa y propuestas ejecutivas permanecen bajo revisión humana.
