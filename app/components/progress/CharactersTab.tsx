import { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import type { CharacterJSON } from '../../services/save-parser/models/Character';
import { useToast } from '../../context/ToastContext';
import { downloadJsxFile, generateBatchJsxScript } from '../../lib/jsx-generator';
import {
  SpriteChoiceModal,
  type SpriteInfo,
} from './SpriteChoiceModal';

const MARKS_CONFIG = [
  { key: "Mom's Heart", label: "Mom's Heart", x: 22, y: 7, cx: 64, visible: true },
  { key: "Isaac", label: "Isaac", x: 34, y: 17, cx: 32, visible: true },
  { key: "Blue Baby", label: "Blue Baby (???", x: 49, y: 20, cx: 0, visible: true },
  { key: "Satan", label: "Satan", x: 25, y: 23, cx: 48, visible: true },
  { key: "The Lamb", label: "The Lamb", x: 37, y: 32, cx: 16, visible: true },
  { key: "Mega Satan", label: "Mega Satan", x: 54, y: 37, cx: 112, visible: true },
  { key: "Boss Rush", label: "Boss Rush", x: 14, y: 36, cx: 80, visible: true },
  { key: "Hush", label: "Hush", x: 11, y: 51, cx: 128, visible: true },
  { key: "Mother", label: "Mother", x: 27, y: 49, cx: 160, visible: true },
  { key: "The Beast", label: "The Beast", x: 41, y: 54, cx: 176, visible: true },
  { key: "Greed", label: "Greed / Ultra Greed", x: 64, y: 16, cx: 144, visible: true },
  { key: "Delirium", label: "Delirium", visible: false },
];

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

const STATE_Y_CROP = [112, 112, 96, 320, 336];
const STATE_ALPHA = [105 / 255, 1, 1, 1, 1];

function getCharacterSpriteInfo(character: CharacterJSON): SpriteInfo {
  const name = character.character;
  const baseSprite = name === 'Jacob & Esau' ? 'Jacob and Esau.png' : `${name}.png`;
  const variants = [];

  if (name === 'Judas') {
    variants.push({ key: 'dark_judas', title: 'Dark Judas', file: 'Dark Judas.png' });
  }

  return {
    sprite: baseSprite,
    hasVariants: variants.length > 0,
    variants,
  };
}

function getMarkDifficultyCode(val?: string): number {
  if (!val || val === 'None') return 0;
  if (val === 'Normal') return 1;
  if (val === 'Hard') return 2;
  if (val === 'Online Normal') return 3;
  if (val === 'Online Hard') return 4;
  return 0;
}

function countHardMarks(marksObj?: Record<string, string>): number {
  if (!marksObj) return 0;
  return Object.values(marksObj).filter(
    (v) => v === 'Hard' || v === 'Online Hard'
  ).length;
}

function drawPostitCanvas(
  canvas: HTMLCanvasElement,
  character: CharacterJSON,
  marksObj: Record<string, string>,
  widgetImage: HTMLImageElement
) {
  const ctx = canvas.getContext('2d');
  if (!ctx || !widgetImage.complete) return;

  const scale = canvas.width / 96;
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.imageSmoothingEnabled = false;
  ctx.globalAlpha = 1;

  const typeOffset = character.tainted ? 5 : 0;
  const deliriumCode = getMarkDifficultyCode(marksObj?.['Delirium']);
  const paperIdx = Math.max(
    0,
    Math.min(PAPER_CROPS.length - 1, typeOffset + deliriumCode)
  );
  const paper = PAPER_CROPS[paperIdx];

  if (paper) {
    ctx.drawImage(
      widgetImage,
      paper.x,
      paper.y,
      96,
      96,
      0,
      0,
      canvas.width,
      canvas.height
    );
  }

  for (const mark of MARKS_CONFIG) {
    if (
      !mark.visible ||
      mark.cx === undefined ||
      mark.x === undefined ||
      mark.y === undefined
    )
      continue;
    const markVal = marksObj?.[mark.key];
    const code = getMarkDifficultyCode(markVal);
    if (code === 0) continue;

    ctx.globalAlpha = STATE_ALPHA[code] || 1;
    ctx.drawImage(
      widgetImage,
      mark.cx,
      STATE_Y_CROP[code],
      16,
      16,
      mark.x * scale,
      mark.y * scale,
      16 * scale,
      16 * scale
    );
    ctx.globalAlpha = 1;
  }
}

function generatePostitBase64(
  character: CharacterJSON,
  marksObj: Record<string, string>,
  widgetImage: HTMLImageElement,
  scaleFactor = 4
): string {
  const canvas = document.createElement('canvas');
  canvas.width = 96 * scaleFactor;
  canvas.height = 96 * scaleFactor;
  drawPostitCanvas(canvas, character, marksObj, widgetImage);
  return canvas.toDataURL('image/png').replace(/^data:image\/png;base64,/, '');
}

function fetchAndScaleSpriteBase64(
  src: string,
  scaleFactor = 10
): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      const originalW = img.naturalWidth || img.width;
      const originalH = img.naturalHeight || img.height;

      const canvas = document.createElement('canvas');
      canvas.width = originalW * scaleFactor;
      canvas.height = originalH * scaleFactor;

      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.imageSmoothingEnabled = false;
        ctx.drawImage(
          img,
          0,
          0,
          originalW,
          originalH,
          0,
          0,
          canvas.width,
          canvas.height
        );
      }

      const dataUrl = canvas.toDataURL('image/png');
      resolve(dataUrl.replace(/^data:image\/png;base64,/, ''));
    };
    img.onerror = () => reject(new Error(`No se pudo cargar la imagen: ${src}`));
    img.src = src;
  });
}

function CharacterRow({
  character,
  widgetImage,
  onExportAction,
}: {
  character: CharacterJSON;
  widgetImage: HTMLImageElement | null;
  onExportAction: (
    action: 'sprite' | 'solo' | 'online' | 'pack-solo' | 'pack-online',
    character: CharacterJSON
  ) => void;
}) {
  const soloCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const onlineCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const spriteInfo = useMemo(() => getCharacterSpriteInfo(character), [character]);

  const soloHard = countHardMarks(character.soloMarks);
  const onlineHard = countHardMarks(character.onlineMarks);

  useEffect(() => {
    if (!widgetImage) return;
    if (soloCanvasRef.current) {
      drawPostitCanvas(
        soloCanvasRef.current,
        character,
        character.soloMarks,
        widgetImage
      );
    }
    if (onlineCanvasRef.current) {
      drawPostitCanvas(
        onlineCanvasRef.current,
        character,
        character.onlineMarks,
        widgetImage
      );
    }
  }, [character, widgetImage]);

  return (
    <div className="grid grid-cols-[180px_290px_1fr_1fr] gap-4 items-center px-4 py-3 hover:bg-neutral-950/40 transition-colors border-b border-neutral-800 last:border-b-0">
      {/* 1. Character Info (Direct Left Aligned) */}
      <div className="min-w-0 text-left pl-2">
        <h3 className="text-sm font-bold text-white truncate">
          {character.character}
        </h3>
      </div>

      {/* 2. 3 Thumbnails (Sprite, Solo Post-it, Online Post-it) */}
      <div className="flex items-center justify-center gap-2 shrink-0">
        {/* Character Sprite Thumbnail (85x85) */}
        <div
          className="w-21.25 h-21.25 bg-neutral-950 border border-neutral-800 rounded-lg flex items-center justify-center p-1 overflow-hidden shrink-0"
          title={`Sprite de ${character.character}`}
        >
          <img
            src={`/Characters/${spriteInfo.sprite}`}
            alt={character.character}
            className="w-full h-full object-contain pixelated"
            loading="lazy"
          />
        </div>

        {/* Solo Post-it (85x85) */}
        <div
          className="w-21.25 h-21.25 bg-neutral-950 border border-neutral-800 rounded-lg flex items-center justify-center p-0.5 overflow-hidden shrink-0"
          title={`Post-it Solo: ${soloHard}/12 Hard`}
        >
          <canvas
            ref={soloCanvasRef}
            width={85}
            height={85}
            className="w-full h-full pixelated"
          />
        </div>

        {/* Online Post-it (85x85) */}
        <div
          className="w-21.25 h-21.25 bg-neutral-950 border border-neutral-800 rounded-lg flex items-center justify-center p-0.5 overflow-hidden shrink-0"
          title={`Post-it Online: ${onlineHard}/12 Hard`}
        >
          <canvas
            ref={onlineCanvasRef}
            width={85}
            height={85}
            className="w-full h-full pixelated"
          />
        </div>
      </div>

      {/* Progress Badges (Centered capsule) */}
      <div className="flex items-center justify-center">
        <div className="flex flex-col gap-1.5 w-44 shrink-0">
          <div className="flex items-center justify-between bg-neutral-950 px-2.5 py-1.5 rounded-md border border-neutral-800 text-xs">
            <span className="text-neutral-300 font-medium flex items-center gap-1.5">
              <span>📜</span> Solo:
            </span>
            <strong className="font-mono text-amber-400 text-xs font-bold">
              {soloHard}/12 Hard
            </strong>
          </div>
          <div className="flex items-center justify-between bg-neutral-950 px-2.5 py-1.5 rounded-md border border-neutral-800 text-xs">
            <span className="text-neutral-300 font-medium flex items-center gap-1.5">
              <span>🌐</span> Online:
            </span>
            <strong className="font-mono text-sky-400 text-xs font-bold">
              {onlineHard}/12 Hard
            </strong>
          </div>
        </div>
      </div>

      {/* Actions (Centered button group) */}
      <div className="flex items-center justify-center">
        <div className="inline-flex items-center gap-1 bg-neutral-950 p-1 rounded-lg border border-neutral-800 flex-wrap justify-center">
          <button
            type="button"
            onClick={() => onExportAction('sprite', character)}
            className="px-2 py-1.5 text-xs font-semibold text-neutral-300 hover:text-emerald-400 hover:bg-emerald-950/30 hover:border-emerald-700/60 border border-transparent rounded-md transition-all cursor-pointer"
            title="Descargar script .jsx (Sprite) para Photoshop"
          >
            🖼️ Sprite
          </button>
          <button
            type="button"
            onClick={() => onExportAction('solo', character)}
            className="px-2 py-1.5 text-xs font-semibold text-neutral-300 hover:text-amber-400 hover:bg-amber-950/30 hover:border-amber-700/60 border border-transparent rounded-md transition-all cursor-pointer"
            title="Descargar script .jsx (Post-it Solo) para Photoshop"
          >
            📜 Solo
          </button>
          <button
            type="button"
            onClick={() => onExportAction('online', character)}
            className="px-2 py-1.5 text-xs font-semibold text-neutral-300 hover:text-sky-400 hover:bg-sky-950/30 hover:border-sky-700/60 border border-transparent rounded-md transition-all cursor-pointer"
            title="Descargar script .jsx (Post-it Online) para Photoshop"
          >
            🌐 Online
          </button>
          <button
            type="button"
            onClick={() => onExportAction('pack-solo', character)}
            className="px-2 py-1.5 text-xs font-bold text-white bg-red-800 hover:bg-red-700 border border-red-700 rounded-md transition-all cursor-pointer shadow"
            title="Descargar script .jsx (Pack Solo: Sprite + Post-it Solo) para Photoshop"
          >
            📦 Pack (Solo)
          </button>
          <button
            type="button"
            onClick={() => onExportAction('pack-online', character)}
            className="px-2 py-1.5 text-xs font-bold text-white bg-red-800 hover:bg-red-700 border border-red-700 rounded-md transition-all cursor-pointer shadow"
            title="Descargar script .jsx (Pack Online: Sprite + Post-it Online) para Photoshop"
          >
            📦 Pack (Online)
          </button>
        </div>
      </div>
    </div>
  );
}

interface CharactersTabProps {
  configured: boolean;
  characters: CharacterJSON[];
  filter: 'normal' | 'tainted';
  onFilterChange: (f: 'normal' | 'tainted') => void;
}

export function CharactersTab({
  configured,
  characters,
  filter,
  onFilterChange,
}: CharactersTabProps) {
  const [widgetImage, setWidgetImage] = useState<HTMLImageElement | null>(null);
  const [activeVariantModal, setActiveVariantModal] = useState<{
    character: CharacterJSON;
    spriteInfo: SpriteInfo;
    action: 'sprite' | 'pack-solo' | 'pack-online';
  } | null>(null);

  const { showToast } = useToast();

  useEffect(() => {
    const img = new Image();
    img.src = '/completion_widget.png';
    img.onload = () => setWidgetImage(img);
  }, []);

  const normalChars = useMemo(
    () => characters.filter((c) => !c.tainted),
    [characters]
  );
  const taintedChars = useMemo(
    () => characters.filter((c) => c.tainted),
    [characters]
  );
  const filteredList = filter === 'normal' ? normalChars : taintedChars;

  // Indicators calculations
  const megaBlastCount = useMemo(() => {
    return normalChars.filter((c) => {
      const ms = c.soloMarks?.['Mega Satan'];
      return ms === 'Hard' || ms === 'Online Hard';
    }).length;
  }, [normalChars]);

  const megaMushCount = useMemo(() => {
    return normalChars.filter((c) => countHardMarks(c.soloMarks) === 12).length;
  }, [normalChars]);

  const deathCertCount = useMemo(() => {
    return characters.filter((c) => countHardMarks(c.soloMarks) === 12).length;
  }, [characters]);

  const isMegaBlastReady = megaBlastCount === 17;
  const isMegaMushReady = megaMushCount === 17;
  const isDeathCertReady = deathCertCount === 34;

  const handleExportCharacterItem = async (
    action: 'sprite' | 'solo' | 'online' | 'pack-solo' | 'pack-online',
    character: CharacterJSON,
    chosenSpriteFile?: string
  ) => {
    if (!widgetImage) return;

    const spriteInfo = getCharacterSpriteInfo(character);
    const spriteToUse = chosenSpriteFile || spriteInfo.sprite;

    if (
      !chosenSpriteFile &&
      spriteInfo.hasVariants &&
      (action === 'sprite' || action === 'pack-solo' || action === 'pack-online')
    ) {
      setActiveVariantModal({ character, spriteInfo, action });
      return;
    }

    try {
      const cleanCharName = character.character.replace(/[\s&]+/g, '_');

      if (action === 'sprite') {
        const b64 = await fetchAndScaleSpriteBase64(
          `/Characters/${spriteToUse}`,
          10
        );
        const script = generateBatchJsxScript([
          {
            name: `${character.character} - Sprite (${spriteToUse.replace('.png', '')})`,
            type: 'sprite',
            b64,
          },
        ]);
        downloadJsxFile(`${cleanCharName}_Sprite.jsx`, script);
        showToast(`Script JSX (Sprite) descargado para ${character.character}.`, 'success');
      } else if (action === 'solo') {
        const b64 = generatePostitBase64(
          character,
          character.soloMarks,
          widgetImage,
          4
        );
        const script = generateBatchJsxScript([
          {
            name: `${character.character} - Post-it (Solo)`,
            type: 'postit',
            b64,
          },
        ]);
        downloadJsxFile(`${cleanCharName}_Postit_Solo.jsx`, script);
        showToast(`Script JSX (Post-it Solo) descargado para ${character.character}.`, 'success');
      } else if (action === 'online') {
        const b64 = generatePostitBase64(
          character,
          character.onlineMarks,
          widgetImage,
          4
        );
        const script = generateBatchJsxScript([
          {
            name: `${character.character} - Post-it (Online)`,
            type: 'postit',
            b64,
          },
        ]);
        downloadJsxFile(`${cleanCharName}_Postit_Online.jsx`, script);
        showToast(`Script JSX (Post-it Online) descargado para ${character.character}.`, 'success');
      } else if (action === 'pack-solo') {
        const spriteB64 = await fetchAndScaleSpriteBase64(
          `/Characters/${spriteToUse}`,
          10
        );
        const soloB64 = generatePostitBase64(
          character,
          character.soloMarks,
          widgetImage,
          4
        );

        const script = generateBatchJsxScript([
          {
            name: `${character.character} - Post-it Solo`,
            type: 'postit',
            b64: soloB64,
          },
          {
            name: `${character.character} - Sprite (${spriteToUse.replace('.png', '')})`,
            type: 'sprite',
            b64: spriteB64,
          },
        ]);
        downloadJsxFile(`${cleanCharName}_Pack_Solo.jsx`, script);
        showToast(`Script JSX (Pack Solo) descargado para ${character.character}.`, 'success');
      } else if (action === 'pack-online') {
        const spriteB64 = await fetchAndScaleSpriteBase64(
          `/Characters/${spriteToUse}`,
          10
        );
        const onlineB64 = generatePostitBase64(
          character,
          character.onlineMarks,
          widgetImage,
          4
        );

        const script = generateBatchJsxScript([
          {
            name: `${character.character} - Post-it Online`,
            type: 'postit',
            b64: onlineB64,
          },
          {
            name: `${character.character} - Sprite (${spriteToUse.replace('.png', '')})`,
            type: 'sprite',
            b64: spriteB64,
          },
        ]);
        downloadJsxFile(`${cleanCharName}_Pack_Online.jsx`, script);
        showToast(`Script JSX (Pack Online) descargado para ${character.character}.`, 'success');
      }
    } catch (err: any) {
      showToast(err.message || 'Error al exportar elemento', 'error');
    }
  };

  return (
    <div className="flex-1 min-h-0 flex flex-col gap-3 overflow-hidden">
      {/* Top Filter and Indicators Panel */}
      <div className="shrink-0 bg-neutral-900 border border-neutral-700 rounded-xl p-4 shadow-xl flex flex-col gap-3">
        {/* Info & Toolbar */}
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-neutral-800 pb-3">
          {/* Character Filter Chips */}
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold uppercase tracking-wider text-neutral-400 mr-1">
              Filtrar:
            </span>
            <button
              type="button"
              onClick={() => onFilterChange('normal')}
              className={`px-3.5 py-1.5 text-xs font-bold rounded-lg border transition-colors cursor-pointer ${filter === 'normal'
                ? 'bg-red-950 text-white border-red-600'
                : 'bg-neutral-950 text-neutral-400 border-neutral-800 hover:text-white'
                }`}
            >
              Normales
            </button>
            <button
              type="button"
              onClick={() => onFilterChange('tainted')}
              className={`px-3.5 py-1.5 text-xs font-bold rounded-lg border transition-colors cursor-pointer ${filter === 'tainted'
                ? 'bg-red-950 text-white border-red-600'
                : 'bg-neutral-950 text-neutral-400 border-neutral-800 hover:text-white'
                }`}
            >
              Tainted
            </button>
          </div>
        </div>

        {/* Global Item Unlock Indicators (only visible when configured) */}
        {configured && (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
            {filter === 'normal' && (
              <div className="bg-neutral-950 border border-neutral-800 rounded-xl p-3 flex items-center gap-3">
                <div className="w-10 h-10 bg-neutral-900 border border-neutral-800 rounded-lg p-1 flex items-center justify-center shrink-0">
                  <img
                    src="/MegaBlast.png"
                    alt="Mega Blast"
                    className="max-w-full max-h-full pixelated"
                  />
                </div>
                <div className="min-w-0">
                  <div className="text-xs font-bold text-neutral-300">Mega Blast</div>
                  <div
                    className={`text-xs font-mono font-bold mt-0.5 ${isMegaBlastReady ? 'text-emerald-400' : 'text-amber-400'
                      }`}
                  >
                    {megaBlastCount}/17
                  </div>
                </div>
              </div>
            )}

            {filter === 'normal' && (
              <div className="bg-neutral-950 border border-neutral-800 rounded-xl p-3 flex items-center gap-3">
                <div className="w-10 h-10 bg-neutral-900 border border-neutral-800 rounded-lg p-1 flex items-center justify-center shrink-0">
                  <img
                    src="/MegaMush.png"
                    alt="Mega Mush"
                    className="max-w-full max-h-full pixelated"
                  />
                </div>
                <div className="min-w-0">
                  <div className="text-xs font-bold text-neutral-300">Mega Mush</div>
                  <div
                    className={`text-xs font-mono font-bold mt-0.5 ${isMegaMushReady ? 'text-emerald-400' : 'text-amber-400'
                      }`}
                  >
                    {megaMushCount}/17
                  </div>
                </div>
              </div>
            )}

            <div className="bg-neutral-950 border border-neutral-800 rounded-xl p-3 flex items-center gap-3 sm:col-span-2 md:col-span-1">
              <div className="w-10 h-10 bg-neutral-900 border border-neutral-800 rounded-lg p-1 flex items-center justify-center shrink-0">
                <img
                  src="/DeathCertificate.png"
                  alt="Death Certificate"
                  className="max-w-full max-h-full pixelated"
                />
              </div>
              <div className="min-w-0">
                <div className="text-xs font-bold text-neutral-300">
                  Death Certificate
                </div>
                <div
                  className={`text-xs font-mono font-bold mt-0.5 ${isDeathCertReady ? 'text-emerald-400' : 'text-amber-400'
                    }`}
                >
                  {deathCertCount}/34
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Character Rows Capsule Table */}
      <div className="flex-1 min-h-0 bg-neutral-900 border border-neutral-700 rounded-xl flex flex-col overflow-y-auto shadow-xl">
        {!configured || filteredList.length === 0 ? (
          <div className="flex-1 flex items-center justify-center p-12 text-center text-neutral-400 text-sm font-medium">
            Configura tu versión y slot de guardado para comenzar.
          </div>
        ) : (
          <>
            {/* Sticky Table Header inside the scroll container */}
            <div className="sticky top-0 z-10 grid grid-cols-[180px_290px_1fr_1fr] gap-4 items-center px-4 py-3 bg-neutral-950/95 backdrop-blur-sm border-b border-neutral-800 text-[11px] font-bold text-neutral-400 uppercase tracking-wider select-none shrink-0 text-center">
              <div className="text-left pl-2">Personaje</div>
              <div>Sprite / Post-it Solo / Online</div>
              <div>Progreso</div>
              <div>Inyección (.jsx)</div>
            </div>

            {/* Rows list */}
            <div className="divide-y divide-neutral-800">
              {filteredList.map((char) => (
                <CharacterRow
                  key={char.id}
                  character={char}
                  widgetImage={widgetImage}
                  onExportAction={handleExportCharacterItem}
                />
              ))}
            </div>
          </>
        )}
      </div>

      {/* Sprite Variant Choice Modal */}
      {activeVariantModal && (
        <SpriteChoiceModal
          isOpen={Boolean(activeVariantModal)}
          characterName={activeVariantModal.character.character}
          spriteInfo={activeVariantModal.spriteInfo}
          onSelect={(chosenFile) => {
            const { action, character } = activeVariantModal;
            setActiveVariantModal(null);
            handleExportCharacterItem(action, character, chosenFile);
          }}
          onClose={() => setActiveVariantModal(null)}
        />
      )}
    </div>
  );
}
