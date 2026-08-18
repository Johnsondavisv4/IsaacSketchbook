import { useState, useRef, useEffect, useCallback } from 'react';
import type { Route } from './+types/postit-generator';
import { TopNav } from '../components/TopNav';
import { useCart } from '../context/CartContext';
import { useToast } from '../context/ToastContext';
import { downloadJsxFile } from '../lib/jsx-generator';

export function meta(): Route.MetaDescriptors {
  return [
    { title: 'Post-it Generator - TBOI Modding Suite' },
    {
      name: 'description',
      content: 'Generador de notas de completado interactivas para The Binding of Isaac',
    },
  ];
}

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
  { x: 288, y: 224 },
];

const MARKS_LIST = [
  { id: 'heart', name: 'Heart', x: 22, y: 7, cx: 64, isDelirium: false },
  { id: 'isaac', name: 'Isaac', x: 34, y: 17, cx: 32, isDelirium: false },
  { id: 'bbaby', name: '??? (Blue Baby)', x: 49, y: 20, cx: 0, isDelirium: false },
  { id: 'satan', name: 'Satan', x: 25, y: 23, cx: 48, isDelirium: false },
  { id: 'lamb', name: 'The Lamb', x: 37, y: 32, cx: 16, isDelirium: false },
  { id: 'megasatan', name: 'Mega Satan', x: 54, y: 37, cx: 112, isDelirium: false },
  { id: 'bossrush', name: 'Boss Rush', x: 14, y: 36, cx: 80, isDelirium: false },
  { id: 'hush', name: 'Hush', x: 11, y: 51, cx: 128, isDelirium: false },
  { id: 'mother', name: 'Mother', x: 27, y: 49, cx: 160, isDelirium: false },
  { id: 'beast', name: 'The Beast', x: 41, y: 54, cx: 176, isDelirium: false },
  { id: 'greed', name: 'Ultra Greed', x: 64, y: 16, cx: 144, isDelirium: false },
  { id: 'delirium', name: 'Delirium', isDelirium: true },
];

const STATES_Y_CROP = [112, 112, 96, 320, 336];
const STATES_ALPHA = [105 / 255, 1.0, 1.0, 1.0, 1.0];

const STATE_LABELS = [
  'Sin Marca',
  'Normal (Solo)',
  'Hard (Solo)',
  'Normal (Online)',
  'Hard (Online)',
];

export default function PostitGenerator() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const spritesheetRef = useRef<HTMLImageElement | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);

  const [charType, setCharType] = useState<'normal' | 'tainted'>('normal');
  const [noMarkStyle, setNoMarkStyle] = useState<'faint' | 'invisible'>('invisible');
  const [marksState, setMarksState] = useState<Record<string, number>>(() => {
    const init: Record<string, number> = {};
    MARKS_LIST.forEach((m) => {
      init[m.id] = 0;
    });
    return init;
  });

  const { addItem } = useCart();
  const { showToast } = useToast();

  // Load Spritesheet
  useEffect(() => {
    const img = new Image();
    img.src = '/completion_widget.png';
    img.onload = () => {
      spritesheetRef.current = img;
      setIsLoaded(true);
    };
  }, []);

  const renderCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    const spritesheet = spritesheetRef.current;
    if (!canvas || !spritesheet) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.imageSmoothingEnabled = false;
    ctx.globalAlpha = 1.0;

    const charOffset = charType === 'normal' ? 0 : 5;
    const deliriumVal = marksState.delirium || 0;
    const paperIdx = Math.min(PAPER_CROPS.length - 1, charOffset + deliriumVal);

    const paper = PAPER_CROPS[paperIdx];
    if (paper) {
      ctx.drawImage(spritesheet, paper.x, paper.y, 96, 96, 0, 0, 96, 96);
    }

    MARKS_LIST.forEach((mark) => {
      if (!mark.isDelirium && mark.cx !== undefined) {
        const stateIdx = marksState[mark.id] || 0;

        if (stateIdx === 0 && noMarkStyle === 'invisible') {
          return;
        }

        const yCrop = STATES_Y_CROP[stateIdx];
        const alpha = STATES_ALPHA[stateIdx];

        ctx.globalAlpha = alpha;
        ctx.drawImage(spritesheet, mark.cx, yCrop, 16, 16, mark.x!, mark.y!, 16, 16);
        ctx.globalAlpha = 1.0;
      }
    });
  }, [charType, noMarkStyle, marksState]);

  useEffect(() => {
    if (isLoaded) {
      renderCanvas();
    }
  }, [isLoaded, renderCanvas]);

  const setAllMarks = (value: number) => {
    const next: Record<string, number> = {};
    MARKS_LIST.forEach((m) => {
      next[m.id] = value;
    });
    setMarksState(next);
  };

  const handlePushToCart = (scaleFactor: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = canvas.width * scaleFactor;
    tempCanvas.height = canvas.height * scaleFactor;
    const tempCtx = tempCanvas.getContext('2d');
    if (tempCtx) {
      tempCtx.imageSmoothingEnabled = false;
      tempCtx.drawImage(
        canvas,
        0, 0, canvas.width, canvas.height,
        0, 0, tempCanvas.width, tempCanvas.height
      );
    }

    const dataUrl = tempCanvas.toDataURL('image/png');
    const b64 = dataUrl.replace(/^data:image\/png;base64,/, '');
    const labelEscala = `${scaleFactor}x`;
    const name = `Postit_${charType}_${Date.now().toString().slice(-4)}_${labelEscala}`;

    addItem({
      name,
      type: 'postit',
      b64,
    });
  };

  const handleDirectDownload = (scaleFactor: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = canvas.width * scaleFactor;
    tempCanvas.height = canvas.height * scaleFactor;
    const tempCtx = tempCanvas.getContext('2d');
    if (tempCtx) {
      tempCtx.imageSmoothingEnabled = false;
      tempCtx.drawImage(
        canvas,
        0, 0, canvas.width, canvas.height,
        0, 0, tempCanvas.width, tempCanvas.height
      );
    }

    const dataUrl = tempCanvas.toDataURL('image/png');
    const b64 = dataUrl.replace(/^data:image\/png;base64,/, '');

    const singleScript = `function importarPostitDirecto() {
    if (app.documents.length === 0) {
        alert("¡Error! Debes tener un lienzo activo abierto en Photoshop.");
        return;
    }
    var docActivo = app.activeDocument;
    var binaryData = (function(input) {
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
    })("${b64}");

    var tempFile = new File(Folder.temp + "/tboi_postit_single.png");
    tempFile.encoding = "binary";
    tempFile.open("w");
    tempFile.write(binaryData);
    tempFile.close();

    var docTemporal = app.open(tempFile);
    docTemporal.activeLayer.duplicate(docActivo);
    docTemporal.saved = true;
    docTemporal.close();

    docActivo.activeLayer.name = "Post-it Note ${charType} (${scaleFactor}x)";
    tempFile.remove();
}
importarPostitDirecto();`;

    downloadJsxFile(`postit_${charType}_${scaleFactor}x.jsx`, singleScript);
    showToast('Script JSX individual descargado.', 'success');
  };

  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-200 flex flex-col items-center p-3 md:p-5">
      <div className="w-full max-w-455 flex flex-col gap-4">
        <TopNav
          title="📜 Post-it Generator"
          subtitle="Diseña notas de completado interactivas pixel-perfect para tus personajes"
        />

        {/* Main Grid: Controls + Sticky Canvas Preview */}
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_22.5rem] gap-5 items-start">
          {/* Controls Column */}
          <div className="bg-neutral-900 border border-neutral-700 rounded-xl p-5 shadow-xl flex flex-col gap-5">
            {/* Top Options Bar */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-neutral-950 p-4 rounded-xl border border-neutral-800">
              {/* Character Type */}
              <div>
                <label className="text-xs font-bold uppercase tracking-wider text-neutral-400 block mb-2">
                  Tipo de Personaje
                </label>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setCharType('normal')}
                    className={`flex-1 py-2 px-3 text-xs font-bold rounded-lg border transition-colors cursor-pointer ${
                      charType === 'normal'
                        ? 'bg-red-950 text-white border-red-700'
                        : 'bg-neutral-800 text-neutral-400 border-neutral-700 hover:text-white'
                    }`}
                  >
                    Normal
                  </button>
                  <button
                    type="button"
                    onClick={() => setCharType('tainted')}
                    className={`flex-1 py-2 px-3 text-xs font-bold rounded-lg border transition-colors cursor-pointer ${
                      charType === 'tainted'
                        ? 'bg-red-950 text-white border-red-700'
                        : 'bg-neutral-800 text-neutral-400 border-neutral-700 hover:text-white'
                    }`}
                  >
                    Tainted
                  </button>
                </div>
              </div>

              {/* No Mark Style */}
              <div>
                <label className="text-xs font-bold uppercase tracking-wider text-neutral-400 block mb-2">
                  Estilo Sin Marca
                </label>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setNoMarkStyle('faint')}
                    className={`flex-1 py-2 px-3 text-xs font-bold rounded-lg border transition-colors cursor-pointer ${
                      noMarkStyle === 'faint'
                        ? 'bg-neutral-800 text-white border-neutral-600'
                        : 'bg-neutral-800 text-neutral-400 border-neutral-700 hover:text-white'
                    }`}
                  >
                    Tenue (Opaco)
                  </button>
                  <button
                    type="button"
                    onClick={() => setNoMarkStyle('invisible')}
                    className={`flex-1 py-2 px-3 text-xs font-bold rounded-lg border transition-colors cursor-pointer ${
                      noMarkStyle === 'invisible'
                        ? 'bg-neutral-800 text-white border-neutral-600'
                        : 'bg-neutral-800 text-neutral-400 border-neutral-700 hover:text-white'
                    }`}
                  >
                    Invisible
                  </button>
                </div>
              </div>
            </div>

            {/* Quick Actions Shortcuts */}
            <div className="flex flex-wrap items-center gap-2 border-b border-neutral-800 pb-4">
              <span className="text-xs font-bold text-neutral-400 mr-2">
                Atajos rápidos:
              </span>
              <button
                type="button"
                onClick={() => setAllMarks(2)}
                className="px-3 py-1.5 text-xs font-semibold text-amber-300 bg-amber-950/40 hover:bg-amber-900/60 border border-amber-800/60 rounded-md transition-colors cursor-pointer"
              >
                📜 Llenar Todo Hard Solo
              </button>
              <button
                type="button"
                onClick={() => setAllMarks(4)}
                className="px-3 py-1.5 text-xs font-semibold text-blue-300 bg-blue-950/40 hover:bg-blue-900/60 border border-blue-800/60 rounded-md transition-colors cursor-pointer"
              >
                🌐 Llenar Todo Hard Online
              </button>
              <button
                type="button"
                onClick={() => setAllMarks(0)}
                className="px-3 py-1.5 text-xs font-semibold text-neutral-400 hover:text-white bg-neutral-800 hover:bg-neutral-700 border border-neutral-700 rounded-md transition-colors cursor-pointer"
              >
                ✕ Limpiar Todo
              </button>
            </div>

            {/* Marks Table */}
            <div className="overflow-x-auto rounded-lg border border-neutral-800">
              <table className="w-full text-left text-xs">
                <thead className="bg-neutral-950 text-neutral-400 uppercase tracking-wider font-bold text-xs border-b border-neutral-800">
                  <tr>
                    <th className="py-3 px-4">Marca / Jefe</th>
                    {STATE_LABELS.map((label, idx) => (
                      <th key={label} className="py-3 px-2 text-center">
                        <span
                          className={
                            idx === 2
                              ? 'text-amber-400'
                              : idx === 4
                              ? 'text-blue-400'
                              : ''
                          }
                        >
                          {label}
                        </span>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-800">
                  {MARKS_LIST.map((mark) => {
                    const currentValue = marksState[mark.id] ?? 0;
                    return (
                      <tr
                        key={mark.id}
                        className="hover:bg-neutral-800 transition-colors"
                      >
                        <td className="py-2.5 px-4 font-semibold text-white">
                          {mark.name}
                        </td>
                        {[0, 1, 2, 3, 4].map((val) => (
                          <td key={val} className="py-2.5 px-2 text-center">
                            <label className="inline-flex items-center justify-center p-1.5 cursor-pointer">
                              <input
                                type="radio"
                                name={`mark-${mark.id}`}
                                value={val}
                                checked={currentValue === val}
                                onChange={() =>
                                  setMarksState((prev) => ({
                                    ...prev,
                                    [mark.id]: val,
                                  }))
                                }
                                className="w-4 h-4 accent-red-600 cursor-pointer"
                              />
                            </label>
                          </td>
                        ))}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Sticky Canvas Column */}
          <div className="bg-neutral-900 border border-neutral-700 rounded-xl p-5 shadow-xl flex flex-col items-center sticky top-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-neutral-400 mb-3">
              Vista Previa Pixel-Perfect
            </h3>

            <div className="w-64 h-64 bg-neutral-950 border-2 border-dashed border-neutral-600 rounded-xl flex items-center justify-center p-3 shadow-inner">
              <canvas
                ref={canvasRef}
                width={96}
                height={96}
                className="w-56 h-56 pixelated drop-shadow-md"
              />
            </div>

            <div className="text-xs text-neutral-400 mt-2 font-mono">
              Resolución nativa: 96 × 96 px
            </div>

            {/* Action Buttons */}
            <div className="w-full flex flex-col gap-2 mt-5">
              <button
                type="button"
                disabled={!isLoaded}
                onClick={() => handlePushToCart(1)}
                className="w-full py-2.5 text-xs font-bold text-white bg-neutral-800 hover:bg-neutral-700 border border-neutral-700 hover:border-red-700 rounded-lg transition-colors cursor-pointer flex items-center justify-center gap-2"
              >
                <span>🛒</span>
                <span>Añadir al Carrito (1x Nativo)</span>
              </button>

              <button
                type="button"
                disabled={!isLoaded}
                onClick={() => handlePushToCart(4)}
                className="w-full py-2.5 text-xs font-bold text-white bg-red-700 hover:bg-red-600 rounded-lg shadow transition-colors cursor-pointer flex items-center justify-center gap-2"
              >
                <span>🛒</span>
                <span>Añadir al Carrito (4x HD 384px)</span>
              </button>

              <div className="border-t border-neutral-800 my-1"></div>

              <button
                type="button"
                disabled={!isLoaded}
                onClick={() => handleDirectDownload(4)}
                className="w-full py-2 text-xs font-semibold text-neutral-300 bg-neutral-900 hover:bg-neutral-800 border border-neutral-700 rounded-lg transition-colors cursor-pointer flex items-center justify-center gap-2"
              >
                <span>📥</span>
                <span>Descargar Script JSX Directo</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
