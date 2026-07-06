import express from 'express';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import PouchDB from 'pouchdb';

const app = express();
const PORT = 3000;

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.join(__dirname, '..');
const POUCH_DB_NAME = 'isaac_progress_manager';

const db = new PouchDB(POUCH_DB_NAME);

const OMITTED_PLAYER_IDS = new Set([11, 12, 17, 20, 38, 39, 40]);
const PLAYER_LABELS = {
    0: 'Isaac',
    1: 'Magdalene',
    2: 'Cain',
    3: 'Judas',
    4: 'Blue Baby',
    5: 'Eve',
    6: 'Samson',
    7: 'Azazel',
    8: 'Lazarus',
    9: 'Eden',
    10: 'The Lost',
    13: 'Lilith',
    14: 'Keeper',
    15: 'Apollyon',
    16: 'The Forgotten',
    18: 'Bethany',
    19: 'Jacob and Esau',
    21: 'Isaac',
    22: 'Magdalene',
    23: 'Cain',
    24: 'Judas',
    25: 'Blue Baby',
    26: 'Eve',
    27: 'Samson',
    28: 'Azazel',
    29: 'Lazarus',
    30: 'Eden',
    31: 'The Lost',
    32: 'Lilith',
    33: 'Keeper',
    34: 'Apollyon',
    35: 'The Forgotten',
    36: 'Bethany',
    37: 'Jacob'
};

const SPRITE_FILES = {
    0: 'Isaac_01.png',
    1: 'Maggy_01.png',
    2: 'Cain_01.png',
    3: 'Judas_01.png',
    4: 'Blue_Baby_01.png',
    5: 'Eve_01.png',
    6: 'Samson_01.png',
    7: 'Azazel_01.png',
    8: 'Lazarus_01.png',
    9: 'Eden_01.png',
    10: 'The_Lost_01.png',
    13: 'Lilith_01.png',
    14: 'Keeper_01.png',
    15: 'Apollyon_01.png',
    16: 'The_Forgotten_01.png',
    18: 'Bethany_01.png',
    19: 'Jacob_and_Esau_01.png',
    21: 'Isaac_02.png',
    22: 'Maggy_02.png',
    23: 'Cain_02.png',
    24: 'Judas_02.png',
    25: 'Blue_Baby_02.png',
    26: 'Eve_02.png',
    27: 'Samson_02.png',
    28: 'Azazel_02.png',
    29: 'Lazarus_02.png',
    30: 'Eden_02.png',
    31: 'The_Lost_02.png',
    32: 'Lilith_02.png',
    33: 'Keeper_02.png',
    34: 'Apollyon_02.png',
    35: 'The_Forgotten_02.png',
    36: 'Bethany_02.png',
    37: 'Jacob_02.png'
};

const MARK_TEMPLATE = {
    Heart: 'No Mark',
    Isaac: 'No Mark',
    '???': 'No Mark',
    Satan: 'No Mark',
    'The lamb': 'No Mark',
    'Mega Satan': 'No Mark',
    'Boss Rush': 'No Mark',
    Hush: 'No Mark',
    Mother: 'No Mark',
    'The Beast': 'No Mark',
    'Ultra Greed': 'No Mark',
    Delirium: 'No Mark'
};

const MARK_STATE_LABELS = ['No Mark', 'Normal', 'Hard', 'Online Normal', 'Online Hard'];

function normalizeMarkValue(value) {
    if (typeof value === 'number' && Number.isFinite(value)) {
        const index = Math.min(MARK_STATE_LABELS.length - 1, Math.max(0, value));
        return MARK_STATE_LABELS[index];
    }

    if (typeof value === 'string') {
        if (MARK_STATE_LABELS.includes(value)) {
            return value;
        }

        const numericValue = Number(value);
        if (Number.isFinite(numericValue)) {
            const index = Math.min(MARK_STATE_LABELS.length - 1, Math.max(0, numericValue));
            return MARK_STATE_LABELS[index];
        }
    }

    return MARK_STATE_LABELS[0];
}

function buildCatalogFromHardcodedMaps() {
    const catalog = [];

    for (const [idText, sprite] of Object.entries(SPRITE_FILES)) {
        const id = Number(idText);
        if (!Number.isFinite(id) || OMITTED_PLAYER_IDS.has(id)) {
            continue;
        }

        const nombre = PLAYER_LABELS[id];
        if (!nombre) {
            continue;
        }

        catalog.push({
            id,
            _id: `progreso_${id}`,
            nombre,
            tipo: id < 21 ? 'normal' : 'tainted',
            sprite,
            ...(id === 3 ? { sprite2: 'Judas_03.png' } : {})
        });
    }

    return catalog.sort((a, b) => a.id - b.id);
}

function createEmptyMarks() {
    return { ...MARK_TEMPLATE };
}

function normalizeProgressDoc(doc, catalogEntry) {
    const base = {
        id: catalogEntry.id,
        _id: catalogEntry._id,
        nombre: catalogEntry.nombre,
        tipo: catalogEntry.tipo,
        sprite: catalogEntry.sprite,
        marcas: createEmptyMarks()
    };

    if (catalogEntry.sprite2) {
        base.sprite2 = catalogEntry.sprite2;
    }

    if (!doc) {
        return base;
    }

    const normalized = {
        ...base,
        ...doc,
        marcas: {
            ...createEmptyMarks(),
            ...Object.fromEntries(
                Object.entries(doc.marcas || {}).map(([key, value]) => [key, normalizeMarkValue(value)])
            )
        }
    };

    if (catalogEntry.sprite2) {
        normalized.sprite2 = catalogEntry.sprite2;
    } else {
        delete normalized.sprite2;
    }

    normalized.id = catalogEntry.id;
    normalized._id = catalogEntry._id;
    normalized.nombre = catalogEntry.nombre;
    normalized.tipo = catalogEntry.tipo;
    normalized.sprite = catalogEntry.sprite;

    return normalized;
}

function getCatalogEntryByProgressId(id) {
    const numericId = Number(String(id).replace(/^progreso_/, ''));
    if (!Number.isFinite(numericId)) {
        return null;
    }

    return catalogCache.find((entry) => entry.id === numericId) || null;
}

let catalogCache = buildCatalogFromHardcodedMaps();

function refreshCatalogCache() {
    catalogCache = buildCatalogFromHardcodedMaps();
    return catalogCache;
}

async function seedDefaultProgressDocuments() {
    const info = await db.info();
    if (info.doc_count > 0) {
        return;
    }

    const backupPath = path.join(ROOT_DIR, 'isaac_progress_manager_backup.json');
    if (fs.existsSync(backupPath)) {
        try {
            const rawData = fs.readFileSync(backupPath, 'utf8');
            const backupDocs = JSON.parse(rawData);
            
            const docsToCreate = backupDocs.map(doc => {
                const catalogEntry = getCatalogEntryByProgressId(doc._id || '');
                if (catalogEntry) {
                    const normalized = normalizeProgressDoc(doc, catalogEntry);
                    delete normalized._rev;
                    return normalized;
                }
                return null;
            }).filter(Boolean);

            if (docsToCreate.length > 0) {
                await db.bulkDocs(docsToCreate);
                console.log('Base de datos inicializada desde el archivo de backup local.');
                return;
            }
        } catch (error) {
            console.error('Error al intentar leer el backup inicial', error);
        }
    }

    console.log('Inicializando base de datos con valores por defecto.');
    const docsToCreate = catalogCache.map((entry) => normalizeProgressDoc(null, entry));
    await db.bulkDocs(docsToCreate);
}

app.use(express.static(path.join(__dirname)));

app.use('/progress-manager', express.static(path.join(__dirname, 'progress-manager')));

app.use('/public', express.static(path.join(__dirname, '..', 'public')));

app.use(express.json({ limit: '2mb' }));

app.get('/progress-manager', (req, res) => {
    res.redirect('/progress-manager/');
});

app.get('/api/catalogo-progreso', (req, res) => {
    res.json(refreshCatalogCache());
});

app.get('/api/progreso/:id', async (req, res) => {
    const catalogEntry = getCatalogEntryByProgressId(req.params.id);

    if (!catalogEntry) {
        return res.status(404).json({ error: 'Personaje no encontrado' });
    }

    try {
        const storedDoc = await db.get(catalogEntry._id);
        return res.json(normalizeProgressDoc(storedDoc, catalogEntry));
    } catch (error) {
        if (error.status === 404) {
            return res.status(404).json({ error: 'No existe progreso guardado para este personaje' });
        }

        console.error('Error leyendo progreso', error);
        return res.status(500).json({ error: 'No se pudo leer el progreso' });
    }
});

app.get('/api/progreso/export', async (req, res) => {
    try {
        const docs = await Promise.all(catalogCache.map(async (entry) => {
            try {
                const storedDoc = await db.get(entry._id);
                return normalizeProgressDoc(storedDoc, entry);
            } catch (error) {
                if (error.status === 404) {
                    return normalizeProgressDoc(null, entry);
                }

                throw error;
            }
        }));

        return res.json(docs);
    } catch (error) {
        console.error('Error exportando progreso', error);
        return res.status(500).json({ error: 'No se pudo exportar el progreso' });
    }
});

app.post('/api/progreso/export-local', (req, res) => {
    const docs = req.body;
    if (!Array.isArray(docs)) {
        return res.status(400).json({ error: 'El payload debe ser un array de documentos' });
    }

    try {
        const backupPath = path.join(ROOT_DIR, 'isaac_progress_manager_backup.json');
        fs.writeFileSync(backupPath, JSON.stringify(docs, null, 2), 'utf-8');
        return res.json({ message: 'Backup guardado exitosamente en la raíz' });
    } catch (error) {
        console.error('Error escribiendo backup en disco', error);
        return res.status(500).json({ error: 'No se pudo guardar el archivo' });
    }
});

app.post('/api/progreso', async (req, res) => {
    const payload = req.body || {};
    const id = String(payload._id || '');
    const catalogEntry = getCatalogEntryByProgressId(id);

    if (!catalogEntry) {
        return res.status(400).json({ error: 'El _id no corresponde a un personaje válido' });
    }

    const normalized = normalizeProgressDoc(payload, catalogEntry);

    if (catalogEntry.sprite2) {
        normalized.sprite2 = catalogEntry.sprite2;
    }

    try {
        const existing = await db.get(catalogEntry._id).catch((error) => (error.status === 404 ? null : Promise.reject(error)));
        if (existing && existing._rev) {
            normalized._rev = existing._rev;
        }

        const result = await db.put(normalized);
        const savedDoc = await db.get(result.id);
        return res.json(normalizeProgressDoc(savedDoc, catalogEntry));
    } catch (error) {
        console.error('Error guardando progreso', error);
        return res.status(500).json({ error: 'No se pudo guardar el progreso' });
    }
});

app.get('/api/sprites', (req, res) => {
    const publicPath = path.join(ROOT_DIR, 'public');

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

async function startServer() {
    try {
        await seedDefaultProgressDocuments();
        app.listen(PORT, () => {
            console.log(`Servidor escuchando en http://localhost:${PORT}`);
        });
    } catch (error) {
        console.error('No se pudo inicializar la base de datos de progreso', error);
        app.listen(PORT, () => {
            console.log(`Servidor escuchando en http://localhost:${PORT}`);
        });
    }
}

startServer();