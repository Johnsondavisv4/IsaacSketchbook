# Isaac Sketchbook

Una suite local de herramientas de desarrollo y modding para **The Binding of Isaac**, diseñada específicamente para integrarse con **Adobe Photoshop**. Permite gestionar sprites, progreso de personajes y exportar todo mediante ExtendScript (`.jsx`) para inyección directa de capas.

---

## Características Principales

- **Dashboard Central**: Punto de entrada a todas las utilidades de la suite, con un sistema de "carrito" o cola de inyección compartida.
- **Asset Exporter**: Permite visualizar y añadir sprites (ubicados en `public/`) a la cola de exportación.
- **Post-it Generator**: Genera las clásicas notas (post-its) de marcas de completado del juego, listas para exportarse.
- **Progress Manager**: 
  - Gestión detallada del progreso por personaje (Normal y Tainted).
  - Guarda automáticamente en una base de datos local usando **PouchDB**.
  - Permite exportar el estado del progreso en formato `JSON` para backups, o generar el script `.jsx` para Photoshop.
- **Integración con Photoshop**: Todas las herramientas exportan a Photoshop mediante scripts `.jsx`. El código convierte las imágenes a base64, genera archivos temporales y los inserta de manera estructurada como capas directamente en tu documento activo.

---

## Requisitos

- [Node.js](https://nodejs.org/) (Versión 18+ recomendada)
- [pnpm](https://pnpm.io/) (Gestor de paquetes)
- **Adobe Photoshop** (Para ejecutar los scripts `.jsx` generados)

---

## Instalación y Ejecución

1. **Instala las dependencias** desde la raíz del proyecto:
   ```bash
   pnpm install
   ```

2. **Inicia el servidor local**:
   ```bash
   pnpm start
   ```

3. **Abre la aplicación** en tu navegador web:
   ```text
   http://localhost:3000
   ```

---

## Rutas y Navegación

Las herramientas se acceden desde el navegador en las siguientes rutas:

- `/` ➔ Dashboard
- `/asset-exporter` ➔ Herramienta de Sprites
- `/postit-generator` ➔ Generador de Marcas (Post-it)
- `/progress-manager` ➔ Gestor de Progreso

### Estructura de Directorios

```text
.
├── public/                 # Sprites y assets gráficos (.png)
├── src/
│   ├── server.js           # Servidor backend Express y configuración PouchDB
│   ├── index.html          # Interfaz del Dashboard
│   ├── index.css           # Estilos globales (Vanilla CSS)
│   ├── index.js            # Lógica del frontend y generación del script masivo JSX
│   ├── asset-exporter/     # Módulo de exportación de assets
│   ├── postit-generator/   # Módulo generador de post-its
│   └── progress-manager/   # Módulo gestor de progreso de personajes
└── package.json
```

---

## Lógica de Progreso y Catálogo

El **Progress Manager** carga un catálogo de personajes basándose en mapas internos (hardcodeados en el servidor). 
- **Base de Datos**: Si la base de datos PouchDB está vacía, se inicializa automáticamente con el progreso por defecto ("No Mark") para todos los personajes detectados.
- **Sprites**: Judas (ID 3) contiene un manejo especial (`sprite2`) reservado para variaciones de su asset (`Judas_03.png`).
- **Actualización de Sprites**: Si agregas nuevos sprites `.png` a la carpeta `public/`, debes reiniciar el servidor (`pnpm start`) para que el sistema los detecte.

---

## Stack Tecnológico

- **Backend**: Node.js, Express.
- **Base de Datos**: PouchDB local (instancia de servidor).
- **Frontend**: Vanilla JS, Vanilla CSS y HTML5 puro. (Sin frameworks como React o Vue).
- **Manejo de Estado UI**: Se utiliza `sessionStorage` (bajo la clave `tboi_sketchbook_cart`) para mantener la cola de inyección activa a medida que navegas entre las distintas páginas.
