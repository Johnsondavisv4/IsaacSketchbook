const IMAGE_SRC = "/public/completion_widget.png";

// Coordenadas XCrop exactas obtenidas del archivo .anm2
const MARKS = [
    { id: "heart", name: "Heart (Mom's Heart)", cx: 64 },
    { id: "isaac", name: "Isaac", cx: 32 },
    { id: "bluebaby", name: "??? (Blue Baby)", cx: 0 },
    { id: "satan", name: "Satan", cx: 48 },
    { id: "lamb", name: "The Lamb", cx: 16 },
    { id: "megasatan", name: "Mega Satan", cx: 112 },
    { id: "bossrush", name: "Boss Rush", cx: 80 },
    { id: "hush", name: "Hush", cx: 128 },
    { id: "mother", name: "Mother", cx: 160 },
    { id: "beast", name: "The Beast", cx: 176 },
    { id: "greed", name: "Ultra Greed", cx: 144 }
];

// Coordenadas YCrop exactas obtenidas del archivo .anm2
const STATES = [
    { id: "normal", name: "Normal", yCrop: 112 },
    { id: "hard", name: "Hard", yCrop: 96 },
    { id: "online_normal", name: "Online Normal", yCrop: 320 },
    { id: "online_hard", name: "Online Hard", yCrop: 336 }
];

let spritesheet = new Image();
const previewCanvas = document.getElementById('preview-canvas');
const previewCtx = previewCanvas.getContext('2d');
const selectMark = document.getElementById('select-mark');
const selectState = document.getElementById('select-state');
const inputScale = document.getElementById('input-scale');
const addCartBtn = document.getElementById('add-cart-btn');
const exportBtn = document.getElementById('export-btn');
const resText = document.getElementById('resolution-preview');

window.onload = function () {
    spritesheet.onload = function () {
        addCartBtn.disabled = false;
        exportBtn.disabled = false;
        updatePreview();
        updateResolutionLabel();
    };
    spritesheet.src = IMAGE_SRC;
};

selectMark.addEventListener('change', updatePreview);
selectState.addEventListener('change', updatePreview);
inputScale.addEventListener('input', updateResolutionLabel);

function updateResolutionLabel() {
    const scale = Math.max(1, parseInt(inputScale.value) || 1);
    resText.innerText = `Resolución final: ${16 * scale}x${16 * scale} px`;
}

function updatePreview() {
    if (!spritesheet.complete) return;

    const mark = MARKS[selectMark.value];
    const state = STATES[selectState.value];

    previewCtx.clearRect(0, 0, 16, 16);
    previewCtx.imageSmoothingEnabled = false;
    previewCtx.drawImage(spritesheet, mark.cx, state.yCrop, 16, 16, 0, 0, 16, 16);
}

function generateScaledCanvas() {
    const scale = Math.max(1, parseInt(inputScale.value) || 1);
    const mark = MARKS[selectMark.value];
    const state = STATES[selectState.value];

    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = 16 * scale;
    tempCanvas.height = 16 * scale;
    const tCtx = tempCanvas.getContext('2d');

    tCtx.imageSmoothingEnabled = false;
    tCtx.drawImage(
        spritesheet,
        mark.cx, state.yCrop, 16, 16,
        0, 0, tempCanvas.width, tempCanvas.height
    );

    return { tempCanvas, scale, mark, state };
}

exportBtn.addEventListener('click', function () {
    if (!spritesheet.complete) return;

    const { tempCanvas, scale, mark, state } = generateScaledCanvas();

    const link = document.createElement('a');
    link.download = `marca_${mark.id}_${state.id}_x${scale}.png`;
    link.href = tempCanvas.toDataURL("image/png");
    link.click();
});

addCartBtn.addEventListener('click', function () {
    if (!spritesheet.complete) return;

    const { tempCanvas, scale, mark, state } = generateScaledCanvas();
    const dataUrl = tempCanvas.toDataURL("image/png");
    const base64Pura = dataUrl.replace(/^data:image\/png;base64,/, "");

    const cleanMarkName = mark.name.split(' (')[0];
    const itemNombre = `Marca ${cleanMarkName} (${state.name}) ${scale}x`;

    const item = {
        name: itemNombre,
        type: 'sprite',
        b64: base64Pura
    };

    if (window.TBOIUtils && window.TBOIUtils.agregarItemAlCarrito) {
        window.TBOIUtils.agregarItemAlCarrito(item);
    } else if (typeof agregarItemAlCarrito === 'function') {
        agregarItemAlCarrito(item);
    }

    const toastFn = window.mostrarToast || (window.TBOIUtils && window.TBOIUtils.mostrarToast);
    if (toastFn) {
        toastFn(`Añadido al carrito: "${itemNombre}"`, 'success');
    }
});
