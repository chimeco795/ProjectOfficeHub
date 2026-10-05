# Verificación de fase 4

Fecha: 2026-10-05. Versión 0.4.0. Esquema SQLite 5, sin migración nueva.

## Cambios y reglas

- Publicaciones: el proyecto mostrado procede exclusivamente del snapshot; los campos históricos ausentes no se completan con valores actuales.
- Indicadores oficiales: resumen semanal guardado. Consultar observaciones importadas no altera la hoja ni su gráfica.
- Gráfica oficial: publicaciones conocidas y corte actual; excluye otros borradores y semanas futuras. Publicar después una semana atrasada no cambia el histórico congelado.
- Porcentajes: cero válido, ausencia nula y variación en puntos porcentuales. Fechas imposibles y valores fuera de rango no producen coordenadas inválidas. Escala de 0 a 100 y menos etiquetas en series largas.
- Revisión pendiente optativa en borrador; publicaciones solo incluyen aceptados. Accesos a resumen, registros, tablas por sección y proyecto.

## Verificación

41 pruebas backend y 6 pruebas frontend correctas; compilación TypeScript/Vite correcta. Una advertencia de deprecación Starlette/httpx, sin fallos. Pruebas de modelo frontend, contratos de histórico, pertenencia proyecto/corte, conservación de marca/porcentajes/snapshot tras editar proyecto y publicación atrasada; suites anteriores conservadas.

Navegador con base aislada `.test-data/phase4-browser`, puerto 8014. Reporte publicado con planeado 50%, real 0%, variación -50 pp; elegir observación/serie de consulta 99%/98% mantuvo la hoja oficial. Cambio a borrador sin cifras mostró guiones/Sin datos y un pendiente sin incluirlo automáticamente. Navegación a Actualización semanal conservó el corte seleccionado. Revisión visual de plantilla, marca, semáforos ausentes y gráfica correcta.

## Límites

No se reconstruyen campos perdidos de publicaciones antiguas. Gráfica de consulta puede incluir proyecciones; no cambia el reporte oficial. Se mantienen textos abreviados y límites de filas de la plantilla, con acceso al registro/tablas completos. No se añadió exportación PDF/PPTX ni autenticación; esta fase corresponde al reporte web local. Los datos sintéticos están separados de la base normal y excluidos de Git. La fase 5 continúa con módulos PMO y migración validada de datos reales.
