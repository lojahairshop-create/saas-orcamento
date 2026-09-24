"use client";

import React, { useEffect, useState } from "react";
import { useNestingStore } from "@/store/nestingStore";
import NestingCanvas from "./NestingCanvas";
import { PartConfig } from "@/types/nesting";
import NestingVisualizer from "@/components/orcamento/NestingVisualizer";

interface NestingViewerAdapterProps {
  nesting: any[];
  sheet?: any;
  readOnly?: boolean;
}

const ENABLE_NEW_CANVAS = true;

export default function NestingViewerAdapter({ nesting, readOnly = false }: NestingViewerAdapterProps) {
  const setSheet = useNestingStore((state) => state.setSheet);
  const addPart = useNestingStore((state) => state.addPart);
  const parts = useNestingStore((state) => state.parts);
  const removePart = useNestingStore((state) => state.removePart);

  const [selectedGroup, setSelectedGroup] = useState<number>(0);
  const [selectedSheet, setSelectedSheet] = useState<number>(0);

  useEffect(() => {
    if (!ENABLE_NEW_CANVAS) return;
    if (!nesting || nesting.length === 0) return;

    const group = nesting[selectedGroup];
    if (!group || !group.chapas || group.chapas.length === 0) return;

    const sheetData = group.chapas[selectedSheet];
    if (!sheetData) return;

    // Atualiza a chapa
    setSheet({
      width: group.chapa_c || 3000, // Comprimento
      height: group.chapa_l || 1500, // Largura
      thickness: 1,
      material: group.key || group.dimensao || 'Aço',
      utilization: sheetData.aproveitamento || 0
    });

    // Limpa peças velhas e insere novas. Hack rápido para limpar tudo:
    useNestingStore.setState({ parts: [] });

    const newParts: PartConfig[] = [];

    sheetData.pecas.forEach((peca: any, idx: number) => {
      // Converte do formato do backend
      // Se não tiver polygon, gera Bounding Box
      const width = peca.rotacionado ? peca.h : peca.w;
      const height = peca.rotacionado ? peca.w : peca.h;
      
      const part: PartConfig = {
        id: peca.id || `part-${idx}`,
        name: `Peça ${peca.id || idx}`,
        quantity: 1,
        x: peca.x,
        y: peca.y,
        rotation: peca.rotation || (peca.rotacionado ? 90 : 0),
        mirrorX: false,
        mirrorY: false,
        selected: false,
        locked: readOnly,
        color: '#94a3b8', // slate-400
        sourceDxfId: peca.id || '',
        material: group.key || 'Aço',
        thickness: 1,
        area: width * height,
        weight: 0,
        boundingBox: { x: 0, y: 0, width, height },
        polygon: peca.polygon || {
          id: `poly-${idx}`,
          closed: true,
          points: [
            0, 0,
            width, 0,
            width, height,
            0, height
          ]
        }
      };

      newParts.push(part);
    });

    useNestingStore.setState({ parts: newParts });

  }, [nesting, selectedGroup, selectedSheet]);

  if (!ENABLE_NEW_CANVAS) {
    return <NestingVisualizer nestingJson={nesting} />;
  }

  if (!nesting || nesting.length === 0) {
    return (
      <div className="py-16 text-center text-slate-500 font-semibold bg-white border border-gray-200 rounded-xl flex flex-col gap-2 items-center">
        <span>Nenhum arranjo salvo ou disponível.</span>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Controles de Navegação */}
      <div className="flex items-center gap-4 bg-white p-4 rounded-xl border border-gray-200">
        <div className="flex flex-col">
          <label className="text-xs font-bold text-slate-500 mb-1">Grupo de Material</label>
          <select 
            className="border border-gray-300 rounded px-3 py-1.5 text-sm"
            value={selectedGroup}
            onChange={(e) => {
              setSelectedGroup(Number(e.target.value));
              setSelectedSheet(0);
            }}
          >
            {nesting.map((g: any, i: number) => (
              <option key={i} value={i}>
                {g.key || g.dimensao} ({g.chapas?.length || 0} chapas)
              </option>
            ))}
          </select>
        </div>

        {nesting[selectedGroup]?.chapas && (
          <div className="flex flex-col">
            <label className="text-xs font-bold text-slate-500 mb-1">Chapa</label>
            <select 
              className="border border-gray-300 rounded px-3 py-1.5 text-sm"
              value={selectedSheet}
              onChange={(e) => setSelectedSheet(Number(e.target.value))}
            >
              {nesting[selectedGroup].chapas.map((c: any, i: number) => (
                <option key={i} value={i}>
                  Chapa {i + 1} - Aproveitamento: {c.aproveitamento}%
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* Renderiza o Canvas envolto numa div controlada */}
      <div className="h-[750px] w-full rounded-xl overflow-hidden border border-gray-200 shadow-sm relative">
        <NestingCanvas />
      </div>
    </div>
  );
}
