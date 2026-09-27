import React, { useRef, useEffect, useState } from 'react';
import { Stage, Layer, Rect, Group } from 'react-konva';
import { PartItem } from './PartItem';
import { PartConfig } from '../../types/nesting';

interface SimplePreviewCanvasProps {
  sheet: { width: number; height: number };
  parts: PartConfig[];
}

export const SimplePreviewCanvas: React.FC<SimplePreviewCanvasProps> = ({ sheet, parts }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [dimensions, setDimensions] = useState({ width: 800, height: 600 });
  
  // Calculate scale and position to fit the sheet in the container
  const padding = 40;
  let scale = 1;
  let x = padding;
  let y = padding;

  if (dimensions.width > 0 && dimensions.height > 0 && sheet.width > 0 && sheet.height > 0) {
    const scaleX = (dimensions.width - padding * 2) / sheet.width;
    const scaleY = (dimensions.height - padding * 2) / sheet.height;
    scale = Math.min(scaleX, scaleY);
    
    // Center it
    x = (dimensions.width - sheet.width * scale) / 2;
    y = (dimensions.height - sheet.height * scale) / 2;
  }

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
    <div className="w-full h-full bg-slate-900" ref={containerRef}>
      <Stage width={dimensions.width} height={dimensions.height}>
        <Layer x={x} y={y} scaleX={scale} scaleY={scale}>
          {/* Sheet */}
          <Rect
            x={0}
            y={0}
            width={sheet.width}
            height={sheet.height}
            fill="#1e293b"
            stroke="#475569"
            strokeWidth={2 / scale}
          />
          {/* Parts */}
          <Group>
            {parts.map(part => (
              <PartItem
                key={part.id}
                part={{ ...part, locked: true, selected: false }}
                status="ok"
                debugMode={false}
                onSelect={() => {}}
                onDragEnd={() => {}}
              />
            ))}
          </Group>
        </Layer>
      </Stage>
    </div>
  );
};
