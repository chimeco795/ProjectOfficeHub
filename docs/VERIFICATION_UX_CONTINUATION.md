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

## Consistencia UX/UI — Gestión y Planificación, 2026-10-14

Base master cf54f1c. Sólo contexto/estado/verificación vigente y código afectado; sin auditoría general. Arquitectura, versión 0.13.0, fase 13 y SQLite 12 conservados. No se alteraron snapshots, publicados, originales, scheduler ni permisos de acceso.

### Cambios

- Barras de filtros con input/select/botón de 36 px, label con separación de 6 px y checkbox centrado en la misma altura del control. Responsable predictivo incluye chips dentro de esa altura; el popup sólo aparece al buscar y permanece flotante. Valores editables de listas mantienen altura al abrir el editor; correos en una línea con tooltip.
- Sin títulos de sección repetidos dentro de Personas, Roles, Equipos, Organigrama, Lista/Tablero y paneles relacionados de RAID/Agenda/Documentos/Presupuesto. Se conservan nombres concretos de personas/equipos en sus fichas y subtítulos funcionales. Editar proyecto limitado a Vista general.
- Selector compartido Lista/Cards de iconos, tooltip y aria-pressed; Tablero/Lista con el mismo patrón compacto. Preferencias de catálogo por cuenta conservadas.
- Personas: nombre/correo y campos de asignaciones vigentes editables en celda mediante ContextField. Roles: nombre y reporta a; archivo permanece en acción explícita. Encabezados ordenables donde el dato es unívoco, filtro de asignación/estado y búsqueda. Varias asignaciones se editan por registro, sin combinar sus identidades. Trabajo conserva sus campos inline y añade avance (%); ordena entre hermanos, manteniendo padres antes de descendientes. Abrir la ficha sigue disponible desde ⋮ o desde el nombre del trabajo.
- Rol sin equipo: asignar persona al proyecto y elegir rol crea membership con team_id null. Equipo se añade posteriormente en la misma asignación; no crea otro Rol ni Persona. Desde organigrama, el rol elegido se ofrece explícitamente para una primera asignación. Opciones de vigencia/líder siguen progresivas.
- Multiequipo: TechLead y ancestros definidos en reports_to no requieren marcar allow_multiple_teams. Se reconocen espacios/guion/underscore en TechLead; no se presume que cualquier título Dirección/Manager pertenezca a ese rango. Roles inferiores/ramas ajenas mantienen excepción explícita. Añadir a otro equipo reutiliza un registro sin equipo cuando existe o usa el rol gestor vigente, y recuerda revisar la dedicación total. La regla profesional no cambia Admin/Gestor/Miembro/Consulta ni redistribuye dedicación automáticamente.
- Organigrama: sólo término Equipo, distintivos E1… y leyenda; Mostrar integrantes activado por defecto. Desactivarlo retira personas y conserva roles, equipos asignados/gestionados, jerarquía, filtro y colapsos.
- Modales: foco verde de 2 px hacia dentro, separación de encabezado/labels y campos compactos. Predecesores usa edición múltiple automática, sin botones Guardar/Cancelar: Enter finaliza, salida guarda, Escape descarta todo el borrador. Clic fuera también guarda después de quitar un chip enfocado; errores conservan el editor y la validación/versiones existentes.

### Pruebas y evidencia

`pytest backend/tests/test_management.py backend/tests/test_pmo.py backend/tests/test_gantt_resize.py backend/tests/test_auth.py -q`: **31/31**. Nueva prueba de rol sin equipo → mismo registro con equipo → TechLead/superior en varios equipos sin excepción; descendiente rechazado, desvincular equipo conserva rol y líder compartido. Se mantienen pruebas de versiones, scope, auditoría, migraciones, resize y acceso. Advertencia existente Starlette/httpx. No se reejecutó toda la suite: full 104 del checkpoint previo permanece como baseline histórica.

`npm test`: **31/31**, incluyendo dos casos nuevos de jerarquía multiequipo (ramas ajenas, padres ausentes, ciclos y archivados). TypeScript (`tsc -b`) y Vite correctos. Aviso de bundle >500 kB conservado. `git diff --check` correcto.

QA real exclusivo en .test-data/auth-browser, 8016, cuenta sintética. Dimensiones medidas: 1280×720/900, 1024×900 y 390×844; en esta pasada el override de viewport sí se aplicó, sin usar las capturas de autenticación como prueba nueva.

| Vista | Comprobación |
|---|---|
| Lista de trabajo | Cinco controles principales: height 36 e igual y=443.25 a 1280; cuatro en primera fila y Nivel/checkbox/acciones alineados en segunda a 1024. Móvil dos columnas de 133.5 px, sin overflow de página. Avance T-01 25→26→25, orden por avance conserva UX-US antes de UX-T. Valores/dependencias restaurados tras reload. |
| Personas | Correo sintético: Escape cancela, Enter guarda, blur restaura flujo@example.test; orden por correo, filtro y Lista/Cards. 1024: tabla puede desplazarse dentro del contenedor de 698 px, sin overflow de página. Barra final única, sin título repetido. Nueva persona QA eligió Analista QA con Sin equipo, después TechLead y equipo independiente. |
| Roles | Nombre Analista QA guardado con Enter y restaurado por blur; Escape cancela. Filtro Activos, orden, Cards y lista a 1024. Rol TechLead creado separado de persona/equipo, reporta a Dirección QA. |
| Equipos / Asignaciones | Dedicación Persona flujo UX 40→41→40 mediante blur/Enter. TechLead añadido a Equipo flujo UX y Equipo UX multiequipo sin pantalla de excepción; mismo rol, membresías distintas. 1024 sin overflow de página. |
| Organigrama | Integrantes activos por defecto, apagar deja roles y ambos equipos bajo TechLead sin nombres de personas. Dirección QA identificada como superior. Filtro Equipo y leyenda E1/E2; revisión 1280/1024, sin título repetido. |
| Detalle del trabajo | QA-DEP: añadir UX-MIN y Escape mantiene T-01; Enter guarda dos predecesores; añadir/quitar chip y clic fuera guarda; restaurado sólo T-01. Editor sin Guardar/Cancelar, popup vacío eliminado. Móvil: modal 374 px sin overflow horizontal, foco rgb(36,107,88) 2 px con offset -2. |
| Planificación | Tablero/Lista con selector compacto; no Editar proyecto. Cronograma conserva barras, dependencias y Hoy; Mes→Semana comprobado. Revisión visual, no nueva certificación de drag/ruta crítica. |

Capturas ignoradas por Git: .test-data/consistency-people.png, consistency-people-1024.png, consistency-roles-1024.png, consistency-team-1024.png, consistency-org-structure.png, consistency-org-1024.png, consistency-work-list.png, consistency-work-list-1024.png, consistency-work-list-mobile.png, consistency-predecessors.png y consistency-predecessors-mobile.png. Capturas intermedias documentan el flujo; la de Personas y Lista de trabajo corresponde al build final. Valores editados en fixtures anteriores restaurados; nuevas entidades de QA permanecen sólo en la base aislada, con auditoría.

### Aplicación normal y pendientes

Respaldo consistente .test-data/pre-consistency-normal-20261014.sqlite3 antes de reiniciar sólo 8011. Comparación posterior: las **36 tablas** coinciden con el respaldo (incluidas cuentas), integrity_check ok, foreign_key_check vacío, esquema 12. No migraciones ni fixtures en data/. Sesiones/cuentas existentes se preservan. No se intervino 8000 ni se recargó un formulario del usuario. App 8011 sirve dist nuevo; instancias antiguas distintas no se declaran actualizadas.

Conservados pendientes ajenos: exportación .pohub real, correo/extracción automáticos, agrupación/preview documental, paridad/widgets legacy, estrés y estabilidad de E1… ante altas/bajas/10+ equipos. Dedicación total se revisa manualmente; no se adapta por capacidad. Algunas columnas de relaciones múltiples se leen y abren ficha en lugar de editarlas ambiguamente. Orden local de encabezados no reescribe prioridad ni jerarquía. Móvil mediante viewport, sin certificar dispositivo táctil físico. Esta entrega cierra los ajustes solicitados, sin cerrar la paridad general.

## Consolidación UX y reglas explícitas — 2026-10-22

Base master 5027f0a. Prioridades solicitadas: Design System, ACL, propiedad de Rol, identidad de Equipo y documentación/tests. Versión 0.13.0/fase 13 sin cambios. **SQLite 13** es la necesidad técnica aditiva para campos nuevos; la autenticación real permanece en schema 12. No se reaudita todo el repo ni se sustituye arquitectura.

### COMPLETADO

- Patrones comunes: Dialog, ConfirmDialog/useConfirmation, ActionMenu, Toolbar, FeedbackState y useActionFeedback. ConfirmDialog sin icono decorativo, header/contenido/footer separados, título verbo+sustantivo sin pregunta, consecuencia breve, botones en fila y principal derecha repitiendo verbo. Se usa en cambios de cuenta que revocan sesiones y generación de enlace. Cancelar no aplica la acción.
- Todos los window.confirm de código frontend eliminados. Archivar/restaurar elemento, rol, equipo o asignación actúa directamente y ofrece toast/Deshacer con la versión devuelta. Conflictos no se pisan. Aviso disponible en top layer del diálogo activo; Agenda usa el mismo feedback y su modal de movimiento sin uso se retiró. Menús y toolbars flotantes/compartidos conservan los contratos de operación.
- ACL reutiliza project_people, sin tabla paralela. Admin/Gestor globales; Miembro/Consulta sólo proyectos donde participa su Persona. Sin vínculo o participación, portafolio vacío con explicación. Middleware comprueba cada lectura, incluyendo alias /cuts y /records/audit. Listados de proyectos/personas/roles/equipos y proyectos de una persona se filtran; capacidad excluye proyectos ocultos; migraciones/globales y original completo requieren gestión. Campos de liderazgo fuera del catálogo visible se ocultan y auditoría global de catálogos no se entrega a lectores restringidos.
- Escritura operativa de Miembro conservada en sus proyectos; Consulta sólo lectura PMO, con perfil/preferencias/contraseña propios. API sigue siendo autoridad. Autores de documentos escritos por Miembro se validan dentro de su catálogo visible. Cambiar participación repercute en la petición siguiente sin exigir nueva sesión.
- roles.manages_multiple_teams configurable desde listado/ficha/alta de Roles. La capacidad se hereda hacia superiores y se explica en UI; no concede permisos de seguridad. El nombre no participa en ejecución. Migración marca sólo TechLead previo para conservar comportamiento; roles nuevos con ese nombre no reciben capacidad por defecto.
- teams.code único/corto, color y shape persistidos; backfill EQn sólo una vez. Equipos permite editar identidad; TeamBadge/teamLabel reutilizados en organigrama, fichas, selectores, asignaciones y agrupaciones de planificación. Código+forma+nombre identifican sin depender sólo de color. Ordenar o renombrar no recalcula código/color/forma.
- README refleja autenticación de schema 12 y esquema vigente 13; ARCHITECTURE describe módulos actuales y separa historia. No se borró verification histórica. AI_CONTEXT distingue completado, pendiente y limitaciones.

### Pruebas

`pytest backend/tests -q`: **112/112**, suite completa, después del último ajuste de validación de autor. Incluye autenticación, permisos, scheduler/resize, migraciones previas, publicaciones, snapshots, originales, versiones y auditoría existentes. Nuevos casos: ACL Miembro/Consulta sobre dos proyectos, alias/descargas/scoped ID cruzado, catálogos/capacidad, retirada de participación con sesión vigente, lector sin Persona, Admin/Gestor globales, propiedad explícita sin inferencia de nombre, identidad estable/única/validada, migración idempotente con backup y conservación de todas las columnas anteriores. Advertencia Starlette/httpx existente.

`npm test`: **32/32**. Jerarquía por propiedad explícita (incluye nombre TechLead sin permiso), padres ausentes/ciclos/archivados e identidad no dependiente del orden/color. TypeScript (`tsc -b`) y Vite correctos; aviso previo de bundle >500 kB. `git diff --check` correcto.

QA exclusivo en .test-data/consolidation-browser-20261022, puerto 8017, cookie independiente pohub_consolidation_qa, copia del fixture sintético anterior. No se crearon cuentas ni entidades de prueba en data/.

| Vista/flujo | Evidencia |
|---|---|
| Login / Portafolio | Admin/Gestor ven 4 proyectos. Logout retira workspace; Miembro y Consulta vinculados a la misma Persona ven 2. No aparecen proyectos Agile/Cascada ajenos ni sus contadores. |
| Permisos | Enlace conocido a proyecto ajeno, abierto en nueva pestaña como Miembro, muestra error genérico y vuelve a portafolio autorizado. API rechaza datos/descargas/alias ajenos con 404. Consulta tiene Nuevo rol/Nuevo equipo y campos de gestión deshabilitados; menús de cuenta sin administración. |
| Confirmación | Guardar permisos de una cuenta QA abre Actualizar permisos, consecuencia, Cancelar/Actualizar; capturado y cancelado sin modificar la cuenta ni conceder acceso. |
| Deshacer | QA flujo contextual archivado desde su ficha sin confirmación; toast dentro de capa modal, Deshacer restaura Activo con versión nueva. |
| Roles | TechLead QA renombrado Coordinación QA conserva capacidad. Campo Multiequipo Sí→No→Sí se guarda explícitamente; Dirección QA muestra Heredado. Nombre sin efecto sobre la regla. |
| Equipos | Equipo QA pasa de EQ2 a código SRE, color rojo y hexágono mediante edición contextual. Esos valores aparecen en ficha y selectores después de guardar. |
| Organigrama | Mostrar integrantes apagado mantiene roles/equipos; SRE/hexágono/rojo y EQ1/círculo se reutilizan en leyenda, filtro y nodos. Coordinación QA conserva múltiples equipos tras renombrar. |

Capturas locales ignoradas: .test-data/consolidation-confirm.png, consolidation-undo.png, consolidation-member-portfolio.png, consolidation-denied-project.png y consolidation-org.png. Datos QA conservan sus cambios sintéticos y auditoría; no se confunden con base real. Revisión principal a viewport de escritorio 1280; no se certificó en esta entrega hardware táctil ni estrés de cientos de equipos.

### Migración normal

Respaldo consistente .test-data/pre-consolidation-normal-20261022.sqlite3, ensayo en .test-data/consolidation-normal-copy-20261022 y aplicación normal verificados. Comparación de **36 tablas**: todos los valores de columnas existentes coinciden; sólo campos nuevos y versión 13 añadidos, integrity_check ok y foreign_key_check vacío. Incluye originales BLOB, snapshots, publicaciones, cuentas y sesiones. Backup automático v12 conservado. No se modificó scheduler ni se hicieron pruebas sobre datos reales.

Normal 8011 iniciado con código nuevo. 8000 reservado no intervenido; no se atribuye la ACL nueva a procesos antiguos que sigan en memoria. No se introducen contraseñas ni se elige una Persona para cuentas reales.

### PENDIENTE / LIMITACIONES

Fuera de este alcance: exportación real .pohub, proveedor de correo/extracción, preview/agrupación documental, widgets/paridad legacy y SSO/MFA si se solicitan. Sin promesas de envío de correo. La ACL es por proyecto, no por campo o documento individual del proyecto autorizado. Personas/equipos compartidos y roles relacionados/ancestros se muestran dentro de ese alcance; no existe un catálogo ACL duplicado. El propietario del archivo SQLite conserva acceso de sistema operativo.

La capacidad multiequipo hereda hacia superiores; desactivarla en un superior no anula una capacidad heredada desde un subordinado, que se muestra como Heredado. Código de equipo estable al ordenar, pero editable por gestión; no es etiqueta histórica inmutable. Dedicación no se redistribuye automáticamente. Preferencias de diseño siguen locales por cuenta y catálogo Lista/Cards en servidor. Algunos secundarios operativos heredados pueden seguir visibles para lectores antes del rechazo de API; ninguna acción elude permisos. Backend bloquea fuera del alcance aunque se fuerce un URL o llamada. Arrastres físicos y móvil completo no recertificados por esta pasada; sus verificaciones anteriores permanecen históricas.
