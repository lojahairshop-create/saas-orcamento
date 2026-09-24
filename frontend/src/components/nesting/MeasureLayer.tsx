import React from 'react';
import { Layer, Line, Text, Group } from 'react-konva';
import { useNestingStore } from '../../store/nestingStore';

// React.memo used for 60FPS requirement
export const MeasureLayer = React.memo(() => {
  const { sheet, showGrid, gridSize, stageScale } = useNestingStore((state) => ({
    sheet: state.sheet,
    showGrid: state.showGrid,
    gridSize: state.gridSize,
    stageScale: 1 // If we want scaling we'd need it from context, or just draw fixed rulers
  }));

  if (!showGrid) return null;

  const rulerColor = 'rgba(255, 255, 255, 0.4)';
  const tickColor = 'rgba(255, 255, 255, 0.3)';

  // For CAD, we usually draw a ruler on top and left, or just grid
  // Grid lines are probably better in SheetLayer, but here is a simple CAD Ruler on axis
  
  const step = 100; // 100mm steps for ticks
  
  const hTicks = [];
  for (let x = 0; x <= sheet.width; x += step) {
    hTicks.push(
      <Group key={`hx-${x}`} x={x} y={-20}>
        <Line points={[0, 0, 0, 10]} stroke={tickColor} strokeWidth={1} />
        <Text text={x.toString()} fill={rulerColor} fontSize={10} y={-12} x={2} />
      </Group>
    );
  }

  const vTicks = [];
  for (let y = 0; y <= sheet.height; y += step) {
    vTicks.push(
      <Group key={`vy-${y}`} x={-20} y={y}>
        <Line points={[0, 0, 10, 0]} stroke={tickColor} strokeWidth={1} />
        <Text text={y.toString()} fill={rulerColor} fontSize={10} x={-25} y={-4} rotation={-90} />
      </Group>
    );
  }

  return (
    <Layer>
      {/* Top Ruler Line */}
      <Line points={[0, -20, sheet.width, -20]} stroke={rulerColor} strokeWidth={1} />
      {hTicks}
      
      {/* Left Ruler Line */}
      <Line points={[-20, 0, -20, sheet.height]} stroke={rulerColor} strokeWidth={1} />
      {vTicks}
    </Layer>
  );
});
