import express from 'express';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const app = express();
const PORT = 3000;

// En el modo "module" moderno no existen __dirname ni __filename de forma nativa.
// Usamos estas dos líneas estándar para recrearlos de manera matemática:
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Servir el index.html y assets de la raíz
app.use(express.static(path.join(__dirname)));
// Servir la carpeta public de forma estática para que el HTML pueda leer los sprites
app.use('/public', express.static(path.join(__dirname, 'public')));

// API ENDPOINT: Escanea la carpeta public y devuelve la lista de imágenes .png
app.get('/api/sprites', (req, res) => {
    const publicPath = path.join(__dirname, 'public');
    
    // Si la carpeta public no existe, la crea automáticamente
    if (!fs.existsSync(publicPath)) {
        fs.mkdirSync(publicPath);
        return res.json([]);
    }

    try {
        const files = fs.readdirSync(publicPath);
        // Filtramos para quedarnos estrictamente con archivos .png
        const pngFiles = files.filter(file => path.extname(file).toLowerCase() === '.png');
        res.json(pngFiles);
    } catch (error) {
        res.status(500).json({ error: "No se pudo leer la carpeta public" });
    }
});

app.listen(PORT, () => {
    console.log(`==================================================`);
    console.log(`🎮 Servidor de Sprites TBOI listo y corriendo!`);
    console.log(`🌐 Abre en tu navegador: http://localhost:${PORT}`);
    console.log(`==================================================`);
});