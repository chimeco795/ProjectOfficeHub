# Verificación de fase 2 — 2026-10-02

## Resultado

31 pruebas backend correctas y compilación React/TypeScript/Vite correcta. Se conservaron las pruebas anteriores, adaptando expectativas de esquema final y versiones de corte. pytest.ini permite ejecutar la suite desde la raíz sin importar las copias de referencia.

## Cobertura nueva

- Flujo combinado Word + Excel, revisión y corrección, resumen, publicación, copia a semana posterior y persistencia tras otro ciclo de aplicación.
- Originales y snapshot de proyecto conservados tras corregir datos y cambiar el proyecto actual.
- Rechazo de publicación desde una versión anterior a cambios de contenido.
- Serie histórica publicada estable aunque se publique posteriormente un corte atrasado.
- Ocho casos de bloqueo directo en SQLite: modificación/borrado de corte y alta/modificación/borrado de registros y fuentes publicados.
- Migración v3 → v4 idempotente, respaldo verificado y conservación de snapshot anterior.
- Conteos de pendientes y eventos de creación, importación, edición y publicación.

## Prueba en navegador

Servidor temporal localhost:8012, PMO_DATA_DIR=.test-data/phase2-browser. Documentos sintéticos en .test-data/phase2-files; no se utilizaron ni subieron datos de usuario.

1. Crear proyecto y corte 2026-10-02 con periodo 2026-09-28 a 2026-10-02.
2. Subir y procesar simultáneamente avance.docx y plan.xlsx; detectar un logro y una actividad pendientes.
3. Cambiar responsable Ana → Beatriz dentro de la revisión, manteniendo Ana en el original Excel.
4. Aceptar ambos registros y guardar avance 50 % / 45 %, variación -5 puntos y resumen.
5. Publicar; verificar bloqueo visual de campos y registro en histórico con cero pendientes.
6. Consultar trazabilidad: creación, dos importaciones, correcciones, resumen y publicación. Abrir antes/después y comprobar Ana → Beatriz.
7. Crear semana 2026-10-09 copiando la publicación: registros pendientes, sin resumen/avance oficiales heredados.
8. Editar en tabla el responsable a Carla y guardar. Regresar a la publicación: permanece Beatriz y campos deshabilitados.
9. Revisar visualmente histórico con borrador y publicado, porcentajes, periodos y pendientes.

Durante la prueba se encontró y corrigió un fallo al mostrar valores nulos de auditoría usando el visor de celdas Excel. La trazabilidad ahora tiene un renderizador propio para valores simples, vacíos y estructuras anidadas; se verificó la corrección en navegador.

## Límites

Los cortes antiguos no permiten reconstruir la composición exacta de una gráfica en su fecha de publicación si nunca se guardó esa selección. La migración v4 congela la serie disponible al migrar y conserva los demás snapshots. Nuevas publicaciones sí conservan esa composición desde el momento de publicar.

Continúan pendientes fase 3 (entidades maestras y conciliación), fase 4 (consolidación ejecutiva) y fase 5 (resto de PMO). No se realizó migración de datos reales. La advertencia de deprecación Starlette/TestClient con httpx sigue siendo no bloqueante y las versiones originales de dependencias se mantuvieron.
