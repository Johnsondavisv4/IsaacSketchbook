const filesContainer = document.getElementById('files-container-list');
const addToCartBtn = document.getElementById('add-to-cart-btn');
const selectAllMaster = document.getElementById('select-all-master');
const sortNameBtn = document.getElementById('sort-name-btn');
const sortDirectionIcon = document.getElementById('sort-direction-icon');
const canvas = document.getElementById('processor-canvas');
const ctx = canvas.getContext('2d');

let listaSpritesRaw = [];
let ordenAscendente = true;

async function fetchSprites() {
    try {
        const response = await fetch('/api/sprites');
        listaSpritesRaw = await response.json();

        if (listaSpritesRaw.length === 0) {
            filesContainer.innerHTML = '<div class="empty-message">La carpeta /public está vacía. Guarda tus archivos .png ahí dentro.</div>';
            addToCartBtn.disabled = true;
            return;
        }

        addToCartBtn.disabled = false;
        renderizarListaDeSprites();

    } catch (error) {
        console.error(error);
        filesContainer.innerHTML = '<div class="empty-message" style="color: var(--accent);">Error de enlace: No se pudo conectar con el servidor backend de Node.</div>';
    }
}

const spriteCache = new Map();

function drawSpritePreview(canvas, src) {
    const ctx = canvas.getContext('2d');
    const targetW = canvas.width || 85;
    const targetH = canvas.height || 85;

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

function renderizarListaDeSprites() {
    listaSpritesRaw.sort((a, b) => {
        return ordenAscendente ? a.localeCompare(b) : b.localeCompare(a);
    });

    filesContainer.innerHTML = '';

    listaSpritesRaw.forEach((filename) => {
        const row = document.createElement('div');
        row.className = 'repo-row';

        row.innerHTML = `
            <div>
                <input type="checkbox" class="sprite-checkbox" value="${filename}">
            </div>
            <div class="thumb-container">
                <canvas class="sprite-thumb" width="85" height="85" aria-label="${filename} preview"></canvas>
            </div>
            <div class="file-link-container">
                <span class="file-name-text" title="${filename}">${filename}</span>
            </div>
            <div>
                <input type="number" class="row-scale-input" value="1" min="1" max="50" data-filename="${filename}">
            </div>
        `;

        row.addEventListener('click', function (e) {
            if (e.target.type !== 'checkbox' && !e.target.classList.contains('row-scale-input')) {
                const cb = row.querySelector('.sprite-checkbox');
                cb.checked = !cb.checked;
                actualizarEstadoMasterCheckbox();
            }
        });

        row.querySelector('.sprite-checkbox').addEventListener('change', actualizarEstadoMasterCheckbox);

        filesContainer.appendChild(row);

        const spriteCanvas = row.querySelector('canvas.sprite-thumb');
        if (spriteCanvas) {
            drawSpritePreview(spriteCanvas, `/public/${filename}`);
        }
    });

    actualizarEstadoMasterCheckbox();
}

sortNameBtn.addEventListener('click', function () {
    ordenAscendente = !ordenAscendente;
    sortDirectionIcon.innerText = ordenAscendente ? "▲" : "▼";
    renderizarListaDeSprites();
});

selectAllMaster.addEventListener('change', function () {
    const checkboxes = document.querySelectorAll('.sprite-checkbox');
    checkboxes.forEach(cb => {
        cb.checked = selectAllMaster.checked;
    });
});

function actualizarEstadoMasterCheckbox() {
    const checkboxes = document.querySelectorAll('.sprite-checkbox');
    if (checkboxes.length === 0) {
        selectAllMaster.checked = false;
        return;
    }
    const checkedCount = document.querySelectorAll('.sprite-checkbox:checked').length;
    selectAllMaster.checked = (checkedCount === checkboxes.length);
}

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
    const checkboxesChecked = document.querySelectorAll('.sprite-checkbox:checked');

    if (checkboxesChecked.length === 0) {
        mostrarToast("Por favor, selecciona al menos un archivo de la lista para añadir al carrito.", 'error');
        return;
    }

    addToCartBtn.disabled = true;
    addToCartBtn.innerText = "Procesando Selección...";

    let carrito = TBOIUtils.obtenerCarrito();

    for (let i = 0; i < checkboxesChecked.length; i++) {
        const cb = checkboxesChecked[i];
        const filename = cb.value;

        const row = cb.closest('.repo-row');
        const scaleInput = row ? row.querySelector('.row-scale-input') : null;
        const scale = Math.max(1, parseInt(scaleInput ? scaleInput.value : '1') || 1);

        const resultado = await procesarImagenPromesa(filename, scale);

        carrito.push({
            name: `${resultado.name}_${scale}x`,
            type: 'sprite',
            b64: resultado.b64
        });
    }

    TBOIUtils.guardarCarrito(carrito);

    mostrarToast(`Se añadieron ${checkboxesChecked.length} sprites al Carrito de Inyección.`, 'success');

    checkboxesChecked.forEach(cb => cb.checked = false);
    selectAllMaster.checked = false;

    addToCartBtn.disabled = false;
    addToCartBtn.innerText = "🛒 Añadir Selección al Carrito";
});

fetchSprites();