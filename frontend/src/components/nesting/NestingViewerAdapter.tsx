"use client";

import React, { useEffect, useState, useMemo } from "react";
import { useNestingStore } from "@/store/nestingStore";
import dynamic from "next/dynamic";
const NestingCanvas = dynamic(() => import("./NestingCanvas"), { ssr: false });
import { PartConfig } from "@/types/nesting";
import NestingVisualizer from "@/components/orcamento/NestingVisualizer";
import { adaptBudgetNesting } from "@/utils/nestingAdapters";

interface NestingViewerAdapterProps {
  isPreviewMode?: boolean;
  nesting: any[];
  itens?: any[];
  sheet?: any;
  readOnly?: boolean;
}

const ENABLE_NEW_CANVAS = true;

import { SimplePreviewCanvas } from "./SimplePreviewCanvas";

export default function NestingViewerAdapter({ nesting, itens = [], readOnly = false, isPreviewMode = false }: NestingViewerAdapterProps) {
  const setSheet = useNestingStore((state) => state.setSheet);

  const [selectedSheetIndex, setSelectedSheetIndex] = useState<number>(0);

  // Derive Canonical Document
  const canonicalDoc = useMemo(() => {
    return adaptBudgetNesting(nesting, itens);
  }, [nesting, itens]);

  useEffect(() => {
    if (isPreviewMode) return; // Se for preview mode, ignora zustand
    if (!ENABLE_NEW_CANVAS) return;
    if (!canonicalDoc || !canonicalDoc.sheets || canonicalDoc.sheets.length === 0) {
      useNestingStore.setState({ parts: [] });
      return;
    }

    // Safely clamp selected index in case sheets array shrinks
    const safeIndex = selectedSheetIndex >= canonicalDoc.sheets.length ? 0 : selectedSheetIndex;
    if (safeIndex !== selectedSheetIndex) {
      setSelectedSheetIndex(safeIndex);
    }

    const sheetData = canonicalDoc.sheets[safeIndex];
    if (!sheetData) return;

    // Atualiza a chapa
    setSheet({
      width: sheetData.width,
      height: sheetData.height,
      thickness: sheetData.thickness || 1,
      material: sheetData.material || 'Aço',
      utilization: sheetData.utilization || 0
    });

    // Limpa peças velhas e insere novas. Hack rápido para limpar tudo:
    useNestingStore.setState({ parts: [] });

    const newParts: PartConfig[] = [];

    sheetData.placements.forEach((peca) => {
      const width = peca.width;
      const height = peca.height;

      const part: PartConfig = {
        id: peca.id,
        name: peca.name,
        quantity: 1,
        x: peca.x,
        y: peca.y,
        rotation: peca.rotation,
        engineRotated: peca.engineRotated,
        mirrorX: false,
        mirrorY: false,
        selected: false,
        locked: readOnly,
        color: '#94a3b8',
        sourceDxfId: peca.sourceItemIndex !== undefined ? peca.sourceItemIndex.toString() : peca.id,
        material: peca.material || sheetData.material || 'Aço',
        thickness: peca.thickness || sheetData.thickness || 1,
        area: width * height,
        weight: 0,
        boundingBox: { x: 0, y: 0, width, height },
        polygon: peca.polygon ? {
          id: peca.polygon.id || `poly-${peca.id}`,
          closed: true as true,
          points: peca.polygon.points
        } : undefined
      };

      newParts.push(part);
    });

    useNestingStore.setState({ parts: newParts });

  }, [canonicalDoc, selectedSheetIndex, readOnly]);

  if (isPreviewMode) {
    if (!canonicalDoc || !canonicalDoc.sheets || canonicalDoc.sheets.length === 0) return null;
    const safeIndex = selectedSheetIndex >= canonicalDoc.sheets.length ? 0 : selectedSheetIndex;
    const sheetData = canonicalDoc.sheets[safeIndex];
    if (!sheetData) return null;

    const newParts = sheetData.placements.map((peca) => {
      const width = peca.width || 100;
      const height = peca.height || 100;

      const part: PartConfig = {
        id: peca.id,
        name: peca.name || peca.id,
        quantity: 1,
        x: peca.x,
        y: peca.y,
        rotation: peca.rotation || 0,
        engineRotated: Boolean(peca.engineRotated),
        mirrorX: false,
        mirrorY: false,
        selected: false,
        locked: true,
        color: '#94a3b8',
        sourceDxfId: peca.sourceItemIndex !== undefined ? peca.sourceItemIndex.toString() : peca.id,
        material: peca.material || sheetData.material || 'Aço',
        thickness: peca.thickness || sheetData.thickness || 1,
        area: width * height,
        weight: 0,
        boundingBox: { x: 0, y: 0, width, height },
        polygon: peca.polygon ? {
          id: peca.polygon.id || `poly-${peca.id}`,
          closed: true as true,
          points: peca.polygon.points
        } : undefined
      };
      return part;
    });

    return (
      <div className="w-full h-full relative flex flex-col">
        {canonicalDoc.sheets.length > 1 && (
          <div className="absolute top-4 left-4 z-10 flex gap-2">
            {canonicalDoc.sheets.map((_, idx) => (
              <button
                key={idx}
                onClick={() => setSelectedSheetIndex(idx)}
                className={`px-3 py-1 rounded shadow text-sm font-medium ${idx === safeIndex ? 'bg-teal-600 text-white' : 'bg-white text-slate-700 hover:bg-slate-50'}`}
              >
                Chapa {idx + 1}
              </button>
            ))}
          </div>
        )}
        <div className="flex-1">
          <SimplePreviewCanvas
            sheet={{ width: sheetData.width, height: sheetData.height }}
            parts={newParts}
          />
        </div>
      </div>
    );
  }

  if (!ENABLE_NEW_CANVAS) {
    return <NestingVisualizer nestingJson={nesting} />;
  }

  if (!canonicalDoc || !canonicalDoc.sheets || canonicalDoc.sheets.length === 0) {
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
          <label className="text-xs font-bold text-slate-500 mb-1">Chapa</label>
          <select
            className="border border-gray-300 rounded px-3 py-1.5 text-sm"
            value={selectedSheetIndex}
            onChange={(e) => setSelectedSheetIndex(Number(e.target.value))}
          >
            {canonicalDoc.sheets.map((sheet, i) => (
              <option key={sheet.id || i} value={i}>
                Chapa {i + 1} - {sheet.material || 'Material Genérico'} ({sheet.width}x{sheet.height}) - Aproveitamento: {sheet.utilization?.toFixed(1) || 0}%
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Renderiza o Canvas envolto numa div controlada */}
      <div className="h-[750px] w-full rounded-xl overflow-hidden border border-gray-200 shadow-sm relative">
        <NestingCanvas />
      </div>
    </div>
  );
}
