// ==========================================
// ASSET EXPORTER - POLISHED SIDEBAR LAYOUT
// ==========================================

const filesContainer = document.getElementById('files-container-list');
const addToCartBtn = document.getElementById('add-to-cart-btn');
const selectAllMaster = document.getElementById('select-all-master');
const sortNameBtn = document.getElementById('sort-name-btn');
const sortDirectionIcon = document.getElementById('sort-direction-icon');
const selectedCounterBadge = document.getElementById('selected-counter-badge');
const sidebarTreeList = document.getElementById('sidebar-tree-list');
const sidebarTotalBadge = document.getElementById('sidebar-total-badge');
const currentFolderTitle = document.getElementById('current-folder-title');
const currentFolderCount = document.getElementById('current-folder-count');
const searchInput = document.getElementById('search-input');
const clearSearchBtn = document.getElementById('clear-search-btn');
const btnSelectFolder = document.getElementById('btn-select-folder');
const btnClearSelection = document.getElementById('btn-clear-selection');
const canvas = document.getElementById('processor-canvas');
const ctx = canvas.getContext('2d');

// App State
let allSprites = [];           // Array of strings: e.g. "Achievements/001_Magdalene.png"
let folderMap = new Map();     // folderName -> Array of files
let currentFolder = '';        // '' means All, or 'Achievements', 'Items', etc.
let searchQuery = '';
let ordenAscendente = true;

// Selections & Scale Overrides
const selectedFiles = new Set();
const fileScales = new Map();

// ==========================================
// 1. CARGA INICIAL DE SPRITES
// ==========================================

async function fetchSprites() {
    try {
        const response = await fetch('/api/sprites');
        allSprites = await response.json();

        if (allSprites.length === 0) {
            filesContainer.innerHTML = '<div class="empty-message">La carpeta /public está vacía. Guarda tus archivos .png ahí dentro.</div>';
            addToCartBtn.disabled = true;
            return;
        }

        buildFolderMap();
        renderSidebar();
        renderCurrentView();

    } catch (error) {
        console.error(error);
        filesContainer.innerHTML = '<div class="empty-message" style="color: var(--accent);">Error de enlace: No se pudo conectar con el servidor backend de Node.</div>';
    }
}

function buildFolderMap() {
    folderMap.clear();

    allSprites.forEach(filePath => {
        const parts = filePath.split('/');
        let folder = '(Raíz)';
        if (parts.length > 1) {
            folder = parts.slice(0, -1).join('/');
        }

        if (!folderMap.has(folder)) {
            folderMap.set(folder, []);
        }
        folderMap.get(folder).push(filePath);
    });

    sidebarTotalBadge.textContent = allSprites.length;
}

// ==========================================
// 2. PANEL LATERAL (SIDEBAR)
// ==========================================

function getFolderIcon(folderName) {
    const f = folderName.toLowerCase();
    if (f.includes('achievement')) return '🏆';
    if (f.includes('item') || f.includes('collectible')) return '📦';
    if (f.includes('character')) return '🧙‍♂️';
    if (f.includes('enemy') || f.includes('boss')) return '👾';
    if (f.includes('mark')) return '🎯';
    return '📁';
}

function renderSidebar() {
    sidebarTreeList.innerHTML = '';

    // Opción: "Todos los Sprites"
    const allItem = document.createElement('div');
    allItem.className = `tree-item ${currentFolder === '' ? 'active' : ''}`;
    allItem.innerHTML = `
        <div class="tree-item-name">
            <span>🌐</span>
            <span>Todos los Sprites</span>
        </div>
        <span class="tree-item-count">${allSprites.length}</span>
    `;
    allItem.addEventListener('click', () => {
        currentFolder = '';
        renderSidebar();
        renderCurrentView();
    });
    sidebarTreeList.appendChild(allItem);

    // Opciones para cada carpeta
    for (const [folder, files] of folderMap.entries()) {
        const item = document.createElement('div');
        item.className = `tree-item ${currentFolder === folder ? 'active' : ''}`;
        const icon = getFolderIcon(folder);

        item.innerHTML = `
            <div class="tree-item-name" title="${folder}">
                <span>${icon}</span>
                <span>${folder}</span>
            </div>
            <span class="tree-item-count">${files.length}</span>
        `;

        item.addEventListener('click', () => {
            currentFolder = folder;
            renderSidebar();
            renderCurrentView();
        });

        sidebarTreeList.appendChild(item);
    }
}

// Botón "Marcar Carpeta": Selecciona todos los visibles de la carpeta activa
btnSelectFolder.addEventListener('click', () => {
    const visibleFiles = getFilteredSprites();
    visibleFiles.forEach(f => selectedFiles.add(f));
    renderCurrentView();
    mostrarToast(`Se seleccionaron ${visibleFiles.length} sprites de esta vista.`, 'info');
});

// Botón "Limpiar Todo": Desmarca todas las selecciones
btnClearSelection.addEventListener('click', () => {
    selectedFiles.clear();
    renderCurrentView();
    mostrarToast('Selección limpiada.', 'info');
});

// ==========================================
// 3. BÚSQUEDA Y FILTRADO
// ==========================================

function handleSearch(query) {
    searchQuery = query.trim().toLowerCase();
    clearSearchBtn.style.display = searchQuery ? 'block' : 'none';
    renderCurrentView();
}

searchInput.addEventListener('input', (e) => handleSearch(e.target.value));
clearSearchBtn.addEventListener('click', () => {
    searchInput.value = '';
    handleSearch('');
});

function getFilteredSprites() {
    let list = [];

    if (currentFolder === '') {
        list = [...allSprites];
    } else {
        list = folderMap.get(currentFolder) || [];
    }

    if (searchQuery) {
        list = list.filter(filePath => filePath.toLowerCase().includes(searchQuery));
    }

    list.sort((a, b) => {
        return ordenAscendente ? a.localeCompare(b) : b.localeCompare(a);
    });

    return list;
}

// ==========================================
// 4. RENDERIZADO DE TABLA DE SPRITES
// ==========================================

function renderCurrentView() {
    const filtered = getFilteredSprites();

    // Actualizar encabezados
    const folderDisplayName = currentFolder === '' ? 'Todos los Sprites' : currentFolder;
    currentFolderTitle.textContent = folderDisplayName;
    currentFolderCount.textContent = `${filtered.length} elemento${filtered.length === 1 ? '' : 's'}`;

    if (filtered.length === 0) {
        filesContainer.innerHTML = `<div class="empty-message">No se encontraron archivos en "${folderDisplayName}" ${searchQuery ? `que coincidan con "${searchQuery}"` : ''}.</div>`;
        actualizarEstadoMasterCheckbox();
        actualizarBotonCarrito();
        return;
    }

    filesContainer.innerHTML = '';

    const fragment = document.createDocumentFragment();

    filtered.forEach(filePath => {
        const row = document.createElement('div');
        row.className = `repo-row ${selectedFiles.has(filePath) ? 'selected' : ''}`;

        const isChecked = selectedFiles.has(filePath);
        const scaleVal = fileScales.get(filePath) || 1;

        const parts = filePath.split('/');
        const fileName = parts[parts.length - 1];
        const folderName = parts.length > 1 ? parts.slice(0, -1).join('/') : '';

        row.innerHTML = `
            <div>
                <input type="checkbox" class="sprite-checkbox" value="${filePath}" ${isChecked ? 'checked' : ''}>
            </div>
            <div class="thumb-container">
                <canvas class="sprite-thumb" width="85" height="85" data-src="/public/${filePath}" aria-label="${filePath} preview"></canvas>
            </div>
            <div class="file-link-container">
                <span class="file-name-text" title="${filePath}">${fileName}</span>
                ${folderName ? `<span class="file-folder-badge">📁 ${folderName}</span>` : ''}
            </div>
            <div>
                <input type="number" class="row-scale-input" value="${scaleVal}" min="1" max="50" data-filepath="${filePath}">
            </div>
        `;

        const cb = row.querySelector('.sprite-checkbox');
        cb.addEventListener('change', () => {
            if (cb.checked) {
                selectedFiles.add(filePath);
                row.classList.add('selected');
            } else {
                selectedFiles.delete(filePath);
                row.classList.remove('selected');
            }
            actualizarEstadoMasterCheckbox();
            actualizarBotonCarrito();
        });

        row.addEventListener('click', (e) => {
            if (e.target.type !== 'checkbox' && !e.target.classList.contains('row-scale-input')) {
                cb.checked = !cb.checked;
                cb.dispatchEvent(new Event('change'));
            }
        });

        const scaleInput = row.querySelector('.row-scale-input');
        scaleInput.addEventListener('input', (e) => {
            const val = parseInt(e.target.value) || 1;
            fileScales.set(filePath, val);
        });

        fragment.appendChild(row);
    });

    filesContainer.appendChild(fragment);

    initLazyThumbnailRenderer();
    actualizarEstadoMasterCheckbox();
    actualizarBotonCarrito();
}

// ==========================================
// 5. MINIATURAS OPTIMIZADAS (LAZY RENDERING)
// ==========================================

const spriteCache = new Map();

function drawSpritePreview(canvas, src) {
    const targetW = canvas.width || 85;
    const targetH = canvas.height || 85;
    const canvasCtx = canvas.getContext('2d');

    canvasCtx.clearRect(0, 0, targetW, targetH);
    canvasCtx.imageSmoothingEnabled = false;

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

        canvasCtx.clearRect(0, 0, targetW, targetH);
        canvasCtx.imageSmoothingEnabled = false;
        canvasCtx.drawImage(img, 0, 0, w, h, posX, posY, drawW, drawH);
    };

    if (spriteCache.has(src)) {
        const cachedImg = spriteCache.get(src);
        if (cachedImg.complete) {
            render(cachedImg);
        } else {
            cachedImg.addEventListener('load', () => render(cachedImg));
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

let thumbnailObserver = null;

function initLazyThumbnailRenderer() {
    if (thumbnailObserver) {
        thumbnailObserver.disconnect();
    }

    thumbnailObserver = new IntersectionObserver((entries, observer) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                const canvasEl = entry.target;
                const src = canvasEl.dataset.src;
                if (src) {
                    drawSpritePreview(canvasEl, src);
                    observer.unobserve(canvasEl);
                }
            }
        });
    }, { root: document.getElementById('repo-box-panel'), rootMargin: '120px' });

    const allThumbCanvases = filesContainer.querySelectorAll('canvas.sprite-thumb');
    allThumbCanvases.forEach(c => thumbnailObserver.observe(c));
}

// ==========================================
// 6. ORDENACIÓN Y SELECCIÓN MASTER
// ==========================================

sortNameBtn.addEventListener('click', function () {
    ordenAscendente = !ordenAscendente;
    sortDirectionIcon.innerText = ordenAscendente ? "▲" : "▼";
    renderCurrentView();
});

selectAllMaster.addEventListener('change', function () {
    const visibleCheckboxes = filesContainer.querySelectorAll('.sprite-checkbox');
    const checked = selectAllMaster.checked;

    visibleCheckboxes.forEach(cb => {
        cb.checked = checked;
        const filePath = cb.value;
        const row = cb.closest('.repo-row');

        if (checked) {
            selectedFiles.add(filePath);
            if (row) row.classList.add('selected');
        } else {
            selectedFiles.delete(filePath);
            if (row) row.classList.remove('selected');
        }
    });

    actualizarBotonCarrito();
});

function actualizarEstadoMasterCheckbox() {
    const visibleCheckboxes = filesContainer.querySelectorAll('.sprite-checkbox');
    if (visibleCheckboxes.length === 0) {
        selectAllMaster.checked = false;
        return;
    }
    const checkedCount = filesContainer.querySelectorAll('.sprite-checkbox:checked').length;
    selectAllMaster.checked = (checkedCount === visibleCheckboxes.length && visibleCheckboxes.length > 0);
}

function actualizarBotonCarrito() {
    const count = selectedFiles.size;
    selectedCounterBadge.textContent = `${count} seleccionado${count === 1 ? '' : 's'}`;
    addToCartBtn.disabled = (count === 0);
}

// ==========================================
// 7. PROCESAMIENTO Y ENVÍO AL CARRITO
// ==========================================

function procesarImagenPromesa(filename, scaleFactor) {
    return new Promise((resolve) => {
        const img = new Image();
        img.onload = function () {
            const originalW = img.width;
            const originalH = img.height;

            canvas.width = originalW * scaleFactor;
            canvas.height = originalH * scaleFactor;

            ctx.clearRect(0, 0, canvas.width, canvas.height);
            ctx.imageSmoothingEnabled = false;

            ctx.drawImage(
                img,
                0, 0, originalW, originalH,
                0, 0, canvas.width, canvas.height
            );

            const dataUrl = canvas.toDataURL("image/png");
            const base64Pura = dataUrl.replace(/^data:image\/png;base64,/, "");
            const cleanName = filename.replace(/\//g, '_').replace(/\.[^/.]+$/, "");

            resolve({ name: cleanName, b64: base64Pura });
        };
        img.src = `/public/${filename}`;
    });
}

addToCartBtn.addEventListener('click', async function () {
    if (selectedFiles.size === 0) {
        mostrarToast("Por favor, selecciona al menos un archivo de la lista para añadir al carrito.", 'error');
        return;
    }

    addToCartBtn.disabled = true;
    addToCartBtn.innerText = `Procesando ${selectedFiles.size} sprites...`;

    let carrito = TBOIUtils.obtenerCarrito();
    const filesToProcess = Array.from(selectedFiles);

    for (let i = 0; i < filesToProcess.length; i++) {
        const filePath = filesToProcess[i];
        const scale = Math.max(1, fileScales.get(filePath) || 1);

        const resultado = await procesarImagenPromesa(filePath, scale);

        carrito.push({
            name: `${resultado.name}_${scale}x`,
            type: 'sprite',
            b64: resultado.b64
        });
    }

    TBOIUtils.guardarCarrito(carrito);
    mostrarToast(`Se añadieron ${filesToProcess.length} sprites al Carrito de Inyección.`, 'success');

    selectedFiles.clear();
    renderCurrentView();

    addToCartBtn.disabled = false;
    addToCartBtn.innerText = "🛒 Añadir Selección al Carrito";
});

// Iniciar aplicación
fetchSprites();