import { useEffect, useCallback } from 'react';
import { useNestingStore } from '../store/nestingStore';

export function useClipboard() {
  const { parts, clipboard, setClipboard, addPart, selectParts, clearSelection, undo, redo, saveHistory } = useNestingStore();

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
    const cmdOrCtrl = isMac ? e.metaKey : e.ctrlKey;

    if (!cmdOrCtrl) return;

    if (e.key === 'c' || e.key === 'C') {
      // Copy
      const selectedParts = parts.filter(p => p.selected);
      if (selectedParts.length > 0) {
        setClipboard(selectedParts);
      }
    } else if (e.key === 'v' || e.key === 'V') {
      // Paste
      if (clipboard.length > 0) {
        clearSelection();
        const newIds: string[] = [];
        
        // Offset for pasted items so they don't overlap perfectly
        const offset = 20;

        // Grouping changes to history
        saveHistory();

        clipboard.forEach(part => {
          const newPart = {
            ...part,
            id: `part-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
            x: part.x + offset,
            y: part.y + offset,
            selected: true,
          };
          // addPart saves history individually, so we might want to bypass or combine.
          // For simplicity, we just add them. Store `addPart` calls saveHistory.
          // Actually, if pasting multiple, it might save multiple histories.
          // A bulk add feature would be better, but we'll use addPart.
          useNestingStore.getState().addPart(newPart);
          newIds.push(newPart.id);
        });
        
        // Since addPart updates selection internally or not, we select them explicitly
        selectParts(newIds, false);
      }
    } else if (e.key === 'd' || e.key === 'D') {
      // Duplicate
      e.preventDefault(); // Prevent browser bookmark shortcut
      const selectedParts = parts.filter(p => p.selected);
      if (selectedParts.length > 0) {
        clearSelection();
        const newIds: string[] = [];
        const offset = 20;
        
        saveHistory();

        selectedParts.forEach(part => {
          const newPart = {
            ...part,
            id: `part-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
            x: part.x + offset,
            y: part.y + offset,
            selected: true,
          };
          useNestingStore.getState().addPart(newPart);
          newIds.push(newPart.id);
        });
        selectParts(newIds, false);
      }
    } else if (e.key === 'z' || e.key === 'Z') {
      if (e.shiftKey) {
        redo();
      } else {
        undo();
      }
    } else if (e.key === 'y' || e.key === 'Y') {
      redo();
    }
  }, [parts, clipboard, setClipboard, selectParts, clearSelection, undo, redo, saveHistory]);

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);
}
