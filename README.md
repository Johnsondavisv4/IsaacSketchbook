# Isaac Sketchbook

Suite local de herramientas para modding de The Binding of Isaac pensada para trabajar con Photoshop, sprites en `public/` y una base de datos local con PouchDB.

## Herramientas

- `Dashboard`: punto de entrada del proyecto y acceso a todas las utilidades.
- `Asset Exporter`: exporta sprites desde la carpeta `public/` para usarlos como capas en Photoshop.
- `Post-it Generator`: genera post-its de completado con la misma tabla de marcas que usa el proyecto.
- `Progress Manager`: gestiona el progreso por personaje, guarda en PouchDB y exporta el estado completo a JSON o a JSX para Photoshop.

## Requisitos

- Node.js
- pnpm
- Adobe Photoshop para usar los scripts `.jsx`

## Instalación

Instala las dependencias desde la raíz del proyecto:

```bash
pnpm install
```

## Ejecución

Arranca el servidor local:

```bash
pnpm start
```

Luego abre:

```text
http://localhost:3000
```

## Rutas principales

- `/` -> Dashboard
- `/asset-exporter` -> Asset Exporter
- `/postit-generator` -> Post-it Generator
- `/progress-manager` -> Progress Manager

## Progress Manager

`Progress Manager` genera el catálogo de personajes desde mapas hardcodeados en el servidor y sincroniza el progreso en una base de datos local de PouchDB.

Comportamiento actual:

- Si la base está vacía, el servidor la siembra con los documentos por defecto.
- Si la base ya existe y tiene documentos, no la modifica.
- El progreso exportado a JSON se genera desde el estado cargado en el cliente.
- Judas normal conserva `sprite2` exclusivo para `Judas_03.png`.

## Estructura del proyecto

```text
.
├── package.json
├── players.xml
├── public/
└── src/
    ├── server.js
    ├── index.html
    ├── index.css
    ├── index.js
    ├── asset-exporter/
    ├── postit-generator/
    └── progress-manager/
```

## Notas

- Las herramientas están diseñadas para funcionar de forma local.
- Los sprites y los archivos de salida deben estar disponibles dentro de la estructura del proyecto.
- Si cambias los sprites en `public/`, reinicia el servidor para regenerar el catálogo.

## Scripts

- `pnpm start` -> levanta `src/server.js`
