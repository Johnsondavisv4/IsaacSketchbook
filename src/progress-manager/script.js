const API_CATALOG = '/api/catalogo-progreso';
const API_PROGRESS = '/api/progreso';
const PUBLIC_BASE = '/public';
const WIDGET_SRC = `${PUBLIC_BASE}/completion_widget.png`;

const MARKS = [
    { key: 'Heart', label: 'Heart', x: 22, y: 7, cx: 64, visible: true },
    { key: 'Isaac', label: 'Isaac', x: 34, y: 17, cx: 32, visible: true },
    { key: '???', label: '???', x: 49, y: 20, cx: 0, visible: true },
    { key: 'Satan', label: 'Satan', x: 25, y: 23, cx: 48, visible: true },
    { key: 'The lamb', label: 'The Lamb', x: 37, y: 32, cx: 16, visible: true },
    { key: 'Mega Satan', label: 'Mega Satan', x: 54, y: 37, cx: 112, visible: true },
    { key: 'Boss Rush', label: 'Boss Rush', x: 14, y: 36, cx: 80, visible: true },
    { key: 'Hush', label: 'Hush', x: 11, y: 51, cx: 128, visible: true },
    { key: 'Mother', label: 'Mother', x: 27, y: 49, cx: 160, visible: true },
    { key: 'The Beast', label: 'The Beast', x: 41, y: 54, cx: 176, visible: true },
    { key: 'Ultra Greed', label: 'Ultra Greed', x: 64, y: 16, cx: 144, visible: true },
    { key: 'Delirium', label: 'Delirium', visible: false }
];

const MARK_STATE_LABELS = ['No Mark', 'Normal', 'Hard', 'Online Normal', 'Online Hard'];

const MARK_STATE_OPTIONS = [
    { value: 'No Mark', label: 'No Mark' },
    { value: 'Normal', label: 'Normal' },
    { value: 'Hard', label: 'Hard' },
    { value: 'Online Normal', label: 'Online Normal' },
    { value: 'Online Hard', label: 'Online Hard' }
];

const PAPER_CROPS = [
    { x: 0, y: 0 },
    { x: 0, y: 128 },
    { x: 0, y: 224 },
    { x: 192, y: 128 },
    { x: 192, y: 224 },
    { x: 96, y: 0 },
    { x: 96, y: 128 },
    { x: 96, y: 224 },
    { x: 288, y: 128 },
    { x: 288, y: 224 }
];

const STATE_Y_CROP = [112, 112, 96, 320, 336];
const STATE_ALPHA = [105 / 255, 1, 1, 1, 1];
const EMPTY_MARKS = {
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

const catalogList = document.getElementById('catalog-list');
const catalogCountPill = document.getElementById('catalog-count-pill');
const syncStatusPill = document.getElementById('sync-status-pill');
const editorModal = document.getElementById('editor-modal');
const editorTitle = document.getElementById('editor-modal-title');
const editorTypeBadge = document.getElementById('editor-type-badge');
const editorCloseBtn = document.getElementById('editor-close-btn');
const editorCancelBtn = document.getElementById('editor-cancel-btn');
const editorSaveBtn = document.getElementById('editor-save-btn');
const exportDbBtn = document.getElementById('export-db-btn');
const previewCanvas = document.getElementById('preview-canvas');
const marksTableBody = document.getElementById('marks-table-body');
const spriteChoiceModal = document.getElementById('sprite-choice-modal');
const spriteChoiceCloseBtn = document.getElementById('sprite-choice-close-btn');
const spriteChoiceGrid = document.getElementById('sprite-choice-grid');

const widgetImage = new Image();
widgetImage.decoding = 'async';
widgetImage.src = WIDGET_SRC;

const state = {
    filter: 'normal',
    catalog: [],
    progressById: new Map(),
    activeCharacter: null,
    activeDocument: null,
    spriteChoiceResolver: null,
    widgetReady: false,
    catalogReady: false
};

function clone(value) {
    return JSON.parse(JSON.stringify(value));
}

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

function createDefaultDocument(character) {
    const document = {
        id: character.id,
        _id: character._id,
        nombre: character.nombre,
        tipo: character.tipo,
        sprite: character.sprite,
        marcas: clone(EMPTY_MARKS)
    };

    if (character.sprite2) {
        document.sprite2 = character.sprite2;
    }

    return document;
}

function normalizeDocument(character, doc) {
    const base = createDefaultDocument(character);
    if (!doc) {
        return base;
    }

    const normalized = {
        ...base,
        ...doc,
        marcas: {
            ...clone(EMPTY_MARKS),
            ...Object.fromEntries(
                Object.entries(doc.marcas || {}).map(([key, value]) => [key, normalizeMarkValue(value)])
            )
        }
    };

    if (character.sprite2) {
        normalized.sprite2 = character.sprite2;
    } else {
        delete normalized.sprite2;
    }

    normalized.id = character.id;
    normalized._id = character._id;
    normalized.nombre = character.nombre;
    normalized.tipo = character.tipo;
    normalized.sprite = character.sprite;

    return normalized;
}

function hasSavedMarks(document) {
    return Boolean(document && document.marcas && Object.values(document.marcas).some((value) => normalizeMarkValue(value) !== 'No Mark'));
}

function hasAnyProgressDocument(document) {
    return Boolean(document && document._id);
}

function getMarkValue(document, key) {
    return MARK_STATE_LABELS.indexOf(normalizeMarkValue(document?.marcas?.[key]));
}

function getCharacterById(characterId) {
    return state.catalog.find((character) => character._id === characterId) || null;
}

function openModal(modal) {
    modal.hidden = false;
    requestAnimationFrame(() => modal.classList.add('is-open'));
}

function closeModal(modal) {
    modal.classList.remove('is-open');
    window.setTimeout(() => {
        modal.hidden = true;
    }, 180);
}

function mostrarToast(message, type = 'success') {
    let container = document.getElementById('toast-container');
    if (!container) {
        container = document.createElement('div');
        container.id = 'toast-container';
        container.className = 'toast-container';
        document.body.appendChild(container);
    }

    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.innerHTML = `
        <p class="toast__title">${type === 'error' ? 'Error' : type === 'info' ? 'Aviso' : 'Éxito'}</p>
        <p class="toast__message">${message}</p>
    `;

    container.appendChild(toast);
    requestAnimationFrame(() => toast.classList.add('is-visible'));

    window.setTimeout(() => {
        toast.classList.remove('is-visible');
        window.setTimeout(() => toast.remove(), 220);
    }, 3000);
}

window.mostrarToast = mostrarToast;

async function fetchJson(url, options) {
    const response = await fetch(url, options);
    if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
    }
    return response.json();
}

async function loadCatalog() {
    const catalog = await fetchJson(API_CATALOG);
    state.catalog = catalog;
    state.catalogReady = true;
    renderCatalog();
}

async function preloadProgressState() {
    const jobs = state.catalog.map(async (character) => {
        try {
            const doc = await fetch(`${API_PROGRESS}/${encodeURIComponent(character._id)}`);
            if (doc.status === 404) {
                return;
            }
            if (!doc.ok) {
                throw new Error(`HTTP ${doc.status}`);
            }
            const parsed = await doc.json();
            state.progressById.set(character._id, parsed);
        } catch (error) {
            console.error('No se pudo sincronizar el progreso', error);
        }
    });

    await Promise.allSettled(jobs);
    renderCatalog();
}

function getFilteredCatalog() {
    return state.catalog.filter((character) => character.tipo === state.filter);
}

function renderCatalog() {
    const catalog = getFilteredCatalog();
    catalogCountPill.textContent = `${catalog.length} personajes`;
    syncStatusPill.textContent = state.catalogReady ? 'PouchDB sembrada y sincronizada' : 'Cargando catálogo...';

    catalogList.innerHTML = '';

    if (!catalog.length) {
        const emptyRow = document.createElement('div');
        emptyRow.className = 'catalog-row';
        emptyRow.innerHTML = '<div class="character-copy"><strong>Sin resultados</strong><span>No hay personajes para este filtro.</span></div>';
        catalogList.appendChild(emptyRow);
        return;
    }

    for (const character of catalog) {
        const row = document.createElement('div');
        row.className = 'catalog-row';

        const saved = state.progressById.get(character._id) || null;
        const active = hasAnyProgressDocument(saved);
        const progressDocument = normalizeDocument(character, saved);

        row.innerHTML = `
            <div class="thumb-pair">
                <div class="thumb-container thumb-container--character">
                    <img class="sprite-thumb" src="${PUBLIC_BASE}/${character.sprite}" alt="${character.nombre}" loading="lazy" decoding="async">
                </div>
                <div class="thumb-container thumb-container--postit">
                    <canvas class="postit-thumb" width="85" height="85" aria-label="${character.nombre} post-it preview"></canvas>
                </div>
            </div>
            <div class="character-copy">
                <strong>${character.nombre}</strong>
                <span>${character.tipo} · ${character._id}</span>
            </div>
            <div class="save-indicator ${active ? 'is-active' : ''}" title="${active ? 'Progreso guardado' : 'Sin marcas guardadas'}">
                <span class="save-indicator__dot"></span>
                <span>${active ? 'Guardado' : 'Vacío'}</span>
            </div>
            <div class="row-actions">
                <button type="button" class="btn btn-secondary" data-action="edit" data-id="${character._id}">📝 Editar Post-it</button>
            </div>
            <div class="row-actions">
                <button type="button" class="btn btn-primary" data-action="download" data-id="${character._id}">⬇ Descargar .jsx</button>
            </div>
        `;

        catalogList.appendChild(row);

        const postitCanvas = row.querySelector('canvas.postit-thumb');
        if (postitCanvas) {
            drawPreview(postitCanvas.getContext('2d'), progressDocument, 85 / 96);
        }
    }
}

function buildMarkTable(progressDocument) {
    marksTableBody.innerHTML = '';

    MARKS.forEach((mark, index) => {
        const row = document.createElement('tr');
        row.className = 'mark-row';

        const nameCell = document.createElement('td');
        nameCell.textContent = mark.label;
        row.appendChild(nameCell);

        const groupName = mark.key === 'Delirium' ? 'mark-delirium' : `mark-${index}`;

        for (const option of MARK_STATE_OPTIONS) {
            const cell = document.createElement('td');

            const label = document.createElement('label');
            label.className = 'touch-label';

            const input = document.createElement('input');
            input.type = 'radio';
            input.name = groupName;
            input.value = String(option.value);
            input.checked = normalizeMarkValue(progressDocument?.marcas?.[mark.key]) === option.value;
            input.setAttribute('aria-label', `${mark.label} - ${option.label}`);

            input.addEventListener('change', () => {
                if (!state.activeDocument) {
                    return;
                }
                state.activeDocument.marcas[mark.key] = option.value;
                drawPreview(previewCanvas.getContext('2d'), state.activeDocument, 1);
            });

            label.appendChild(input);
            cell.appendChild(label);
            row.appendChild(cell);
        }

        marksTableBody.appendChild(row);
    });
}

function drawPreview(context, progressDocument, scale) {
    if (!widgetImage.complete) {
        return;
    }

    const canvasWidth = 96 * scale;
    const canvasHeight = 96 * scale;
    context.clearRect(0, 0, canvasWidth, canvasHeight);
    context.imageSmoothingEnabled = false;
    context.globalAlpha = 1;

    const typeOffset = progressDocument.tipo === 'tainted' ? 5 : 0;
    const deliriumValue = getMarkValue(progressDocument, 'Delirium');
    const paper = PAPER_CROPS[Math.max(0, Math.min(PAPER_CROPS.length - 1, typeOffset + deliriumValue))];

    if (paper) {
        context.drawImage(widgetImage, paper.x, paper.y, 96, 96, 0, 0, canvasWidth, canvasHeight);
    }

    for (const mark of MARKS) {
        if (!mark.visible) {
            continue;
        }

        const value = getMarkValue(progressDocument, mark.key);
        if (value === 0) {
            continue;
        }

        context.globalAlpha = STATE_ALPHA[value];
        context.drawImage(
            widgetImage,
            mark.cx,
            STATE_Y_CROP[value],
            16,
            16,
            mark.x * scale,
            mark.y * scale,
            16 * scale,
            16 * scale
        );
        context.globalAlpha = 1;
    }
}

function waitForImage(image) {
    if (image.complete && image.naturalWidth > 0) {
        return Promise.resolve();
    }

    return new Promise((resolve, reject) => {
        image.addEventListener('load', () => resolve(), { once: true });
        image.addEventListener('error', reject, { once: true });
    });
}

async function ensureWidgetReady() {
    if (state.widgetReady) {
        return;
    }

    await waitForImage(widgetImage);
    state.widgetReady = true;
}

async function openEditor(characterId) {
    const character = getCharacterById(characterId);
    if (!character) {
        return;
    }

    await ensureWidgetReady();
    const serverDoc = state.progressById.get(character._id) || null;

    state.activeCharacter = character;
    state.activeDocument = normalizeDocument(character, serverDoc);

    editorTitle.textContent = character.nombre;
    editorTypeBadge.textContent = character.tipo;

    buildMarkTable(state.activeDocument);
    drawPreview(previewCanvas.getContext('2d'), state.activeDocument, 1);
    openModal(editorModal);
}

function closeEditor() {
    state.activeCharacter = null;
    state.activeDocument = null;
    closeModal(editorModal);
}

async function saveCurrentDocument() {
    if (!state.activeCharacter || !state.activeDocument) {
        return;
    }

    editorSaveBtn.disabled = true;
    editorSaveBtn.textContent = 'Guardando...';

    try {
        const payload = clone(state.activeDocument);
        const saved = await fetchJson(API_PROGRESS, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(payload)
        });

        state.progressById.set(state.activeCharacter._id, saved);
        state.activeDocument = saved;
        renderCatalog();
        mostrarToast(`Progreso guardado para ${state.activeCharacter.nombre}.`, 'success');
        closeEditor();
    } catch (error) {
        console.error(error);
        mostrarToast(`No se pudo guardar el progreso de ${state.activeCharacter.nombre}.`, 'error');
    } finally {
        editorSaveBtn.disabled = false;
        editorSaveBtn.textContent = '💾 Guardar en Base de Datos';
    }
}

function blobToBase64(blob) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => {
            const result = String(reader.result || '');
            resolve(result.split(',')[1] || '');
        };
        reader.onerror = () => reject(reader.error || new Error('No se pudo leer el blob'));
        reader.readAsDataURL(blob);
    });
}

async function fetchImageBase64(src) {
    const response = await fetch(src);
    if (!response.ok) {
        throw new Error(`No se pudo cargar ${src}`);
    }

    return blobToBase64(await response.blob());
}

function buildJsxScript(character, selectedSprite, postitBase64, spriteBase64) {
    const assets = [
        { name: `${character.nombre} - Post-it`, b64: postitBase64 },
        { name: `${character.nombre} - Sprite (${selectedSprite.replace(/\.png$/i, '')})`, b64: spriteBase64 }
    ];

    return `
(function () {
    if (app.documents.length === 0) {
        alert("Debes abrir un documento activo antes de ejecutar este script.");
        return;
    }

    var docActivo = app.activeDocument;
    var assets = ${JSON.stringify(assets, null, 4)};

    function decodeB64(input) {
        var chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=";
        var output = "";
        var enc1, enc2, enc3, enc4;
        var chr1, chr2, chr3;
        var i = 0;

        while (i < input.length) {
            enc1 = chars.indexOf(input.charAt(i++));
            enc2 = chars.indexOf(input.charAt(i++));
            enc3 = chars.indexOf(input.charAt(i++));
            enc4 = chars.indexOf(input.charAt(i++));

            chr1 = (enc1 << 2) | (enc2 >> 4);
            chr2 = ((enc2 & 15) << 4) | (enc3 >> 2);
            chr3 = ((enc3 & 3) << 6) | enc4;

            output += String.fromCharCode(chr1);
            if (enc3 !== 64) output += String.fromCharCode(chr2);
            if (enc4 !== 64) output += String.fromCharCode(chr3);
        }

        return output;
    }

    function importLayer(asset, index) {
        var tempFile = new File(Folder.temp + "/tboi_progress_manager_" + index + ".png");
        tempFile.encoding = "binary";
        tempFile.open("w");
        tempFile.write(decodeB64(asset.b64));
        tempFile.close();

        var docTemporal = app.open(tempFile);
        docTemporal.activeLayer.duplicate(docActivo);
        docTemporal.saved = true;
        docTemporal.close();

        docActivo.activeLayer.name = asset.name;
        tempFile.remove();
    }

    for (var i = 0; i < assets.length; i++) {
        importLayer(assets[i], i);
    }
})();`;
}

function downloadTextFile(filename, content) {
    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
}

async function exportProgressDatabase() {
    if (!exportDbBtn) {
        return;
    }

    exportDbBtn.disabled = true;
    exportDbBtn.textContent = 'Exportando...';

    try {
        const docs = state.catalog.map((character) => {
            const savedDoc = state.progressById.get(character._id) || null;
            return normalizeDocument(character, savedDoc);
        });
        const filename = `isaac_progress_manager_${new Date().toISOString().slice(0, 10)}.json`;
        downloadTextFile(filename, JSON.stringify(docs, null, 2));
        mostrarToast('BDD exportada correctamente en JSON.', 'success');
    } catch (error) {
        console.error(error);
        mostrarToast('No se pudo exportar la BDD a JSON.', 'error');
    } finally {
        exportDbBtn.disabled = false;
        exportDbBtn.textContent = 'Exportar BDD JSON';
    }
}

function buildSpriteChoiceModal(character) {
    spriteChoiceGrid.innerHTML = '';

    const choices = [
        {
            key: 'sprite',
            title: 'Versión principal',
            subtitle: character.sprite,
            src: `${PUBLIC_BASE}/${character.sprite}`
        }
    ];

    if (character.sprite2) {
        choices.push({
            key: 'sprite2',
            title: 'Dark Judas',
            subtitle: character.sprite2,
            src: `${PUBLIC_BASE}/${character.sprite2}`
        });
    }

    for (const choice of choices) {
        const button = document.createElement('button');
        button.type = 'button';
        button.className = 'choice-button';
        button.innerHTML = `
            <img class="choice-button__image" src="${choice.src}" alt="${choice.title}" loading="lazy" decoding="async">
            <div class="choice-button__title">${choice.title}</div>
            <div class="choice-button__subtitle">${choice.subtitle}</div>
        `;

        button.addEventListener('click', () => {
            const resolver = state.spriteChoiceResolver;
            state.spriteChoiceResolver = null;
            closeModal(spriteChoiceModal);
            if (resolver) {
                resolver(choice.key);
            }
        });

        spriteChoiceGrid.appendChild(button);
    }
}

function openSpriteChoice(character) {
    return new Promise((resolve) => {
        state.spriteChoiceResolver = resolve;
        buildSpriteChoiceModal(character);
        openModal(spriteChoiceModal);
    });
}

async function exportCharacter(character, selectedSpriteKey) {
    try {
        const progressDocument = state.progressById.get(character._id) || createDefaultDocument(character);
        const normalized = normalizeDocument(character, progressDocument);

        const postitCanvas = document.createElement('canvas');
        postitCanvas.width = 384;
        postitCanvas.height = 384;
        const postitContext = postitCanvas.getContext('2d');

        await ensureWidgetReady();
        drawPreview(postitContext, normalized, 4);

        const selectedSprite = selectedSpriteKey === 'sprite2' ? character.sprite2 : character.sprite;
        const spriteBase64 = await fetchImageBase64(`${PUBLIC_BASE}/${selectedSprite}`);
        const postitBase64 = postitCanvas.toDataURL('image/png').split(',')[1];
        const jsx = buildJsxScript(character, selectedSprite, postitBase64, spriteBase64);

        downloadTextFile(`${character.nombre.replace(/\s+/g, '_')}_Progress_Manager.jsx`, jsx);
        mostrarToast(`Script JSX exportado para ${character.nombre}.`, 'success');
    } catch (error) {
        console.error(error);
        mostrarToast(`No se pudo exportar ${character.nombre}.`, 'error');
    }
}

async function handleDownload(characterId) {
    const character = getCharacterById(characterId);
    if (!character) {
        return;
    }

    let selectedSpriteKey = 'sprite';
    if (character.sprite2) {
        const choice = await openSpriteChoice(character);
        if (!choice) {
            mostrarToast('Exportación cancelada.', 'info');
            return;
        }
        selectedSpriteKey = choice;
    }

    await exportCharacter(character, selectedSpriteKey);
}

catalogList.addEventListener('click', (event) => {
    const button = event.target.closest('button[data-action]');
    if (!button) {
        return;
    }

    const characterId = button.dataset.id;
    if (button.dataset.action === 'edit') {
        openEditor(characterId);
    }

    if (button.dataset.action === 'download') {
        handleDownload(characterId);
    }
});

document.querySelectorAll('input[name="catalog-filter"]').forEach((input) => {
    input.addEventListener('change', () => {
        state.filter = input.value;
        renderCatalog();
    });
});

editorCloseBtn.addEventListener('click', closeEditor);
editorCancelBtn.addEventListener('click', closeEditor);
editorModal.addEventListener('click', (event) => {
    if (event.target === editorModal) {
        closeEditor();
    }
});

spriteChoiceCloseBtn.addEventListener('click', () => {
    const resolver = state.spriteChoiceResolver;
    state.spriteChoiceResolver = null;
    closeModal(spriteChoiceModal);
    if (resolver) {
        resolver(null);
    }
});

spriteChoiceModal.addEventListener('click', (event) => {
    if (event.target === spriteChoiceModal) {
        const resolver = state.spriteChoiceResolver;
        state.spriteChoiceResolver = null;
        closeModal(spriteChoiceModal);
        if (resolver) {
            resolver(null);
        }
    }
});

editorSaveBtn.addEventListener('click', saveCurrentDocument);
if (exportDbBtn) {
    exportDbBtn.addEventListener('click', exportProgressDatabase);
}

async function init() {
    try {
        await loadCatalog();
        syncStatusPill.textContent = 'Catálogo sincronizado';
        await preloadProgressState();
        await ensureWidgetReady();
        renderCatalog();
    } catch (error) {
        console.error(error);
        mostrarToast('No se pudo inicializar Progress Manager.', 'error');
    }
}

init();