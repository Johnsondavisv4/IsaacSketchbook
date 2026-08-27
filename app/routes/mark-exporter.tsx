import { useState, useRef, useEffect, useCallback } from 'react';
import type { Route } from './+types/mark-exporter';
import { TopNav } from '../components/TopNav';
import { useCart } from '../context/CartContext';
import { useToast } from '../context/ToastContext';
import { downloadJsxFile } from '../lib/jsx-generator';

export function meta(): Route.MetaDescriptors {
  return [
    { title: 'Mark Exporter - TBOI Modding Suite' },
    {
      name: 'description',
      content: 'Extrae marcas oficiales de completado pixel-perfect individualmente para The Binding of Isaac',
    },
  ];
}

interface MarkDef {
  id: string;
  name: string;
  shortName: string;
  cx: number;
}

interface StateDef {
  id: string;
  name: string;
  yCrop: number;
  badgeClass: string;
}

const MARKS: MarkDef[] = [
  { id: 'heart', name: "Heart (Mom's Heart)", shortName: "Mom's Heart", cx: 64 },
  { id: 'isaac', name: 'Isaac', shortName: 'Isaac', cx: 32 },
  { id: 'bluebaby', name: '??? (Blue Baby)', shortName: 'Blue Baby', cx: 0 },
  { id: 'satan', name: 'Satan', shortName: 'Satan', cx: 48 },
  { id: 'lamb', name: 'The Lamb', shortName: 'The Lamb', cx: 16 },
  { id: 'megasatan', name: 'Mega Satan', shortName: 'Mega Satan', cx: 112 },
  { id: 'bossrush', name: 'Boss Rush', shortName: 'Boss Rush', cx: 80 },
  { id: 'hush', name: 'Hush', shortName: 'Hush', cx: 128 },
  { id: 'mother', name: 'Mother', shortName: 'Mother', cx: 160 },
  { id: 'beast', name: 'The Beast', shortName: 'The Beast', cx: 176 },
  { id: 'greed', name: 'Ultra Greed', shortName: 'Ultra Greed', cx: 144 },
];

const STATES: StateDef[] = [
  {
    id: 'normal',
    name: 'Normal (Solo)',
    yCrop: 112,
    badgeClass: 'bg-neutral-800 text-neutral-300 border-neutral-700',
  },
  {
    id: 'hard',
    name: 'Hard (Solo)',
    yCrop: 96,
    badgeClass: 'bg-amber-950 text-amber-400 border-amber-800/60',
  },
  {
    id: 'online_normal',
    name: 'Online Normal',
    yCrop: 320,
    badgeClass: 'bg-blue-950 text-blue-400 border-blue-800/60',
  },
  {
    id: 'online_hard',
    name: 'Online Hard',
    yCrop: 336,
    badgeClass: 'bg-purple-950 text-purple-400 border-purple-800/60',
  },
];

export default function MarkExporter() {
  const previewCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const spritesheetRef = useRef<HTMLImageElement | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);

  const [selectedMarkIdx, setSelectedMarkIdx] = useState<number>(0);
  const [selectedStateIdx, setSelectedStateIdx] = useState<number>(1); 
  const [scale, setScale] = useState<number>(4);

  const { addItem } = useCart();
  const { showToast } = useToast();

  const selectedMark = MARKS[selectedMarkIdx] || MARKS[0];
  const selectedState = STATES[selectedStateIdx] || STATES[0];

  
  useEffect(() => {
    const img = new Image();
    img.src = '/completion_widget.png';
    img.onload = () => {
      spritesheetRef.current = img;
      setIsLoaded(true);
    };
  }, []);

  const renderPreview = useCallback(() => {
    const canvas = previewCanvasRef.current;
    const spritesheet = spritesheetRef.current;
    if (!canvas || !spritesheet) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, 16, 16);
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(
      spritesheet,
      selectedMark.cx,
      selectedState.yCrop,
      16,
      16,
      0,
      0,
      16,
      16
    );
  }, [selectedMark, selectedState]);

  useEffect(() => {
    if (isLoaded) {
      renderPreview();
    }
  }, [isLoaded, renderPreview]);

  
  const generateScaledCanvas = useCallback(
    (scaleMultiplier: number): { canvas: HTMLCanvasElement; b64: string } => {
      const spritesheet = spritesheetRef.current;
      const targetScale = Math.max(1, scaleMultiplier);

      const tempCanvas = document.createElement('canvas');
      tempCanvas.width = 16 * targetScale;
      tempCanvas.height = 16 * targetScale;
      const ctx = tempCanvas.getContext('2d');

      if (ctx && spritesheet) {
        ctx.imageSmoothingEnabled = false;
        ctx.drawImage(
          spritesheet,
          selectedMark.cx,
          selectedState.yCrop,
          16,
          16,
          0,
          0,
          tempCanvas.width,
          tempCanvas.height
        );
      }

      const dataUrl = tempCanvas.toDataURL('image/png');
      const b64 = dataUrl.replace(/^data:image\/png;base64,/, '');

      return { canvas: tempCanvas, b64 };
    },
    [selectedMark, selectedState]
  );

  const handleAddToCart = () => {
    if (!isLoaded) return;

    const { b64 } = generateScaledCanvas(scale);
    const itemName = `Marca ${selectedMark.shortName} (${selectedState.name}) ${scale}x`;

    addItem({
      name: itemName,
      type: 'mark',
      b64,
    });
  };

  const handleDownloadPng = () => {
    if (!isLoaded) return;

    const { canvas } = generateScaledCanvas(scale);
    const link = document.createElement('a');
    link.download = `marca_${selectedMark.id}_${selectedState.id}_x${scale}.png`;
    link.href = canvas.toDataURL('image/png');
    link.click();
    showToast(`Descargando PNG: marca_${selectedMark.id}_${selectedState.id}_x${scale}.png`, 'success');
  };

  const handleDownloadJsx = () => {
    if (!isLoaded) return;

    const { b64 } = generateScaledCanvas(scale);
    const scriptContent = `function importarMarcaDirecto() {
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

    var tempFile = new File(Folder.temp + "/tboi_mark_single.png");
    tempFile.encoding = "binary";
    tempFile.open("w");
    tempFile.write(binaryData);
    tempFile.close();

    var docTemporal = app.open(tempFile);
    docTemporal.activeLayer.duplicate(docActivo);
    docTemporal.saved = true;
    docTemporal.close();

    docActivo.activeLayer.name = "Marca ${selectedMark.shortName} (${selectedState.name}) ${scale}x";
    tempFile.remove();
}
importarMarcaDirecto();`;

    downloadJsxFile(`marca_${selectedMark.id}_${selectedState.id}_x${scale}.jsx`, scriptContent);
    showToast('Script JSX individual descargado.', 'success');
  };

  const finalResolution = 16 * Math.max(1, scale);

  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-200 flex flex-col p-3 md:p-5">
      <div className="w-full flex-1 flex flex-col gap-3 min-h-0">
        <TopNav
          title={
            <span className="flex items-center gap-2.5">
              <i className="bi bi-bullseye text-red-500"></i>
              <span>Mark Exporter</span>
            </span>
          }
          subtitle="Extrae marcas oficiales de completado con escalado personalizado pixel-perfect"
        />

        
        <div className="flex-1 min-h-0 grid grid-cols-1 lg:grid-cols-[1fr_24rem] xl:grid-cols-[1fr_28rem] gap-4 w-full">
          
          <div className="bg-neutral-900 border border-neutral-700 rounded-xl p-4 sm:p-5 shadow-xl flex flex-col gap-4 min-h-0 overflow-y-auto">
            
            <div>
              <div className="flex items-center justify-between mb-2.5">
                <label className="text-xs font-bold uppercase tracking-wider text-neutral-400">
                  1. Seleccionar Marca / Jefe
                </label>
                <span className="text-xs font-semibold text-neutral-400">
                  {selectedMark.name}
                </span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
                {MARKS.map((mark, idx) => {
                  const isSelected = selectedMarkIdx === idx;
                  return (
                    <button
                      key={mark.id}
                      type="button"
                      onClick={() => setSelectedMarkIdx(idx)}
                      className={`p-3 rounded-lg border text-left flex items-center transition-all cursor-pointer ${
                        isSelected
                          ? 'bg-red-950/70 border-red-700 text-white shadow-md shadow-red-950/30'
                          : 'bg-neutral-950 border-neutral-800 text-neutral-300 hover:bg-neutral-800 hover:border-neutral-700'
                      }`}
                    >
                      <span className="text-xs font-bold truncate">{mark.shortName}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            
            <div>
              <label className="text-xs font-bold uppercase tracking-wider text-neutral-400 block mb-2.5">
                2. Dificultad / Modo
              </label>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {STATES.map((state, idx) => {
                  const isSelected = selectedStateIdx === idx;
                  return (
                    <button
                      key={state.id}
                      type="button"
                      onClick={() => setSelectedStateIdx(idx)}
                      className={`p-3 rounded-lg border flex items-center justify-between transition-all cursor-pointer ${
                        isSelected
                          ? 'bg-red-950/70 border-red-700 text-white'
                          : 'bg-neutral-950 border-neutral-800 text-neutral-300 hover:bg-neutral-800'
                      }`}
                    >
                      <span className="text-xs font-bold">{state.name}</span>
                      <span
                        className={`text-[10px] uppercase font-bold px-1.5 py-0.5 rounded border ${state.badgeClass}`}
                      >
                        {state.id.replace('_', ' ')}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            
            <div className="bg-neutral-950 p-4 rounded-xl border border-neutral-800 flex items-center justify-between gap-4">
              <div>
                <label className="text-xs font-bold uppercase tracking-wider text-neutral-400 block mb-1">
                  3. Multiplicador de Escalado
                </label>
                <span className="text-xs font-mono text-emerald-400 font-bold">
                  Resolución final: {finalResolution} × {finalResolution} px
                </span>
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min="1"
                  max="200"
                  value={scale}
                  onChange={(e) => setScale(Math.max(1, parseInt(e.target.value) || 1))}
                  className="w-20 bg-neutral-900 border border-neutral-700 focus:border-red-600 focus:outline-none rounded-lg px-2.5 py-1.5 text-xs text-center text-white font-mono"
                />
                <span className="text-xs font-bold text-neutral-400 select-none">x</span>
              </div>
            </div>
          </div>

          
          <div className="bg-neutral-900 border border-neutral-700 rounded-xl p-5 shadow-xl flex flex-col items-center justify-between shrink-0 h-full overflow-y-auto">
            <h3 className="text-xs font-bold uppercase tracking-wider text-neutral-400 mb-2">
              Vista Previa de Marca
            </h3>

            
            <div className="w-56 h-56 bg-neutral-950 border-2 border-dashed border-neutral-700 rounded-xl flex items-center justify-center p-4 shadow-inner">
              <canvas
                ref={previewCanvasRef}
                width={16}
                height={16}
                className="w-36 h-36 pixelated drop-shadow-lg"
              />
            </div>

            
            <div className="w-full bg-neutral-950 p-3 rounded-lg border border-neutral-800 my-2 flex flex-col gap-1.5 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-neutral-400">Marca:</span>
                <span className="font-semibold text-white truncate max-w-36">
                  {selectedMark.shortName}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-neutral-400">Modo:</span>
                <span className="font-semibold text-white">{selectedState.name}</span>
              </div>
              <div className="flex items-center justify-between border-t border-neutral-800 pt-1.5 mt-0.5">
                <span className="text-neutral-400">Resolución final:</span>
                <span className="font-mono font-bold text-emerald-400">
                  {finalResolution} × {finalResolution} px
                </span>
              </div>
            </div>

            
            <div className="w-full flex flex-col gap-2">
              <button
                type="button"
                disabled={!isLoaded}
                onClick={handleAddToCart}
                className="w-full py-2.5 text-xs font-bold text-white bg-red-700 hover:bg-red-600 disabled:bg-neutral-700 disabled:text-neutral-500 disabled:cursor-not-allowed rounded-lg shadow-lg transition-colors cursor-pointer flex items-center justify-center gap-2"
              >
                <i className="bi bi-cart3"></i>
                <span>Añadir al Carrito ({scale}x)</span>
              </button>

              <button
                type="button"
                disabled={!isLoaded}
                onClick={handleDownloadPng}
                className="w-full py-2 text-xs font-semibold text-neutral-200 bg-neutral-800 hover:bg-neutral-700 border border-neutral-700 hover:border-neutral-600 rounded-lg transition-colors cursor-pointer flex items-center justify-center gap-2"
              >
                <i className="bi bi-download"></i>
                <span>Descargar PNG</span>
              </button>

              <div className="border-t border-neutral-800 my-0.5"></div>

              <button
                type="button"
                disabled={!isLoaded}
                onClick={handleDownloadJsx}
                className="w-full py-2 text-xs font-semibold text-neutral-400 hover:text-white bg-neutral-950 hover:bg-neutral-800 border border-neutral-800 rounded-lg transition-colors cursor-pointer flex items-center justify-center gap-2"
              >
                <i className="bi bi-file-earmark-code"></i>
                <span>Descargar Script JSX Directo</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
