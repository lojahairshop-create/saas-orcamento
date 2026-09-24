import React from 'react';
import { useNestingStore } from '../../store/nestingStore';

export const StatsPanel: React.FC = () => {
  const { sheet, parts, autoSaveStatus } = useNestingStore();

  const totalParts = parts.length;
  const utilPercent = sheet.utilization.toFixed(1);

  return (
    <div className="bg-slate-800 border-t border-slate-700 p-2 text-xs flex justify-between text-slate-400">
      <div className="flex gap-6">
        <span>Chapa: {sheet.width}x{sheet.height}x{sheet.thickness}mm</span>
        <span>Material: {sheet.material}</span>
        {autoSaveStatus === 'saving' && <span className="text-yellow-400">Salvando...</span>}
        {autoSaveStatus === 'saved' && <span className="text-green-400">Salvo localmente</span>}
        {autoSaveStatus === 'error' && <span className="text-red-400">Erro ao salvar</span>}
      </div>
      <div className="flex gap-6">
        <span>Peças: {totalParts}</span>
        <span>Aproveitamento: <strong className="text-blue-400">{utilPercent}%</strong></span>
      </div>
    </div>
  );
};
