# Verificación de fase 3

Fecha: 2026-10-02. Versión 0.3.0 / esquema 5.

## Automatizada

- `python -m pytest -q`: 39 pruebas correctas. Una advertencia de deprecación Starlette/httpx sin fallos.
- `npm --prefix frontend run build`: TypeScript y Vite correctos.
- Cobertura: identidad/código/correo, aislamiento de proyectos y responsables, control de versiones, publicación con conciliación obligatoria, rollback de alta incompatible, duplicado de vínculo, traer/aplicar cambios explícitamente, conservación de originales, copia con procedencia, auditoría de personas, importación repetida sin alta de maestros.
- Cambio del riesgo y nombre de persona tras publicar no altera snapshot ni payload histórico. INSERT/UPDATE/DELETE SQL sobre snapshots publicados se rechazan.
- Migración v4→v5 idempotente, respaldo v4, publicaciones anteriores intactas y sin vínculos inventados. Suites anteriores conservadas y adaptadas a conciliación obligatoria.

## Navegador

Base aislada `.test-data/phase3-browser`, puerto temporal 8013. Se creó proyecto sintético vacío, persona, riesgo rojo asignado, corte desde catálogo, revisión/aceptación y publicación. El catálogo cambió a verde; la conciliación del corte publicado siguió mostrando rojo, versión capturada 1 y sin controles de escritura. Recargar conservó proyecto/corte/vista. Auditoría integrada mostró creación, vinculación, revisión, publicación y actualización. Se revisó presentación visual; se añadió scroll al menú para mantener accesibles todos sus módulos.

## Operación y límites

App normal reiniciada en 8011 con la base local existente, migrada con respaldo automático. No se cargaron ejemplos en ella. ZIP originales intactos.

La importación propone registros: el usuario resuelve identidades y códigos; no hay coincidencias difusas automáticas por nombre. Actividades es el maestro inicial de WorkItem, sin Board/Gantt/jerarquías avanzadas. Los datos del PMO antiguo no se migraron. Los cortes ya publicados antes de esta fase siguen consultables sin conciliación retrospectiva. La auditoría se agrega al consultar; las tablas históricas se conservan. No se probó cada combinación visual de campos/tipos, pero los contratos comunes se cubren en backend. Autenticación multiusuario fuera de este incremento local.
