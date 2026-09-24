import { useCallback } from 'react';
import Konva from 'konva';

export function useZoom(
  stageRef: React.RefObject<Konva.Stage | null>,
  scale: number,
  setScale: (s: number) => void,
  setPos: (pos: { x: number, y: number }) => void
) {
  const handleWheel = useCallback((e: Konva.KonvaEventObject<WheelEvent>) => {
    e.evt.preventDefault();
    const stage = stageRef.current;
    if (!stage) return;

    const scaleBy = 1.1;
    const oldScale = stage.scaleX();
    const pointer = stage.getPointerPosition();

    if (!pointer) return;

    const mousePointTo = {
      x: (pointer.x - stage.x()) / oldScale,
      y: (pointer.y - stage.y()) / oldScale,
    };

    const newScale = e.evt.deltaY < 0 ? oldScale * scaleBy : oldScale / scaleBy;
    setScale(newScale);

    const newPos = {
      x: pointer.x - mousePointTo.x * newScale,
      y: pointer.y - mousePointTo.y * newScale,
    };
    setPos(newPos);
  }, [stageRef, setScale, setPos]);

  return { handleWheel };
}
