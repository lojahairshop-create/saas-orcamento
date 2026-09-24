import React from 'react';
import { useNestingStore } from '../../store/nestingStore';

const IS_DEV = process.env.NODE_ENV !== 'production';

export const Toolbar: React.FC = () => {
  const { showGrid, snapEnabled, debugMode, toggleGrid, toggleSnap, toggleDebug } = useNestingStore();

  return (
    <div className="flex items-center gap-4 bg-slate-800 p-2 border-b border-slate-700 text-slate-200">
      <div className="font-bold text-lg px-2 border-r border-slate-700">
        SigmaNest Web
      </div>
      
      <button 
        className={`px-3 py-1 rounded text-sm font-medium transition-colors ${showGrid ? 'bg-blue-600 text-white' : 'bg-slate-700 hover:bg-slate-600'}`}
        onClick={toggleGrid}
      >
        Grid {showGrid ? 'ON' : 'OFF'}
      </button>

      <button 
        className={`px-3 py-1 rounded text-sm font-medium transition-colors ${snapEnabled ? 'bg-blue-600 text-white' : 'bg-slate-700 hover:bg-slate-600'}`}
        onClick={toggleSnap}
      >
        Snap {snapEnabled ? 'ON' : 'OFF'}
      </button>

      <button 
        className={`px-3 py-1 rounded text-sm font-medium transition-colors border border-red-500 ${debugMode ? 'bg-red-600 text-white' : 'bg-slate-700 text-red-400 hover:bg-slate-600'}`}
        onClick={toggleDebug}
      >
        Modo Debug
      </button>

      {IS_DEV && (
<button 
        className="px-3 py-1 rounded text-sm font-medium transition-colors bg-purple-700 hover:bg-purple-600 text-white"
        onClick={() => {
          const startTime = performance.now();
          useNestingStore.setState({ parts: [] }); // clear
          const newParts: any[] = [];
          for(let i=0; i<300; i++) {
             const width = 100 + Math.random() * 200;
             const height = 100 + Math.random() * 200;
             newParts.push({
                id: `perf-${i}`,
                name: `Perf ${i}`,
                quantity: 1,
                x: Math.random() * 2000,
                y: Math.random() * 1000,
                rotation: 0,
                mirrorX: false,
                mirrorY: false,
                selected: false,
                locked: false,
                color: '#64748b',
                sourceDxfId: '',
                material: 'Aço',
                thickness: 1,
                area: width * height,
                weight: 0,
                boundingBox: { x: 0, y: 0, width, height },
                polygon: { id: `p-${i}`, closed: true, points: [0,0, width,0, width,height, 0,height] }
             });
          }
          useNestingStore.setState({ parts: newParts });
        }}
      >
        Perf Test (300 peças)
      </button>
)}

      {/* Add more toolbar items as needed */}
    </div>
  );
};
