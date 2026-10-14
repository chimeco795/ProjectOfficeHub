# Continuación UX — solicitud del 2026-10-08

Conserva el histórico de las tres etapas y, al final, la verificación vigente del refinamiento puntual del 2026-10-09. La pasada minimalista previa, incluyendo resize del Gantt y evidencia de arrastre semanal/orden/móvil, está en [VERIFICATION_PHASE13_MINIMALIST.md](VERIFICATION_PHASE13_MINIMALIST.md).

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
# Cierre de las tres etapas — 2026-10-08

Implementación concluida sin renumerar la fase oficial 13 ni la versión 0.13.0. Esquema SQLite 11. Backend: 86 pruebas correctas; frontend: 29 pruebas correctas; TypeScript y Vite correctos. Advertencia heredada de Starlette/TestClient sobre httpx, sin fallos.

Minutas TXT/DOCX conservan los bytes originales, fecha y participantes. Propuestas manuales pendientes requieren revisión humana explícita: vincular trabajo existente, crear trabajo/RAID con validación transaccional, registrar decisión o ignorar. Se comprobaron aislamiento, conflicto de código con rollback, versiones, originales DOCX referenciados a fuentes, candidaturas y conservación de publicados. /minute-contract prepara una extensión futura: no hay extracción automática ni IA externa conectada. Matriz de suficiencia completa en EXECUTIVE_SUFFICIENCY.md.

QA visual sobre .test-data/phase5-browser: minuta TXT cargada, propuesta vinculada y aceptada contra UX13-ENT sin crear duplicado; biblioteca muestra un original con vínculos a evento, trabajo y corte. La ficha del trabajo y la trazabilidad del corte de 06 oct muestran el mismo adjunto. Minutas ocupan un bloque de ancho completo bajo la agenda, con aceptación y vínculo visibles en .test-data/ux-continuation-minutes.jpg. Ficha compactada de 1406 a 994 px de contenido, con tres columnas y sin acordeones grandes; icono del adjunto ya no invade el estado. Organigrama comprobado con rol/persona/asignación, contraer/expandir y zoom. Todas estas escrituras son exclusivamente sintéticas.

La base normal se respaldó antes de actualizar y se ensayó la migración en una copia. Tras iniciar la aplicación actualizada en 8011, comparación de todas las columnas originales de 23 tablas: valores idénticos, esquema 11, foreign_key_check vacío e integrity_check ok. No se insertaron ejemplos en data/, ni se alteraron fechas de trabajo, snapshots, fuentes o históricos. Respaldos y evidencias en .test-data/ están ignorados por Git.

Límites explícitos: resize de duración del Gantt permitido como pendiente; arrastres HTML5 semanal, de periodos y orden de filas no certificados visualmente. El arrastre horizontal del Gantt sí se validó y restauró. Ausencias/horarios contextualizan disponibilidad sin cambiar el scheduler. Recordatorios locales requieren agenda abierta. La narrativa ejecutiva permanece revisable/manual; el contrato futuro no es un proveedor activo. Móvil completo, exportación real .pohub y paridad total legacy no se declaran cerrados.

## Refinamiento UX puntual — 2026-10-09

Base master 8c512d9. Versión 0.13.0, fase oficial 13 y SQLite 11 conservados. Esta sección es el estado vigente; los checkpoints anteriores permanecen históricos. Sólo frontend y documentación: sin cambios de arquitectura, contratos, scheduler, backend, migraciones, publicaciones u originales.

### Cambios

- Tablero: flechas centradas en la franja colapsada y orientadas por extremo. Clic en cabecera o zona amplia expande; flecha y zona amplia son botones accesibles. Columna reordenada que sigue colapsada conserva su acceso a expansión. Configuración flotante de 1–4 columnas; casillas en línea cuando hay espacio, con ajuste al ancho del área de trabajo. Se elimina “Cerrar columnas”; Columnas, clic fuera y Escape cierran, y scroll/resize evitan dejar el popover desanclado. Se mantienen las claves de preferencias, contador, drag/drop y Tablero/Lista.
- Gantt: identidad fija con sticky y fondo que cubre toda la altura de cada fila; fechas, barras y conexiones se desplazan detrás de esa columna. Una sola estructura conserva la sincronización vertical. La rueda vertical no se convierte automáticamente en movimiento horizontal; pan del fondo, flechas, scroll horizontal nativo y trackpad permanecen. Ancho fijo 230 px en escritorio y 160 px en móvil; conexiones adaptadas a esa medida. Se conservan los handlers de mover/resize, zoom, jerarquía, Hoy y simulación/ruta crítica.
- RAID/hitos: Tipo, Buscar y Archivados tienen separación explícita; label e input de búsqueda se separan 8 px. Lista por defecto y selector Cards. Filas/cards completas abren la misma ficha contextual; sin botón Editar permanente. Cards de menor altura y ancho, con respuesta limitada a dos líneas.
- Personas: “Ver persona y asignación” abre directamente proyecto/equipo/rol/dedicación. Una persona no asignada comienza por “Asignar a este proyecto”; luego elige un equipo existente y un rol del catálogo. Contacto, vigencia y líder se despliegan bajo demanda. Sin crear roles dentro del alta de personas.
- Equipos: comparte AssignmentFields con Personas; mantiene las mismas llamadas y validaciones de memberships. Equipo, rol y dedicación se editan por separado; vigencia/líder/excepción multiequipo quedan bajo un único desplegable. Añadir persona y ⋮ se alinean a la derecha, con ficha de equipo compacta.
- Personas, roles, equipos, project_people y memberships continúan siendo entidades distintas. Las asignaciones existentes se editan en su registro, incluyendo las que aún no tienen equipo. Las vencidas se muestran como anteriores en lectura; no se convierten automáticamente en una nueva asignación.

### Comprobaciones

- `npm test`: 29/29 frontend correctas, incluyendo límites/preferencias de columnas, jerarquía, orden visual, fechas/zoom, precedencias y búsqueda predictiva.
- `npm run build`: TypeScript (`tsc -b`) y Vite correctos. Continúa el aviso de bundle principal superior a 500 kB; no se cambió la arquitectura para corregirlo.
- Backend no reejecutado: no se modificó código/lógica del backend. Baseline anterior: 89 pruebas correctas.
- `git diff --check` correcto.

Revisión real en QA 8015, base sintética .test-data/phase5-browser:

| Vista | Evidencia de interacción |
|---|---|
| Tablero | Límites: último checkbox seleccionado deshabilitado y quinto no disponible. Ocho checks en una línea a 1280/1024; se ajustan en móvil. Cierre por botón y clic fuera; expansión desde zona amplia y cabecera. Preferencias conservadas tras reload. UX-MIN arrastrado de En ejecución a Preparado y restaurado con Deshacer; estado comprobado también en Lista. Reordenación por cabecera expandida y restauración comprobadas. |
| Gantt | Día/Semana/Mes/Trimestre, contraer/expandir UX-E con descendientes, dependencias visibles y simulación con ruta crítica sin aplicar. En escritorio, desplazamiento 320 px: nombre permanece en x=309 y el track pasa x=554 → 234; ambas celdas comparten y=154. Arrastre de UX13-ENT +2 días y Deshacer; fin +1 día por teclado y Deshacer. Fechas restauradas 2026-10-07 → 2026-11-01. En móvil: nombre x=51 antes/después de scroll 160 px, ancho 160 px y cero desbordamiento horizontal de página. |
| RAID/hitos | Lista inicial, búsqueda UX-R, filtro Archivados y selección Hitos vacía sin errores. Cards compactas de UX-R; clic abre ficha existente con opciones secundarias ⋮. En móvil la búsqueda conserva gap 8 px y no hay desbordamiento horizontal. |
| Personas | Rol Analista QA → QA flujo contextual → Analista QA, dedicación 40 → 45 → 40, persistidos en la misma asignación de Validación fase 5. Selector flotante dentro de viewport 390; ficha a 1024 sin overflow horizontal. |
| Equipos / Asignaciones | Los mismos valores guardados desde Personas aparecen en Equipo flujo UX. Edición compartida de vigencia, campos principales compactos y opciones desplegables. Equipo compartido vinculado a Proyecto paralelo QA mediante el flujo existente. |
| Roles | Catálogo independiente, jerarquía y ficha de Analista QA; archivo permanece en ⋮. No se creó ni convirtió un rol para la prueba. |

Flujo completo adicional desde una persona global existente **sin asignar** a Proyecto paralelo QA: asignar proyecto → vincular equipo compartido desde Equipos → elegir equipo desde Personas → rol Analista QA → dedicación 20% → vigencia 2026-10-09 a 2026-10-31 → líder Persona QA capacidad. Recarga confirma todos los valores. No se crearon personas, roles ni equipos duplicados.

Prueba de vigencia en esa asignación sintética: fechas temporales 2026-10-01 a 2026-10-08; Personas muestra “Asignaciones anteriores · 1” con equipo, rol y porcentaje en lectura y ofrece iniciar una asignación actual, sin crearla automáticamente. Se restauraron las fechas 2026-10-09 a 2026-10-31 desde Equipos. La asignación original de Validación fase 5 conserva 40%, su líder y rol.

Evidencia local ignorada por Git: .test-data/ux-continuation-board.png, ux-continuation-gantt-fixed.png, ux-continuation-gantt-mobile.png, ux-continuation-raid-list.png, ux-continuation-raid-cards.png, ux-continuation-person-assignment.png, ux-continuation-teams.png y ux-continuation-roles.png.

No se insertaron fixtures ni se realizaron escrituras de prueba en data/. No se reinició ni modificó el backend normal; 8011 sirve el nuevo dist. No se editaron cortes publicados, fuentes ni originales. El respaldo y la comparación de 31 tablas documentados en el checkpoint minimalista corresponden a esa entrega anterior.

### Pendientes y límites conservados

- Reordenación desde la cabecera colapsada estrecha no recertificada mediante el navegador de QA; sí desde cabecera expandida y menú ⋮. Para reordenar puede expandirse la columna o usarse el menú.
- Vista Hitos comprobada con selección vacía; no se fabricó un hito nuevo para la revisión.
- Prueba móvil mediante viewport; no certifica dispositivos táctiles físicos. Nombres largos y filas profundas pueden truncarse; ficha y tooltip conservan el detalle.
- Continúan abiertos exportación real .pohub, proveedor de extracción automática, widgets/paridad legacy y pruebas de estrés/arrastre de periodos anteriores. No se renumeran fases para estos pendientes.


## Checkpoint parcial — catálogos y operación, 2026-10-12

Solicitud nueva sobre master cad52e3. Versión 0.13.0, fase 13, SQLite 11. No se ha completado el incremento completo; el acceso real sigue pendiente.

COMPLETADO: Lista/Cards reutilizable y preferencia por persona local en RAID/Personas/Roles/Documentos/Portafolio (Cards por defecto sólo Portafolio). RAID elimina Responsables, muestra ocho columnas, ordena y permite edición contextual de estado/prioridad/responsable/objetivo con versión. Personas y Roles muestran asignaciones vigentes del proyecto, sin duplicar entidades; ficha de persona comienza por nombre/correo y conserva asignación y contacto progresivo. Cards abren ficha, ⋮ contiene secundarios. Organigrama usa color/forma/Cn/nombre, leyenda/filtro y asignación desde rol vacío; reutiliza persona y membership o permite alta separada. Agenda concentra sus controles en una barra que se ajusta al ancho. Documentos comparte dataset/filtros entre Lista/Cards, agrupa por proyecto/tipo/fecha y filtra por relación; ficha, relaciones y descarga existentes se conservan; fuente ejecutiva abre en lectura.

Comprobaciones actuales en QA 8015, datos sintéticos:

| Vista | Evidencia |
|---|---|
| RAID | Tabla de ocho columnas a 1280; prioridad UX-R Media→Alta→Media por inline, recarga confirma restauración. Sin bloque Responsables. |
| Personas | Lista a 1280/1024; tabla 713 px a viewport 1024, sin overflow de página. Ficha nombre/correo antes de asignación. Cards y preferencia tras reload comprobadas a 1280. |
| Roles | Lista inicial a 1280 y Cards con persona/equipo/jerarquía. Nuevo rol permanece independiente. |
| Organigrama | Filtro/leyenda C1 a 1024; + Asignar persona abre buscador y asignación existente. Analista QA→QA flujo contextual→Analista QA persistidos en la misma asignación, dedicación 40% conservada. No se crearon personas/equipos/roles ni nuevas memberships para esta prueba. |
| Agenda | Barra a 1280/1024, controles de calendario Mes/Semana/Día conservados. Arrastres y recordatorios no recertificados en este checkpoint. |
| Documentos | Lista a 1280, Cards a 1024; defecto de icono absoluto corregido y chips compactados. Un original muestra evento/trabajo/corte. Ficha TXT editable y fuente Word en lectura con descarga. No se subieron ni modificaron originales. |
| Portafolio | Cards predeterminadas y Lista con mismos cuatro proyectos QA a 1024; selección abre el proyecto. |

29 tests frontend correctos; TypeScript/Vite correctos (advertencia de bundle >500 kB conservada). Backend no modificado ni reejecutado; baseline previo 89 tests. git diff --check correcto. Cambios de prueba exclusivamente en QA, restaurados valores de prioridad y rol; su auditoría queda conservada. App normal 8011 sirve dist actual sin migración/reinicio/backend modificado.

Evidencia local ignorada: .test-data/catalog-people-1024.png y catalog-documents-1024.png. Las imágenes se capturaron después de recargar y verificar el contenido; no reutilizar las de la entrega anterior como pruebas del incremento nuevo.

PENDIENTE: autenticación real y validación Login/Logout/expiración/permisos; vincular preferencias a cuentas; SMTP o mecanismo real de recuperación (pregunta abierta, sin envíos ficticios); agrupación documental por evento/trabajo/RAID/corte y preview seguro; inline/orden/filtros adicionales en Personas/Roles; secundarios en ⋮ a anchos reducidos; células persistentes al cambiar el catálogo, hover y prueba de más de diez equipos; completar ambas vistas de cada área a 1280/1024, flujo de alta desde organigrama y full suites al cierre. El filtro del organigrama conserva la jerarquía completa y filtra personas; Cn se deriva de la lista actual de equipos ordenada por ID. No certificar estabilidad de etiquetas ante altas/bajas ni estrés.

LIMITACIONES: preferencia de navegador por persona local, sin autenticación; contactos extra bajo desplegable; tabla ancha puede desplazarse dentro de su contenedor. No se cambió arquitectura, scheduler, histórico, snapshots, originales o schema. Siguen abiertos .pohub real, extracción automática, widgets/paridad legacy y límites anteriores.


## Autenticación real — entrega del 2026-10-14

Base master 8c39910. Prioridad autorizada por el usuario. Se conserva versión 0.13.0/fase 13; migración SQLite 11→12 aditiva para acceso. El incremento UX restante no se declara cerrado.

### Completado

- Cuenta de acceso (correo/nombre/hash/estado/permiso/person_id opcional/preferencias/versión) independiente de Persona PMO y de roles profesionales. Crear cuenta no crea Persona, Rol, Equipo ni Asignación. Primer Admin mediante pantalla local, sin contraseña predeterminada.
- Sesiones opacas aleatorias, persistidas como hash, cookie HttpOnly/SameSite Strict; Secure cuando el transporte es HTTPS. Local actual usa HTTP exclusivamente en loopback. CSRF ligado a sesión, origen estricto en escrituras, límites persistentes de intentos, respuestas neutrales y errores de validación que no devuelven contraseñas.
- Todas las APIs de datos y descargas protegidas; health/status/login/bootstrap/recover/reset son las excepciones públicas. Logout invalida la sesión y desmonta el estado del workspace. Reautenticación tras caducidad recupera proyecto/vista cuando hay contexto. Respuestas antiguas se comparan con la sesión que las originó antes de modificar identidad.
- Normal: 30 minutos de inactividad y máximo 12 horas, cookie de sesión. Recordarme: 7 días de inactividad y máximo 30 días, cookie persistente. El frontend comprueba el vencimiento por intervalo, evitando overflow de setTimeout con treinta días; la autoridad final es el backend.
- Admin administra cuentas y PMO. Gestor administra PMO, sin administrar cuentas. Miembro escribe trabajo/eventos/documentos/comentarios en proyectos de su Persona vinculada. Consulta sólo lee datos PMO; puede cambiar su propio perfil/contraseña/preferencias. Las lecturas del PMO son compartidas entre usuarios autenticados: no hay ACL de lectura por proyecto en esta entrega.
- Cambiar permiso/estado/vínculo revoca sesiones de la cuenta afectada; cambio/restablecimiento de contraseña revoca las demás/todas, respectivamente. No se permite retirar el último Admin activo. No existe borrado físico de cuentas desde esta interfaz.
- Menú en cabecera con nombre/avatar, perfil, preferencias, contraseña, cuentas para Admin y logout. Lista/Cards se guarda en cuenta y se separa entre usuarios. Diseño/orden/columnas permanecen en navegador por cuenta; se conserva una copia inicial de la preferencia histórica de su persona vinculada cuando falta el nuevo valor. Persona por defecto de agenda/documentos/minutas deriva del vínculo explícito, no de un selector libre de identidad.
- Recuperación: enlace Admin de un solo uso, 30 minutos, token guardado como hash y fragmento URL; sin login automático después del reset. Propietario local puede emitir el enlace mediante recover_account.py. /recover usa “Si existe una cuenta asociada, recibirás instrucciones” y explica que no está configurado el envío automático. No se enviaron mensajes ni se fingió email.

### Comprobaciones

`pytest backend/tests -q`: **104/104**, incluyendo los 89 originales autenticados con un Admin de prueba a través de los endpoints reales y 15 casos nuevos de acceso. Se conservaron las garantías de migraciones anteriores, publicados, snapshots, originales, scheduler, versiones y auditoría. Tests de acceso cubren API sin sesión, bootstrap único/local, ausencia de Personas ficticias, hash/no exposición de contraseña, cookies/CSRF/origen, rotación/Recordarme/logout/idle/expiry, credenciales neutrales y rate limit, tres permisos inferiores, proyectos propios/ajenos para escritura, perfil/preferencias aislados, revocación, último Admin, reset vencido/single-use/propietario local y descargas. Cookie alternativa probada contra interferencia entre instancias. Advertencia previa de Starlette/httpx, sin fallos.

`npm test`: **29/29**; TypeScript y Vite correctos. Se mantiene el aviso de bundle >500 kB; no se cambió arquitectura para eliminarlo. git diff --check correcto.

Revisión real con fixture aislado .test-data/auth-browser y servidor 8016:

| Flujo | Evidencia |
|---|---|
| Login / Recordarme | Login con cuenta sintética → Portafolio; Recordarme permanece tras recarga sin caducidad inmediata. |
| Perfil / cuentas | Cuenta Administrador QA distinta de Persona flujo UX; vínculo visible/opcional; cuatro permisos y gestión de cuentas sólo en menú Admin. Formularios de contraseña revisados vacíos, sin introducir nuevas credenciales mediante navegador. Cambios/reset completos probados en backend. |
| Preferencias | Personas Cards guardado desde preferencias y recuperado después de reload. Consulta tiene defaults propios. |
| Consulta | Crear proyecto/nuevo elemento y ContextFields de edición deshabilitados; filtro RAID/Hitos permanece funcional. Menu sin cuentas y backend rechaza operaciones privilegiadas. Acciones heredadas adicionales pueden seguir apareciendo, pero no eluden la autorización del servidor. |
| Caducidad | Sesiones Admin vencidas mediante fixture exclusivo QA; siguiente operación muestra Login, retira los datos y reingreso vuelve a Personas del mismo proyecto. |
| PMO existente | RAID UX-R Media→Alta→Media con Admin, guardado/recarga y controles busy sin perder la ficha; sólo datos sintéticos y auditoría de la prueba. |
| Logout / recuperación | Logout retira workspace y muestra Login; solicitud de recuperación devuelve texto neutral con limitación de correo, sin envío externo. |

Dimensiones **medidas**, no supuestas: configuración inicial normal a 1280×900 y 1024×900, sin overflow horizontal. Las superficies de QA navegadas por la herramienta mantuvieron 1280×720 aunque se solicitó override de 1024; por ello no se certifican sus diálogos/Portafolio a 1024 en esta entrega. Esa revisión, junto con la matriz UX restante, queda pendiente. Evidencia .test-data/auth-setup-1280.png, auth-setup-1024.png y auth-password-1280.png, ignorada por Git; no citar la captura provisional mal nombrada como prueba de 1024.

### Migración y aplicación normal

Respaldo consistente del SQLite en ejecución: .test-data/pre-auth-normal-20261014.sqlite3. Ensayo en .test-data/auth-normal-copy: 31 tablas originales con mismos valores, schema_version añade 12; integridad ok y sin errores FK, sin cuentas creadas. Después de detener sólo el proceso normal 8011 se tomó pre-auth-normal-stopped-20261014.sqlite3 y se reinició 8011 con el backend nuevo. Comparación post-migración contra ese último respaldo: todos los valores anteriores conservados, integridad/FK correctas y cero cuentas de prueba en data/. No se modificaron publicaciones, originales, fechas de trabajo ni catálogos reales. La configuración inicial del usuario está disponible; su primera contraseña debe introducirla personalmente. No se intervino el proceso reservado 8000 ni se declara actualizado ningún proceso antiguo que aún esté en memoria.

### Operación y límites

1. Abrir http://127.0.0.1:8011/ y crear el primer Admin (nombre/correo/frase de al menos 12 caracteres/confirmación).
2. Menú de usuario → Cuentas y permisos: crear cuentas o vincularlas a una Persona existente. Guardar permisos/vínculo cierra sesiones de esa cuenta; volver a ingresar.
3. Recuperación con Admin: generar enlace temporal desde ⋮ de la cuenta y entregarlo únicamente al titular; el titular introduce la nueva contraseña.
4. Si se pierde la única cuenta Admin y no hay otra sesión, propietario local: desde backend ejecutar `..\.venv\Scripts\python.exe -m app.recover_account --email correo@ejemplo.com`. Se imprime un enlace local de 30 minutos, no una contraseña. Este comando requiere el acceso del propietario al archivo SQLite, fuera del límite de seguridad web.

`PMO_SESSION_COOKIE` permite separar cookies en entornos de prueba que comparten host; QA usa pohub_auth_qa y normal el nombre predeterminado. App instalada es local, sin TLS/SSO/MFA ni transportador de email. No se afirma proteger el archivo SQLite frente a usuarios del sistema operativo con acceso al archivo. Auth está aislado en un módulo/router y las cuentas tienen IDs independientes para una futura integración Entra ID; no hay integración activa.

Diseño de hash/sesiones/CSRF/recuperación contrastado con [OWASP Password Storage](https://cheatsheetseries.owasp.org/cheatsheets/Password_Storage_Cheat_Sheet.html), [Session Management](https://cheatsheetseries.owasp.org/cheatsheets/Session_Management_Cheat_Sheet.html), [CSRF Prevention](https://cheatsheetseries.owasp.org/cheatsheets/Cross-Site_Request_Forgery_Prevention_Cheat_Sheet.html) y [Forgot Password](https://cheatsheetseries.owasp.org/cheatsheets/Forgot_Password_Cheat_Sheet.html).

PENDIENTES CONSERVADOS: integrar un proveedor para correo automático, SSO/MFA si se solicitan, refinamiento de controles heredados según permiso, matriz UX completa a 1024, agrupación documental por relación/preview, células 10+/persistencia/hover, filtros/inline restantes, .pohub real, extracción de minutas y widgets/paridad legacy. Esta entrega cierra la prioridad de autenticación, no esos pendientes.

Cierre de acceso: navegación al fragmento de recuperación en una pestaña abierta muestra el formulario vacío y permite volver al login sin reutilizar campos. Backend verifica que restablecer una cuenta también cierre la sesión del navegador cuando pertenecía a otra cuenta. Miembro puede previsualizar/aplicar fechas de trabajos de sus proyectos; la simulación global conserva permisos de gestión.
