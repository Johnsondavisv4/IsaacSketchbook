import express from 'express';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const app = express();
const PORT = 3000;

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

app.use(express.static(path.join(__dirname)));

app.use('/public', express.static(path.join(__dirname, '..', 'public')));

app.get('/api/sprites', (req, res) => {
    const publicPath = path.join(__dirname, '..', 'public');

    if (!fs.existsSync(publicPath)) {
        fs.mkdirSync(publicPath);
        return res.json([]);
    }

    try {
        const files = fs.readdirSync(publicPath);
        const pngFiles = files.filter(file => path.extname(file).toLowerCase() === '.png');
        res.json(pngFiles);
    } catch (error) {
        res.status(500).json({ error: "No se pudo leer la carpeta public" });
    }
});

app.listen(PORT, () => {
    console.log(`==================================================`);
    console.log(`🎨 🚀 ¡TBOI - MODDING SUITE EN MARCHA! 🚀 🎨`);
    console.log(`==================================================`);
    console.log(`🏠 Dashboard Central : http://localhost:${PORT}`);
    console.log(`📁 Asset Exporter   : http://localhost:${PORT}/asset-exporter`);
    console.log(`📜 Post-it Generator : http://localhost:${PORT}/postit-generator`);
    console.log(`==================================================`);
    console.log(`💡 Usa Ctrl + C en esta terminal para apagar el servidor.`);
});