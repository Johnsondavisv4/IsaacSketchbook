# 🎨 TBOI - Modding Suite

Central de comando, análisis y gestión de scripts para **Adobe Photoshop** y sincronización de partidas de Steam para **The Binding of Isaac: Repentance / Repentance+**.

Permite visualizar tu progreso oficial del juego, extraer recursos en pixel art a cualquier resolución sin pérdida de calidad y generar scripts automatizados de ExtendScript (`.jsx`) para construir gráficos, miniaturas y composiciones directamente en Photoshop.

---

## 🚀 Herramientas Principales

### 📈 1. Progress Manager
Sincronización directa y lectura automática de tus archivos de guardado binarios de Steam (`.dat`).
- **Compatibilidad Dual**:
  - **The Binding of Isaac: Repentance**: 637 logros oficiales y marcas clásicas Solo.
  - **The Binding of Isaac: Repentance+**: 641 logros oficiales con soporte para marcas cooperativas **Online**.
- **Selector de Partidas con SaveDrawings Dinámicos**:
  - Evaluación automática del estado de cada ranura de guardado (File 1, 2 y 3).
  - Previsualización animada interactiva idéntica a la pantalla oficial de selección del juego (*SaveSelectMenu*), reflejando hitos como *Golden God*, *Platinum God*, *1001%*, *1000000%*, *Dead God*, marcas de comprobación y contorno de la foto.
- **Pestaña de Personajes**:
  - Seguimiento de los 34 personajes (17 Normales y 17 Tainted).
  - Visualización dual de notas de completado (**Solo** y **Online Co-op**).
  - Exportación de scripts `.jsx` individuales (*Sprite*, *Post-it Solo*, *Post-it Online*) y *Packs combinados*.
- **Pestaña de Ítems**:
  - Matriz interactiva de los 717 coleccionables del juego.
  - Información de obtención y requisitos de desbloqueo.
- **Pestaña de Logros (Achievements)**:
  - Catálogo completo de los 641 logros con buscador en tiempo real.
  - Filtros rápidos por estado (*Unlocked* / *Locked*).
  - Inspector detallado con sprite en alta fidelidad y requisitos oficiales de desbloqueo.

---

### 📜 2. Post-it Generator
Diseñador visual interactivo de notas de completado con previsualización pixel-perfect en canvas (96 × 96 px).
- **Tipos de Personaje**: Soporte completo para notas de personajes **Normales** y **Tainted**.
- **Estados de Marca**: Configuración individual de las 12 marcas de jefes en 5 estados (*Sin marca*, *Normal Solo*, *Hard Solo*, *Normal Online*, *Hard Online*).
- **Estilos de fondo**: Visualización de marcas tenues o invisibles.
- **Atajos rápidos**: Botones para *Llenar Todo Hard Solo*, *Llenar Todo Hard Online* y *Limpiar Todo*.
- **Exportación**: Generación de scripts `.jsx` en resolución nativa (1x - 96px) o escalado HD (4x - 384px).

---

### 📁 3. Asset Exporter
Explorador visual de la biblioteca de sprites pixel art del juego con escalado por nearest-neighbor.
- **Categorías Organizadas**: *Trinkets*, *Coleccionables / Ítems*, *Personajes*, *Enemigos / Jefes*, *Marcas* y *Logros*.
- **Buscador y Filtro**: Filtrado en tiempo real por nombre de sprite y orden alfabético.
- **Escalado Personalizado**: Multiplicador de escala individual o masivo sin suavizado borroso.
- **Procesamiento por Lotes**: Selección múltiple y envío directo al Carrito de Inyección.

---

### 🎯 4. Mark Exporter
Extractor individual de marcas oficiales de completado de jefes (*Mom's Heart*, *Isaac*, *Satan*, *Blue Baby*, *The Lamb*, *Mega Satan*, *Boss Rush*, *Hush*, *Ultra Greed*, *Delirium*, *Mother* y *The Beast*).
- **Modos de Dificultad**: Normal Solo, Hard Solo, Normal Online y Hard Online.
- **Escalado Libre**: Multiplicadores desde 1x (16×16 px) hasta 200x (3200×3200 px).
- **Formatos de Salida**: Descarga directa en imagen **PNG** transparente o script **JSX** para Photoshop.

---

### 🛒 5. Carrito de Inyección
Cola global de elementos acumulados desde cualquiera de las herramientas.
- Permite combinar sprites, marcas y notas de completado en una sola sesión de trabajo.
- Genera un script maestro `.jsx` que crea el documento de Photoshop y coloca cada recurso en su propia capa nombrada y alineada.

---

## ⚙️ Sincronización con Archivos de Guardado (Steam)

La suite detecta y analiza automáticamente los archivos de partida ubicados en la carpeta de Steam:
```text
C:\Program Files (x86)\Steam\userdata\<TuSteamID>\250900\remote\
```

- **Repentance**: `rep_persistentgamedata1.dat`, `rep_persistentgamedata2.dat`, `rep_persistentgamedata3.dat`
- **Repentance+**: `rep+persistentgamedata1.dat`, `rep+persistentgamedata2.dat`, `rep+persistentgamedata3.dat`

Puedes cambiar en cualquier momento entre versión y archivo de guardado (File 1, 2 o 3) desde el botón de configuración de la barra superior. La modal de configuración analiza el progreso de cada ranura en tiempo real y renderiza los **SaveDrawings animados oficiales** con sus marcas y estados correspondientes.

---

## 🛠️ Stack Tecnológico

- **Framework**: [Remix](https://remix.run/) (React Router Full-Stack SSR)
- **UI**: [React 19](https://react.dev/)
- **Estilos**: [Tailwind CSS v4](https://tailwindcss.com/)
- **Iconografía**: [Bootstrap Icons](https://icons.getbootstrap.com/)
- **Lenguaje**: [TypeScript](https://www.typescriptlang.org/)
- **Gestor de Paquetes**: [pnpm](https://pnpm.io/)
- **Empaquetador**: [Vite](https://vitejs.dev/)

---

## 📦 Instalación y Comandos

```bash
# 1. Instalar todas las dependencias
pnpm install

# 2. Iniciar el servidor de desarrollo
pnpm dev

# 3. Comprobar tipos con TypeScript
pnpm typecheck

# 4. Compilar para producción
pnpm build

# 5. Iniciar el servidor de producción
pnpm start
```

La aplicación estará disponible de forma predeterminada en `http://localhost:5173`.

---

## 🖌️ Flujo de Trabajo en Adobe Photoshop

1. Exporta tu script individual o el lote completo desde el **Carrito de Inyección** para descargar un archivo con extensión `.jsx`.
2. Abre **Adobe Photoshop**.
3. Dirígete al menú: **Archivo > Secuencias de comandos > Explorar...** (*File > Scripts > Browse...*).
4. Selecciona el archivo `.jsx` descargado.
5. Photoshop ejecutará el script ExtendScript automáticamente, creando el documento y posicionando cada capa con precisión pixel-perfect.
