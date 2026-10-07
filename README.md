# Project Office Hub

Producto PMO con un catálogo maestro de proyectos y Seguimiento Ejecutivo dentro de cada proyecto. React + TypeScript + Vite, FastAPI y SQLite. Uso local en este incremento.

## Estado

Fases 0–4 completadas el 5 de octubre de 2026. Incremento de diseño y uso cotidiano disponible: versión 0.11.0, esquema SQLite 8: proyectos, seguimiento semanal, catálogo RAID/hitos/actividades, personas compartidas, conciliación explícita y snapshots protegidos.

Desde **Catálogo y responsables** administra el estado actual. Al crear un corte puedes partir del catálogo o copiar una semana anterior. Revisa y acepta los registros; en **Conciliar con el catálogo** vincula los riesgos, dependencias, hitos y actividades antes de publicar. Vincular no sobrescribe los valores semanales. Traer datos actuales vuelve a dejar el registro pendiente; aplicar cambios al catálogo exige revisar y guardar el formulario. **Auditoría del proyecto** reúne los eventos históricos.

Incremento operativo de fase 5 disponible: Backlog, Board, Gantt, Roadmap, equipos, presupuesto, agenda y documentos operan sobre SQLite. Migración .pohub con validación previa, asignación de proyectos, transacción atómica y originales descargables. El usuario aún no tiene su exportación: la migración real y la paridad completa siguen pendientes. Véase docs/VERIFICATION_PHASE5.md para la matriz de alcance. Los ZIP originales permanecen intactos.

## Diseño y operación diaria

Navegación por módulos y pestañas, vista general con compromisos reales, portafolio con búsqueda y filtros, tablero por arrastre y agenda mensual/semanal/diaria. Ver docs/VERIFICATION_PHASE6.md. Esta entrega no cierra la migración real pendiente de fase 5.

## Reporte ejecutivo

Los indicadores se toman del resumen semanal guardado. La gráfica muestra publicaciones anteriores y el corte actual; las series importadas se consultan por separado y nunca sustituyen cifras oficiales. Cero es un dato válido; campos ausentes siguen sin definir. Los borradores muestran solo registros aceptados inicialmente, con una opción explícita para incluir pendientes y dudosos. Los reportes publicados usan únicamente datos históricos.

Desde el reporte puedes abrir el resumen, consultar/editar registros, ir a sus tablas o volver al proyecto. La marca y plantilla continúan configurándose por corte. Validación: `npm --prefix frontend test`, `npm --prefix frontend run build` y `python -m pytest -q` con el entorno virtual activado. Véase docs/VERIFICATION_PHASE4.md.

## Inicio en este equipo

Desde la raíz del repositorio:

```powershell
.\Start.ps1
```

Abrir http://127.0.0.1:8000. Para otro puerto: `.\Start.ps1 -Port 8011`. La base productiva local empieza vacía; no se insertan proyectos de ejemplo. Ctrl+C detiene el servidor.

## Instalación reproducible

Requisitos: Python 3.12+ y Node.js 22+ con npm.

```powershell
python -m venv .venv
.\.venv\Scripts\python.exe -m pip install -r backend/requirements.lock.txt
Set-Location frontend
npm ci
npm run build
Set-Location ..
.\Start.ps1
```

Para desarrollo, ejecutar `..\.venv\Scripts\python.exe -m uvicorn app.main:app --reload --host 127.0.0.1 --port 8000` desde backend y `npm run dev` desde frontend.

## Uso

1. Crear proyecto en Portafolio y definir metodología, prioridad, objetivo y fechas.
2. Abrir su resumen; editar la ficha guarda cambios con control de versión.
3. Entrar en Seguimiento Ejecutivo para consultar o crear cortes del proyecto.
4. La URL conserva proyecto, vista y corte al recargar o abrirla en otra pestaña.

Fecha objetivo, Go Live y cierre son campos independientes. Una publicación anterior conserva los datos de proyecto que tenía al publicarse.

## Seguimiento Ejecutivo — fase 2

Crear un corte vacío o desde la semana anterior, indicar fecha y periodo, e importar documentos .docx y .xlsx. Revisar los registros, corregirlos y aceptarlos; también se pueden editar tablas o agregar registros manuales. Los originales permanecen conservados.

En Actualización semanal, guardar porcentajes y resumen. Publicar exige no tener pendientes ni dudosos y convierte el corte en solo lectura. El histórico muestra avances, estado y pendientes; Trazabilidad del corte muestra creación, importaciones, correcciones y publicación. Una nueva semana copiada queda pendiente de revisión y comienza sin porcentajes ni resumen semanal.

Si otra ventana modifica contenido, se rechaza publicar con una versión antigua. Recargar el corte permite revisar la información nueva. Los cambios en una semana posterior no alteran publicaciones anteriores.

## Datos y migraciones

Datos locales en `data/pmo.sqlite3`, excluidos de Git. `PMO_DATA_DIR` permite utilizar otra carpeta. Se conservan los datos normales creados por el usuario; no se importó su base legacy .pohub. Las pruebas de navegador usan `.test-data/browser` y no forman parte de la base normal.

Al iniciar se ejecutan las migraciones necesarias hasta esquema 8. La v3 agrega metodología, prioridad, fecha objetivo y fecha de actualización; la v4 protege publicaciones y guarda su serie histórica. Si contiene proyectos, se crea primero el respaldo `backup-v2-<fecha>.sqlite3` o `backup-v3-<fecha>.sqlite3`, según la migración. Los proyectos anteriores reciben Hybrid y prioridad Media como valores iniciales revisables; no se inventa una fecha objetivo ni se cambian snapshots publicados.

Para un respaldo manual, detener la aplicación y copiar la carpeta data. Para restaurar, conservar la copia actual y arrancar con otra carpeta mediante PMO_DATA_DIR. No apuntar este incremento a la única copia de una base anterior.

## Verificación

```powershell
Set-Location backend
..\.venv\Scripts\python.exe -m pytest -q
Set-Location ..\frontend
npm run build
```

Resultado vigente: 72 pruebas backend, 17 frontend y TypeScript/Vite correctos. Ver docs/VERIFICATION_PHASE11.md para verificaciones visuales pendientes. [Verificación de fase 2](docs/VERIFICATION_PHASE2.md). Véase [verificación](docs/VERIFICATION.md) para el alcance y las advertencias heredadas.

## Documentación

- [Plan de integración](docs/INTEGRATION_PLAN.md)
- [Arquitectura implementada](docs/ARCHITECTURE.md)
- [Modelo de datos](docs/DATA_MODEL.md)
- [Contexto de continuidad](AI_CONTEXT.md)
- [Inventario de fuentes](docs/SOURCE_INVENTORY.md)

Rama principal: master. El servidor escucha en localhost; este incremento no incluye autenticación ni despliegue multiusuario.

El cronograma permite filtrar alertas y revisar fechas que se cruzan con sus predecesores. El análisis orientativo no modifica fechas. Ver docs/VERIFICATION_PHASE7.md.

Desde Cronograma puedes simular fechas y revisar holgura antes de aplicar los cambios. La aplicación actualiza el catálogo en una transacción y conserva los reportes publicados. Modelo: días naturales, duraciones completas, relaciones fin-inicio, sin recursos ni festivos. Ver docs/VERIFICATION_PHASE8.md.

Equipo incluye capacidad por fechas entre proyectos y organigrama compartido. Los trabajos admiten comentarios y asignación a iteraciones/releases mediante arrastre. Estado vigente y pendientes: docs/STATUS.md; verificación: docs/VERIFICATION_PHASE9.md.

Revisión UX/UI 0.10.0: alta rápida, edición progresiva e inline, equipo por tareas, Gantt jerárquico y biblioteca compartida de documentos. Alcance y verificación: [VERIFICATION_PHASE10](docs/VERIFICATION_PHASE10.md).

Revisión UX/UI 0.11.0: ficha display-to-edit, agenda con duración/movimiento confirmado, usuario local, documentos con autor/descripción y PDF/PNG del reporte. [Alcance y verificación](docs/VERIFICATION_PHASE11.md). Fase vigente 11, con comprobaciones visuales específicas pendientes; migración real de fase 5 pendiente.
