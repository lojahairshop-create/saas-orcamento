import { useState, useCallback } from 'react';
import Konva from 'konva';
import { useNestingStore } from '../store/nestingStore';
import { checkPolygonCollision, doPolygonsIntersect } from '../utils/collision'; // We'll need to use bounding box logic

export function useSelectionBox(stageRef: React.RefObject<Konva.Stage | null>) {
  const { parts, selectParts, clearSelection } = useNestingStore();
  
  const [selectionBox, setSelectionBox] = useState({
    visible: false,
    startX: 0,
    startY: 0,
    endX: 0,
    endY: 0,
  });

  const handleMouseDown = useCallback((e: Konva.KonvaEventObject<MouseEvent>) => {
    // Only start selection box on left click (button 0) on stage or sheet
    if (e.evt.button !== 0) return;
    if (e.target !== e.target.getStage() && e.target.name() !== 'sheet') return;

    const stage = stageRef.current;
    if (!stage) return;

    // Get pointer position relative to stage (unscaled)
    const pos = stage.getRelativePointerPosition();
    if (pos) {
      setSelectionBox({
        visible: true,
        startX: pos.x,
        startY: pos.y,
        endX: pos.x,
        endY: pos.y,
      });
    }
  }, [stageRef]);

  const handleMouseMove = useCallback((e: Konva.KonvaEventObject<MouseEvent>) => {
    if (!selectionBox.visible) return;

    const stage = stageRef.current;
    if (!stage) return;

    const pos = stage.getRelativePointerPosition();
    if (pos) {
      setSelectionBox(prev => ({
        ...prev,
        endX: pos.x,
        endY: pos.y,
      }));
    }
  }, [selectionBox.visible, stageRef]);

  const handleMouseUp = useCallback((e: Konva.KonvaEventObject<MouseEvent>) => {
    if (!selectionBox.visible) return;

    setSelectionBox(prev => ({ ...prev, visible: false }));

    const { startX, startY, endX, endY } = selectionBox;
    // If it was just a click, don't do anything (handled by onClick)
    if (Math.abs(startX - endX) < 5 && Math.abs(startY - endY) < 5) {
      return;
    }

    const isLeftToRight = endX >= startX;
    
    // Bounding box of selection
    const boxMinX = Math.min(startX, endX);
    const boxMaxX = Math.max(startX, endX);
    const boxMinY = Math.min(startY, endY);
    const boxMaxY = Math.max(startY, endY);

    const isMulti = e.evt.shiftKey || e.evt.ctrlKey;
    const selectedIds: string[] = [];

    parts.forEach(part => {
      // Get part's current bounding box
      const partMinX = part.x + part.boundingBox.x;
      const partMaxX = part.x + part.boundingBox.x + part.boundingBox.width;
      const partMinY = part.y + part.boundingBox.y;
      const partMaxY = part.y + part.boundingBox.y + part.boundingBox.height;

      const isInside = partMinX >= boxMinX && partMaxX <= boxMaxX &&
                       partMinY >= boxMinY && partMaxY <= boxMaxY;
      
      const isIntersecting = !(partMinX > boxMaxX || partMaxX < boxMinX ||
                               partMinY > boxMaxY || partMaxY < boxMinY);

      if (isLeftToRight) {
        // Window selection: must be fully inside
        if (isInside) selectedIds.push(part.id);
      } else {
        // Crossing selection: can be intersecting
        if (isIntersecting) selectedIds.push(part.id);
      }
    });

    if (!isMulti) {
      clearSelection();
    }
    
    if (selectedIds.length > 0) {
      selectParts(selectedIds, true); // true to append if isMulti is already handled by clearSelection
    }
  }, [selectionBox, parts, selectParts, clearSelection]);

  return {
    selectionBox,
    handlers: {
      onMouseDown: handleMouseDown,
      onMouseMove: handleMouseMove,
      onMouseUp: handleMouseUp,
    }
  };
}
