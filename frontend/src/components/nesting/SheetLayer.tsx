import React from 'react';
import { Layer, Rect, Line, Group } from 'react-konva';
import { useNestingStore } from '../../store/nestingStore';
import { generateGridLines } from '../../utils/grid';

export const SheetLayer: React.FC = () => {
  const { sheet, gridSize, showGrid } = useNestingStore();
  const { width, height } = sheet;

  const gridLines = React.useMemo(() => {
    return generateGridLines(width, height, gridSize);
  }, [width, height, gridSize]);

  return (
    <Layer>
      {/* Base sheet background */}
      <Rect
        name="sheet"
        x={0}
        y={0}
        width={width}
        height={height}
        fill="#1e293b" // slate-800 - dark industrial base
        stroke="#475569" // slate-600
        strokeWidth={2}
      />
      
      {/* Grid lines */}
      {showGrid && (
        <Group>
          {gridLines.x.map((x, i) => (
            <Line
              key={`v-${i}`}
              points={[x, 0, x, height]}
              stroke="#334155" // slate-700
              strokeWidth={1}
              dash={[5, 5]}
            />
          ))}
          {gridLines.y.map((y, i) => (
            <Line
              key={`h-${i}`}
              points={[0, y, width, y]}
              stroke="#334155" // slate-700
              strokeWidth={1}
              dash={[5, 5]}
            />
          ))}
        </Group>
      )}
    </Layer>
  );
};
