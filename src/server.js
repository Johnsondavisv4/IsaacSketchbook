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

const db = new PouchDB(path.join(ROOT_DIR, POUCH_DB_NAME));

const PLAYER_LABELS = {
    1: 'Isaac',
    2: 'Magdalene',
    3: 'Cain',
    4: 'Judas',
    5: 'Blue Baby',
    6: 'Eve',
    7: 'Samson',
    8: 'Azazel',
    9: 'Lazarus',
    10: 'Eden',
    11: 'The Lost',
    12: 'Lilith',
    13: 'Keeper',
    14: 'Apollyon',
    15: 'The Forgotten',
    16: 'Bethany',
    17: 'Jacob and Esau',
    18: 'Isaac',
    19: 'Magdalene',
    20: 'Cain',
    21: 'Judas',
    22: 'Blue Baby',
    23: 'Eve',
    24: 'Samson',
    25: 'Azazel',
    26: 'Lazarus',
    27: 'Eden',
    28: 'The Lost',
    29: 'Lilith',
    30: 'Keeper',
    31: 'Apollyon',
    32: 'The Forgotten',
    33: 'Bethany',
    34: 'Jacob'
};

const SPRITE_FILES = {
    1: 'Isaac_01.png',
    2: 'Maggy_01.png',
    3: 'Cain_01.png',
    4: 'Judas_01.png',
    5: 'Blue_Baby_01.png',
    6: 'Eve_01.png',
    7: 'Samson_01.png',
    8: 'Azazel_01.png',
    9: 'Lazarus_01.png',
    10: 'Eden_01.png',
    11: 'The_Lost_01.png',
    12: 'Lilith_01.png',
    13: 'Keeper_01.png',
    14: 'Apollyon_01.png',
    15: 'The_Forgotten_01.png',
    16: 'Bethany_01.png',
    17: 'Jacob_and_Esau_01.png',
    18: 'Isaac_02.png',
    19: 'Maggy_02.png',
    20: 'Cain_02.png',
    21: 'Judas_02.png',
    22: 'Blue_Baby_02.png',
    23: 'Eve_02.png',
    24: 'Samson_02.png',
    25: 'Azazel_02.png',
    26: 'Lazarus_02.png',
    27: 'Eden_02.png',
    28: 'The_Lost_02.png',
    29: 'Lilith_02.png',
    30: 'Keeper_02.png',
    31: 'Apollyon_02.png',
    32: 'The_Forgotten_02.png',
    33: 'Bethany_02.png',
    34: 'Jacob_02.png'
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
        if (!Number.isFinite(id)) {
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
            tipo: id <= 17 ? 'normal' : 'tainted',
            sprite,
            ...(id === 4 ? { sprite2: 'Judas_03.png' } : {})
        });
    }

    return catalog.sort((a, b) => a.id - b.id);
}

function createEmptyMarks() {
    return { ...MARK_TEMPLATE };
}

function isHardMark(value) {
    return value === 'Hard' || value === 'Online Hard';
}

function normalizeProgressDoc(doc, catalogEntry) {
    const marcasNormalized = {
        ...createEmptyMarks(),
        ...Object.fromEntries(
            Object.entries(doc?.marcas || {}).map(([key, value]) => [key, normalizeMarkValue(value)])
        )
    };

    const completado = Object.values(marcasNormalized).length === 12 &&
        Object.values(marcasNormalized).every(isHardMark);

    return {
        id: catalogEntry.id,
        _id: catalogEntry._id,
        nombre: catalogEntry.nombre,
        tipo: catalogEntry.tipo,
        sprite: catalogEntry.sprite,
        ...(catalogEntry.sprite2 ? { sprite2: catalogEntry.sprite2 } : {}),
        Completado: completado,
        marcas: marcasNormalized
    };
}

function getCatalogEntryByProgressId(id) {
    const numericId = Number(String(id).replace(/^progreso_/, ''));
    if (!Number.isFinite(numericId)) {
        return null;
    }

    return catalogCache.find((entry) => entry.id === numericId) || null;
}

function hasAll12HardMarks(doc) {
    if (!doc || !doc.marcas) return false;
    const values = Object.values(doc.marcas);
    return values.length === 12 && values.every(isHardMark);
}

async function getStateDoc() {
    const keys = ['estado_0', ...catalogCache.map((entry) => entry._id)];
    const result = await db.allDocs({ include_docs: true, keys });

    const docMap = new Map();
    for (const row of result.rows) {
        if (row.doc) {
            docMap.set(row.id, row.doc);
        }
    }

    const storedState = docMap.get('estado_0') || null;
    const progressDocs = catalogCache.map((entry) => {
        const storedDoc = docMap.get(entry._id) || null;
        return normalizeProgressDoc(storedDoc, entry);
    });

    const normalDocs = progressDocs.filter(d => d.tipo === 'normal');
    const totalNormales = normalDocs.length;
    const totalPersonajes = progressDocs.length;

    const megaBlastHardCount = normalDocs.filter(d => isHardMark(d.marcas?.['Mega Satan'])).length;
    const megaMushCount = normalDocs.filter(d => hasAll12HardMarks(d)).length;
    const deathCertificateCount = progressDocs.filter(d => hasAll12HardMarks(d)).length;

    const storedMenu = storedState && (storedState['Menu Actual'] || storedState.MenuActual);
    const menuActual = (storedMenu === 'tainted' || storedMenu === 'normal')
        ? storedMenu
        : 'normal';

    return {
        id: 0,
        _id: 'estado_0',
        'Menu Actual': menuActual,
        'Mega Blast': `${megaBlastHardCount}/${totalNormales}`,
        'Mega Mush': `${megaMushCount}/${totalNormales}`,
        'Death Certificate': `${deathCertificateCount}/${totalPersonajes}`
    };
}

async function saveStateDoc(menuActualInput) {
    const menuActual = menuActualInput === 'tainted' ? 'tainted' : 'normal';
    const existing = await db.get('estado_0').catch(e => (e.status === 404 ? null : Promise.reject(e)));

    const docToSave = {
        id: 0,
        _id: 'estado_0',
        'Menu Actual': menuActual
    };

    if (existing && existing._rev) {
        docToSave._rev = existing._rev;
    }

    await db.put(docToSave);
    return getStateDoc();
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
    let docsToCreate = [];

    if (fs.existsSync(backupPath)) {
        try {
            const backupDocs = JSON.parse(fs.readFileSync(backupPath, 'utf8'));
            if (Array.isArray(backupDocs) && backupDocs.length > 0) {
                const backupStateDoc = backupDocs.find(d => d && d._id === 'estado_0');
                const storedMenu = backupStateDoc ? (backupStateDoc['Menu Actual'] || backupStateDoc.MenuActual) : 'normal';

                docsToCreate.push({
                    id: 0,
                    _id: 'estado_0',
                    'Menu Actual': storedMenu === 'tainted' ? 'tainted' : 'normal'
                });

                const backupDocsMap = new Map();
                for (const d of backupDocs) {
                    if (d && d._id && d._id !== 'estado_0') {
                        backupDocsMap.set(d._id, d);
                    }
                }

                for (const catalogEntry of catalogCache) {
                    const existingBackupDoc = backupDocsMap.get(catalogEntry._id);
                    const normalized = normalizeProgressDoc(existingBackupDoc || null, catalogEntry);
                    delete normalized._rev;
                    docsToCreate.push(normalized);
                }
                console.log('Base de datos inicializada desde el archivo de backup local.');
            }
        } catch (error) {
            console.error('Error al intentar leer el backup inicial, usando seeder por defecto', error);
            docsToCreate = [];
        }
    }

    if (docsToCreate.length === 0) {
        console.log('Inicializando base de datos con valores por defecto (No Marks, contadores en 0).');
        docsToCreate = [
            { id: 0, _id: 'estado_0', 'Menu Actual': 'normal' },
            ...catalogCache.map((entry) => normalizeProgressDoc(null, entry))
        ];
    }

    await db.bulkDocs(docsToCreate);
}

app.use(express.static(path.join(__dirname)));

app.use('/progress-manager', express.static(path.join(__dirname, 'progress-manager')));
app.use('/progress-manager-beta', express.static(path.join(__dirname, 'progress-manager-beta')));
app.use('/mark-exporter', express.static(path.join(__dirname, 'mark-exporter')));
app.use('/asset-exporter', express.static(path.join(__dirname, 'asset-exporter')));

app.use('/public', express.static(path.join(__dirname, '..', 'public')));

app.use(express.json({ limit: '2mb' }));

app.get('/progress-manager', (req, res) => {
    res.redirect('/progress-manager/');
});

app.get('/progress-manager-beta', (req, res) => {
    res.redirect('/progress-manager-beta/');
});

app.get('/mark-exporter', (req, res) => {
    res.redirect('/mark-exporter/');
});

app.get('/asset-exporter', (req, res) => {
    res.redirect('/asset-exporter/');
});

app.get('/api/catalogo-progreso', (req, res) => {
    res.json(refreshCatalogCache());
});

app.get('/api/estado', async (req, res) => {
    try {
        res.json(await getStateDoc());
    } catch (error) {
        console.error('Error obteniendo estado', error);
        res.status(500).json({ error: 'No se pudo obtener el estado' });
    }
});

app.post('/api/estado', async (req, res) => {
    try {
        const menuActual = req.body?.['Menu Actual'] || req.body?.MenuActual;
        const updated = await saveStateDoc(menuActual);
        res.json(updated);
    } catch (error) {
        console.error('Error guardando estado', error);
        res.status(500).json({ error: 'No se pudo guardar el estado' });
    }
});

async function getAllProgressDocs() {
    const keys = catalogCache.map((entry) => entry._id);
    const result = await db.allDocs({ include_docs: true, keys });

    const docMap = new Map();
    for (const row of result.rows) {
        if (row.doc) {
            docMap.set(row.id, row.doc);
        }
    }

    return catalogCache.map((entry) => {
        const storedDoc = docMap.get(entry._id) || null;
        return normalizeProgressDoc(storedDoc, entry);
    });
}

app.get('/api/progreso/export', async (req, res) => {
    try {
        res.json(await getAllProgressDocs());
    } catch (error) {
        console.error('Error exportando progreso', error);
        res.status(500).json({ error: 'No se pudo exportar el progreso' });
    }
});

app.post('/api/progreso/export-local', async (req, res) => {
    try {
        const stateDoc = await getStateDoc();
        const docs = await getAllProgressDocs();
        const cleanDocs = [
            stateDoc,
            ...docs.map(doc => {
                const copy = { ...doc };
                delete copy._rev;
                return copy;
            })
        ];
        const backupPath = path.join(ROOT_DIR, 'isaac_progress_manager_backup.json');

        if (fs.existsSync(backupPath)) {
            fs.unlinkSync(backupPath);
        }

        fs.writeFileSync(backupPath, JSON.stringify(cleanDocs, null, 2), 'utf-8');
        res.json({ message: 'Backup guardado exitosamente en la raíz' });
    } catch (error) {
        console.error('Error escribiendo backup en disco', error);
        res.status(500).json({ error: 'No se pudo guardar el archivo' });
    }
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

function getAllPngFiles(dir, baseDir = dir) {
    let results = [];
    if (!fs.existsSync(dir)) return results;

    const entries = fs.readdirSync(dir, { withFileTypes: true });

    for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);
        if (entry.isDirectory()) {
            results = results.concat(getAllPngFiles(fullPath, baseDir));
        } else if (entry.isFile() && path.extname(entry.name).toLowerCase() === '.png') {
            const relativePath = path.relative(baseDir, fullPath).replace(/\\/g, '/');
            results.push(relativePath);
        }
    }

    return results;
}

app.get('/api/sprites', (req, res) => {
    const publicPath = path.join(ROOT_DIR, 'public');

    if (!fs.existsSync(publicPath)) {
        fs.mkdirSync(publicPath);
        return res.json([]);
    }

    try {
        const pngFiles = getAllPngFiles(publicPath);
        res.json(pngFiles);
    } catch (error) {
        console.error('Error leyendo la carpeta public y subcarpetas', error);
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