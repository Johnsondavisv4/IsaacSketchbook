import { useState } from 'react';
import { Link } from 'react-router';
import type { Route } from './+types/home';
import { useCart } from '../context/CartContext';
import { ConfirmModal } from '../components/ConfirmModal';

export function meta(): Route.MetaDescriptors {
  return [
    { title: 'TBOI - Modding Suite Dashboard' },
    {
      name: 'description',
      content: 'Central de comando y gestión de scripts para Adobe Photoshop',
    },
  ];
}

const TOOLS = [
  {
    title: 'Progress Manager',
    path: '/progress-manager',
    icon: 'bi bi-graph-up-arrow',
    desc: 'Sincronización automática con Steam (.dat), marcas de completado y exportación dual de Post-its.',
  },
  {
    title: 'Post-it Generator',
    path: '/postit-generator',
    icon: 'bi bi-sticky-fill',
    desc: 'Diseña notas de completado interactivas para tus personajes (Normales / Tainted) con marcas pixel-perfect.',
  },
  {
    title: 'Asset Exporter',
    path: '/asset-exporter',
    icon: 'bi bi-folder2-open',
    desc: 'Explora tu biblioteca de sprites, escálalos sin distorsión e inyéctalos en capas de Photoshop.',
  },
  {
    title: 'Mark Exporter',
    path: '/mark-exporter',
    icon: 'bi bi-bullseye',
    desc: 'Extrae marcas oficiales individualmente con escalado personalizado para tus diseños y miniaturas.',
  },
];

export default function Home() {
  const { cart, removeItem, clearCart, generateCartScript } = useCart();
  const [isClearModalOpen, setIsClearModalOpen] = useState(false);

  const numSprites = cart.filter((i) => i.type === 'sprite').length;
  const numPostits = cart.filter((i) => i.type === 'postit').length;
  const numMarks = cart.filter((i) => i.type === 'mark').length;

  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-200 flex flex-col p-4 md:p-6 lg:p-8 overflow-y-auto">
      <div className="w-full flex flex-col gap-6">
        <header className="mt-1">
          <h1 className="text-2xl md:text-3xl font-bold text-white tracking-tight flex items-center gap-2.5">
            <i className="bi bi-palette-fill text-red-500"></i>
            <span>TBOI - Modding Suite</span>
          </h1>
          <p className="text-neutral-400 text-sm mt-1">
            Central de comando y gestión de scripts para Adobe Photoshop
          </p>
        </header>

        <section className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
          {TOOLS.map((tool) => (
            <Link
              key={tool.path}
              to={tool.path}
              className="group bg-neutral-900 border border-neutral-700 hover:border-red-700 rounded-xl p-5 flex items-start gap-4 transition-all duration-150 hover:-translate-y-0.5 hover:shadow-lg hover:shadow-red-950/20"
            >
              <div className="text-2xl bg-neutral-950 p-3.5 rounded-lg border border-neutral-800 shrink-0 group-hover:scale-105 transition-transform flex items-center justify-center text-neutral-300 group-hover:text-red-400">
                <i className={tool.icon}></i>
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <h2 className="text-base font-bold text-white group-hover:text-red-400 transition-colors">
                    {tool.title}
                  </h2>
                </div>
                <p className="text-xs text-neutral-400 mt-1.5 leading-relaxed">
                  {tool.desc}
                </p>
              </div>
            </Link>
          ))}
        </section>

        <section className="bg-neutral-900 border border-neutral-700 rounded-xl p-5 shadow-xl flex flex-col gap-4">
          <div className="flex items-center justify-between border-b border-neutral-700 pb-3.5">
            <div className="flex items-center gap-2.5">
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                <i className="bi bi-cart3 text-red-400"></i>
                <span>Carrito de Inyección</span>
              </h2>
              {cart.length > 0 && (
                <span className="bg-red-700 text-white text-xs font-bold px-2 py-0.5 rounded-full">
                  {cart.length}
                </span>
              )}
            </div>
            <button
              type="button"
              disabled={cart.length === 0}
              onClick={() => setIsClearModalOpen(true)}
              className="px-3 py-1.5 text-xs font-semibold text-neutral-300 bg-neutral-800 hover:bg-neutral-700 disabled:opacity-40 disabled:hover:bg-neutral-800 border border-neutral-700 rounded-md transition-colors cursor-pointer disabled:cursor-not-allowed"
            >
              Vaciar Carrito
            </button>
          </div>

          <div className="text-sm text-neutral-400">
            {cart.length === 0 ? (
              <span>
                El carrito está vacío. Ve a las herramientas para añadir sprites, notas o marcas.
              </span>
            ) : (
              <span className="text-neutral-300 font-medium">
                Elementos listos en la cola:{' '}
                <strong className="text-white">{numSprites} Sprites</strong>
                {numPostits > 0 && (
                  <>
                    , <strong className="text-white">{numPostits} Notas de Post-it</strong>
                  </>
                )}
                {numMarks > 0 && (
                  <>
                    , <strong className="text-white">{numMarks} Marcas</strong>
                  </>
                )}
                .
              </span>
            )}
          </div>

          {cart.length > 0 && (
            <div className="max-h-60 overflow-y-auto rounded-lg bg-neutral-950 border border-neutral-800 divide-y divide-neutral-800">
              {cart.map((item, index) => {
                const badgeColor =
                  item.type === 'sprite'
                    ? 'bg-emerald-950/80 text-emerald-400 border-emerald-800/60'
                    : item.type === 'postit'
                    ? 'bg-amber-950/80 text-amber-400 border-amber-800/60'
                    : 'bg-blue-950/80 text-blue-400 border-blue-800/60';

                return (
                  <div
                    key={`${item.name}-${index}`}
                    className="flex items-center justify-between px-4 py-2.5 text-sm hover:bg-neutral-900 transition-colors"
                  >
                    <div className="flex items-center gap-2.5 min-w-0 pr-3">
                      <span className="font-medium text-white truncate">{item.name}</span>
                      <span
                        className={`text-xs uppercase font-bold px-1.5 py-0.5 rounded border ${badgeColor}`}
                      >
                        {item.type}
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => removeItem(index)}
                      className="px-2.5 py-1 text-xs font-semibold text-red-400 bg-red-950/40 hover:bg-red-900/60 border border-red-900/60 rounded transition-colors cursor-pointer shrink-0"
                    >
                      Quitar
                    </button>
                  </div>
                );
              })}
            </div>
          )}

          <button
            type="button"
            disabled={cart.length === 0}
            onClick={generateCartScript}
            className="w-full py-3 text-sm font-bold text-white bg-red-700 hover:bg-red-600 active:translate-y-0 disabled:bg-neutral-700 disabled:text-neutral-500 disabled:cursor-not-allowed rounded-lg shadow-lg transition-all cursor-pointer"
          >
            Generar Script (.jsx)
          </button>
        </section>
      </div>

      <ConfirmModal
        isOpen={isClearModalOpen}
        title="Vaciar carrito"
        message="¿Deseas vaciar el carrito de inyección? Esta acción eliminará todos los elementos guardados."
        confirmText="Sí, vaciar todo"
        onConfirm={() => {
          clearCart();
          setIsClearModalOpen(false);
        }}
        onCancel={() => setIsClearModalOpen(false)}
      />
    </div>
  );
}
