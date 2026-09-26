import React from 'react';
import { Group, Line, Text, Rect, Circle } from 'react-konva';
import Konva from 'konva';
import { PartConfig } from '../../types/nesting';

interface PartItemProps {
  part: PartConfig;
  status: 'ok' | 'out_of_sheet' | 'collision';
  debugMode: boolean;
  onSelect: (e: Konva.KonvaEventObject<MouseEvent | TouchEvent>, id: string) => void;
  onDragEnd: (e: Konva.KonvaEventObject<DragEvent>, id: string) => void;
}

export const PartItem = React.memo(({ part, status, debugMode, onSelect, onDragEnd }: PartItemProps) => {
  let strokeColor = part.selected ? '#60a5fa' : '#94a3b8';
  let fillColor = part.selected ? '#3b82f6' : (part.color || '#64748b');
  let shadowColor = 'black';
  let shadowBlur = 5;

  if (debugMode) {
    if (status === 'collision') {
      strokeColor = '#ef4444'; // red
      fillColor = '#7f1d1d';
      shadowColor = 'red';
      shadowBlur = 10;
    } else if (status === 'out_of_sheet') {
      strokeColor = '#f97316'; // orange
      fillColor = '#9a3412';
      shadowColor = 'orange';
      shadowBlur = 10;
    } else {
      strokeColor = '#22c55e'; // green
      fillColor = '#14532d';
    }
  }

  return (
    <Group
      id={part.id}
      name="part-group"
      x={part.x}
      y={part.y}
      rotation={part.rotation}
      scaleX={part.mirrorX ? -1 : 1}
      scaleY={part.mirrorY ? -1 : 1}
      draggable={!part.locked}
      onClick={(e) => onSelect(e, part.id)}
      onTap={(e: any) => onSelect(e, part.id)}
      onDragEnd={(e) => onDragEnd(e, part.id)}
    >
      {/* Main Geometry */}
      {part.polygon ? (
        <Line
          points={part.polygon.points}
          closed={true}
          fill={fillColor}
          stroke={strokeColor}
          strokeWidth={part.selected || debugMode ? 2 : 1}
          opacity={0.8}
          shadowColor={shadowColor}
          shadowBlur={shadowBlur}
          shadowOpacity={0.5}
          shadowOffset={{ x: 2, y: 2 }}
        />
      ) : (
        <Rect
          x={part.boundingBox.x}
          y={part.boundingBox.y}
          width={part.boundingBox.width}
          height={part.boundingBox.height}
          fill={fillColor}
          stroke={strokeColor}
          strokeWidth={part.selected || debugMode ? 2 : 1}
          opacity={0.8}
          shadowColor={shadowColor}
          shadowBlur={shadowBlur}
          shadowOpacity={0.5}
          shadowOffset={{ x: 2, y: 2 }}
        />
      )}

      {/* Holes */}
      {part.polygon?.holes?.map((holePoints, idx) => (
        <Line
          key={`hole-${idx}`}
          points={holePoints}
          closed={true}
          fill="#1e293b" // matches sheet background
          stroke="#94a3b8"
          strokeWidth={1}
        />
      ))}

      {/* Part Label */}
      {!debugMode && (
        <Text
          text={part.name}
          x={part.boundingBox.x}
          y={part.boundingBox.y - 15}
          fill="#e2e8f0"
          fontSize={12}
          fontFamily="monospace"
          listening={false}
        />
      )}

      {/* Debug Overlays */}
      {debugMode && (
        <>
          <Rect 
            x={part.boundingBox.x} 
            y={part.boundingBox.y} 
            width={part.boundingBox.width} 
            height={part.boundingBox.height} 
            stroke="#eab308" 
            strokeWidth={2} 
            dash={[5, 5]} 
            listening={false}
          />
          <Circle x={0} y={0} radius={8} fill={status === 'ok' ? '#22c55e' : (status === 'collision' ? '#ef4444' : '#f97316')} listening={false} />
          <Text 
            x={10} 
            y={-20} 
            text={`X:${Math.round(part.x)} Y:${Math.round(part.y)} R:${part.rotation}°`} 
            fontSize={14} 
            fill={status === 'ok' ? '#22c55e' : (status === 'collision' ? '#f87171' : '#fb923c')} 
            fontFamily="monospace"
            listening={false} 
          />
        </>
      )}
    </Group>
  );
});
