# Plan de integración de Project Office Hub

Fecha: 2026-10-02. Estado actualizado: fases 0–3 completadas. Base unificada, flujo semanal y conciliación maestra implementados; fases 4–5 pendientes. Véase VERIFICATION.md para resultados y límites de validación.

Las secciones de arquitectura observada describen los paquetes originales; ARCHITECTURE.md y DATA_MODEL.md describen la implementación actual.

## 1. Objetivo y alcance

Construir un único producto PMO llamado Project Office Hub. Seguimiento Ejecutivo será un módulo dentro de cada proyecto. No habrá un segundo catálogo de proyectos, riesgos, hitos o responsables ni una aplicación incrustada mediante iframe.

Este documento distingue los hallazgos del código recibido de las decisiones propuestas. Los ZIP originales permanecen intactos; las copias de consulta están en `.reference/`, excluidas de Git. Las instrucciones del documento adjunto describen el producto objetivo; la sesión actual comienza por su planificación.

## 2. Arquitectura observada y evidencia

### Project Office Hub 3.1.0

- Aplicación multipágina HTML/JavaScript con Vite 7 y TypeScript 5.9 declarados en `package.json`. `vite.config.js` incorpora las páginas HTML como entradas independientes.
- `assets/app.js` y scripts de cada página implementan la interfaz y operaciones sobre un documento global `db`.
- `assets/core/storage.js` lee y escribe localStorage sincrónicamente; replica el documento en IndexedDB y mantiene respaldos. IndexedDB no equivale actualmente a un backend relacional.
- `assets/core/domain.js` contiene reglas de jerarquía y avance para metodologías Agile, Waterfall e Hybrid. `src/core/models.ts`, `repository.ts` y `use-cases.ts` aportan contratos parciales; no constituyen una aplicación React terminada.
- Entidades: proyectos, personas, equipos, membresías, work items, relaciones entre equipos y proyectos, iteraciones, releases, agenda, adjuntos, RAID y auditoría. Presupuesto y movimientos aparecen en `budget.html`, aunque no están completamente descritos por la interfaz TypeScript del documento.
- `raid.html` almacena Risk, Assumption, Issue y Dependency en una colección común. WorkItem también admite Issue: hace falta distinguir una incidencia RAID de una tarea de trabajo relacionada.
- `assets/app.js` limita la auditoría a los últimos 1.000 eventos. El nuevo producto debe conservar el histórico disponible y dejar de truncarlo automáticamente.
- `raid.html` y `budget.html` insertan ejemplos o importes iniciales al abrir vistas vacías. Esa conducta no se trasladará al producto real.
- `VALIDACION.md` contiene verificaciones anteriores declaradas por el proyecto. El paquete no incluye una suite automatizada equivalente a la del módulo semanal ni un script `test` en package.json.

### ResumenEjecutivoSemana

La raíz efectiva del código es `ResumenEjecutivoSemana/ResumenEjecutivoSemanal/`.

- React 19, TypeScript 5.8 y Vite 6 declarados en `frontend/package.json`; compilación con `tsc -b && vite build`.
- FastAPI, Pydantic y sqlite3; dependencias fijadas en `backend/requirements.lock.txt`.
- `backend/app/db.py`: esquema versionado hasta v2, claves foráneas, transacciones, respaldo previo a migración y trigger que impide modificar el original de un registro.
- Tablas actuales: `projects`, `cuts`, `sources`, `records`, `audit`, `cut_audit`, `project_audit`. Los registros de actividades, riesgos y otras secciones conservan `original` y `current` en JSON; todavía no son entidades maestras relacionales compartidas con PMO.
- `backend/app/main.py`: API de proyectos, cortes, importaciones, revisión, edición en lote, publicación, auditoría e histórico. Usa control de versiones para conflictos y bloquea edición de cortes publicados desde la API.
- La publicación guarda `project_snapshot`; los registros permanecen asociados al corte. No existe todavía un modelo de snapshots vinculado a riesgos/hitos maestros de PMO.
- `importers.py`: Word por encabezados, párrafos y tablas; Excel por alias y mapeo configurable. Conserva originales, ubicación y fórmulas/valores almacenados. No recalcula Excel ni resuelve automáticamente responsables implícitos.
- `Workbench.tsx`, `WeeklyEditor.tsx`, `OriginalValues.tsx`, `ExecutiveReport.tsx` y `ProgressChart.tsx` implementan tablas editables, resumen semanal, fuente original y reporte web con gráfica SVG.
- La gráfica permite histórico de cortes y series importadas, con selección alternativa automática cuando faltan porcentajes oficiales. El producto unificado debe distinguir explícitamente esos dos usos.
- Tres archivos de pruebas backend: `test_workflow.py`, `test_phase2.py`, `test_report.py`. Cubren importación, aislamiento, revisión, versiones, publicación, copia, migración e indicadores/marca del reporte.
- Aplicación local sin autenticación según README. La planificación inicial mantiene ejecución local; el despliegue compartido necesita su propia fase de identidad y permisos.

## 3. Inventario funcional y decisiones

KEEP = conservar comportamiento; MERGE = unificar conceptos; MIGRATE = cambiar soporte técnico; DEPRECATE = retirar después de disponer de sustituto; NEW = desarrollar.

| Área | Decisión | Resultado previsto |
|---|---|---|
| Proyecto | MERGE | Un Project con metodología, estado, objetivo y fechas diferenciadas |
| Personas, equipos y asignaciones PMO | MIGRATE | Catálogos relacionales y membresías con rol y vigencia |
| Backlog, Board, Gantt y Roadmap | MIGRATE | Vistas de los mismos WorkItem, sin catálogos paralelos |
| RAID y riesgos/dependencias semanales | MERGE | RaidItem maestro y snapshots por corte |
| Hitos | MERGE / NEW | Milestone maestro; revisión antes de convertir campos de actividad importados |
| Actividades semanales | MERGE | Vinculación a WorkItem; observación histórica por corte |
| Cortes y copia desde corte anterior | KEEP | Mantener fechas, revisión pendiente y exclusión de avances de otra semana |
| Word y Excel | KEEP | Reutilizar parsers y revisión; ampliar reconciliación con entidades maestras |
| Originales y trazabilidad | KEEP | Conservar archivos, hash, ubicación, originales y ediciones |
| Reporte vivo y marca | KEEP | Reutilizar componentes y plantilla; consultar datos históricos protegidos |
| Histórico de avance | KEEP / MIGRATE | Serie oficial desde cortes; fuentes importadas como consulta separada |
| Auditoría | MERGE | Un AuditEvent para proyecto, importación, entidad y corte |
| Presupuesto, agenda, documentos | MIGRATE | Mantener comportamiento y relaciones; completar contratos |
| localStorage de negocio | DEPRECATE | SQLite como fuente maestra; preferencias visuales pueden seguir locales |
| Navegación HTML y estado global db | DEPRECATE | Sustitución gradual por módulos React y API |
| Snapshot de entidad maestra | NEW | Congelar campos mostrados, responsables y relaciones relevantes |
| Conciliación y mapa de identificadores | NEW | Asociar registros al maestro sin duplicación ni mezcla de proyectos |
| Autenticación multiusuario | NEW, fase posterior | Fuera del primer incremento local |

## 4. Equivalencias y conflictos de datos

| Origen PMO | Origen semanal | Regla propuesta |
|---|---|---|
| Project.start | projects.start_date | Fecha de inicio común |
| Project.target | projects.go_live / close_date | No equiparar automáticamente: objetivo, Go Live y cierre son fechas distintas |
| Project.state | projects.status | Mapeo explícito, conservando valor original |
| Person.id / ownerId | current.owner textual | Resolver por identificador o revisión humana; no fusionar solo por nombre |
| raid Risk | records sección riesgos | Vincular a RaidItem del mismo proyecto; snapshot conserva estado semanal |
| raid Dependency / workItems.dependencies | records dependencias | Diferenciar dependencia RAID de enlace de precedencia entre tareas |
| WorkItem tipo Issue | raid Issue / problemas | Relacionar cuando corresponda; no asumir equivalencia por etiqueta |
| WorkItem / fechas de planificación | actividades e hitos importados | Revisar identidad y significado antes de actualizar el maestro |
| auditLog | audit / cut_audit / project_audit | Importar conservando origen, fecha y valores, sin inventar usuario |

Un código igual en dos proyectos no identifica la misma entidad. Las coincidencias ambiguas quedan en revisión. No se generarán personas, hitos o riesgos maestros por el simple hecho de detectar una cadena en Word o Excel.

## 5. Arquitectura objetivo

Un frontend React/TypeScript/Vite, una API FastAPI y una base SQLite. Project Office Hub define la navegación y el dominio maestro; el código semanal aporta la base de persistencia, importación y reporte.

Estructura propuesta: `frontend/src/modules/{projects,executive,raid,planning,people,budget}`, `backend/app/{api,services,repositories,domain}`, `backend/migrations`, `backend/tests` y `docs`. Separar progresivamente el actual `main.py`; no reescribir los parsers y componentes probados por motivos cosméticos.

Centralizar SQL y transacciones en repositorios. Incorporar migraciones secuenciales con registro de versión y pruebas sobre copias. Evitar introducir dependencias de SQLite en contratos de negocio; la migración a PostgreSQL requerirá adaptar SQL, tipos y concurrencia y no se considera automática.

La navegación será Portafolio → Proyecto → módulos, incluido Seguimiento Ejecutivo → cortes, importación/revisión, edición, reporte e histórico. Las URL deben conservar proyecto y corte al recargar o compartir un enlace local. La API debe validar pertenencia en cada operación, no confiar únicamente en el selector del frontend.

## 6. Modelo relacional propuesto

| Entidad | Campos/relaciones principales |
|---|---|
| Project | id, name, description, objective, methodology, status, priority, start_date, target_date, go_live, close_date, version |
| Person / Team / Membership / ProjectTeam | Identidad única, equipo, proyecto, rol, asignación y vigencia |
| WorkItem / WorkItemDependency | Proyecto, jerarquía, tipo, estado, responsable, fechas, esfuerzo y precedencias |
| RaidItem | Proyecto, tipo, código opcional, responsable, probabilidad, impacto, respuesta, estado, prioridad ejecutiva e inclusión |
| Milestone | Proyecto, código opcional, actividad vinculada opcional, fechas, responsable y estado |
| Budget / BudgetEntry | Proyecto, moneda, aprobado, contingencia y movimientos |
| WeeklyCut | Proyecto, report_date, period_start/end, status, planned/actual, summary, general_status, confianza Go Live, version, published_at, created_at/updated_at |
| WeeklyProjectSnapshot | Corte, versión y valores del proyecto utilizados por el reporte |
| WeeklyRaidSnapshot / WeeklyMilestoneSnapshot / WeeklyActivitySnapshot | Corte, referencia maestra, versión de origen y valores históricos completos |
| WeeklyNarrative | Corte, sección, contenido y procedencia; alertas, decisiones y narrativas sin forzar una entidad maestra ficticia |
| SourceFile / ImportRecord | Archivo y hash, corte, ubicación, original inmutable, valor revisado, estado de revisión y versión |
| ImportBinding | Registro importado, entidad destino y correspondencia de campos aprobada |
| AuditEvent | Fecha, acción, proyecto/corte/entidad, antes/después, origen y actor cuando exista |
| MigrationIdentity | Sistema de origen, tipo, id anterior, id nuevo; unicidad para reintentos |

Los snapshots son hechos históricos, no segundos riesgos o proyectos operativos. Su referencia al maestro no reemplaza los valores congelados. Conservar texto del responsable además de su ID evita que un cambio de nombre altere el reporte antiguo. Las entidades referenciadas se archivan; no se eliminan en cascada sobre históricos.

La variación es real menos planeado cuando ambos están definidos; ausencia no equivale a cero. Mantener porcentajes entre 0 y 100 y fechas ISO. Inicialmente un corte por proyecto y fecha, como en el módulo existente. Mapear `borrador/publicado` a estados de dominio DRAFT/PUBLISHED sin romper contratos durante la transición.

## 7. Publicación y actualización del maestro

1. Importar genera propuestas con originales protegidos; no modifica entidades maestras.
2. Revisar permite corregir datos y elegir entidad existente o creación explícita. Separar «aceptar dato semanal» de «actualizar estado actual del proyecto».
3. Aplicar una actualización maestra requiere versión esperada y auditoría; una observación de una semana antigua no sobrescribe silenciosamente el estado actual.
4. Publicar valida revisión completa, pertenencia, versiones y consistencia; congela snapshots y metadata en una transacción junto con auditoría y cambio de estado.
5. Bloquear modificación, alta y borrado de contenido publicado en todas las rutas. Añadir protección de base de datos mediante migración probada donde proceda.
6. Corrección inicial: crear corte posterior, conservando la publicación. Una futura revisión en la misma fecha necesitará un modelo explícito de revisiones; no reabrir ni sobrescribir.

El reporte oficial y la gráfica histórica consultan publicaciones y snapshots. La consulta de borradores o series importadas debe identificarse como vista previa. Congelar o versionar también la selección de puntos históricos del reporte si una publicación posterior de un corte atrasado pudiera cambiar una lámina ya publicada.

## 8. Estrategia de migración y reversión

1. Inventariar y registrar hashes de paquetes originales; conservar referencias locales fuera de Git.
2. Establecer baseline ejecutando tests/build originales en copias con dependencias reproducibles y datos temporales. Un informe previo no sustituye esta ejecución.
3. Incorporar código y tests útiles al nuevo repositorio, excluyendo cachés, entornos, bases reales, documentos de usuario y artefactos compilados.
4. Crear esquema maestro aditivo y adaptadores. Preservar importadores y endpoints semanales mientras se integran los catálogos.
5. PMO: importar una exportación `.pohub`, validar schemaVersion, referencias y conteos, mostrar conflictos y aplicar en transacción. El ZIP contiene código; no asumir que contiene los datos actuales del navegador del usuario.
6. Semanal: migrar una copia de SQLite con respaldo, conservar proyectos, cortes, archivos originales, revisiones y auditorías. Mantener intactos los valores publicados aunque la conciliación con el maestro se complete después.
7. Usar MigrationIdentity y hash del lote para hacer los reintentos idempotentes. Conciliar explícitamente proyectos de ambos orígenes.
8. Verificar conteos, referencias, hashes de fuentes y equivalencia de reportes históricos antes de cambiar a la base nueva.
9. Reversión: restaurar respaldo en otra ubicación y volver a la versión compatible; no ejecutar degradaciones destructivas sobre la única copia.

Cada módulo migrado pasa a escribir únicamente en la API. Los módulos originales siguen disponibles como referencia externa durante la transición, sin doble escritura ni sincronización implícita entre dos bases. No se declara paridad completa hasta terminar las fases funcionales.

## 9. Fases y criterios de aceptación

| Fase | Entregables | Criterio para cerrarla |
|---|---|---|
| 0. Análisis y baseline | Este plan, contexto, inventario y ejecución baseline | Hallazgos documentados; build/tests ejecutados o bloqueo concreto registrado |
| 1. Base unificada | Estructura, Project maestro, migraciones, FastAPI, React y navegación | Crear/editar dos proyectos, persistir tras reinicio y navegar sin mezcla de datos |
| 2. Seguimiento Ejecutivo | Cortes, Word/Excel, revisión, tablas, publicación, histórico | Flujo completo por proyecto; originales y publicaciones protegidos; suite heredada adaptada |
| 3. Entidades maestras | RAID, hitos, personas y WorkItem, conciliación y snapshots | Cambiar un riesgo actual no altera cortes publicados; importación repetida no duplica maestros |
| 4. Reporte ejecutivo | Plantilla viva, indicadores, gráfica oficial y navegación a edición | Reporte aislado por proyecto/corte, valores ausentes correctos, sin dependencias de datos maestros cambiantes |
| 5. Resto de PMO | Portafolio, Board, Gantt, Roadmap, presupuesto, equipos, agenda y documentos | Matriz de paridad por módulo y migración de datos validada; retirar persistencia antigua |

Preservar los componentes de reporte desde la fase 2; la fase 4 adapta y verifica su integración completa, no elimina el reporte mientras tanto. El primer incremento de código será fase 1, tras establecer baseline. No se asignan fechas sin medir el trabajo de migración.

## 10. Verificación prevista

- Ejecutar `npm ci` y `npm run build` del frontend semanal; instalar el lock de Python en entorno aislado y ejecutar `python -m pytest -q` en backend. PMO requiere instalar sus dependencias y compilar; su paquete no trae suite equivalente.
- Conservar los tres archivos de tests originales y adaptar contratos sin eliminar sus garantías.
- Añadir pruebas de snapshots frente a cambios de nombre, riesgo, fecha y responsable; aislamiento entre proyectos; versiones concurrentes; publicación atómica; rechazos de todas las escrituras en publicado.
- Probar migración idempotente, referencias huérfanas, rollback ante lote inválido y preservación de archivos/originales/auditoría.
- Verificar navegación y recarga, cambios sin guardar, importación → revisión → publicación → reporte, y presentación de tablas/reportes en navegador.
- Comprobar que no se crean datos de ejemplo al abrir un proyecto vacío.
- Cada incremento cerrará con build, pruebas relevantes, revisión de cambios, commit pequeño y push de master.

## 11. Riesgos y pendientes concretos

| Riesgo | Tratamiento |
|---|---|
| Dos representaciones de una misma entidad | Reconciliación por proyecto y mapa de identidad; revisión de ambigüedades |
| Pérdida de campos no tipados en PMO | Revisar scripts HTML y conservar payload original de migración |
| Históricos que dependen del estado actual | Snapshots completos y tests de inmutabilidad |
| Auditorías fragmentadas y truncadas | Unificar sin inventar eventos perdidos; conservar procedencia |
| Datos semilla automáticos | Retirarlos de los flujos productivos; fixtures solo para tests |
| Diferencias Vite/TypeScript y dependencias | Baseline con versiones recibidas antes de cualquier actualización |
| Excel con fórmulas sin caché / responsables ambiguos | Advertencias y revisión; no completar valores por suposición |
| Protección de publicado solo en API existente | Revisar rutas y añadir defensas relacionales probadas |
| Colisiones entre fecha objetivo y Go Live | Campos separados y decisión explícita en migración |
| Módulos todavía no migrados | Seguimiento de paridad; no presentar el primer incremento como PMO terminado |

Baseline ejecutado: ambos builds terminan y las 10 pruebas semanales originales pasan. La fase 1 terminó con 19 pruebas correctas. La fase 2 termina con 31 pruebas correctas, build React/TypeScript y verificación del flujo semanal completo en navegador (VERIFICATION_PHASE2.md). No se han importado datos reales exportados de PMO ni bases de usuario. La compilación HTML antigua tiene advertencias documentadas en VERIFICATION.md.

## Cierre de fase 3

Implementado en esquema 5: catálogo común master_items para RAID, Milestone y Activity (base inicial de WorkItem), personas/asignación por proyecto, snapshots semanales, conciliación explícita y auditoría agregada. Las jerarquías y vistas avanzadas de planificación quedan en fase 5. No se infieren identidades por nombre ni se convierten importaciones automáticamente en maestros. Código único por proyecto y vínculo único por entidad/corte. Véase VERIFICATION_PHASE3.md.
