# Contexto de Project Office Hub

## Checkpoint activo — autenticación real, 2026-10-14

Base master 8c39910. Se implementó la prioridad autorizada “autenticación real”. Versión 0.13.0 y fase oficial 13 conservadas; SQLite 12 es una migración aditiva necesaria para cuentas, sesiones, recuperación, límites de intentos y auditoría de acceso.

COMPLETADO: cuentas distintas de Personas, permisos Admin/Gestor/Miembro/Consulta distintos de Roles profesionales; vínculo person_id opcional y explícito por Admin. Contraseñas scrypt con sal aleatoria; sesiones opacas revocables, cookie HttpOnly/SameSite Strict, comprobación de origen y CSRF, login/Recordarme/expiración/logout, menú de usuario/perfil/preferencias/cambio de contraseña y administración de cuentas. Toda API de datos y descargas exige sesión. Gestor administra PMO; Miembro modifica trabajo/eventos/documentos/comentarios sólo en proyectos de su persona vinculada; Consulta lee. Lectura global compartida entre cuentas autenticadas, sin ACL de lectura por proyecto. Cambios de permisos/vínculo/estado revocan sesiones; último Admin activo protegido. Preferencias Lista/Cards almacenadas por cuenta; tablero/dashboard/Gantt permanecen locales por cuenta y reutilizan preferencias anteriores de la persona vinculada cuando no hay valor nuevo.

RECUPERACIÓN REAL: Admin genera enlace de un solo uso de 30 minutos; el titular introduce la nueva contraseña. Fallback del propietario local en backend/app/recover_account.py cuando es el único Admin y no tiene sesión. Tokens almacenados sólo como hash, fragmento URL y revocación de todas las sesiones al restablecer. Sin correo automático/proveedor conectado, SSO ni MFA: /recover responde de forma neutral y explica la alternativa; no simular envíos.

VERIFICADO: 104 pruebas backend (89 anteriores + 15 de acceso), 29 frontend, TypeScript/Vite y git diff --check. QA aislado en .test-data/auth-browser, 8016, cookie pohub_auth_qa. Login/Recordarme tras reload, perfil/preferencias, Consulta con filtros utilizables y campos de edición bloqueados, logout y caducidad→relogin→mismo proyecto/vista; RAID Media→Alta→Media confirmado con Admin. Formulario de configuración inicial revisado a 1280/1024 reales; QA de cuenta/perfil a 1280 efectivo. Detalles y límites de viewport en docs/VERIFICATION_UX_CONTINUATION.md.

NORMAL: backup pre-auth-normal-20261014.sqlite3 y respaldo detenido pre-auth-normal-stopped-20261014.sqlite3, fuera de Git. Migración ensayada en copia; tras reiniciar sólo 8011, 31 tablas previas conservan valores, schema_version añade 12, integrity_check ok y foreign_key_check vacío. No se crearon cuentas ni fixtures en data/. App normal http://127.0.0.1:8011/ lista para que el usuario cree su primer Admin e introduzca personalmente su contraseña. Proceso 8000 no intervenido; no dar por actualizadas otras instancias antiguas en memoria.

PENDIENTE: proveedor de correo automático, SSO/Entra ID/MFA si se autorizan; agrupaciones documentales por relaciones/preview, refinamientos restantes de catálogos/barras/células 10+ y cierre visual completo del incremento UX anterior. .pohub real, extracción automática de minutas y paridad/widgets legacy siguen abiertos. No reiniciar auditoría ni renumerar fases.

## Checkpoint anterior — catálogos y operación, 2026-10-12

Incremento en curso sobre master cad52e3, solicitud attachments/d6374663-6298-42e9-9d7a-7bd93f46fa75/Texto pegado.txt. Conservados versión 0.13.0, fase oficial 13 y SQLite 11. Este checkpoint es parcial: no declarar completada la solicitud completa ni el acceso real.

COMPLETADO EN ESTE CHECKPOINT: RAID sin bloque de responsables, tabla de ocho columnas, ordenación y edición contextual con contratos/versiones existentes. Lista/Cards compartido en RAID, Personas, Roles, Documentos y Portafolio; predeterminado Lista excepto Portafolio Cards. Preferencia por persona local, todavía sin cuenta autenticada. Personas/Roles presentan asignaciones vigentes del proyecto; contacto principal primero y asignación independiente en ficha. Cards abren ficha y acciones secundarias ⋮. Organigrama muestra forma/color/etiqueta de equipo, leyenda/filtro y + Asignar persona desde un rol vacío, reutilizando PersonAssignment; alta de persona separada. Agenda reúne alcance/vista/búsqueda/filtros/alta en barra responsive. Documentos tiene ocho columnas, Cards, agrupación proyecto/tipo/fecha y filtro por relación existente; fuentes ejecutivas en lectura, descarga de originales y relaciones múltiples conservadas.

VERIFICADO: 29 tests frontend; TypeScript/Vite correctos. QA 8015: prioridad RAID Media→Alta→Media, rol desde organigrama Analista QA→QA flujo contextual→Analista QA, misma asignación con 40%; preferencias de vistas tras recarga; ficha de persona y documental, fuente ejecutiva en lectura. Revisión a 1280/1024 según matriz de docs/VERIFICATION_UX_CONTINUATION.md. Backend no modificado ni reejecutado. Sin migraciones, escrituras QA en data/ ni cambios de publicados/originales.

SIGUIENTE PASO: implementar autenticación real aditiva: Cuenta de acceso distinta de Persona, permisos distintos de Roles profesionales; bootstrap de primer Admin, login/sesiones/expiración/logout/perfil/cambio y recuperación de contraseña. No convertir el selector local en autenticación aparente. Se preguntó por proveedor de correo; no hay respuesta todavía, no simular envíos. Completar agrupación documental por evento/trabajo/RAID/corte y previsualización segura, orden/filtros e inline adicionales en catálogos, secundarios responsive de barras, identificación/persistencia de células al crecer y prueba de 10+ equipos/hover. Completar matriz visual 1280/1024 y full suites después del incremento completo. Conservar todas las limitaciones históricas.

## Checkpoint anterior — refinamiento UX puntual, 2026-10-09

Base master 8c512d9. Solicitud directa: Tablero, Gantt, RAID/hitos y flujo Persona → Proyecto → Equipo → Rol → Dedicación → Vigencia/líder. Conservados versión 0.13.0, fase oficial 13, SQLite 11, arquitectura, contratos, tests e histórico.

COMPLETADO: flechas centradas y orientadas por extremo; cabecera y zona amplia del colapso expanden, con botones accesibles. Columnas 1–4 en popover flotante, checks en línea si caben, cierre por Columnas/clic fuera/Escape, sin “Cerrar columnas”. Gantt fija nombres/responsables/estado/avance; timeline y barras se desplazan horizontalmente, con filas compartidas para sincronización vertical. La rueda vertical ya no fuerza pan horizontal. RAID/hitos abre en Lista, ofrece Cards compactas clicables y controles espaciados. Personas abre directamente su asignación al proyecto, equipo, rol y dedicación; vigencia/líder y contacto son progresivos. AssignmentFields reutiliza los campos existentes desde Personas y Equipos; roles siguen siendo catálogo independiente. Las asignaciones vencidas se presentan como anteriores, sin reescribirlas ni duplicarlas automáticamente.

VERIFICACIÓN ACTUAL: 29 tests frontend correctos; TypeScript y Vite correctos. Backend sin cambios, no reejecutado; 89 pruebas correctas en la entrega anterior. Seis vistas revisadas en escritorio; controles a 1024 y viewport móvil 390. Flujos de asignación completos y persistencia comprobados exclusivamente en QA 8015. Arrastre de tarjetas/cabeceras expandidas/barras, ajuste de duración por teclado y Deshacer comprobados; zoom, jerarquía, dependencias y ruta crítica simulada conservados. Detalles y límites en docs/VERIFICATION_UX_CONTINUATION.md, sección de refinamiento puntual del 2026-10-09.

DATOS: sin cambios de backend, migraciones ni escrituras QA en data/. App normal http://127.0.0.1:8011/ sirve el build actualizado. Evidencia sintética .test-data/ux-continuation-*.png, fuera de Git. Las publicaciones y originales no se editaron.

PENDIENTE: exportación real .pohub, extracción automática, widgets/paridad legacy y límites anteriores siguen abiertos. Cabecera colapsada estrecha no recertificada para reordenación por arrastre; sí cabecera expandida y menú ⋮. Móvil mediante viewport, sin certificar dispositivos táctiles físicos. Continuar sólo con el alcance nuevo indicado por el usuario.

## Checkpoint anterior — UX minimalista, cierre 2026-10-09

Solicitud: attachments/a9cae9bb-beb4-40b7-b73b-7d4bb8765253/Texto pegado.txt, base master 2522e6f. Mantener versión 0.13.0, fase oficial 13 y SQLite 11. No reiniciar auditoría ni renumerar fases.

COMPLETADO: pasada transversal minimalista. Columnas checklist 1–4, drag/menú ⋮/Deshacer y colapso estrecho; autocomplete flotante; fichas progresivas Persona/Equipo/Rol y RAID contextual; detalle de trabajo sin cajas; organigrama contextual con pan; Agenda/Documentos con filtros colapsables; Gantt con resize de extremos validado, movimiento directo y orden vertical local sin alterar prioridad; avisos/Deshacer. Conservadas arquitectura, scheduler, auditoría y publicaciones. 89 pruebas backend, 29 frontend y TypeScript/Vite correctos. Flujos A–E sintéticos y revisión 1280/1024/móvil documentados en docs/VERIFICATION_PHASE13_MINIMALIST.md.

DATOS NORMALES: backup .test-data/pre-minimalist-normal.sqlite3; tras reiniciar sólo 8011, las 31 tablas conservan valores idénticos, integridad correcta y sin errores de claves foráneas. No hay nuevas migraciones ni datos QA en data/. App normal http://127.0.0.1:8011/.

PENDIENTE FUERA DEL INCREMENTO: exportación real .pohub, proveedor de extracción automática, widgets legacy adicionales/paridad completa. Arrastre de periodos y estrés con cientos de conexiones no recertificados. Móvil verificado mediante viewport; no certificar dispositivos táctiles físicos. Deshacer respeta las validaciones de concurrencia.

SIGUIENTE PASO EXACTO: conservar esta entrega; continuar sólo con el alcance nuevo que indique el usuario. La extracción futura genera propuestas pendientes vía /minute-contract, nunca hechos aceptados automáticamente. Las verificaciones anteriores describen entregas históricas; resize/arrastre semanal/orden de filas ya tienen evidencia nueva en la verificación minimalista.

## Baseline histórica al 2026-10-07

Fases 0–4 completadas. Repositorio privado chimeco795/ProjectOfficeHub, master. Base React/TypeScript/Vite + FastAPI + SQLite funcional. Proyecto maestro con metodología, prioridad y fechas independientes; portafolio, resumen y acceso a Seguimiento Ejecutivo. Start.ps1 permite iniciar la app local.

Baseline histórica: 10 tests semanales originales correctos, builds de ambos orígenes correctos con advertencias en PMO HTML. La entrega 0.10.0 tuvo 68 tests backend y 16 frontend. Estado vigente: 0.13.0, 89 backend, 29 frontend y build correctos. Creación, edición, recarga de proyecto/corte y aislamiento entre proyectos comprobados con base temporal.

## Reglas

Project Office Hub es el producto maestro. Seguimiento Ejecutivo es un módulo por proyecto. Un solo catálogo de proyectos. No duplicar futuros catálogos de personas, riesgos, hitos y actividades. Importar genera propuestas; conservar originales, trazabilidad e histórico. Publicados inmutables; no insertar datos de muestra automáticamente.

## Implementación base y antecedentes

- backend/app/api, domain y repositories: separación inicial del dominio Project.
- backend/app/migrations.py: migraciones aditivas v2 → v3 → v4 → v5 → v6 con respaldos. Esquema 4 protege cortes publicados, registros y fuentes con triggers; las modificaciones de contenido incrementan la versión del corte. La publicación congela también la serie histórica oficial.
- frontend/src/modules/projects: resumen y campos comunes de la ficha.
- frontend/src/modules/executive: histórico filtrable, avances, pendientes y trazabilidad con valores antes/después. Creación de cortes con periodo explícito y copia desde una semana anterior.
- Código semanal heredado y sus tres archivos de pruebas preservados. Los tests de migración esperan ahora esquema final 11 y se conservaron sus garantías.
- La URL guarda project, view y cut y restaura el contexto al cargar; usa replaceState, sin historial por pantalla.
- Catálogo maestro compartido de RAID, hitos y actividades; personas globales asignadas a proyectos; conciliación explícita, snapshots por registro y auditoría agregada. Ver VERIFICATION_PHASE3.md.
- Fase 5 implementa planificación sobre master_items, equipos, presupuesto, agenda, documentos e importador schemaVersion 3. No se importaron datos reales. Ver docs/VERIFICATION_PHASE5.md para límites y paridad pendiente.

## Datos

Los ZIP originales permanecen intactos. Las copias de consulta .reference/ están ignoradas. No se importaron datos reales del usuario. data/ es la base normal; .test-data/browser y .test-data/phase2-browser son exclusivamente verificaciones visuales con datos sintéticos. Ambas se excluyen de Git.

Fuentes: D:/Archivos/Downloads/project-office-hub-v3-1-0 (1).zip y D:/Archivos/ChatGPT/ResumenEjecutivoSemana.zip. Raíz del segundo código: ResumenEjecutivoSemana/ResumenEjecutivoSemanal/.

## Continuación

Fase actual: 13, continuación UX/dashboard/planificación adaptativa sobre el incremento 12. Ver docs/VERIFICATION_PHASE13.md; las limitaciones anteriores no comprobadas siguen registradas. La migracion real y paridad legacy de fase 5 siguen pendientes. El usuario confirmó que todavía no tiene la exportación .pohub. Fase 3 cerrada con catálogo actual, corte desde maestros, conciliación y snapshots inmutables. Las actividades incorporan WorkItem, jerarquía y precedencias; no crear otro catálogo.

No se migraron datos reales desde los ZIP o el navegador anterior. La base local puede contener proyectos creados por el usuario: conservarlos. Pruebas visuales de fase 3 en .test-data/phase3-browser, separadas de data/pmo.sqlite3.

Fase 4: reportModel centraliza indicadores, filtrado y snapshots. Reporte oficial separado de series de consulta; pendientes optativos en borrador. GET por proyecto/corte para histórico; otras semanas en borrador quedan excluidas. Sin cambio de esquema.

Ver docs/VERIFICATION_PHASE4.md. No actualizar retrospectivamente una publicación. El servidor se mantiene local y sin autenticación.

Fase 6 solicitada: mejorar forma visual y funcionalidad. Entrega 0.6.0: navegación WorkspaceNav/WorkspaceTabs, panel de proyecto con métricas actuales, búsqueda del portafolio, Board por arrastre y filtros, calendario día/semana/mes. Pruebas y límites en docs/VERIFICATION_PHASE6.md. Esquema permanece en 6; no cerrar paridad ni migración real de fase 5.

Incremento 0.7.0: cronograma Schedule con escala, progreso y revisión de dependencias. scheduleModel evalúa fechas incompletas, vencidos y precedencias fin-inicio al día siguiente en días naturales; analiza catálogo completo pese a filtros. No reprograma ni calcula ruta crítica. Ver VERIFICATION_PHASE7.md.

Fase 8 (0.8.0): simulación de fechas y aplicación transaccional desde Cronograma. Backend services/scheduler.py y api/schedule.py; frontend ScheduleSimulation. Conserva duraciones inclusivas, no adelanta, usa días naturales y dependencias fin-inicio. Huella ligada al proyecto/fecha/catálogo; rechazo ante cambios concurrentes. 58 pruebas backend y 13 frontend. Ver VERIFICATION_PHASE8.md para reglas, supuestos y pruebas. No reprogramar datos reales sin acción explícita del usuario.

Entrega 0.9.0: capacidad entre proyectos por vigencias, organigrama global people.leader_id/role (esquema 7, respaldo v6), comentarios append-only en audit_events con request_id idempotente, roadmap por arrastre y selector. 65 pruebas backend, 13 frontend y build correctos. docs/STATUS.md es la matriz vigente. Legacy conserva comentarios/jerarquías en original; aún no mapea esos campos operativos ni attachments. Datos reales .pohub pendientes.


## Revisión UX/UI 0.10.0 (master, esquema 7)

Alta rápida de seis campos → detalles progresivos. Código automático editable; tipos según metodología. Lista con chips y edición inline explícita; dependencias buscables y chips. Board operativo por defecto con filtros de nivel/tipo. Colores de estado compartidos con Gantt, catálogo y resumen. Gantt jerárquico, línea Hoy y detalle, conservando ScheduleSimulation. Equipo separado por personas disponibles/asignaciones/equipos compartidos/capacidad/organigrama; retirar asignación es archivar, no borrar persona. Documentos agrupa originales de proyecto y fuentes de cortes por hash, sin alterar BLOB ni snapshots; una carga repetida reutiliza el original. Controles compactos y formularios responsive de máximo dos columnas.

68 pruebas backend, 16 frontend y build correctos. Ver `docs/VERIFICATION_PHASE10.md` para decisiones, revisión visual y límites. No hay cambio de arquitectura ni esquema. No se sustituyó el estado actual por snapshots ni se modificaron publicaciones históricas. La migración real de fase 5 continúa pendiente de `.pohub`.

### Requisito registrado en fases 10–11

**Dashboard personalizable con widgets redimensionables y arrastrables, heredado del PMO anterior.** En fase 13 se implementó la cuadrícula para los ocho widgets del resumen actual. Los widgets adicionales de avance, riesgos, ruta crítica, equipo, presupuesto e hitos siguen registrados para posteriores incrementos; no omitirlos. El usuario autorizó implementar el dashboard en la continuación 13.

## Entrega anterior 2026-10-07: 0.11.0, esquema 8

Ficha de lectura display-to-edit; responsable/predecesores buscables; lista jerarquica; rol/dedicacion inline; usuario local elegido del catalogo. Agenda con duracion, estado, relacion, notas/documentos, movimiento confirmado y deshacer. Documentos con descripcion/autor y referencia a bytes de fuentes. Reporte dentro del workspace, Full Screen opcional y PDF/PNG proporcionales. 72 tests backend, 17 frontend y TypeScript/Vite correctos. Migracion normal: respaldo y 23 tablas con valores anteriores intactos.

Ver docs/VERIFICATION_PHASE11.md para alcance y comprobaciones visuales pendientes por bloqueo de la pestaña interna de error. Dashboard sigue pendiente: arrastrar, redimensionar, reordenar, ocultar/configurar tamaño; incluir estado general y proximos hitos. Drag/resize del Gantt pendiente. No dar por cerrada la migracion real .pohub ni la paridad legacy. Las secciones anteriores describen entregas historicas.

## Entrega base 2026-10-07: 0.12.0, esquema 9

ContextField: lectura sin borde, hover sutil, editor del valor; Enter/blur guarda si válido, Escape cancela, errores retienen borrador y guardado impide doble envío. Confirmación explícita para textarea, múltiples y archivo. Persona predictiva por nombre/correo/acentos: ocho resultados flotantes, iniciales y chips; no desplegar catálogo vacío. Proyecto, trabajo, backlog, roadmap y rol/dedicación usan el patrón común.

Agile muestra Sprint; Hybrid Iteración / Sprint; Waterfall Periodo. No renombrar campos internos ni datos existentes. Gantt tiene jerarquía contraíble y vínculos visibles; recibe fechas/holgura/ruta crítica de ScheduleSimulation, con estado simulado claramente indicado. No cambiar scheduler ni aplicar fechas sin acción explícita.

Estrategia PMO → ejecutivo: inventario previo en docs/EXECUTIVE_SOURCE_MAP.md. Desde PMO captura hechos/versiones en project_snapshot.pmo atómicamente; propone avance solo con cobertura completa de hojas operativas, media sin ponderar. No inventar planeado, baseline, semáforos, exposición o narrativa. La publicación conserva la captura del proyecto y evidencia; copiar cortes/importar sigue compatible. Reuniones con propose_executive proponen related_id sin duplicarlo ni copiar notas. Esquema 9 aditivo, respaldo automático v8.

75 pruebas backend, 21 frontend, TypeScript/Vite y revisión real de ocho pantallas correctos; detalles/límites en docs/VERIFICATION_PHASE12.md. El dashboard y la inspección real PDF/PNG se cerraron en fase 13. Baseline, decisiones estructuradas, migración real, paridad legacy, móvil completo y agenda semanal por arrastre siguen pendientes.

## Entrega histórica 2026-10-07: 0.13.0, esquema 9

Se conservaron y completaron los cambios locales anteriores, sin reiniciar arquitectura. Portafolio añade señales objetivas de atraso, vencidos, bloqueos, riesgos relevantes y desviación del último corte cuando hay cifras. Wizard Crear proyecto: identidad/metodología y prioridad/estado/fechas; solo nombre obligatorio.

Dashboard configurable: ocho widgets existentes, Lectura/Diseño, doce columnas, arrastre y resize por puntero, snap, mínimos, colisiones desplazadas hacia abajo, flechas/botones accesibles, ocultar/agregar/restaurar. Posición/tamaño/visibilidad en localStorage por usuario local + proyecto; useLocalPersonId notifica cambios de persona y separa sus preferencias. No es autenticación ni sincronización de cuenta.

Planificación: Tablero/Lista como vistas de Trabajo, mismo dataset/nivel/filtros. Filtros colapsables inicialmente ocultos con badge/limpiar/cerrar en las cuatro vistas. Columnas configurables (cuatro iniciales) y extremos colapsables; preferencias persistentes y contador de trabajo oculto. Agile: Sprints y releases; Waterfall: Cronograma primero y Fases y entregables con Phase/Deliverable/hitos reales, sin Sprint; Hybrid: Iteraciones y entregas con periodos y vista de entregables/hitos. Modelo iteration_id/release_id sin cambios; no convertir periodos automáticamente.

Gantt evoluciona con zoom día/semana/mes/trimestre, horizonte/ancho reales y ticks UTC; conserva Hoy, jerarquía, conexiones, avance, responsable, estado, prioridad, tooltip y propuesta/ruta crítica simulada. Sin cambios en scheduler, transacciones ni snapshots. Orden manual y drag/resize de barras pendientes; click abre ficha para modificar fechas explícitamente.

76 pruebas backend, 25 frontend y TypeScript/Vite correctos. Ocho pantallas revisadas en escritorio, con arrastre/resize/persistencia/cambio de persona reales y contenido por las tres metodologías. PDF A3 de una página renderizado con Poppler y PNG 3072 × 2146 inspeccionados. Ver docs/VERIFICATION_PHASE13.md para evidencia, límites y conservación de datos normales. No se declara cerrada la migración real ni la paridad legacy.
