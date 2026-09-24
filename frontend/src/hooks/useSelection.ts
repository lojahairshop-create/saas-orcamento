import { useCallback } from 'react';
import { useNestingStore } from '../store/nestingStore';
import Konva from 'konva';

export function useSelection() {
  const { parts, selectParts, clearSelection } = useNestingStore();

  const handleSelect = useCallback((e: Konva.KonvaEventObject<MouseEvent | TouchEvent>, id: string) => {
    e.cancelBubble = true;
    const isMultiSelect = e.evt.shiftKey || e.evt.ctrlKey || e.evt.metaKey;
    selectParts([id], isMultiSelect);
  }, [selectParts]);

  const handleStageClick = useCallback((e: Konva.KonvaEventObject<MouseEvent | TouchEvent>) => {
    // If we click on the stage directly, clear selection
    if (e.target === e.target.getStage() || e.target.name() === 'sheet') {
      clearSelection();
    }
  }, [clearSelection]);

  const selectedParts = parts.filter(p => p.selected);

  return {
    handleSelect,
    handleStageClick,
    selectedParts,
  };
}
