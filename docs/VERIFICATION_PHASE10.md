# Entrega 0.10.0 — Revisión UX/UI global

Fecha: 2026-10-06. Trabajo sobre master. React/TypeScript/Vite + FastAPI + SQLite sin cambio de arquitectura, esquema ni motor de planificación. Esquema SQLite: 7.

## Decisiones de experiencia de uso

- Cabecera con nombre y badge de metodología, conservando el contexto del menú. Las vistas vinculadas a una publicación usan la metodología de su snapshot, sin completar datos históricos desde el proyecto actual.
- Alta rápida con seis campos: tipo, nombre, responsable, estado, prioridad y fecha objetivo/compromiso. Código generado automáticamente con UUID, editable después. Crear abre los detalles del registro ya guardado, sin repetir el POST al completar información.
- Tipos filtrados por metodología para nuevas altas; los tipos legacy existentes continúan visibles al editar. Planificación, esfuerzo, dependencias y reporte ejecutivo permanecen plegados inicialmente. Comentarios accesibles en su propia sección.
- Dependencias con búsqueda por nombre/código y chips removibles. El backend conserva las validaciones de jerarquía, referencias y ciclos.
- Lista con chips para tipo, responsable, estado y prioridad; fecha editable en el mismo sitio. Guardado explícito y Cancelar/Escape: salir del control no guarda accidentalmente. Cada actualización conserva los demás campos y su versión. Los conflictos se muestran sin ocultar el editor.
- Board operativo por defecto; filtros de tipo y nivel permiten ver épicas/entregables o todos los trabajos. Se conserva drag & drop y edición de estado accesible mediante chip.
- Paleta compartida: gris/nuevo, azul claro/preparado, azul/activo, rojo/bloqueado, violeta/resuelto, verde/cerrado y gris rojizo/retirado. Siempre hay texto; estados legacy conservan su nombre con color neutro. Aplicado a lista, Board, Gantt, catálogo y atención del resumen.
- Cronograma ordenado por jerarquía y sangría, barras por estado, línea de hoy dentro del intervalo y tooltip con fechas, responsable, estado, avance y dependencias. Clic en barra o etiqueta abre detalles. Trabajos sin fechas siguen disponibles en el detalle. ScheduleSimulation, su huella, transacción, holgura y rutas críticas no cambian.
- Equipo separado en personas disponibles, equipo del proyecto, equipos compartidos, capacidad y organigrama. Personas compartidas se reutilizan; alta de persona y edición de asignación son diálogos independientes. Tarjetas muestran rol, porcentaje, líder y vigencia. Quitar asignación archiva de forma reversible: conserva identidad, referencias e historia de la persona.
- Biblioteca con iconos de tipo, nombre, tamaño, fecha y asociaciones. Endpoint de lectura agrupa por SHA-256 documentos y fuentes ejecutivas del mismo proyecto. Descarga el original desde su ubicación actual. Subir contenido ya presente reutiliza el archivo; un documento archivado puede recuperarse desde el filtro correspondiente.
- Controles compactos, formularios de una o dos columnas, tablas/Board/Gantt con desplazamiento local y editor de una columna en móvil. Escape del diálogo respeta el bloqueo durante guardado.

## Persistencia y límites

No se modifica el modelo de datos. No se migran ni eliminan BLOB existentes. Las fuentes guardadas históricamente en cada corte siguen conservándose como antes; la biblioteca unifica su consulta, sin reescribir publicaciones ni efectuar deduplicación física retrospectiva. La importación/revisión ejecutiva conserva su flujo de extracción y snapshot; un original descargable en Documentos no constituye aprobación de su contenido.

No se elimina a una persona del catálogo global al quitar una asignación. Puede permanecer como responsable de trabajos y como persona del proyecto sin asignación activa. La jerarquía del Gantt es visual, no agrega duraciones ni crea precedencias. El tooltip nativo está disponible al pasar el cursor y el clic permite abrir los detalles también en dispositivos táctiles. Las tablas amplias mantienen scroll horizontal en pantallas pequeñas.

## Pruebas ejecutadas

- `.venv/Scripts/python.exe -m pytest -q`: **68 passed**. Advertencia existente de deprecación Starlette/httpx; sin fallos.
- `npm.cmd --prefix frontend test`: **16 passed**.
- `npm.cmd --prefix frontend run build`: TypeScript y Vite correctos.
- `git diff --check`: correcto.

Tres nuevas pruebas backend cubren reutilización de documentos activos/archivados, aislamiento por proyecto, descarga original exacta, agrupación de fuentes entre cortes y preservación íntegra de un corte publicado. Tres nuevas pruebas frontend cubren listas de tipos por metodología, jerarquía con ancestros filtrados, referencias ausentes/ciclos legacy y estados desconocidos.

Revisión en navegador con base sintética `.test-data/phase5-browser`, separada de `data/`: alta rápida, apertura automática de detalles, búsqueda/selección de predecesor, guardado, edición inline de estado y permanencia tras recargar; Board operativo sin épicas y arrastre de tarjeta entre estados; tarjetas de equipo, edición de rol, retirada y restauración de asignación; Gantt Epic → Feature → UserStory → Task, colores/tooltip/edición desde barra y validación de simulación ante fechas incompletas; biblioteca con fuente Word compartida y archivo de texto. Se revisaron también resumen, presupuesto, calendario, histórico y reporte ejecutivo. Revisión móvil a 390 × 844: formulario de seis campos en una columna, botones accesibles y documentos. Viewport restaurado al terminar.

## Pendientes explícitos

**Dashboard personalizable heredado del PMO anterior, con widgets redimensionables y arrastrables.** Widgets previstos: avance, riesgos, bloqueos, ruta crítica, equipo, presupuesto, hitos y próximo corte ejecutivo. No implementado en esta entrega; mantener este requisito en siguientes fases.

Continúan pendientes la exportación `.pohub` real del usuario, validación de adjuntos legacy y paridad indicada en las verificaciones anteriores. Esta revisión UX no declara resuelta la migración ni completa toda la funcionalidad del PMO original.
