import React from 'react';
import { Rect } from 'react-konva';

interface SelectionBoxProps {
  visible: boolean;
  startX: number;
  startY: number;
  endX: number;
  endY: number;
}

export const SelectionBox: React.FC<SelectionBoxProps> = ({ visible, startX, startY, endX, endY }) => {
  if (!visible) return null;

  const isLeftToRight = endX >= startX;
  
  const x = Math.min(startX, endX);
  const y = Math.min(startY, endY);
  const width = Math.abs(endX - startX);
  const height = Math.abs(endY - startY);

  const strokeColor = isLeftToRight ? '#0000ff' : '#00ff00';
  const fillColor = isLeftToRight ? 'rgba(0, 0, 255, 0.2)' : 'rgba(0, 255, 0, 0.2)';
  const dash = isLeftToRight ? [] : [5, 5];

  return (
    <Rect
      x={x}
      y={y}
      width={width}
      height={height}
      fill={fillColor}
      stroke={strokeColor}
      strokeWidth={1 / 1} // We might want to scale stroke width based on stage zoom, but 1 is ok.
      dash={dash}
      listening={false}
    />
  );
};
