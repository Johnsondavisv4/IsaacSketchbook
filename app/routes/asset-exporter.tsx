import { useState, useMemo } from 'react';
import type { Route } from './+types/asset-exporter';
import fs from 'node:fs';
import path from 'node:path';
import { TopNav } from '../components/TopNav';
import { useCart } from '../context/CartContext';
import { useToast } from '../context/ToastContext';

export function meta(): Route.MetaDescriptors {
  return [
    { title: 'Asset Exporter - TBOI Modding Suite' },
    {
      name: 'description',
      content: 'Explora y escala sprites de pixel art para exportar a Adobe Photoshop',
    },
  ];
}

function getAllPngFiles(dir: string, baseDir: string = dir): string[] {
  let results: string[] = [];
  if (!fs.existsSync(dir)) return results;

  const entries = fs.readdirSync(dir, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      results = results.concat(getAllPngFiles(fullPath, baseDir));
    } else if (
      entry.isFile() &&
      path.extname(entry.name).toLowerCase() === '.png'
    ) {
      const relativePath = path.relative(baseDir, fullPath).replace(/\\/g, '/');
      results.push(relativePath);
    }
  }

  return results;
}

export async function loader() {
  const publicPath = path.join(process.cwd(), 'public');
  const sprites = getAllPngFiles(publicPath).sort((a, b) => a.localeCompare(b));
  return { sprites };
}

function getFolderIcon(folder: string): string {
  if (folder === 'all') return 'bi bi-globe2';
  const f = folder.toLowerCase();
  if (f.includes('trinket')) return 'bi bi-gem';
  if (f.includes('achievement')) return 'bi bi-trophy-fill';
  if (f.includes('item') || f.includes('collectible')) return 'bi bi-box-seam-fill';
  if (f.includes('character')) return 'bi bi-people-fill';
  if (f.includes('enemy') || f.includes('boss')) return 'bi bi-bug-fill';
  if (f.includes('mark')) return 'bi bi-bullseye';
  return 'bi bi-folder2-open';
}

export default function AssetExporter({ loaderData }: Route.ComponentProps) {
  const { sprites } = loaderData;
  const { addMultipleItems } = useCart();
  const { showToast } = useToast();

  const [selectedFolder, setSelectedFolder] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [isAscending, setIsAscending] = useState<boolean>(true);
  const [selectedFiles, setSelectedFiles] = useState<Set<string>>(new Set());
  const [scales, setScales] = useState<Map<string, number>>(new Map());
  const [bulkScale, setBulkScale] = useState<number>(4);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);

  
  const folderMap = useMemo(() => {
    const rawMap = new Map<string, string[]>();
    for (const sprite of sprites) {
      const parts = sprite.split('/');
      const folder = parts.length > 1 ? parts.slice(0, -1).join('/') : '/';
      if (!rawMap.has(folder)) {
        rawMap.set(folder, []);
      }
      rawMap.get(folder)!.push(sprite);
    }

    const sortedEntries = Array.from(rawMap.entries()).sort(([a], [b]) => {
      if (a === '/') return -1;
      if (b === '/') return 1;
      return a.localeCompare(b);
    });

    return new Map(sortedEntries);
  }, [sprites]);

  
  const filteredSprites = useMemo(() => {
    let result = sprites;

    if (selectedFolder !== 'all') {
      result = folderMap.get(selectedFolder) || [];
    }

    if (searchQuery.trim() !== '') {
      const q = searchQuery.toLowerCase();
      result = result.filter((s) => s.toLowerCase().includes(q));
    }

    return isAscending
      ? [...result].sort((a, b) => a.localeCompare(b))
      : [...result].sort((a, b) => b.localeCompare(a));
  }, [sprites, selectedFolder, searchQuery, isAscending, folderMap]);

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      const next = new Set(selectedFiles);
      filteredSprites.forEach((f) => next.add(f));
      setSelectedFiles(next);
    } else {
      const next = new Set(selectedFiles);
      filteredSprites.forEach((f) => next.delete(f));
      setSelectedFiles(next);
    }
  };

  const toggleSelect = (filePath: string) => {
    setSelectedFiles((prev) => {
      const next = new Set(prev);
      if (next.has(filePath)) {
        next.delete(filePath);
      } else {
        next.add(filePath);
      }
      return next;
    });
  };

  const setScaleForFile = (filePath: string, scale: number) => {
    setScales((prev) => {
      const next = new Map(prev);
      next.set(filePath, scale);
      return next;
    });
  };

  const handleApplyBulkScale = () => {
    if (selectedFiles.size === 0) {
      showToast('Selecciona al menos un sprite para aplicar la escala masiva.', 'error');
      return;
    }
    setScales((prev) => {
      const next = new Map(prev);
      selectedFiles.forEach((file) => {
        next.set(file, Math.max(1, bulkScale));
      });
      return next;
    });
    showToast(`Escala ${bulkScale}x aplicada a ${selectedFiles.size} sprites.`, 'success');
  };

  const processImage = (filePath: string, scale: number): Promise<{ name: string; b64: string }> => {
    return new Promise((resolve) => {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = img.naturalWidth * scale;
        canvas.height = img.naturalHeight * scale;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.imageSmoothingEnabled = false;
          ctx.drawImage(img, 0, 0, img.naturalWidth, img.naturalHeight, 0, 0, canvas.width, canvas.height);
        }
        const dataUrl = canvas.toDataURL('image/png');
        const b64 = dataUrl.replace(/^data:image\/png;base64,/, '');
        const cleanName = filePath.replace(/[/\\?%*:|"<>]/g, '_').replace(/\.[^/.]+$/, '');
        resolve({ name: `${cleanName}_${scale}x`, b64 });
      };
      img.onerror = () => {
        resolve({ name: filePath, b64: '' });
      };
      img.src = `/${filePath}`;
    });
  };

  const handleAddToCart = async () => {
    if (selectedFiles.size === 0) {
      showToast('Selecciona al menos un sprite.', 'error');
      return;
    }

    setIsProcessing(true);
    const filesToProcess = Array.from(selectedFiles);
    const results = [];

    for (const filePath of filesToProcess) {
      const scale = scales.get(filePath) || 1;
      const res = await processImage(filePath, scale);
      if (res.b64) {
        results.push({
          name: res.name,
          type: 'sprite' as const,
          b64: res.b64,
        });
      }
    }

    addMultipleItems(results);
    showToast(`Se añadieron ${results.length} sprites al carrito.`, 'success');
    setSelectedFiles(new Set());
    setIsProcessing(false);
  };

  const isAllSelected =
    filteredSprites.length > 0 &&
    filteredSprites.every((f) => selectedFiles.has(f));

  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-200 flex flex-col items-center p-3 md:p-5">
      <div className="w-full max-w-455 h-[calc(100vh-40px)] min-h-137.5 flex flex-col gap-3">
        <TopNav
          title={
            <span className="flex items-center gap-2.5">
              <i className="bi bi-folder2-open text-red-500"></i>
              <span>Asset Exporter</span>
            </span>
          }
          subtitle="Explora y escala sprites de pixel art para inyectar en Photoshop"
        />

        
        <div className="flex-1 min-h-0 flex gap-3 overflow-hidden">
          
          <aside className="w-64 bg-neutral-900 border border-neutral-700 rounded-xl flex flex-col shrink-0 overflow-hidden">
            <div className="p-3 border-b border-neutral-800 flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-neutral-400">
                Carpetas
              </span>
              <span className="text-xs font-mono font-bold bg-neutral-800 text-neutral-300 px-2 py-0.5 rounded-full border border-neutral-700">
                {sprites.length}
              </span>
            </div>

            <div className="flex-1 overflow-y-auto p-2 space-y-1">
              <button
                type="button"
                onClick={() => setSelectedFolder('all')}
                className={`w-full flex items-center justify-between px-3 py-2 text-xs font-semibold rounded-lg border transition-colors cursor-pointer ${
                  selectedFolder === 'all'
                    ? 'bg-red-950/70 text-white border-red-800/80'
                    : 'text-neutral-300 hover:bg-neutral-800 border-transparent'
                }`}
              >
                <div className="flex items-center gap-2">
                  <i className="bi bi-globe2 text-neutral-400"></i>
                  <span>Todos los Sprites</span>
                </div>
                <span className="text-xs font-mono opacity-80">{sprites.length}</span>
              </button>

              {Array.from(folderMap.entries()).map(([folder, files]) => (
                <button
                  key={folder}
                  type="button"
                  onClick={() => setSelectedFolder(folder)}
                  className={`w-full flex items-center justify-between px-3 py-2 text-xs font-semibold rounded-lg border transition-colors cursor-pointer ${
                    selectedFolder === folder
                      ? 'bg-red-950/70 text-white border-red-800/80'
                      : 'text-neutral-300 hover:bg-neutral-800 border-transparent'
                  }`}
                >
                  <div className="flex items-center gap-2 truncate pr-2">
                    <i className={`${getFolderIcon(folder)} text-neutral-400`}></i>
                    <span className="truncate">{folder}</span>
                  </div>
                  <span className="text-xs font-mono opacity-80">{files.length}</span>
                </button>
              ))}
            </div>

            <div className="p-2 border-t border-neutral-800 flex gap-2">
              <button
                type="button"
                onClick={() => setSelectedFiles(new Set(filteredSprites))}
                className="flex-1 py-1.5 text-xs font-semibold text-neutral-300 bg-neutral-800 hover:bg-neutral-700 border border-neutral-700 rounded-md transition-colors cursor-pointer"
              >
                Seleccionar Vista
              </button>
              <button
                type="button"
                onClick={() => setSelectedFiles(new Set())}
                className="py-1.5 px-3 text-xs font-semibold text-neutral-400 hover:text-white bg-neutral-800 hover:bg-neutral-800 border border-neutral-700 rounded-md transition-colors cursor-pointer"
              >
                Limpiar
              </button>
            </div>
          </aside>

          
          <main className="flex-1 bg-neutral-900 border border-neutral-700 rounded-xl flex flex-col min-w-0 overflow-hidden shadow-xl">
            
            <div className="p-3 border-b border-neutral-800 flex flex-wrap items-center justify-between gap-3 bg-neutral-900">
              <div className="flex items-center gap-2 flex-1 min-w-60 max-w-md">
                <input
                  type="text"
                  placeholder="Buscar sprites por nombre..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-neutral-950 border border-neutral-700 focus:border-red-600 focus:outline-none rounded-lg px-3 py-1.5 text-xs text-white placeholder-neutral-500"
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => setSearchQuery('')}
                    className="px-2 py-1 text-xs text-neutral-400 hover:text-white bg-neutral-800 rounded"
                  >
                    ✕
                  </button>
                )}
              </div>

              <div className="flex flex-wrap items-center gap-3">
                <div className="flex items-center gap-1.5 bg-neutral-950 border border-neutral-800 rounded-lg px-2 py-1">
                  <span className="text-[11px] font-semibold text-neutral-400">Escala:</span>
                  <input
                    type="number"
                    min={1}
                    max={100}
                    value={bulkScale}
                    onChange={(e) => setBulkScale(Math.max(1, parseInt(e.target.value) || 1))}
                    className="w-12 bg-neutral-900 border border-neutral-700 focus:border-red-600 focus:outline-none rounded px-1.5 py-0.5 text-xs text-white text-center font-mono"
                  />
                  <span className="text-xs text-neutral-400 font-semibold">x</span>
                  <button
                    type="button"
                    onClick={handleApplyBulkScale}
                    disabled={selectedFiles.size === 0}
                    className="px-2 py-0.5 text-[11px] font-semibold text-neutral-200 bg-neutral-800 hover:bg-neutral-700 disabled:opacity-40 disabled:hover:bg-neutral-800 border border-neutral-700 rounded transition-colors cursor-pointer disabled:cursor-not-allowed"
                    title="Aplicar escala a los sprites seleccionados"
                  >
                    Aplicar ({selectedFiles.size})
                  </button>
                </div>

                <span className="text-xs font-semibold text-neutral-400 hidden sm:inline">
                  {selectedFiles.size} de {filteredSprites.length} seleccionados
                </span>
                <button
                  type="button"
                  disabled={selectedFiles.size === 0 || isProcessing}
                  onClick={handleAddToCart}
                  className="px-4 py-2 text-xs font-bold text-white bg-red-700 hover:bg-red-600 disabled:bg-neutral-700 disabled:text-neutral-500 disabled:cursor-not-allowed rounded-lg shadow transition-colors cursor-pointer flex items-center gap-2 shrink-0"
                >
                  <i className="bi bi-cart3"></i>
                  <span>{isProcessing ? 'Procesando...' : 'Añadir al Carrito'}</span>
                </button>
              </div>
            </div>

            
            <div className="grid grid-cols-[48px_100px_1fr_140px] gap-4 items-center px-4 py-2.5 bg-neutral-950 border-b border-neutral-800 text-xs font-bold text-neutral-400 uppercase tracking-wider select-none shrink-0">
              <div className="flex justify-center">
                <input
                  type="checkbox"
                  checked={isAllSelected}
                  onChange={(e) => handleSelectAll(e.target.checked)}
                  className="w-4 h-4 accent-red-600 rounded cursor-pointer"
                />
              </div>
              <div className="text-center">Sprite</div>
              <button
                type="button"
                onClick={() => setIsAscending((prev) => !prev)}
                className="flex items-center gap-1.5 text-left hover:text-white transition-colors cursor-pointer w-fit"
              >
                <span>Archivo</span>
                <span className="text-red-500 text-xs">{isAscending ? '▲' : '▼'}</span>
              </button>
              <div className="text-center">Escala</div>
            </div>

            
            <div className="flex-1 overflow-y-auto divide-y divide-neutral-800">
              {filteredSprites.length === 0 ? (
                <div className="p-12 text-center text-neutral-400 text-sm">
                  No se encontraron sprites que coincidan con la búsqueda.
                </div>
              ) : (
                filteredSprites.map((filePath) => {
                  const isSelected = selectedFiles.has(filePath);
                  const scale = scales.get(filePath) || 1;
                  const filename = filePath.split('/').pop() || filePath;
                  const folder = filePath.includes('/')
                    ? filePath.substring(0, filePath.lastIndexOf('/'))
                    : '';

                  return (
                    <div
                      key={filePath}
                      className={`grid grid-cols-[48px_100px_1fr_140px] gap-4 items-center px-4 py-2.5 transition-colors ${isSelected ? 'bg-red-950/20' : 'hover:bg-neutral-800'
                        }`}
                    >
                      
                      <div className="flex justify-center">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => toggleSelect(filePath)}
                          className="w-4 h-4 accent-red-600 rounded cursor-pointer"
                        />
                      </div>

                      
                      <div className="flex justify-center">
                        <div className="w-21.25 h-21.25 bg-neutral-950 border border-neutral-800 rounded flex items-center justify-center overflow-hidden">
                          <img
                            src={`/${filePath}`}
                            alt={filename}
                            className="w-full h-full object-contain pixelated"
                            loading="lazy"
                          />
                        </div>
                      </div>

                      
                      <div className="min-w-0 pr-2">
                        <div className="text-sm font-semibold text-white truncate">
                          {filename}
                        </div>
                        {folder && (
                          <div className="text-xs text-neutral-500 truncate mt-0.5">
                            {folder}
                          </div>
                        )}
                      </div>

                      
                      <div className="flex justify-center items-center gap-1">
                        <input
                          type="number"
                          min={1}
                          max={100}
                          value={scale}
                          onChange={(e) =>
                            setScaleForFile(
                              filePath,
                              Math.max(1, parseInt(e.target.value) || 1)
                            )
                          }
                          className="w-16 bg-neutral-950 text-neutral-200 border border-neutral-700 focus:border-red-600 focus:outline-none rounded-md px-2 py-1 text-xs font-semibold text-center font-mono"
                        />
                        <span className="text-xs text-neutral-400 font-semibold select-none">
                          x
                        </span>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </main>
        </div>
      </div>
    </div>
  );
}
