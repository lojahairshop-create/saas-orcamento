import React, { useEffect } from 'react';
import { CanvasStage } from './CanvasStage';
import { Toolbar } from './Toolbar';
import { PropertiesPanel } from './PropertiesPanel';
import { StatsPanel } from './StatsPanel';
import { useAutoSave } from '../../hooks/useAutoSave';

export const NestingCanvas: React.FC = () => {
  const { hasDraft, restoreDraft } = useAutoSave();

  useEffect(() => {
    if (hasDraft()) {
      if (window.confirm('Encontramos um layout salvo anteriormente. Deseja restaurar?')) {
        restoreDraft();
      }
    }
  }, []);

  return (
    <div className="flex flex-col h-screen w-full bg-slate-900 overflow-hidden font-sans">
      <Toolbar />
      <div className="flex flex-1 overflow-hidden">
        <div className="flex-1 relative">
          <CanvasStage />
        </div>
        <PropertiesPanel />
      </div>
      <StatsPanel />
    </div>
  );
};

export default NestingCanvas;
