const CART_STORAGE_KEY = 'tboi_sketchbook_cart';

const canvas = document.getElementById('postit-canvas');
const ctx = canvas.getContext('2d');
let spritesheet = new Image();

const PAPER_CROPS = [
    { x: 0, y: 0 }, { x: 0, y: 128 }, { x: 0, y: 224 }, { x: 192, y: 128 }, { x: 192, y: 224 },
    { x: 96, y: 0 }, { x: 96, y: 128 }, { x: 96, y: 224 }, { x: 288, y: 128 }, { x: 288, y: 224 }
];

const MARKS_DATA = [
    { name: "Heart", x: 22, y: 7, cx: 64, type: 'sprite' },
    { name: "Isaac", x: 34, y: 17, cx: 32, type: 'sprite' },
    { name: "???", x: 49, y: 20, cx: 0, type: 'sprite' },
    { name: "Satan", x: 25, y: 23, cx: 48, type: 'sprite' },
    { name: "The lamb", x: 37, y: 32, cx: 16, type: 'sprite' },
    { name: "Mega Satan", x: 54, y: 37, cx: 112, type: 'sprite' },
    { name: "Boss Rush", x: 14, y: 36, cx: 80, type: 'sprite' },
    { name: "Hush", x: 11, y: 51, cx: 128, type: 'sprite' },
    { name: "Mother", x: 27, y: 49, cx: 160, type: 'sprite' },
    { name: "The Beast", x: 41, y: 54, cx: 176, type: 'sprite' },
    { name: "Ultra Greed", x: 64, y: 16, cx: 144, type: 'sprite' },
    { name: "Delirium", type: 'special' }
];

const STATES_Y_CROP = [112, 112, 96, 320, 336];
const STATES_ALPHA = [105 / 255, 1.0, 1.0, 1.0, 1.0];

window.onload = function () {
    spritesheet.onload = function () {
        document.getElementById('ui-container').style.display = 'block';
        document.getElementById('export-btn').disabled = false;
        document.getElementById('export-btn-hd').disabled = false;
        buildTable();
        drawCanvas();
    };
    spritesheet.src = '/public/completion_widget.png';
};

function buildTable() {
    const tbody = document.getElementById('marks-table-body');
    tbody.innerHTML = '';

    MARKS_DATA.forEach((mark, index) => {
        const tr = document.createElement('tr');

        const tdName = document.createElement('td');
        tdName.innerText = mark.name;
        tr.appendChild(tdName);

        const groupName = mark.type === 'special' ? 'mark-delirium' : `mark-${index}`;

        for (let value = 0; value < 5; value++) {
            const tdRadio = document.createElement('td');

            const label = document.createElement('label');
            label.className = 'touch-label';

            const radio = document.createElement('input');
            radio.type = 'radio';
            radio.name = groupName;
            radio.value = value;
            if (value === 0) radio.checked = true;

            radio.addEventListener('change', drawCanvas);

            label.appendChild(radio);
            tdRadio.appendChild(label);
            tr.appendChild(tdRadio);
        }
        tbody.appendChild(tr);
    });
}

function drawCanvas() {
    if (!spritesheet.complete) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.globalAlpha = 1.0;

    const charOffset = parseInt(document.querySelector('input[name="character-type"]:checked').value);
    const deliriumValue = parseInt(document.querySelector('input[name="mark-delirium"]:checked').value);
    const paperIdx = charOffset + deliriumValue;

    const paper = PAPER_CROPS[paperIdx];
    if (paper) {
        ctx.drawImage(spritesheet, paper.x, paper.y, 96, 96, 0, 0, 96, 96);
    }

    const noMarkStyle = document.querySelector('input[name="nomark-style"]:checked').value;

    MARKS_DATA.forEach((mark, index) => {
        if (mark.type === 'sprite') {
            const checkedRadio = document.querySelector(`input[name="mark-${index}"]:checked`);
            if (checkedRadio) {
                const stateIdx = parseInt(checkedRadio.value);

                if (stateIdx === 0 && noMarkStyle === 'invisible') {
                    return;
                }

                const yCrop = STATES_Y_CROP[stateIdx];
                const alpha = STATES_ALPHA[stateIdx];

                ctx.globalAlpha = alpha;
                ctx.drawImage(spritesheet, mark.cx, yCrop, 16, 16, mark.x, mark.y, 16, 16);
                ctx.globalAlpha = 1.0;
            }
        }
    });
}

function empujarPostitAlCarrito(canvasObjetivo, labelEscala) {
    const dataUrl = canvasObjetivo.toDataURL("image/png");
    const base64Pura = dataUrl.replace(/^data:image\/png;base64,/, "");

    const charOffset = parseInt(document.querySelector('input[name="character-type"]:checked').value);
    const tipoLabel = charOffset === 0 ? "normal" : "tainted";

    const rawCart = sessionStorage.getItem(CART_STORAGE_KEY);
    let carrito = rawCart ? JSON.parse(rawCart) : [];

    const prefijoBúsqueda = `Post-it Note ${tipoLabel}`;
    const cantidadExistentes = carrito.filter(item => item.name.startsWith(prefijoBúsqueda)).length;
    const proximoNumero = cantidadExistentes + 1;

    const nombreFinalCapa = `Post-it Note ${tipoLabel} ${proximoNumero} (${labelEscala})`;

    carrito.push({
        name: nombreFinalCapa,
        type: 'postit',
        b64: base64Pura
    });

    sessionStorage.setItem(CART_STORAGE_KEY, JSON.stringify(carrito));

    alert(`🛒 ¡Añadido al carrito con éxito!\nRegistrado como: "${nombreFinalCapa}"`);
}

document.getElementById('export-btn').addEventListener('click', function () {
    if (!spritesheet.complete) return;
    empujarPostitAlCarrito(canvas, "1x");
});

document.getElementById('export-btn-hd').addEventListener('click', function () {
    if (!spritesheet.complete) return;

    const scaleFactor = 4;
    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = canvas.width * scaleFactor;
    tempCanvas.height = canvas.height * scaleFactor;
    const tempCtx = tempCanvas.getContext('2d');

    tempCtx.imageSmoothingEnabled = false;

    tempCtx.drawImage(
        canvas,
        0, 0, canvas.width, canvas.height,
        0, 0, tempCanvas.width, tempCanvas.height
    );

    empujarPostitAlCarrito(tempCanvas, "4x");
});