import { useState, useCallback, useRef } from 'react';
import Konva from 'konva';

export function useCanvas() {
  const stageRef = useRef<Konva.Stage>(null);
  const [stagePos, setStagePos] = useState({ x: 0, y: 0 });
  const [stageScale, setStageScale] = useState(1);

  const handleDragEnd = useCallback((e: Konva.KonvaEventObject<DragEvent>) => {
    if (e.target === e.target.getStage()) {
      setStagePos({ x: e.target.x(), y: e.target.y() });
    }
  }, []);

  return {
    stageRef,
    stagePos,
    setStagePos,
    stageScale,
    setStageScale,
    handleDragEnd,
  };
}
