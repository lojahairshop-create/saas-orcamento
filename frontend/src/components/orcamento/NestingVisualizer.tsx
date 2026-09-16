"use client";

import React, { useMemo } from "react";
import { Card } from "@/components/ui/Card";

interface PecasType {
  id: string;
  w: number;
  h: number;
  x: number;
  y: number;
  rotacionado: boolean;
}

interface NovosRetalhosType {
  x: number;
  y: number;
  w: number;
  h: number;
}

interface LayoutChapaType {
  aproveitamento: number;
  pecas: PecasType[];
}

interface NestingGroupType {
  key?: string;
  dimensao?: string;
  tipo?: string;
  aproveitamento_medio?: number;
  chapa_l: number;
  chapa_c: number;
  total_chapas?: number;
  novos_retalhos_gerados?: NovosRetalhosType[];
  chapas: LayoutChapaType[];
}

interface NestingVisualizerProps {
  nestingJson: NestingGroupType[];
}

export default function NestingVisualizer({ nestingJson }: NestingVisualizerProps) {
  const groups = useMemo(() => {
    if (!nestingJson || !Array.isArray(nestingJson)) return [];
    return nestingJson;
  }, [nestingJson]);

  if (groups.length === 0) {
    return (
      <div className="py-16 text-center text-slate-500 font-semibold bg-white/[0.01] border border-white/5 rounded-xl flex flex-col gap-2 items-center">
        <span>Nenhum arranjo salvo ou disponível. Certifique-se de salvar o orçamento para gerar o cálculo final.</span>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      {groups.map((res, gIdx) => (
        <Card
          key={gIdx}
          header={
            <div className="flex justify-between items-center w-full">
              <span className="font-bold text-slate-200">
                {res.key || res.dimensao} {res.tipo === 'retalho' ? '(Retalho do Estoque)' : '(Chapa Inteira)'}
              </span>
              {res.aproveitamento_medio !== undefined && (
                <span className="text-xs font-bold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-1 rounded-full">
                  Aproveitamento Médio: {res.aproveitamento_medio}%
                </span>
              )}
            </div>
          }
        >
          <div className="flex flex-col gap-6">
            {/* Infos chapa */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-xs bg-white/[0.01] border border-slate-200 p-4 rounded-xl shadow-sm">
              <div>
                <span className="text-slate-500 block font-semibold mb-0.5">Medida Utilizada</span>
                <span className="font-bold text-slate-700">{res.chapa_l} x {res.chapa_c} mm</span>
              </div>
              <div>
                <span className="text-slate-500 block font-semibold mb-0.5">Quantidade Ocupada</span>
                <span className="font-bold text-slate-700">{res.total_chapas || res.chapas?.length || 0} unidade(s)</span>
              </div>
              <div>
                <span className="text-slate-500 block font-semibold mb-0.5">Espaçamento (Margem)</span>
                <span className="font-bold text-slate-700">5.0 mm</span>
              </div>
              <div>
                <span className="text-slate-500 block font-semibold mb-0.5">Origem Material</span>
                <span className="font-bold text-slate-700">{res.tipo === 'retalho' ? 'Retalho Existente' : 'Chapa Nova'}</span>
              </div>
            </div>

            {/* Chapas individuais */}
            <div className="flex flex-col gap-6">
              {res.chapas && res.chapas.map((chapa: LayoutChapaType, cIdx: number) => (
                <div key={cIdx} className="flex flex-col gap-3 border border-slate-200 bg-slate-50 p-5 rounded-xl shadow-sm">
                  <div className="flex justify-between items-center text-xs font-bold">
                    <span className="text-slate-700">Layout #{cIdx + 1}</span>
                    <span className="text-blue-600 bg-blue-500/10 border border-blue-500/20 px-2 py-0.5 rounded-full">
                      Eficiência: {chapa.aproveitamento}%
                    </span>
                  </div>

                  {/* CAD canvas representation */}
                  <div className="relative w-full border border-slate-800 bg-[#07070a] rounded-lg overflow-hidden shadow-inner flex items-center justify-center p-4">
                    <div
                      style={{
                        width: "100%",
                        maxWidth: "700px",
                        aspectRatio: `${res.chapa_c} / ${res.chapa_l}`,
                        position: "relative",
                        border: "1px dashed #334155",
                        backgroundColor: "#020204",
                      }}
                    >
                      {/* Render parts */}
                      {chapa.pecas && chapa.pecas.map((peca: PecasType, pIdx: number) => (
                        <div
                          key={pIdx}
                          style={{
                            position: "absolute",
                            left: `${(peca.y / res.chapa_c) * 100}%`,
                            top: `${(peca.x / res.chapa_l) * 100}%`,
                            width: `${(peca.h / res.chapa_c) * 100}%`,
                            height: `${(peca.w / res.chapa_l) * 100}%`,
                            backgroundColor: peca.rotacionado ? "rgba(245, 158, 11, 0.2)" : "rgba(59, 130, 246, 0.2)",
                            border: peca.rotacionado ? "1px solid rgba(245, 158, 11, 0.6)" : "1px solid rgba(59, 130, 246, 0.6)",
                            borderRadius: "3px",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            padding: "2px",
                            boxSizing: "border-box",
                            overflow: "hidden",
                            transition: "all 0.2s ease",
                          }}
                          title={`${peca.id}: ${Math.round(peca.w)}x${Math.round(peca.h)}mm ${peca.rotacionado ? '(Rotacionado 90°)' : ''}`}
                        >
                          <div className="flex flex-col items-center justify-center text-center select-none w-full h-full">
                            <span className="text-[8px] md:text-[9.5px] font-bold text-slate-200 truncate max-w-full leading-none">
                              {peca.id}
                            </span>
                            <span className="text-[7px] md:text-[8px] text-slate-400 font-bold mt-0.5">
                              {Math.round(peca.w)}x{Math.round(peca.h)}
                            </span>
                          </div>
                        </div>
                      ))}

                      {/* Render generated useful scraps (only on the last or corresponding sheet if global) */}
                      {res.novos_retalhos_gerados && res.novos_retalhos_gerados.map((retalho: NovosRetalhosType, rIdx: number) => (
                        <div
                          key={`retalho-${rIdx}`}
                          style={{
                            position: "absolute",
                            left: `${(retalho.y / res.chapa_c) * 100}%`,
                            top: `${(retalho.x / res.chapa_l) * 100}%`,
                            width: `${(retalho.h / res.chapa_c) * 100}%`,
                            height: `${(retalho.w / res.chapa_l) * 100}%`,
                            backgroundColor: "rgba(16, 185, 129, 0.2)", // Emerald green
                            border: "1px dashed rgba(16, 185, 129, 0.8)",
                            borderRadius: "3px",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            padding: "2px",
                            boxSizing: "border-box",
                          }}
                          title={`Retalho Gerado: ${Math.round(retalho.w)}x${Math.round(retalho.h)}mm`}
                        >
                          <div className="flex flex-col items-center justify-center text-center select-none">
                            <span className="text-[8px] md:text-[10px] font-bold text-emerald-400">RETALHO (SOBRA ÚTIL)</span>
                            <span className="text-[7px] md:text-[8px] text-emerald-300/80 font-bold mt-0.5">
                              {Math.round(retalho.w)}x{Math.round(retalho.h)}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </Card>
      ))}
    </div>
  );
}
