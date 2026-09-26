import {
  CanonicalNestingDocument,
  CanonicalNestingSheet,
  CanonicalNestingPlacement,
} from "../types/nestingCanonical";

export function adaptBudgetNesting(
  nestingJson: any[],
  itens: any[] = []
): CanonicalNestingDocument {
  if (!nestingJson || !Array.isArray(nestingJson)) {
    return { sheets: [] };
  }

  const sheets: CanonicalNestingSheet[] = nestingJson.map((bin, binIndex) => {
    const dimensao = bin.dimensao || [3000, 1500];
    const width = dimensao[0];
    const height = dimensao[1];
    const sourceType = bin.tipo;
    const utilization = bin.nesting_result?.aproveitamento_percentual;

    // Placements
    const rawPlacements = bin.nesting_result?.pecas_posicionadas || [];
    const placements: CanonicalNestingPlacement[] = rawPlacements.map(
      (peca: any, pecaIndex: number) => {
        // sourceItemIndex is the 'id' in the bin's placement
        const sourceItemIndex = typeof peca.id === "number" ? peca.id : parseInt(peca.id, 10);
        let name = `Peça ${peca.id}`;
        let material = undefined;
        let thickness = undefined;

        if (!isNaN(sourceItemIndex) && itens[sourceItemIndex]) {
          const itemInfo = itens[sourceItemIndex];
          name = itemInfo.descricao || name;
          material = itemInfo.material;
          thickness = itemInfo.espessura;
        }

        // Stabilize ID for React/Konva rendering
        const stableId = `${bin.id || binIndex}-${sourceItemIndex}-${pecaIndex}`;

        return {
          id: stableId,
          sourceItemIndex: isNaN(sourceItemIndex) ? undefined : sourceItemIndex,
          name,
          x: peca.x,
          y: peca.y,
          width: peca.w || 0,
          height: peca.h || 0,
          rotation: 0,
          engineRotated: Boolean(peca.rotacionado),
          // Explicitly leaving polygon undefined if absent
          polygon: peca.polygon,
          material,
          thickness,
        };
      }
    );

    // Infer sheet material/thickness from its first placement if possible (bins are homogeneous)
    const sheetMaterial = placements.length > 0 ? placements[0].material : undefined;
    const sheetThickness = placements.length > 0 ? placements[0].thickness : undefined;

    return {
      id: bin.id || `sheet-${binIndex}`,
      width,
      height,
      utilization,
      sourceType,
      material: sheetMaterial,
      thickness: sheetThickness,
      placements,
    };
  });

  return { sheets };
}
