const API_PROGRESS = '/api/beta/progress';
const PUBLIC_BASE = '/public';
const CHARACTER_SRC = `${PUBLIC_BASE}/Characters`;
const WIDGET_SRC = `${PUBLIC_BASE}/completion_widget.png`;

const MARKS = [
    { key: "Mom's Heart", label: "Mom's Heart", x: 22, y: 7, cx: 64, visible: true },
    { key: "Isaac", label: "Isaac", x: 34, y: 17, cx: 32, visible: true },
    { key: "Blue Baby", label: "Blue Baby (???", x: 49, y: 20, cx: 0, visible: true },
    { key: "Satan", label: "Satan", x: 25, y: 23, cx: 48, visible: true },
    { key: "The Lamb", label: "The Lamb", x: 37, y: 32, cx: 16, visible: true },
    { key: "Mega Satan", label: "Mega Satan", x: 54, y: 37, cx: 112, visible: true },
    { key: "Boss Rush", label: "Boss Rush", x: 14, y: 36, cx: 80, visible: true },
    { key: "Hush", label: "Hush", x: 11, y: 51, cx: 128, visible: true },
    { key: "Mother", label: "Mother", x: 27, y: 49, cx: 160, visible: true },
    { key: "The Beast", label: "The Beast", x: 41, y: 54, cx: 176, visible: true },
    { key: "Greed", label: "Greed / Ultra Greed", x: 64, y: 16, cx: 144, visible: true },
    { key: "Delirium", label: "Delirium", visible: false }
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

// Elementos DOM
const catalogList = document.getElementById('catalog-list');
const catalogCountPill = document.getElementById('catalog-count-pill');
const syncStatusPill = document.getElementById('sync-status-pill');
const settingsStatusPill = document.getElementById('settings-status-pill');
const settingsStatusText = document.getElementById('settings-status-text');

const settingsModal = document.getElementById('settings-modal');
const settingsCloseBtn = document.getElementById('settings-close-btn');
const settingsCancelBtn = document.getElementById('settings-cancel-btn');
const settingsSaveBtn = document.getElementById('settings-save-btn');
const previewSaveFilename = document.getElementById('preview-save-filename');
const previewSaveStatus = document.getElementById('preview-save-status');

const spriteChoiceModal = document.getElementById('sprite-choice-modal');
const spriteChoiceCloseBtn = document.getElementById('sprite-choice-close-btn');
const spriteChoiceGrid = document.getElementById('sprite-choice-grid');

const indicatorMegaBlast = document.getElementById('indicator-mega-blast');
const indicatorMegaMush = document.getElementById('indicator-mega-mush');
const indicatorDeathCert = document.getElementById('indicator-death-certificate');
const megaBlastValue = document.getElementById('mega-blast-value');
const megaMushValue = document.getElementById('mega-mush-value');
const deathCertValue = document.getElementById('death-certificate-value');

const widgetImage = new Image();
widgetImage.decoding = 'async';
widgetImage.src = WIDGET_SRC;

const spriteCache = new Map();

const state = {
    activeTab: 'characters',
    filter: 'normal',
    characters: [],
    achievements: [],
    items: [],
    settings: { version: 'Repentance+', slot: 1 },
    saveExists: false,
    widgetReady: false,
    spriteChoiceResolver: null
};

// ==========================================
// INFORMACIÓN Y VARIANTES DE SPRITES
// ==========================================

function getCharacterSpriteInfo(character) {
    const name = character.character;
    const baseSprite = name === 'Jacob & Esau' ? 'Jacob and Esau.png' : `${name}.png`;
    const variants = [];

    if (name === 'Judas') {
        variants.push({ key: 'dark_judas', title: 'Dark Judas', file: 'Dark Judas.png' });
    } else if (name === 'The Forgotten') {
        variants.push({ key: 'forgotten_soul', title: 'The Soul', file: 'The Forgotten soul.png' });
        variants.push({ key: 'forgotten_body', title: 'The Body', file: 'The Forgotten body.png' });
    } else if (name === 'Lilith') {
        variants.push({ key: 'lilith_a', title: 'Lilith (Alt)', file: 'Lilith a.png' });
    } else if (name === 'Jacob & Esau') {
        variants.push({ key: 'jacob', title: 'Jacob', file: 'Jacob.png' });
        variants.push({ key: 'esau', title: 'Esau', file: 'Esau.png' });
    } else if (name === 'Tainted Forgotten') {
        variants.push({ key: 't_forgotten_soul', title: 'Tainted Soul', file: 'Tainted Forgotten soul.png' });
        variants.push({ key: 't_forgotten_body', title: 'Tainted Body', file: 'Tainted Forgotten body.png' });
    } else if (name === 'Tainted Lazarus') {
        variants.push({ key: 't_lazarus_a', title: 'Tainted Lazarus A', file: 'Tainted Lazarus a.png' });
        variants.push({ key: 't_lazarus_b', title: 'Tainted Lazarus B', file: 'Tainted Lazarus b.png' });
    } else if (name === 'Tainted Lost') {
        variants.push({ key: 't_lost_b', title: 'Tainted Lost (Alt)', file: 'Tainted Lost b.png' });
    }

    return {
        sprite: baseSprite,
        hasVariants: variants.length > 0,
        variants
    };
}

// ==========================================
// UTILIDADES
// ==========================================

function getMarkDifficultyCode(val) {
    if (!val || val === 'None') return 0;
    if (val === 'Normal') return 1;
    if (val === 'Hard') return 2;
    if (val === 'Online Normal') return 3;
    if (val === 'Online Hard') return 4;
    return 0;
}

function countHardMarks(marksObj) {
    if (!marksObj) return 0;
    return Object.values(marksObj).filter(v => v === 'Hard' || v === 'Online Hard').length;
}

function countTotalMarks(marksObj) {
    if (!marksObj) return 0;
    return Object.values(marksObj).filter(v => v && v !== 'None').length;
}

async function fetchJson(url, options) {
    const response = await fetch(url, options);
    if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
    }
    return response.json();
}

function waitForImage(image) {
    if (image.complete && image.naturalWidth > 0) return Promise.resolve();
    return new Promise((resolve, reject) => {
        image.addEventListener('load', () => resolve(), { once: true });
        image.addEventListener('error', reject, { once: true });
    });
}

async function ensureWidgetReady() {
    if (state.widgetReady) return;
    await waitForImage(widgetImage);
    state.widgetReady = true;
}

function openModal(modal) {
    if (!modal) return;
    modal.hidden = false;
    requestAnimationFrame(() => modal.classList.add('is-open'));
}

function closeModal(modal) {
    if (!modal) return;
    modal.classList.remove('is-open');
    setTimeout(() => { modal.hidden = true; }, 180);
}

// ==========================================
// RENDERIZADO DE SPRITES Y POST-ITS
// ==========================================

function drawSpritePreview(canvas, src) {
    const ctx = canvas.getContext('2d');
    const targetW = canvas.width || 76;
    const targetH = canvas.height || 76;

    ctx.clearRect(0, 0, targetW, targetH);
    ctx.imageSmoothingEnabled = false;

    const render = (img) => {
        const w = img.naturalWidth || img.width;
        const h = img.naturalHeight || img.height;
        if (!w || !h) return;

        let scale;
        if (w > targetW || h > targetH) {
            scale = Math.min(targetW / w, targetH / h);
        } else {
            scale = Math.floor(Math.min(targetW / w, targetH / h));
            if (scale < 1) scale = 1;
        }

        const drawW = w * scale;
        const drawH = h * scale;
        const posX = Math.floor((targetW - drawW) / 2);
        const posY = Math.floor((targetH - drawH) / 2);

        ctx.clearRect(0, 0, targetW, targetH);
        ctx.imageSmoothingEnabled = false;
        ctx.drawImage(img, 0, 0, w, h, posX, posY, drawW, drawH);
    };

    if (spriteCache.has(src)) {
        const cachedImg = spriteCache.get(src);
        if (cachedImg.complete) {
            render(cachedImg);
        } else {
            cachedImg.addEventListener('load', () => render(cachedImg), { once: true });
        }
    } else {
        const img = new Image();
        img.decoding = 'async';
        img.onload = () => {
            spriteCache.set(src, img);
            render(img);
        };
        img.src = src;
    }
}

function drawPostitOnCanvas(canvas, character, marksObj) {
    const context = canvas.getContext('2d');
    if (!context || !state.widgetReady) return;

    const scale = canvas.width / 96;
    context.clearRect(0, 0, canvas.width, canvas.height);
    context.imageSmoothingEnabled = false;
    context.globalAlpha = 1;

    const typeOffset = character.tainted ? 5 : 0;
    const deliriumCode = getMarkDifficultyCode(marksObj?.['Delirium']);
    const paperIdx = Math.max(0, Math.min(PAPER_CROPS.length - 1, typeOffset + deliriumCode));
    const paper = PAPER_CROPS[paperIdx];

    if (paper) {
        context.drawImage(widgetImage, paper.x, paper.y, 96, 96, 0, 0, canvas.width, canvas.height);
    }

    for (const mark of MARKS) {
        if (!mark.visible) continue;
        const markVal = marksObj?.[mark.key];
        const code = getMarkDifficultyCode(markVal);
        if (code === 0) continue;

        context.globalAlpha = STATE_ALPHA[code] || 1;
        context.drawImage(
            widgetImage,
            mark.cx,
            STATE_Y_CROP[code],
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

function updateIndicators() {
    const normalChars = state.characters.filter(c => !c.tainted);
    const allChars = state.characters;

    const megaBlastCount = normalChars.filter(c => {
        const ms = c.soloMarks?.['Mega Satan'];
        return ms === 'Hard' || ms === 'Online Hard';
    }).length;
    if (megaBlastValue) megaBlastValue.textContent = `${megaBlastCount}/17`;

    const megaMushCount = normalChars.filter(c => countHardMarks(c.soloMarks) === 12).length;
    if (megaMushValue) megaMushValue.textContent = `${megaMushCount}/17`;

    const deathCertCount = allChars.filter(c => countHardMarks(c.soloMarks) === 12).length;
    if (deathCertValue) deathCertValue.textContent = `${deathCertCount}/34`;

    const isNormal = state.filter === 'normal';
    if (indicatorMegaBlast) indicatorMegaBlast.hidden = !isNormal;
    if (indicatorMegaMush) indicatorMegaMush.hidden = !isNormal;
}

function getFilteredCharacters() {
    return state.characters.filter(c => state.filter === 'tainted' ? c.tainted : !c.tainted);
}

function renderCatalog() {
    if (!catalogList) return;
    catalogList.innerHTML = '';

    const list = getFilteredCharacters();
    catalogCountPill.textContent = `${list.length} personajes`;

    updateIndicators();

    for (const char of list) {
        const spriteInfo = getCharacterSpriteInfo(char);
        const row = document.createElement('div');
        row.className = 'catalog-row catalog-row--dual';

        const soloCount = countTotalMarks(char.soloMarks);
        const soloHard = countHardMarks(char.soloMarks);
        const onlineCount = countTotalMarks(char.onlineMarks);
        const onlineHard = countHardMarks(char.onlineMarks);

        row.innerHTML = `
            <div class="thumb-pair">
                <div class="thumb-container thumb-container--character">
                    <canvas class="sprite-thumb" width="85" height="85" aria-label="${char.character} sprite preview"></canvas>
                </div>
                <div class="thumb-container thumb-container--postit">
                    <canvas class="postit-thumb postit-thumb--solo" width="85" height="85" aria-label="${char.character} post-it solo preview"></canvas>
                </div>
                <div class="thumb-container thumb-container--postit">
                    <canvas class="postit-thumb postit-thumb--online" width="85" height="85" aria-label="${char.character} post-it online preview"></canvas>
                </div>
            </div>
            <div class="character-copy">
                <strong>${char.character}</strong>
                <span>${char.tainted ? 'Tainted' : 'Normal'}</span>
            </div>
            <div class="progress-split-badge">
                <div class="progress-split-item progress-split-item--solo">
                    <span>📜 Solo:</span>
                    <strong>${soloHard}/12 Hard</strong>
                </div>
                <div class="progress-split-item progress-split-item--online">
                    <span>🌐 Online:</span>
                    <strong>${onlineHard}/12 Hard</strong>
                </div>
            </div>
            <div class="row-actions">
                <div class="btn-group-download">
                    <button type="button" class="btn-opt btn-opt--sprite" data-action="download-sprite" data-id="${char.id}" title="Descargar Sprite en JSX">🖼️ Sprite</button>
                    <button type="button" class="btn-opt btn-opt--postit" data-action="download-solo" data-id="${char.id}" title="Descargar Post-it Solo en JSX">📜 Solo</button>
                    <button type="button" class="btn-opt btn-opt--online" data-action="download-online" data-id="${char.id}" title="Descargar Post-it Online en JSX">🌐 Online</button>
                    <button type="button" class="btn-opt btn-opt--full" data-action="download-full" data-id="${char.id}" title="Descargar Pack Completo">📦 Pack</button>
                </div>
            </div>
        `;

        const spriteCanvas = row.querySelector('.sprite-thumb');
        const soloCanvas = row.querySelector('.postit-thumb--solo');
        const onlineCanvas = row.querySelector('.postit-thumb--online');

        if (spriteCanvas) drawSpritePreview(spriteCanvas, `${CHARACTER_SRC}/${spriteInfo.sprite}`);
        if (soloCanvas) drawPostitOnCanvas(soloCanvas, char, char.soloMarks);
        if (onlineCanvas) drawPostitOnCanvas(onlineCanvas, char, char.onlineMarks);

        catalogList.appendChild(row);
    }
}

// ==========================================
// MODAL DE SELECCIÓN DE VARIANTE DE SPRITE
// ==========================================

function buildSpriteChoiceModal(character, spriteInfo) {
    if (!spriteChoiceGrid) return;
    spriteChoiceGrid.innerHTML = '';

    const choices = [
        {
            key: 'main',
            title: 'Versión principal',
            subtitle: spriteInfo.sprite,
            src: `${CHARACTER_SRC}/${spriteInfo.sprite}`
        }
    ];

    if (spriteInfo.variants) {
        spriteInfo.variants.forEach(v => {
            choices.push({
                key: v.key,
                title: v.title,
                subtitle: v.file,
                src: `${CHARACTER_SRC}/${v.file}`
            });
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
                resolver(choice.subtitle);
            }
        });

        spriteChoiceGrid.appendChild(button);
    }
}

function openSpriteChoice(character, spriteInfo) {
    return new Promise((resolve) => {
        state.spriteChoiceResolver = resolve;
        buildSpriteChoiceModal(character, spriteInfo);
        openModal(spriteChoiceModal);
    });
}

async function resolveSpriteForExport(character) {
    const spriteInfo = getCharacterSpriteInfo(character);
    if (spriteInfo.hasVariants) {
        const chosen = await openSpriteChoice(character, spriteInfo);
        if (!chosen) return null;
        return chosen;
    }
    return spriteInfo.sprite;
}

// ==========================================
// EXPORTADOR JSX (PHOTOSHOP BASE64)
// ==========================================

function fetchAndScaleSpriteBase64(src, scaleFactor = 10) {
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.onload = () => {
            const originalW = img.naturalWidth || img.width;
            const originalH = img.naturalHeight || img.height;

            const spriteCanvas = document.createElement('canvas');
            spriteCanvas.width = originalW * scaleFactor;
            spriteCanvas.height = originalH * scaleFactor;

            const ctx = spriteCanvas.getContext('2d');
            ctx.imageSmoothingEnabled = false;
            ctx.drawImage(img, 0, 0, originalW, originalH, 0, 0, spriteCanvas.width, spriteCanvas.height);

            const dataUrl = spriteCanvas.toDataURL('image/png');
            resolve(dataUrl.split(',')[1] || '');
        };
        img.onerror = () => reject(new Error(`No se pudo cargar la imagen: ${src}`));
        img.src = src;
    });
}

function buildJsxFromAssets(assets) {
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

// Descargas
async function handleDownloadSprite(charId) {
    const char = state.characters.find(c => c.id === charId);
    if (!char) return;

    try {
        const spriteFile = await resolveSpriteForExport(char);
        if (!spriteFile) return;

        const spriteBase64 = await fetchAndScaleSpriteBase64(`${CHARACTER_SRC}/${spriteFile}`, 10);
        const assets = [
            { name: `${char.character} - Sprite (${spriteFile.replace(/\.png$/i, '')})`, b64: spriteBase64 }
        ];

        const jsx = buildJsxFromAssets(assets);
        downloadTextFile(`${char.character.replace(/[\s&]+/g, '_')}_Sprite.jsx`, jsx);
        if (typeof mostrarToast === 'function') {
            mostrarToast(`Script JSX (Solo Sprite) exportado para ${char.character}.`, 'success');
        }
    } catch (error) {
        console.error(error);
        if (typeof mostrarToast === 'function') {
            mostrarToast(`No se pudo exportar el Sprite de ${char.character}.`, 'error');
        }
    }
}

async function handleDownloadSolo(charId) {
    const char = state.characters.find(c => c.id === charId);
    if (!char) return;

    try {
        await ensureWidgetReady();
        const postitCanvas = document.createElement('canvas');
        postitCanvas.width = 384;
        postitCanvas.height = 384;
        drawPostitOnCanvas(postitCanvas, char, char.soloMarks);

        const postitBase64 = postitCanvas.toDataURL('image/png').split(',')[1];
        const assets = [
            { name: `${char.character} - Post-it (Solo)`, b64: postitBase64 }
        ];

        const jsx = buildJsxFromAssets(assets);
        downloadTextFile(`${char.character.replace(/[\s&]+/g, '_')}_Postit_Solo.jsx`, jsx);
        if (typeof mostrarToast === 'function') {
            mostrarToast(`Script JSX (Post-it Solo) exportado para ${char.character}.`, 'success');
        }
    } catch (error) {
        console.error(error);
        if (typeof mostrarToast === 'function') {
            mostrarToast(`No se pudo exportar el Post-it Solo de ${char.character}.`, 'error');
        }
    }
}

async function handleDownloadOnline(charId) {
    const char = state.characters.find(c => c.id === charId);
    if (!char) return;

    try {
        await ensureWidgetReady();
        const postitCanvas = document.createElement('canvas');
        postitCanvas.width = 384;
        postitCanvas.height = 384;
        drawPostitOnCanvas(postitCanvas, char, char.onlineMarks);

        const postitBase64 = postitCanvas.toDataURL('image/png').split(',')[1];
        const assets = [
            { name: `${char.character} - Post-it (Online)`, b64: postitBase64 }
        ];

        const jsx = buildJsxFromAssets(assets);
        downloadTextFile(`${char.character.replace(/[\s&]+/g, '_')}_Postit_Online.jsx`, jsx);
        if (typeof mostrarToast === 'function') {
            mostrarToast(`Script JSX (Post-it Online) exportado para ${char.character}.`, 'success');
        }
    } catch (error) {
        console.error(error);
        if (typeof mostrarToast === 'function') {
            mostrarToast(`No se pudo exportar el Post-it Online de ${char.character}.`, 'error');
        }
    }
}

async function handleDownloadFull(charId) {
    const char = state.characters.find(c => c.id === charId);
    if (!char) return;

    try {
        const spriteFile = await resolveSpriteForExport(char);
        if (!spriteFile) return;

        await ensureWidgetReady();

        const soloCanvas = document.createElement('canvas');
        soloCanvas.width = 384;
        soloCanvas.height = 384;
        drawPostitOnCanvas(soloCanvas, char, char.soloMarks);
        const soloBase64 = soloCanvas.toDataURL('image/png').split(',')[1];

        const onlineCanvas = document.createElement('canvas');
        onlineCanvas.width = 384;
        onlineCanvas.height = 384;
        drawPostitOnCanvas(onlineCanvas, char, char.onlineMarks);
        const onlineBase64 = onlineCanvas.toDataURL('image/png').split(',')[1];

        const spriteBase64 = await fetchAndScaleSpriteBase64(`${CHARACTER_SRC}/${spriteFile}`, 10);

        const assets = [
            { name: `${char.character} - Post-it Solo`, b64: soloBase64 },
            { name: `${char.character} - Post-it Online`, b64: onlineBase64 },
            { name: `${char.character} - Sprite (${spriteFile.replace(/\.png$/i, '')})`, b64: spriteBase64 }
        ];

        const jsx = buildJsxFromAssets(assets);
        downloadTextFile(`${char.character.replace(/[\s&]+/g, '_')}_FullPack.jsx`, jsx);
        if (typeof mostrarToast === 'function') {
            mostrarToast(`Script JSX (Pack Completo) exportado para ${char.character}.`, 'success');
        }
    } catch (error) {
        console.error(error);
        if (typeof mostrarToast === 'function') {
            mostrarToast(`No se pudo exportar el Pack Completo de ${char.character}.`, 'error');
        }
    }
}

// Event Delegation
if (catalogList) {
    catalogList.addEventListener('click', (event) => {
        const button = event.target.closest('button[data-action]');
        if (!button) return;

        const charId = Number(button.dataset.id);
        const action = button.dataset.action;

        if (action === 'download-sprite') {
            handleDownloadSprite(charId);
        } else if (action === 'download-solo') {
            handleDownloadSolo(charId);
        } else if (action === 'download-online') {
            handleDownloadOnline(charId);
        } else if (action === 'download-full') {
            handleDownloadFull(charId);
        }
    });
}

// Cerrar modal de variantes
if (spriteChoiceCloseBtn) {
    spriteChoiceCloseBtn.addEventListener('click', () => {
        state.spriteChoiceResolver = null;
        closeModal(spriteChoiceModal);
    });
}

if (spriteChoiceModal) {
    spriteChoiceModal.addEventListener('click', (event) => {
        if (event.target === spriteChoiceModal) {
            state.spriteChoiceResolver = null;
            closeModal(spriteChoiceModal);
        }
    });
}

// ==========================================
// CONTROLADOR DE PESTAÑAS (TABS)
// ==========================================

function setupTabs() {
    const tabButtons = document.querySelectorAll('.main-tab-btn');
    tabButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            const targetTab = btn.getAttribute('data-tab');
            state.activeTab = targetTab;

            tabButtons.forEach(b => b.classList.toggle('active', b === btn));

            const tabCharacters = document.getElementById('tab-characters-content');
            const tabItems = document.getElementById('tab-items-content');
            const tabAchievements = document.getElementById('tab-achievements-content');

            if (tabCharacters) tabCharacters.hidden = targetTab !== 'characters';
            if (tabItems) tabItems.hidden = targetTab !== 'items';
            if (tabAchievements) tabAchievements.hidden = targetTab !== 'achievements';

            if (targetTab === 'items') {
                renderItemsCatalog();
            }
        });
    });
}

// ==========================================
// RENDERIZADO DE COLECCIONABLES (ITEMS)
// ==========================================

function getSpriteFilename(id, name) {
    const id3 = String(id).padStart(3, '0');
    const safeName = name
        .replace(/[<>:"/\\|*?]/g, '_')
        .replace(/\s+/g, '_')
        .trim();
    return `${id3}_${safeName}.png`;
}

function renderItemsCatalog() {
    const container = document.getElementById('items-collection-container');
    if (!container) return;

    let validItems = state.items.filter(i => i.id > 0);
    container.innerHTML = '';

    const PAGE_SIZE = 120;
    const ROW_SIZE = 20;
    const totalPages = Math.ceil(validItems.length / PAGE_SIZE);

    for (let p = 0; p < totalPages; p++) {
        const pageItems = validItems.slice(p * PAGE_SIZE, (p + 1) * PAGE_SIZE);

        const pageCard = document.createElement('div');
        pageCard.className = 'collection-page-card';
        pageCard.dataset.page = String(p + 1);

        const title = document.createElement('h2');
        title.className = 'collection-page-title';
        title.textContent = `PAGE ${p + 1}`;
        pageCard.appendChild(title);

        const grid = document.createElement('div');
        grid.className = 'collection-page-grid';

        for (const item of pageItems) {
            const itemFile = getSpriteFilename(item.id, item.name);
            const itemDiv = document.createElement('div');
            itemDiv.className = `collection-item ${item.seen ? 'is-seen' : 'is-unseen'}`;
            itemDiv.title = `#${item.id} - ${item.name}`;
            itemDiv.dataset.id = String(item.id);

            const img = document.createElement('img');
            img.className = 'collection-item__image';
            img.src = `/public/Items/${itemFile}`;
            img.alt = item.name;
            img.loading = 'lazy';
            img.decoding = 'async';

            itemDiv.appendChild(img);
            grid.appendChild(itemDiv);
        }

        pageCard.appendChild(grid);
        container.appendChild(pageCard);
    }
}

// ==========================================
// CONTROLADOR DE CONFIGURACIÓN (SETTINGS)
// ==========================================

async function loadSettingsAndProgress() {
    try {
        const data = await fetchJson(API_PROGRESS);
        state.settings = data.settings || { version: 'Repentance+', slot: 1, characterMenu: 'normal' };
        state.saveExists = data.saveExists;
        state.characters = data.characters || [];
        state.achievements = data.achievements || [];
        state.items = data.items || [];

        if (!data.configured) {
            syncStatusPill.textContent = 'Configuración requerida';
            syncStatusPill.classList.add('meta-pill--muted');
            if (settingsStatusText) settingsStatusText.textContent = '⚙️ Configurar Partida';
            if (settingsStatusPill) settingsStatusPill.classList.add('meta-pill--muted');
            if (catalogList) catalogList.innerHTML = '<div style="padding: 40px 20px; text-align: center; color: #888;">Configura tu versión y slot de guardado para comenzar.</div>';
            openSettingsModal();
            return;
        }

        updateSettingsHeaderBadge(data);

        if (state.settings && state.settings.characterMenu) {
            state.filter = state.settings.characterMenu === 'tainted' ? 'tainted' : 'normal';
            const radio = document.querySelector(`input[name="catalog-filter"][value="${state.filter}"]`);
            if (radio) radio.checked = true;
        }

        renderCatalog();
        if (state.activeTab === 'items') {
            renderItemsCatalog();
        }
        syncStatusPill.textContent = data.saveExists ? `Sincronizado: ${data.saveFile}` : 'Modo fuera de línea';
        syncStatusPill.classList.toggle('meta-pill--muted', !data.saveExists);
    } catch (e) {
        console.error('Error cargando progreso:', e);
        syncStatusPill.textContent = 'Error de sincronización';
    }
}

function updateSettingsHeaderBadge(data) {
    if (!settingsStatusText) return;

    if (data.configured) {
        const v = data.settings.version;
        const icon = v === 'Repentance+' ? '🟢' : '🔴';
        const statusIcon = data.saveExists ? '✔️' : '⚠️';
        settingsStatusText.textContent = `${icon} ${v} · Slot ${data.settings.slot} ${statusIcon}`;
        settingsStatusPill.classList.remove('meta-pill--muted');
    } else {
        settingsStatusText.textContent = '⚙️ Configurar Partida';
        settingsStatusPill.classList.add('meta-pill--muted');
    }
}

function openSettingsModal() {
    if (!settingsModal) return;

    const version = state.settings?.version || 'Repentance+';
    const slot = state.settings?.slot || 1;

    const versionRadio = document.querySelector(`input[name="setting-version"][value="${version}"]`);
    if (versionRadio) versionRadio.checked = true;

    const slotRadio = document.querySelector(`input[name="setting-slot"][value="${slot}"]`);
    if (slotRadio) slotRadio.checked = true;

    checkSettingsPreview();
    openModal(settingsModal);
}

function closeSettingsModal() {
    closeModal(settingsModal);
}

async function checkSettingsPreview() {
    const selectedVersion = document.querySelector('input[name="setting-version"]:checked')?.value || 'Repentance+';
    const selectedSlot = Number(document.querySelector('input[name="setting-slot"]:checked')?.value) || 1;

    const prefix = selectedVersion === 'Repentance+' ? 'rep+' : 'rep_';
    const expectedFilename = `${prefix}persistentgamedata${selectedSlot}.dat`;

    if (previewSaveFilename) previewSaveFilename.textContent = expectedFilename;
    if (previewSaveStatus) {
        previewSaveStatus.className = 'preview-status';
        previewSaveStatus.textContent = '🔍 Comprobando...';
    }

    try {
        const res = await fetch('/api/settings/check', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ version: selectedVersion, slot: selectedSlot })
        });
        const status = await res.json();

        if (previewSaveStatus) {
            if (status.exists) {
                previewSaveStatus.className = 'preview-status exists';
                previewSaveStatus.textContent = '✔️ Encontrado en Steam';
            } else {
                previewSaveStatus.className = 'preview-status missing';
                previewSaveStatus.textContent = '⚠️ No encontrado en Steam';
            }
        }
    } catch (e) {
        if (previewSaveStatus) {
            previewSaveStatus.className = 'preview-status';
            previewSaveStatus.textContent = 'Error al verificar';
        }
    }
}

async function saveSettingsFromModal() {
    const selectedVersion = document.querySelector('input[name="setting-version"]:checked')?.value || 'Repentance+';
    const selectedSlot = Number(document.querySelector('input[name="setting-slot"]:checked')?.value) || 1;

    try {
        settingsSaveBtn.disabled = true;
        settingsSaveBtn.textContent = 'Guardando...';

        const res = await fetch('/api/settings', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ version: selectedVersion, slot: selectedSlot })
        });
        const data = await res.json();

        if (data.ok) {
            closeSettingsModal();
            if (typeof mostrarToast === 'function') {
                mostrarToast(`Configuración guardada: ${data.settings.version} (Slot ${data.settings.slot})`, 'success');
            }
            await loadSettingsAndProgress();
        }
    } catch (e) {
        console.error(e);
        if (typeof mostrarToast === 'function') {
            mostrarToast('Error al guardar la configuración.', 'error');
        }
    } finally {
        settingsSaveBtn.disabled = false;
        settingsSaveBtn.textContent = '💾 Guardar Configuración';
    }
}

// Event Listeners
if (settingsStatusPill) settingsStatusPill.addEventListener('click', openSettingsModal);
if (settingsCloseBtn) settingsCloseBtn.addEventListener('click', closeSettingsModal);
if (settingsCancelBtn) settingsCancelBtn.addEventListener('click', closeSettingsModal);
if (settingsSaveBtn) settingsSaveBtn.addEventListener('click', saveSettingsFromModal);

document.querySelectorAll('input[name="setting-version"], input[name="setting-slot"]').forEach(input => {
    input.addEventListener('change', checkSettingsPreview);
});

document.querySelectorAll('input[name="catalog-filter"]').forEach(radio => {
    radio.addEventListener('change', (e) => {
        state.filter = e.target.value;
        renderCatalog();
        // Guardar menú actual en settings.json
        fetch('/api/settings', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ characterMenu: state.filter })
        }).catch(err => console.error('Error guardando menú en settings:', err));
    });
});

async function init() {
    setupTabs();
    await ensureWidgetReady();
    await loadSettingsAndProgress();
    document.querySelector('.workspace')?.classList.add('is-loaded');
}

init();