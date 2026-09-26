import React from 'react';
import { useNestingStore } from '../../store/nestingStore';

export const PropertiesPanel: React.FC = () => {
  const { parts, updatePart } = useNestingStore();
  const selectedParts = parts.filter(p => p.selected);

  if (selectedParts.length === 0) {
    return (
      <div className="w-64 bg-slate-800 border-l border-slate-700 p-4 text-slate-400 text-sm">
        Nenhuma peça selecionada.
      </div>
    );
  }

  const part = selectedParts[0]; // Just showing the first selected for simplicity

  const handleRotate = (angle: number) => {
    updatePart(part.id, { rotation: part.rotation + angle });
  };

  const canRotate = Boolean(part.polygon);

  return (
    <div className="w-64 bg-slate-800 border-l border-slate-700 p-4 text-slate-200 flex flex-col gap-4">
      <h3 className="font-bold border-b border-slate-700 pb-2">Propriedades</h3>
      
      <div className="text-sm flex flex-col gap-2">
        <div className="flex justify-between">
          <span className="text-slate-400">Nome:</span>
          <span className="font-mono truncate ml-2" title={part.name}>{part.name}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-slate-400">X:</span>
          <span className="font-mono">{part.x.toFixed(2)} mm</span>
        </div>
        <div className="flex justify-between">
          <span className="text-slate-400">Y:</span>
          <span className="font-mono">{part.y.toFixed(2)} mm</span>
        </div>
        <div className="flex justify-between">
          <span className="text-slate-400">Rotação:</span>
          <span className="font-mono">{part.rotation.toFixed(2)}°</span>
        </div>
        {part.engineRotated !== undefined && (
          <div className="flex justify-between">
            <span className="text-slate-400">Motor Rotacionou:</span>
            <span className="font-mono">{part.engineRotated ? 'Sim' : 'Não'}</span>
          </div>
        )}
      </div>

      <div className="flex gap-2 mt-4">
        <button 
          className="flex-1 bg-slate-700 hover:bg-slate-600 disabled:opacity-50 disabled:cursor-not-allowed py-1 rounded text-sm transition-colors"
          onClick={() => handleRotate(90)}
          disabled={!canRotate}
          title={!canRotate ? "Rotação desabilitada para visualização Bounding Box" : ""}
        >
          Rot +90°
        </button>
        <button 
          className="flex-1 bg-slate-700 hover:bg-slate-600 disabled:opacity-50 disabled:cursor-not-allowed py-1 rounded text-sm transition-colors"
          onClick={() => handleRotate(-90)}
          disabled={!canRotate}
          title={!canRotate ? "Rotação desabilitada para visualização Bounding Box" : ""}
        >
          Rot -90°
        </button>
      </div>
    </div>
  );
};
