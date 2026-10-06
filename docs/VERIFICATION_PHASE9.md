# Entrega 0.9.0 — Equipo y coordinación del trabajo

Fecha: 2026-10-06. Reúne cuatro pendientes funcionales de la matriz original; no declara migración real ni paridad total.

## Completado

- **Capacidad por vigencia** en Equipo: fecha inicial/final (máximo 366 días), pico, promedio ponderado y días sobre 100%. Consulta personas del proyecto y sus asignaciones de todos los proyectos. Vigencias inclusivas; extremos vacíos sin límite, asignaciones archivadas excluidas. Desglose por tramo/proyecto/rol. No estima horas, festivos ni capacidad individual distinta de 100%.
- **Organigrama global** en Equipo: líder directo y cargo de cada persona, estructura jerárquica y señalización de personas del proyecto. Roles de Membership permanecen independientes. Validación de ciclos en API y SQLite, control de versión compartido con edición de persona y auditoría global visible desde sus proyectos.
- **Comentarios** en trabajos guardados: notas locales con fecha, conservadas como eventos de auditoría. No alteran campos ni versión del trabajo. UUID por envío evita duplicados al reintentar; mismo UUID con texto diferente se rechaza. Se añaden aclaraciones nuevas, sin sobrescribir notas previas. No son mensajes externos ni identidades autenticadas de varios usuarios.
- **Iteraciones y releases por arrastre**: columnas separadas por tipo, trabajos sin asignar, selector accesible y desasignación. Conserva la otra asignación, las fechas y las dependencias. Las referencias archivadas se muestran fuera de la vista activa. Versiones concurrentes se rechazan.

## Persistencia

SQLite 7 agrega `people.leader_id` y `people.role`. Migración aditiva v6 → v7 con backup-v6 y triggers para impedir ciclos. Las personas existentes empiezan sin líder y cargo vacío; no se infieren jerarquías. Los comentarios reutilizan audit_events; no hay segundo catálogo. Los snapshots publicados permanecen inmutables.

## Verificación

65 pruebas backend correctas, 13 frontend correctas y build TypeScript/Vite correcto. Los siete nuevos tests cubren solapamiento inclusivo, promedio ponderado, asignaciones disjuntas, fechas abiertas, archivados, cero, intervalo inválido, consulta entre proyectos limitada a su roster, comentarios/reintentos/aislamiento, periodos y snapshots, versiones y ciclos del organigrama y migración respaldada idempotente. Las pruebas heredadas de migración ahora esperan esquema final 7.

Navegador en `.test-data/phase5-browser`: asignación de 60% en un proyecto y 50% en otro, coincidentes por 15 días; muestra pico 110%, 15 días de sobreasignación y promedio 55% en intervalo de 30 días. Se comprobó comentario guardado sin guardar el formulario del trabajo, arrastre hacia Iteración QA y permanencia al recargar. Se editó cargo y líder en organigrama y se verificó «Reporta a Líder QA». Ninguno de estos datos de prueba se creó en la base normal.

## Pendientes reales

La exportación `.pohub` del usuario todavía no existe. Continúan pendientes la validación/mapeo de sus datos reales, los adjuntos legacy y convertir comentarios/jerarquías históricos preservados en el archivo original a los nuevos campos operativos. No retirar persistencia antigua antes de conciliarlos. La simulación de fechas sigue sin calendarios laborales ni nivelación automática según capacidad. Presupuestos mantienen monedas separadas sin conversión. No se añadieron envío de invitaciones, autenticación multiusuario ni despliegue público.
