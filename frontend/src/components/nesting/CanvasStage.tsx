import React, { useRef, useEffect, useState } from 'react';
import { Stage } from 'react-konva';
import { SheetLayer } from './SheetLayer';
import { PartLayer } from './PartLayer';
import { TransformerLayer } from './TransformerLayer';
import { SelectionBox } from './SelectionBox';
import { MeasureLayer } from './MeasureLayer';
import { useCanvas } from '../../hooks/useCanvas';
import { useSelection } from '../../hooks/useSelection';
import { useSelectionBox } from '../../hooks/useSelectionBox';
import { useZoom } from '../../hooks/useZoom';
import { useClipboard } from '../../hooks/useClipboard';

export const CanvasStage: React.FC = () => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [dimensions, setDimensions] = useState({ width: 800, height: 600 });
  const { stageRef, stagePos, setStagePos, stageScale, setStageScale, handleDragEnd } = useCanvas();
  const { handleSelect, handleStageClick } = useSelection();
  const { handleWheel } = useZoom(stageRef, stageScale, setStageScale, setStagePos);
  
  // Use selection box hooks
  const { selectionBox, handlers: selectionBoxHandlers } = useSelectionBox(stageRef);

  // Use clipboard and undo/redo
  useClipboard();

  useEffect(() => {
    const updateSize = () => {
      if (containerRef.current) {
        setDimensions({
          width: containerRef.current.offsetWidth,
          height: containerRef.current.offsetHeight,
        });
      }
    };
    
    updateSize();
    window.addEventListener('resize', updateSize);
    return () => window.removeEventListener('resize', updateSize);
  }, []);

  return (
    <div ref={containerRef} className="w-full h-full bg-slate-900 overflow-hidden cursor-crosshair relative">
      <Stage
        ref={stageRef}
        width={dimensions.width}
        height={dimensions.height}
        onWheel={handleWheel}
        onClick={handleStageClick}
        onTap={(e: any) => handleStageClick(e)}
        onMouseDown={selectionBoxHandlers.onMouseDown}
        onMouseMove={selectionBoxHandlers.onMouseMove}
        onMouseUp={selectionBoxHandlers.onMouseUp}
        x={stagePos.x}
        y={stagePos.y}
        scaleX={stageScale}
        scaleY={stageScale}
        draggable={!selectionBox.visible} // Disable stage dragging if selecting
        onDragEnd={handleDragEnd}
      >
        <MeasureLayer />
        <SheetLayer />
        <PartLayer onSelect={handleSelect} />
        <TransformerLayer stageRef={stageRef} />
        <SelectionBox {...selectionBox} />
      </Stage>
    </div>
  );
};

