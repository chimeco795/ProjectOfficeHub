# Verificación y paridad de fase 5

Fecha: 2026-10-05. Incremento 0.5.0, SQLite 6. **Fase 5 en curso**, no cierre de paridad ni de migración real.

## Alcance y matriz

| Módulo | Implementado | Límite / pendiente |
|---|---|---|
| Portafolio | Catálogo único, ficha, acceso por proyecto | Sin importación real validada |
| Backlog | Tipos Agile/Waterfall/Hybrid, padre, esfuerzo, puntos, fechas, responsable, progreso y precedencias sobre master_items | Comentarios antiguos se conservan solo en original |
| Board | Estados y cambio explícito con control de versión | Sin arrastrar tarjetas |
| Gantt | Barras de fechas, avance, edición, lista de fechas incompletas | Sin reprogramación automática ni ruta crítica |
| Roadmap | Iteraciones y releases, fechas y trabajo vinculado | Sin editor gráfico por arrastre |
| Equipos | Equipos globales asignables, líder, miembros por proyecto, roles, porcentaje y vigencias | Sin organigrama de personas; suma mostrada no calcula disponibilidad por fecha |
| Presupuesto | Base explícita, contingencia, costos Planned/Committed/Actual/Forecast, centavos exactos y totales por moneda | Sin conversión de divisas |
| Agenda | Eventos, fechas, horas, responsable e invitados internos; búsqueda y rango | Lista; faltan vistas calendario día/semana/mes; no envía invitaciones |
| Documentos | Subida hasta 20 MB, bytes originales, SHA256, vínculo a maestro, notas, archivo/restauración, descarga por proyecto | Attachments del exportador antiguo bloqueados hasta verificar formato real |
| Migración | schemaVersion 3, validación previa sin escrituras, mapa de proyectos, asignación explícita de datos globales, transacción, identidad y original descargable | Exportación real aún no disponible; colisiones ambiguas requieren conciliación, no sobrescritura |

El producto nuevo usa SQLite; no escribe en localStorage del PMO anterior. No retirar ni borrar la persistencia anterior hasta migrar y conciliar los datos reales. No se declara paridad completa. Las opciones visuales y campos sin equivalente se conservan en el archivo de origen, no se presentan como datos operativos migrados.

## Verificación ejecutada

- 50 pruebas backend correctas: regresión semanal y nuevos casos de jerarquía, ciclos, aislamiento, versiones, periodos, presupuesto, equipos, eventos, documentos, importación y migración de esquema.
- 6 pruebas frontend del modelo de reporte correctas. TypeScript y build Vite correctos.
- Importación sintética: preview sin cambios, aplicación atómica, rollback de referencia inválida, reintento idempotente, descarga exacta del original, proyecto existente sin sobrescribir y equipos asignados exclusivamente a sus proyectos declarados. Attachments desconocidos rechazados.
- Migración SQLite v5 → v6 con respaldo, segunda ejecución idempotente, publicaciones y claves foráneas verificadas.
- Navegador en base separada `.test-data/phase5-browser`, puerto 8015: acceso a migración desde portafolio vacío, restauración de Board por URL, movimiento a En ejecución, edición de compromiso, presentación Gantt y presupuesto 1,000.10 con contingencia cero. No se afirma una prueba visual exhaustiva de todas las pantallas.
- Advertencia existente de Starlette/httpx en tests; no impide las pruebas.

## Continuación

Completar las diferencias de interfaz y comportamiento de la matriz. Cuando el usuario tenga `.pohub`, validar primero el archivo, resolver formatos/identidades ambiguos y comparar recuentos y valores por proyecto antes de aplicar. El usuario confirmó que todavía no tiene la exportación; no volver a suponer que los ZIP de código son sus datos actuales.
