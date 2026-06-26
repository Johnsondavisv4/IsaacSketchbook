const CART_STORAGE_KEY = 'tboi_sketchbook_cart';

const cartStatusText = document.getElementById('cart-status-text');
const cartItemsList = document.getElementById('cart-items-list');
const checkoutBtn = document.getElementById('checkout-btn');
const clearCartBtn = document.getElementById('clear-cart-btn');

function obtenerCarrito() {
    const rawData = localStorage.getItem(CART_STORAGE_KEY);
    return rawData ? JSON.parse(rawData) : [];
}

function guardarCarrito(carrito) {
    localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(carrito));
}

function actualizarInterfazDashboard() {
    const carrito = obtenerCarrito();

    if (carrito.length === 0) {
        cartStatusText.innerText = "El carrito está vacío. Ve a las herramientas para añadir sprites o notas.";
        cartItemsList.innerHTML = '';
        checkoutBtn.disabled = true;
        clearCartBtn.disabled = true;
        return;
    }

    const numSprites = carrito.filter(item => item.type === 'sprite').length;
    const numPostits = carrito.filter(item => item.type === 'postit').length;
    cartStatusText.innerText = `Elementos listos en la cola de inyección: ${numSprites} Sprites y ${numPostits} Notas de Post-it.`;

    checkoutBtn.disabled = false;
    clearCartBtn.disabled = false;

    cartItemsList.innerHTML = '';
    carrito.forEach((item, index) => {
        const itemRow = document.createElement('div');
        itemRow.className = 'cart-item';

        const typeBadge = item.type === 'sprite' ? 'Sprite' : 'Post-it';

        itemRow.innerHTML = `
            <div>
                <span class="item-name">${item.name}</span>
                <span class="item-type">${typeBadge}</span>
            </div>
            <button class="btn btn-danger-sm" data-index="${index}">Quitar</button>
        `;

        itemRow.querySelector('.btn-danger-sm').addEventListener('click', function () {
            eliminarItemDelCarrito(index);
        });

        cartItemsList.appendChild(itemRow);
    });
}

function eliminarItemDelCarrito(index) {
    const carrito = obtenerCarrito();
    carrito.splice(index, 1);
    guardarCarrito(carrito);
    actualizarInterfazDashboard();
}

clearCartBtn.addEventListener('click', function () {
    if (confirm("¿Estás seguro de que deseas vaciar toda la cola de inyección?")) {
        localStorage.removeItem(CART_STORAGE_KEY);
        actualizarInterfazDashboard();
    }
});

checkoutBtn.addEventListener('click', function () {
    const carrito = obtenerCarrito();
    if (carrito.length === 0) return;

    checkoutBtn.disabled = true;
    checkoutBtn.innerText = "Generando Pack...";

    const payloadMasivo = carrito.map(item => ({
        name: item.name,
        b64: item.b64
    }));

    const codigoJSX = `function importarLoteCompletoAAltar() {
    if (app.documents.length === 0) {
        alert("¡Error! Debes tener un lienzo de trabajo activo abierto en Photoshop antes de ejecutar el script.");
        return;
    }

    var docActivo = app.activeDocument;
    var assets = ${JSON.stringify(payloadMasivo, null, 4)};

    function decodeB64(input) {
        var keystr = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=";
        var output = "";
        var chr1, chr2, chr3;
        var enc1, enc2, enc3, enc4;
        var i = 0;
        while (i < input.length) {
            enc1 = keystr.indexOf(input.charAt(i++));
            enc2 = keystr.indexOf(input.charAt(i++));
            enc3 = keystr.indexOf(input.charAt(i++));
            enc4 = keystr.indexOf(input.charAt(i++));
            chr1 = (enc1 << 2) | (enc2 >> 4);
            chr2 = ((enc2 & 15) << 4) | (enc3 >> 2);
            chr3 = ((enc3 & 3) << 6) | enc4;
            output += String.fromCharCode(chr1);
            if (enc3 != 64) output += String.fromCharCode(chr2);
            if (enc4 != 64) output += String.fromCharCode(chr3);
        }
        return output;
    }

    for (var i = 0; i < assets.length; i++) {
        var item = assets[i];
        
        var binaryData = decodeB64(item.b64);
        var tempFile = new File(Folder.temp + "/tboi_bulk_asset_" + i + ".png");
        tempFile.encoding = "binary";
        tempFile.open("w");
        tempFile.write(binaryData);
        tempFile.close();

        var docTemporal = app.open(tempFile);
        docTemporal.activeLayer.duplicate(docActivo);
        
        docTemporal.saved = true;
        docTemporal.close();

        docActivo.activeLayer.name = item.name;
        
        tempFile.remove();
    }
}
importarLoteCompletoAAltar();`;

    const blob = new Blob([codigoJSX], { type: "text/plain;charset=utf-8" });
    const link = document.createElement('a');
    link.download = `Cola_Inyeccion_Photoshop_TBOI.jsx`;
    link.href = URL.createObjectURL(blob);
    link.click();

    checkoutBtn.disabled = false;
    checkoutBtn.innerText = "Generar Script Unificado (.jsx)";
});

actualizarInterfazDashboard();