# Revisión UX/UI 0.11.0

Fecha de cierre técnico: 2026-10-07. Rama master. Esquema SQLite 8.

## Alcance implementado

- Ficha de trabajo en lectura por defecto, edición de un campo con guardar/cancelar, grupos avanzados y descripción separada. Alta de seis campos con responsable buscable; abre la ficha al crear.
- Lista jerárquica con padres antes que hijos, chips y edición contextual; búsqueda de responsable. Board operativo, estados compartidos y motor de Gantt/simulación conservados.
- Navegación separada en Planificación, Gestión, Operación y Seguimiento Ejecutivo.
- Rol y dedicación editables en la tarjeta. Marcar líder actualiza explícitamente el equipo compartido al que pertenece la asignación.
- Preferencia de usuario local por navegador, elegida del catálogo global; propone autor de documento y organizador si está asignado al proyecto. No autentica la identidad.
- Eventos con descripción requerida en la interfaz, duración, organizador/invitados buscables, relación con trabajo, estado, notas y documentos. Lectura de detalles antes de editar; búsqueda por texto, personas, fechas, proyecto y trabajo.
- Calendario con arrastre en mes/semana/día, confirmación y deshacer con control de versión. El movimiento cambia exclusivamente fecha/hora. Vista diaria con timeline y detalle.
- Documentos con descripción, autor y relación; búsqueda por metadatos. Un archivo previamente importado como fuente puede tener metadatos operativos referenciando sus bytes originales.
- Reporte dentro del workspace por defecto; pantalla completa con salida visible/Escape y la misma composición. Exportación de una PNG completa y PDF A3 de una página, escala proporcional, orientación automática y captura exclusiva de la hoja.

## Pruebas

Backend: 72 pruebas correctas. Se mantienen las garantías previas de snapshots, publicaciones, aislamiento, auditoría y simulación. Pruebas nuevas: movimiento/undo sin pérdida de contenido, rechazo de versiones antiguas y proyectos ajenos, duración válida, metadatos/documentos repetidos, reutilización de bytes de fuentes, migración v8 idempotente con respaldo y conservación de datos legacy.

Frontend: 17 pruebas correctas, incluida escala proporcional de exportación. TypeScript y Vite correctos. Una advertencia de deprecación Starlette/httpx en las pruebas backend no impide su ejecución.

Migración de la base local: respaldo previo en `.test-data/pre-ux11-normal.sqlite3`, respaldo automático v7 en data, esquema 7 → 8. Comparación exacta de todas las columnas anteriores en 23 tablas y comprobación de claves foráneas: sin cambios en valores anteriores; dos proyectos conservados.

## Revisión visual efectuada

Base sintética separada `.test-data/phase5-browser`, sin añadir ejemplos a data. Se revisaron en escritorio y móvil de 390 × 844: resumen, ficha de trabajo, lista, Board, Gantt, roadmap, equipo, presupuesto, agenda, documentos y seguimiento/reporte dentro del workspace. Las tablas y timelines amplios mantienen scroll horizontal; formularios pasan a una columna. Se revisaron además portafolio y cortes.

Flujos comprobados en navegador: selección de usuario local y organizador predeterminado; alta de evento de 90 minutos; arrastre mensual con confirmar/deshacer; arrastre diario de 09:00 a 10:00 con confirmar/deshacer; cambio contextual de prioridad; carga de documento con descripción y autor; reporte a pantalla completa en escritorio y exportaciones.

Exportaciones descargadas: PNG 3072 × 2050 y PDF de una página horizontal. Ambas inspeccionadas visualmente, incluido render del PDF con Poppler: composición completa, sin sidebar ni controles externos. El PDF usa imagen rasterizada; el texto no es seleccionable. Se activó compresión posteriormente para reducir tamaño.

## Verificación visual aún pendiente

La sesión de navegador se reinició y quedó en una página interna de error. La política del navegador bloqueó recuperar esa pestaña. No se declara probado: arrastre semanal, alta rápida y pantalla completa en móvil, ni la última corrección que vuelve a mostrar los metadatos en la tarjeta diaria. Estos puntos requieren reabrir la página HTTP de pruebas y repetir la comprobación. El código compila; esto no sustituye la prueba visual.

## Límites y pendientes del producto

- Dashboard pendiente: widgets arrastrables, redimensionables, reordenables, ocultables y de tamaño configurable; avance, riesgos, bloqueos, ruta crítica, próximos hitos, equipo, presupuesto, próximo corte y estado general.
- Drag/resize del Gantt pendiente; conservar el motor de simulación al implementarlo. El cálculo actual usa días naturales, relaciones fin-inicio y no considera recursos/festivos.
- Migración real `.pohub` pendiente porque el usuario aún no tiene la exportación. Los ZIP contienen código y se conservan intactos. No declarar paridad total ni migración de datos reales.
- Invitaciones y usuario son locales; no hay autenticación ni envío externo de invitaciones.
- La API admite descripción vacía/duración ausente para compatibilidad legacy; la creación desde interfaz exige descripción y duración. No se inventa duración de eventos anteriores ni autor histórico.
- La hoja ejecutiva conserva su composición fija y abrevia textos extensos; el detalle completo sigue disponible al seleccionar el registro.
