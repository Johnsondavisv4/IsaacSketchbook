const CART_STORAGE_KEY = 'tboi_sketchbook_cart';

function obtenerCarrito() {
    const rawData = sessionStorage.getItem(CART_STORAGE_KEY);
    return rawData ? JSON.parse(rawData) : [];
}

function guardarCarrito(carrito) {
    sessionStorage.setItem(CART_STORAGE_KEY, JSON.stringify(carrito));
}

function agregarItemAlCarrito(item) {
    const carrito = obtenerCarrito();
    carrito.push(item);
    guardarCarrito(carrito);
}

function mostrarToast(mensaje, tipo = 'success') {
    let container = document.getElementById('toast-container');

    if (!container) {
        container = document.createElement('div');
        container.id = 'toast-container';
        container.className = 'toast-container';
        document.body.appendChild(container);
    }

    const toast = document.createElement('div');
    toast.className = `toast ${tipo}`;
    const titulo = tipo === 'error' ? 'Error' : (tipo === 'info' ? 'Aviso' : 'Éxito');
    toast.innerHTML = `
        <div class="toast__title">${titulo}</div>
        <div class="toast__message">${mensaje}</div>
    `;

    container.appendChild(toast);

    requestAnimationFrame(() => {
        toast.classList.add('is-visible');
    });

    window.setTimeout(() => {
        toast.classList.remove('is-visible');
        window.setTimeout(() => toast.remove(), 220);
    }, 3000);
}

window.TBOIUtils = {
    CART_STORAGE_KEY,
    obtenerCarrito,
    guardarCarrito,
    agregarItemAlCarrito,
    mostrarToast
};

window.mostrarToast = mostrarToast;
window.obtenerCarrito = obtenerCarrito;
window.guardarCarrito = guardarCarrito;
window.CART_STORAGE_KEY = CART_STORAGE_KEY;
