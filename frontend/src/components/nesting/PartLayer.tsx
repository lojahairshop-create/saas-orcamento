import React, { useCallback } from 'react';
import { Layer } from 'react-konva';
import { useNestingStore } from '../../store/nestingStore';
import { calculateSnap } from '../../utils/snap';
import { debugCollision } from '../../utils/collision';
import Konva from 'konva';
import { PartItem } from './PartItem';

interface PartLayerProps {
  onSelect: (e: Konva.KonvaEventObject<MouseEvent | TouchEvent>, id: string) => void;
}

export const PartLayer: React.FC<PartLayerProps> = ({ onSelect }) => {
  const { parts, sheet, updatePart, gridSize, snapEnabled, debugMode } = useNestingStore();

  const handleDragEnd = useCallback((e: Konva.KonvaEventObject<DragEvent>, id: string) => {
    const node = e.target;
    const snappedPos = calculateSnap(
      { x: node.x(), y: node.y() },
      parts,
      id,
      gridSize,
      snapEnabled
    );

    node.position(snappedPos);
    updatePart(id, { x: snappedPos.x, y: snappedPos.y });
  }, [parts, gridSize, snapEnabled, updatePart]);

  return (
    <Layer>
      {parts.map((part) => {
        const status = debugMode ? debugCollision(part, parts, sheet) : 'ok';
        
        return (
          <PartItem 
            key={part.id} 
            part={part} 
            status={status} 
            debugMode={debugMode} 
            onSelect={onSelect} 
            onDragEnd={handleDragEnd} 
          />
        );
      })}
    </Layer>
  );
};
