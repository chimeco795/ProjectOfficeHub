# Verificación — 2026-10-02

## Baseline de fase 0

- Backend semanal recibido: 10 pruebas correctas con pytest, en copia de referencia y datos temporales.
- Frontend semanal: npm ci y npm run build correctos (TypeScript + Vite 6.4.3, versión resuelta del lock).
- PMO antiguo: npm install y npm run build correctos (Vite 7.3.6 resuelto desde el rango recibido). No se recibió package-lock; no se puede reconstruir exactamente la instalación histórica.
- Vite del PMO antiguo advierte que los scripts HTML sin type=module no se empaquetan. Que termine el build no acredita el funcionamiento de su distribución compilada. La migración no usa esos artefactos.

## Fase 1

- Entorno Python propio .venv instalado desde backend/requirements.lock.txt.
- Frontend instalado mediante npm ci con el lock conservado.
- 19 pruebas backend correctas: 10 heredadas y 9 casos nuevos contando parametrizaciones.
- Cobertura nueva: CRUD parcial de proyecto (crear/leer/actualizar), fechas distintas, validación, versiones obsoletas, persistencia entre ciclos de arranque y conexiones, auditoría, corte ajeno, proyecto inexistente y migración v2 idempotente con respaldo y snapshots conservados.
- No se eliminó ningún test heredado. Se actualizó únicamente su expectativa del esquema final de 2 a 3.
- Compilación TypeScript y build Vite correctos.

## Navegador

Verificado en servidor localhost:8010 con PMO_DATA_DIR apuntando a .test-data/browser:

1. Portafolio inicialmente vacío, sin ejemplos insertados.
2. Crear Verificación A con metodología Waterfall y objetivo propio.
3. Editar nombre y prioridad; recargar y comprobar ficha conservada.
4. Crear corte 2026-10-02; comprobar URL con project/view/cut y restauración tras recarga.
5. Volver al portafolio: 1 proyecto y 1 corte.
6. Crear Verificación B con metodología Agile; comprobar resumen sin cortes del primer proyecto.
7. Inspección visual del resumen, campos y navegación.

Estos datos de prueba no se copian a data/ ni se suben a Git. No se repitió la aceptación visual completa de Word/Excel y publicación: corresponde a fase 2, aunque sus pruebas backend heredadas pasan.

## Advertencias no bloqueantes

Starlette advierte que su integración TestClient con httpx está deprecada y recomienda httpx2. Se conservaron las versiones fijadas del paquete original y no se hizo una actualización de dependencias ajena al incremento.

npm muestra avisos de política de scripts de esbuild; las compilaciones comprobadas terminaron correctamente. No se cambiaron políticas globales.
