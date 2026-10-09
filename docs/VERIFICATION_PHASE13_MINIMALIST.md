# UX minimalista transversal — cierre 2026-10-09

Solicitud a9cae9bb-beb4-40b7-b73b-7d4bb8765253, aplicada sobre master 2522e6f. Versión 0.13.0, fase oficial 13 y SQLite 11 conservados. No se rehizo el scheduler ni Seguimiento Ejecutivo.

## COMPLETADO

- Columnas: checklist compacto, límite 1–4, persistencia por persona/proyecto, drag de encabezados y menú ⋮ para mover/ocultar. Sin flechas permanentes. Nuevo trabajo dentro de Nuevo; columnas colapsadas de 44 px con texto y acciones dentro del encabezado.
- Lectura y edición: feedback discreto de guardado; selects contextuales guardan al seleccionar. Autocomplete flotante con posición y altura limitadas al viewport. Menús ⋮ flotan también dentro de diálogos nativos.
- Persona: alta Nombre/Correo seguida de ficha; datos opcionales progresivos y edición contextual. Equipo: alta Nombre seguida de miembros; persona existente, rol independiente, dedicación, líder y vigencia. El alta de asignación permite definir el rol después, sin inventar un rol ni duplicar una asignación vigente sin equipo. La excepción multiequipo sigue siendo explícita y validada en backend.
- Rol: Nombre y Reporta a; ficha contextual y archivo/restauración en ⋮. Organigrama compacto, seleccionar nodo muestra información contextual; conserva jerarquía, zoom, contraer/expandir y añade pan.
- Trabajo: alta rápida conservada y ficha ancha con menos cajas/bordes; grupos abiertos, búsqueda de Sprint/predecesores y adjuntos. Acción de cálculo de avance en ⋮.
- RAID/Hitos: ficha contextual con guardado por campo, código editable y archivo en ⋮. Los formularios de conciliación y propuestas ejecutivas conservan su confirmación explícita.
- Agenda: filtros colapsables, ficha contextual y movimiento validado con aviso/Deshacer. Tooltip legible y acotado; el selector de minuta ya no desborda el ancho móvil. Documentos conserva descripción/autor/relaciones contextuales y añade filtros colapsables.
- Gantt: handles discretos para inicio/fin, interacción por puntero y teclado. Validación transaccional de rango, dependencias, estado y huella del catálogo antes de aplicar; auditoría y rechazo de propuestas obsoletas. Movimiento válido directo con Deshacer; diálogo únicamente al encontrar conflictos. Orden vertical por puntero entre hermanos, persistente localmente y con Deshacer, sin modificar prioridad. Zoom y simulación existentes conservados; controles secundarios en ⋮.
- Dashboard: movimiento y resize muestran aviso con Deshacer. Widgets estrechos muestran dos compromisos completos y acceso al plan; el tamaño grande conserva tres. Sin scroll interno añadido para resolver el layout.

## Pruebas y recorridos comprobados

- Backend completo: **89 passed**. Nuevas pruebas: resize válido/rechazado, dependencias incidentes, aislamiento, rango inválido, huella obsoleta, deshacer, prioridad, snapshot publicado, estado terminado y rollback de auditoría; asignación progresiva sin rol y actualización posterior.
- Frontend completo: **29 passed**. TypeScript y Vite build correctos. `git diff --check` sin errores al cerrar. Única advertencia backend: deprecación existente del TestClient Starlette/httpx.
- Servidor QA 8015 con base separada `.test-data/phase5-browser`, proyecto f5eb9167-c242-46b1-afc4-eef6e3208c7e. Todas las altas/cambios de estos recorridos son sintéticos.

| Recorrido | Comprobación real en navegador |
|---|---|
| A/B Persona → Proyecto → Equipo → Rol | Persona flujo UX / flujo@example.test, teléfono 5550001111; asignada al proyecto, Equipo flujo UX, Analista QA, 40%, líder Líder QA. Equipo creado sólo con nombre; ficha y autocomplete de miembro revisados. Rol QA flujo contextual creado con Reporta a Dirección QA. |
| C Trabajo → Sprint → Dependencia → Board → Gantt | UX-MIN creado con alta rápida; inicio 24 oct/fin 30 oct, Iteración QA, predecesor T-01; estado En ejecución desde el tablero. Barra arrastrada a 26 oct/1 nov y deshecha. Handle derecho arrastrado a 1 nov manteniendo inicio 24 oct y deshecho. Inicio arrastrado al 19 oct rechazado por predecesor que finaliza el 20; fechas originales conservadas. Resize de un día por teclado también guardado/deshecho. |
| Orden de columnas/filas | En ejecución arrastrada antes de Preparado; aviso y Deshacer restauraron el orden. Menú mover derecha también comprobado. UX13-ENT arrastrado antes de UX-MIN en Gantt; Deshacer restauró orden y prioridad Media permaneció igual. |
| D Evento → invitados → trabajo → calendario → minuta | Evento flujo minimalista con Persona flujo UX, organizador local, descripción y vínculo UX-MIN. Arrastrado de 8 oct 09:00 a 9 oct 10:00 y deshecho; duración 60, invitado y relación conservados. Minuta TXT original adjuntada desde Agenda. |
| E Documento → descripción → relaciones → acceso | minimalist-minute.txt subido mediante el adjunto de minuta; descripción contextual actualizada. Relaciones simultáneas Evento / UX-MIN / Corte 6 oct guardadas. Mismo original disponible desde Agenda, ficha UX-MIN y Trazabilidad del corte, además de la biblioteca. No se repitió una segunda carga del mismo archivo desde el botón Cargar documento. |
| RAID | UX-R sintético creado; Impacto guardado inline como Medio y ficha permaneció abierta. No se alteraron registros de cortes. |
| Dashboard | Lectura/Diseño; widget Atención reducido a 4×5 y ampliado a 12×6 en 1024 px. Movimiento por puntero y Deshacer comprobados, sin colisiones; restaurado el diseño QA. |

## Revisión visual

Revisión en navegador real con viewports 1280×800, 1024×800 y 390×844. Incluye filtros abiertos/cerrados, checklist de columnas, colapso/expansión, menús ⋮, fichas y autocomplete, widgets en lectura/diseño, organigrama y zoom del Gantt. No se declara una certificación de todos los navegadores o dispositivos físicos.

- 1280/1024: Board, ficha de trabajo, Persona/Equipo, organigrama contraído/expandido, Dashboard pequeño/grande, Agenda y biblioteca revisados. Ancho de documento 1265/1009 px respectivamente, dentro del viewport, en las mediciones efectuadas.
- Móvil: navegación, Board, ficha de trabajo/autocomplete, Persona, Equipo/rol, Gantt y Agenda comprobados. También ficha/filtros de Documentos, dashboard y organigrama. Menú de columna 220 px dentro del viewport; encabezado colapsado 28 px dentro de columna 44 px. Selector de minuta corregido de 368 a 305 px; página de Agenda vuelve a 375 px dentro de viewport 390.
- Gantt: Semana/Mes en escritorio y Día en móvil. El timeline es contenido inherentemente desplazable; su ancho puede superar el contenedor sin desbordar la página. Zoom/pan del organigrama móvil comprobado: scrollLeft 0 → 185 con ancho 305 y canvas 547, página 375 px.
- Se corrigieron los estilos de sidebar que se filtraban al detalle del organigrama y al tooltip de Agenda. El primero ocupa 911 px con color legible/posición normal en 1280; el tooltip final mide 320×158, flota dentro del viewport y no requiere scroll.
- Evidencias locales ignoradas por Git: `.test-data/minimalist-board-1280.png`, `minimalist-board-1024.png`, `minimalist-work-1280.png`. El viewport temporal se restableció al terminar.

## Conservación de datos normales

Copia previa `.test-data/pre-minimalist-normal.sqlite3`, creada con SQLite backup desde conexión de sólo lectura. Se reinició únicamente el servidor 8011 para activar el backend actualizado; el servicio ajeno en 8000 no se tocó. Tras arrancar, **las 31 tablas contienen exactamente los mismos valores**, integrity_check `ok`, foreign_key_check vacío y health 200. Sin migración, sin insertar ejemplos en `data/`, sin cambios en fuentes, snapshots o publicaciones. Aplicación normal disponible en http://127.0.0.1:8011/.

## PENDIENTE

Fuera de este incremento: exportación real .pohub (el usuario todavía no la tiene), proveedor de extracción automática de minutas, paridad legacy completa y widgets adicionales del PMO original. El arrastre de periodos ya existente y escenarios con cientos de conexiones no se recertificaron en esta pasada.

## LIMITACIONES

Preferencias de columnas, orden y widgets son locales al navegador/persona/proyecto. Las fechas usan días naturales; ausencias/capacidad contextualizan sin modificar el scheduler. Deshacer una modificación de datos puede rechazarse si el catálogo cambió; no sobreescribe concurrencia. La revisión móvil usa viewport de navegador, sin certificar gestos de hardware táctil. La selección del archivo mediante automatización del navegador tardó excesivamente, aunque la carga y los vínculos finales se comprobaron. Minutas/propuestas siguen requiriendo revisión humana; no hay proveedor IA configurado. No se declara paridad total ni migración real cerrada.
