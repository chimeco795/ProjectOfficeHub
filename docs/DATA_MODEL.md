# Modelo de datos implementado — esquema 5

## Project maestro

Tabla projects: id, name, description, objective, status, start_date, go_live, close_date, created_at, version y cuatro campos nuevos: methodology, priority, target_date, updated_at.

Metodologías permitidas: Agile, Waterfall, Hybrid. Prioridad: Baja, Media, Alta, Crítica. El contrato API usa estados Activo, En pausa y Cerrado. Nombre no vacío tras eliminar espacios. Inicio no puede ser posterior a objetivo, Go Live o cierre; no se impone equivalencia ni orden entre esas tres fechas finales.

La creación y cada actualización se registran en project_audit. Cada modificación incrementa version y actualiza updated_at. El frontend debe enviar la versión leída; una versión obsoleta devuelve 409.

## Relaciones conservadas

- projects 1:N cuts; unicidad por project_id y report_date.
- cuts 1:N sources, con archivo original BLOB, SHA-256, mapeo y advertencias.
- cuts 1:N records, con original, current, generated, review y version.
- records y sources mantienen procedencia; parent_record_id identifica copias desde otra semana.
- audit, cut_audit y project_audit conservan la auditoría heredada.
- cuts.project_snapshot conserva los datos de proyecto publicados. La migración no lo recalcula.

Los campos ejecutivos de cortes siguen en metadata; actividades, riesgos e hitos siguen siendo registros semanales JSON. El esquema 5 añade vínculos explícitos al catálogo y una consulta de auditoría unificada, preservando estos registros.

## Migración v2 → v3

Migración aditiva y transaccional; respaldo previo si existen proyectos. Los valores iniciales son Hybrid, Media, target_date nulo y updated_at igual a created_at. Ejecutarla otra vez no modifica los datos ni duplica columnas. Se prueban tanto la evolución desde v1 como desde v2 y la conservación de snapshots publicados.

No se cargó información real del navegador PMO ni una base semanal del usuario. Una migración de datos entre productos requerirá el mapa de identidades y la conciliación definidos en INTEGRATION_PLAN.md.

## Fase 2 — seguimiento semanal

Esquema 4: cuts.updated_at y cuts.history_snapshot. La migración crea respaldo de bases pobladas antes de cambios. Triggers bloquean UPDATE/DELETE del corte publicado y INSERT/UPDATE/DELETE de sus registros y fuentes. Los archivos fuente no se pueden actualizar, y un registro no puede moverse a otro corte.

Toda modificación de registros o fuentes incrementa cuts.version dentro de la misma transacción. Así una publicación o edición del resumen desde una ventana antigua se rechaza con 409. Los lotes inválidos se revierten completos, incluidos los incrementos de versión.

La publicación congela project_snapshot, metadata, registros y history_snapshot. Este último guarda la serie oficial de publicaciones conocida en ese momento; publicar después una semana atrasada no cambia el reporte ya publicado. Para publicaciones anteriores al esquema 4 se congela la serie disponible durante la migración: no se puede reconstruir qué publicaciones eran visibles originalmente si no se registró ese dato.

cut_audit registra ahora creación e importación además de copia, edición y publicación. GET /api/cuts/{cut_id}/timeline combina esos eventos con las ediciones de records para consulta del corte. Las auditorías históricas no se inventan retroactivamente; la consulta de fase 3 agrega estos eventos sin reescribirlos.

## Fase 3 — esquema 5

- people: identidad global, correo normalizado único si está informado, versión. project_people asigna personas a proyectos.
- master_items: tipo Risk/Assumption/Issue/Dependency/Milestone/Activity, código único sin distinguir mayúsculas por proyecto, nombre, descripción, estado, responsable, relación, fechas, probabilidad, impacto, respuesta, prioridad, avance, inclusión ejecutiva, archivo y versión. No hay borrado físico en la API.
- weekly_item_snapshots: record_id único, cut_id, master_item_id, master_version, master_snapshot, payload y frozen_at. Un maestro solo se vincula una vez por corte. Relaciones y responsables deben pertenecer al proyecto.
- audit_events: eventos nuevos de catálogo/personas. La consulta por proyecto combina estos eventos con auditorías anteriores y cambios de las personas asignadas.

Crear corte desde maestro copia elementos activos seleccionados y los deja pendientes. Copiar corte conserva vínculos y procedencia, sin copiar frozen_at. Importar Word/Excel nunca crea maestros automáticamente. Conciliar requiere aceptación previa; alta y vínculo son atómicos. Traer valores actuales requiere versiones y nueva revisión; aplicar al maestro requiere formulario explícito. Vincular, desvincular y aplicar invalidan la versión del registro para detectar concurrencia.

Publicar exige vínculos en riesgos, dependencias, hitos y actividades aceptados; congela payload con los valores semanales revisados. master_snapshot conserva el estado maestro capturado al vincular/traer/aplicar, que puede diferir del semanal. Triggers protegen snapshots publicados. La migración v4→v5 respalda bases pobladas, no altera publicaciones anteriores ni inventa sus vínculos.
