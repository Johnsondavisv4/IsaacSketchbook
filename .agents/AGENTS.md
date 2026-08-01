# Isaac Sketchbook - Agent Guidelines

Estas son las reglas y patrones arquitectónicos para el proyecto **Isaac Sketchbook**, una suite local de herramientas para modding de The Binding of Isaac.

## 1. Resumen del Proyecto y Arquitectura
- **Propósito:** Una suite de herramientas web locales (Dashboard, Asset Exporter, Post-it Generator, Progress Manager) diseñadas para exportar assets y estados hacia Adobe Photoshop mediante ExtendScript (`.jsx`).
- **Backend:** Node.js + Express (`src/server.js`). PouchDB se usa como base de datos local para guardar el progreso de los personajes.
- **Frontend:** Vanilla HTML, CSS y JS (sin frameworks como React o Vue).
- **Gestor de Paquetes:** `pnpm`.
- **Assets:** Los sprites y recursos gráficos se alojan en la carpeta `public/`.

## 2. Reglas Técnicas Principales
- **Tecnologías Web Vanilla:** Mantén el uso de Vanilla JS, HTML y CSS para el frontend. No introduzcas frameworks a menos que el usuario lo pida explícitamente.
- **Integración con Photoshop:** El objetivo principal de las herramientas es generar scripts `.jsx` que inyecten imágenes codificadas en base64 directamente en un documento activo de Adobe Photoshop. Usa `src/index.js` como referencia para ver cómo se genera y descarga este código.
- **Uso de PouchDB:** `Progress Manager` maneja el estado usando una instancia local de PouchDB en el servidor (`path.join(ROOT_DIR, 'isaac_progress_manager')`).
  - **ID 0 (`estado_0`)**: Guarda el menú activo (`"Menu Actual"`) y los indicadores globales calculados (`"Mega Blast"`, `"Mega Mush"`, `"Death Certificate"`).
  - **Personajes (`progreso_1` a `progreso_34`)**: IDs 1–17 para Normales y 18–34 para Tainted. Incluyen el campo booleano `"Completado": true|false` (calculado si las 12 marcas son `Hard` o `Online Hard`).
  - La base se inicializa desde `isaac_progress_manager_backup.json` solo si está vacía. Si no hay backup, se sembrará con la plantilla por defecto (marcas en `No Mark` y contadores en 0).
- **Restricciones del Servidor y API:**
  - El servidor se levanta localmente mediante `pnpm start` (que ejecuta `node src/server.js`).
  - Rutas globales y de estado: `/api/estado` (GET/POST).
  - Carga y backup masivo: `/api/progreso/export` (GET) y `/api/progreso/export-local` (POST).
  - **Orden de Rutas en Express**: Las rutas estáticas masivas (`/export`, `/export-local`) deben definirse **antes** que las rutas dinámicas parametrizadas (`/api/progreso/:id`).

## 3. Estructura de Directorios y Patrones
- `public/`: Ubica aquí cualquier nuevo sprite o asset de imagen. Asegúrate de que sean `.png`.
- `src/server.js`: Contiene la lógica principal del servidor Express y la BD.
- `src/index.*`: Archivos correspondientes al Dashboard y al sistema de carrito.
- Herramientas (`src/asset-exporter/`, `src/postit-generator/`, `src/progress-manager/`): Cada herramienta tiene su propia subcarpeta. Cualquier herramienta nueva debe seguir este patrón.

## 4. Gestión de Estado (Frontend)
- El sistema de "Carrito" o cola de inyección usa `sessionStorage` bajo la clave `tboi_sketchbook_cart` para compartir el estado entre las distintas herramientas antes de exportar masivamente a Photoshop.

## 5. Idioma y Documentación
- Toda la documentación (`README.md`), comentarios en código y el texto de la interfaz de usuario están en **Español**.
- Al crear nuevos elementos de UI, alertas o comentarios en el código, utiliza el **Español** para mantener la coherencia del proyecto.

## 6. Comandos Comunes
- Instalar dependencias: `pnpm install`
- Iniciar el proyecto: `pnpm start`
