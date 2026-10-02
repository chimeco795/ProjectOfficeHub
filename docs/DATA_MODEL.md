# Modelo de datos implementado — esquema 3

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

Los campos ejecutivos de cortes siguen en metadata; actividades, riesgos e hitos siguen siendo registros semanales JSON. Esto preserva compatibilidad durante fase 1; no constituye todavía la reconciliación con entidades maestras de fase 3. La auditoría unificada propuesta también queda pendiente.

## Migración v2 → v3

Migración aditiva y transaccional; respaldo previo si existen proyectos. Los valores iniciales son Hybrid, Media, target_date nulo y updated_at igual a created_at. Ejecutarla otra vez no modifica los datos ni duplica columnas. Se prueban tanto la evolución desde v1 como desde v2 y la conservación de snapshots publicados.

No se cargó información real del navegador PMO ni una base semanal del usuario. Una migración de datos entre productos requerirá el mapa de identidades y la conciliación definidos en INTEGRATION_PLAN.md.
