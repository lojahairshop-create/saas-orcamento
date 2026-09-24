import { useEffect, useRef, useState } from 'react';
import { useNestingStore } from '../store/nestingStore';

export function useAutoSave(orcamentoId: string = 'orc-1', sheetId: string = 'sheet-1') {
  const { parts, setAutoSaveStatus, setParts } = useNestingStore();
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  
  const draftKey = `popup:nesting:draft:${orcamentoId}:${sheetId}`;

  // Helper to check for existing draft
  const hasDraft = () => {
    return !!localStorage.getItem(draftKey);
  };

  const restoreDraft = () => {
    const draft = localStorage.getItem(draftKey);
    if (!draft) return;
    try {
      const parsed = JSON.parse(draft);
      const draftParts = parsed.parts;
      
      // We merge draft properties into current parts
      // Assuming parts are loaded from original DXFs initially
      const updatedParts = useNestingStore.getState().parts.map(p => {
        const draftPart = draftParts.find((dp: any) => dp.id === p.id);
        if (draftPart) {
          return {
            ...p,
            x: draftPart.x,
            y: draftPart.y,
            rotation: draftPart.rotation,
            mirrorX: draftPart.mirrorX,
            mirrorY: draftPart.mirrorY,
            locked: draftPart.locked
          };
        }
        return p;
      });
      
      setParts(updatedParts);
    } catch (e) {
      console.error('Failed to restore draft', e);
    }
  };

  useEffect(() => {
    setAutoSaveStatus('saving');

    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    timeoutRef.current = setTimeout(() => {
      try {
        const draftParts = parts.map(p => ({
          id: p.id,
          x: p.x,
          y: p.y,
          rotation: p.rotation,
          mirrorX: p.mirrorX,
          mirrorY: p.mirrorY,
          locked: p.locked
        }));

        const layoutData = {
          parts: draftParts,
          timestamp: new Date().toISOString(),
        };
        
        localStorage.setItem(draftKey, JSON.stringify(layoutData));
        setAutoSaveStatus('saved');
        
        setTimeout(() => setAutoSaveStatus('idle'), 2000);
      } catch (e) {
        console.error('AutoSave failed', e);
        setAutoSaveStatus('error');
      }
    }, 500); // 500ms debounce

    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, [parts, setAutoSaveStatus, draftKey]);

  return { hasDraft, restoreDraft };
}

