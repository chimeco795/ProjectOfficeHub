# Project Office Hub

Producto PMO con un catálogo maestro de proyectos y Seguimiento Ejecutivo dentro de cada proyecto. React + TypeScript + Vite, FastAPI y SQLite. Uso local en este incremento.

## Estado

Fases 0 y 1 completadas el 2 de octubre de 2026: baseline, estructura unificada, proyecto maestro, migración a esquema 3 y navegación Portafolio → Proyecto → Seguimiento Ejecutivo. Se conserva el código y las pruebas del módulo semanal; la conciliación con entidades RAID, hitos y actividades maestras corresponde a fases posteriores.

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

## Uso de la fase 1

1. Crear proyecto en Portafolio y definir metodología, prioridad, objetivo y fechas.
2. Abrir su resumen; editar la ficha guarda cambios con control de versión.
3. Entrar en Seguimiento Ejecutivo para consultar o crear cortes del proyecto.
4. La URL conserva proyecto, vista y corte al recargar o abrirla en otra pestaña.

Fecha objetivo, Go Live y cierre son campos independientes. Una publicación anterior conserva los datos de proyecto que tenía al publicarse.

## Datos y migraciones

Datos locales en `data/pmo.sqlite3`, excluidos de Git. `PMO_DATA_DIR` permite utilizar otra carpeta. No se importaron bases ni documentos del usuario durante esta fase. Las pruebas de navegador usan `.test-data/browser` y no forman parte de la base normal.

Al iniciar, el esquema v2 se migra a v3 agregando metodología, prioridad, fecha objetivo y fecha de actualización. Si contiene proyectos, se crea primero `backup-v2-<fecha>.sqlite3`. Los proyectos anteriores reciben Hybrid y prioridad Media como valores iniciales revisables; no se inventa una fecha objetivo ni se cambian snapshots publicados.

Para un respaldo manual, detener la aplicación y copiar la carpeta data. Para restaurar, conservar la copia actual y arrancar con otra carpeta mediante PMO_DATA_DIR. No apuntar este incremento a la única copia de una base anterior.

## Verificación

```powershell
Set-Location backend
..\.venv\Scripts\python.exe -m pytest -q
Set-Location ..\frontend
npm run build
```

Resultado de fase 1: 19 pruebas backend correctas y compilación frontend correcta. Véase [verificación](docs/VERIFICATION.md) para el alcance y las advertencias heredadas.

## Documentación

- [Plan de integración](docs/INTEGRATION_PLAN.md)
- [Arquitectura implementada](docs/ARCHITECTURE.md)
- [Modelo de datos](docs/DATA_MODEL.md)
- [Contexto de continuidad](AI_CONTEXT.md)
- [Inventario de fuentes](docs/SOURCE_INVENTORY.md)

Rama principal: master. El servidor escucha en localhost; este incremento no incluye autenticación ni despliegue multiusuario.
