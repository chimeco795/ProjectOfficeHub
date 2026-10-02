# Project Office Hub

Producto PMO con un catálogo maestro de proyectos y Seguimiento Ejecutivo dentro de cada proyecto. React + TypeScript + Vite, FastAPI y SQLite. Uso local en este incremento.

## Estado

Fases 0, 1 y 2 completadas el 2 de octubre de 2026: baseline, estructura unificada, proyecto maestro, migración a esquema 4 y navegación Portafolio → Proyecto → Seguimiento Ejecutivo. Se conserva el código y las pruebas del módulo semanal; la conciliación con entidades RAID, hitos y actividades maestras corresponde a fases posteriores.

El producto todavía no tiene integrados Board, Gantt, presupuesto, personas ni el resto de los módulos del PMO antiguo. Los ZIP originales permanecen intactos.

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

Datos locales en `data/pmo.sqlite3`, excluidos de Git. `PMO_DATA_DIR` permite utilizar otra carpeta. No se importaron bases ni documentos del usuario durante esta fase. Las pruebas de navegador usan `.test-data/browser` y no forman parte de la base normal.

Al iniciar se ejecutan las migraciones necesarias hasta esquema 4. La v3 agrega metodología, prioridad, fecha objetivo y fecha de actualización; la v4 protege publicaciones y guarda su serie histórica. Si contiene proyectos, se crea primero el respaldo `backup-v2-<fecha>.sqlite3` o `backup-v3-<fecha>.sqlite3`, según la migración. Los proyectos anteriores reciben Hybrid y prioridad Media como valores iniciales revisables; no se inventa una fecha objetivo ni se cambian snapshots publicados.

Para un respaldo manual, detener la aplicación y copiar la carpeta data. Para restaurar, conservar la copia actual y arrancar con otra carpeta mediante PMO_DATA_DIR. No apuntar este incremento a la única copia de una base anterior.

## Verificación

```powershell
Set-Location backend
..\.venv\Scripts\python.exe -m pytest -q
Set-Location ..\frontend
npm run build
```

Resultado actual: 31 pruebas backend correctas y compilación frontend correcta. [Verificación de fase 2](docs/VERIFICATION_PHASE2.md). Véase [verificación](docs/VERIFICATION.md) para el alcance y las advertencias heredadas.

## Documentación

- [Plan de integración](docs/INTEGRATION_PLAN.md)
- [Arquitectura implementada](docs/ARCHITECTURE.md)
- [Modelo de datos](docs/DATA_MODEL.md)
- [Contexto de continuidad](AI_CONTEXT.md)
- [Inventario de fuentes](docs/SOURCE_INVENTORY.md)

Rama principal: master. El servidor escucha en localhost; este incremento no incluye autenticación ni despliegue multiusuario.
