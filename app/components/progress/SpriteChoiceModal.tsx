import React from 'react';

export interface SpriteVariant {
  key: string;
  title: string;
  file: string;
}

export interface SpriteInfo {
  sprite: string;
  hasVariants: boolean;
  variants: SpriteVariant[];
}

interface SpriteChoiceModalProps {
  isOpen: boolean;
  characterName: string;
  spriteInfo: SpriteInfo | null;
  onSelect: (filename: string) => void;
  onClose: () => void;
}

export function SpriteChoiceModal({
  isOpen,
  characterName,
  spriteInfo,
  onSelect,
  onClose,
}: SpriteChoiceModalProps) {
  if (!isOpen || !spriteInfo) return null;

  const choices = [
    {
      key: 'main',
      title: 'Versión principal',
      subtitle: spriteInfo.sprite,
      src: `/Characters/${spriteInfo.sprite}`,
    },
    ...spriteInfo.variants.map((v) => ({
      key: v.key,
      title: v.title,
      subtitle: v.file,
      src: `/Characters/${v.file}`,
    })),
  ];

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm transition-opacity"
      onClick={onClose}
    >
      <div
        className="w-full max-w-190 bg-neutral-900 border border-neutral-750 rounded-2xl p-6 shadow-2xl transition-all"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="sprite-choice-title"
      >
        {/* Modal Header */}
        <header className="flex items-start justify-between gap-4 mb-4 pb-2 border-b border-neutral-800">
          <div>
            <p className="text-[11px] font-bold text-red-500 uppercase tracking-wider mb-1">
              Exportación con variante
            </p>
            <h2 id="sprite-choice-title" className="text-lg font-bold text-white">
              ¿Qué versión del sprite deseas exportar?
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8.5 h-8.5 rounded-full border border-neutral-700 bg-neutral-950 text-neutral-300 hover:text-white hover:bg-neutral-800 hover:border-neutral-500 flex items-center justify-center transition-all cursor-pointer shrink-0"
            title="Cerrar"
          >
            ✕
          </button>
        </header>

        {/* Choice Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
          {choices.map((choice) => (
            <button
              key={choice.key}
              type="button"
              onClick={() => onSelect(choice.subtitle)}
              className="flex flex-col items-center gap-2.5 w-full p-3.5 rounded-xl border border-neutral-800 bg-neutral-950/70 hover:bg-neutral-800/80 hover:border-red-600 hover:-translate-y-0.5 transition-all cursor-pointer group text-center"
            >
              <img
                src={choice.src}
                alt={choice.title}
                loading="lazy"
                decoding="async"
                className="w-full max-w-37.5 aspect-square object-contain pixelated bg-neutral-950 border border-neutral-800 rounded-lg p-2 group-hover:scale-105 transition-transform"
              />
              <div className="text-sm font-bold text-white group-hover:text-red-400 transition-colors">
                {choice.title}
              </div>
              <div className="text-xs text-neutral-400 text-center break-all font-mono">
                {choice.subtitle}
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
