import React from 'react';

interface ConfirmModalProps {
  isOpen: boolean;
  title: string;
  eyebrow?: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  onConfirm: () => void;
  onCancel: () => void;
}

export function ConfirmModal({
  isOpen,
  title,
  eyebrow = 'Advertencia',
  message,
  confirmText = 'Confirmar',
  cancelText = 'Cancelar',
  onConfirm,
  onCancel,
}: ConfirmModalProps) {
  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm transition-opacity"
      onClick={onCancel}
    >
      <div
        className="w-full max-w-md bg-neutral-900 border border-neutral-700 rounded-xl p-5 shadow-2xl transition-transform"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
      >
        <div className="mb-3">
          <div className="text-xs font-bold tracking-wider uppercase text-red-600 mb-1">
            {eyebrow}
          </div>
          <h2 className="text-xl font-bold text-white">{title}</h2>
        </div>

        <p className="text-sm text-neutral-300 leading-relaxed mb-6">{message}</p>

        <div className="flex gap-3 justify-end">
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 text-xs font-semibold text-neutral-300 bg-neutral-700 hover:bg-neutral-600 rounded-md transition-colors cursor-pointer"
          >
            {cancelText}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className="px-4 py-2 text-xs font-semibold text-white bg-red-700 hover:bg-red-600 rounded-md transition-colors cursor-pointer"
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
}
