# Contexto de Project Office Hub

## Producto y reglas

Project Office Hub será el producto maestro PMO. ResumenEjecutivoSemana se integrará como Seguimiento Ejecutivo dentro de cada proyecto. Arquitectura objetivo: React, TypeScript, Vite, FastAPI y SQLite, con separación de persistencia para permitir PostgreSQL más adelante.

Un solo catálogo de proyectos, personas, riesgos, hitos y actividades. Las importaciones generan propuestas revisables. Conservar originales, trazabilidad e histórico. Publicado significa inmutable; el estado actual de una entidad nunca modifica sus snapshots anteriores. No insertar datos de demostración automáticamente.

## Estado al 2026-10-02

- Repositorio privado `chimeco795/ProjectOfficeHub`, rama principal `master`.
- Analizadas estáticamente las dos bases de código recibidas. Plan detallado en `docs/INTEGRATION_PLAN.md`.
- No hay aplicación integrada todavía. Build y tests de baseline pendientes.
- Copias extraídas en `.reference/` ignoradas por Git. No alterar ni publicar las bases de datos o archivos de usuario presentes en referencias.
- PMO: HTML/JS, documento global, localStorage e IndexedDB; contratos TypeScript parciales.
- Semanal: React/FastAPI/sqlite3, esquema v2, registros JSON por corte, originales inmutables, publicación protegida en API y tres archivos de tests backend.

## Fuentes locales

- `D:/Archivos/Downloads/project-office-hub-v3-1-0 (1).zip`
- `D:/Archivos/ChatGPT/ResumenEjecutivoSemana.zip`

La raíz de código del segundo paquete es `ResumenEjecutivoSemana/ResumenEjecutivoSemanal/`.

## Siguiente incremento

Establecer baseline de pruebas y builds sobre copias aisladas. Después incorporar base React/FastAPI y ampliar Project maestro con metodología y fechas separadas, navegación PMO y persistencia relacional. Mantener tests y capacidades del módulo semanal. Seguir las fases y criterios de aceptación del plan; actualizar este contexto al cerrar cada incremento.
