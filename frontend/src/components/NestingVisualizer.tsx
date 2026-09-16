import React from "react";

interface PecaLayout {
  id: string;
  x: number;
  y: number;
  w: number;
  h: number;
  rotacionado?: boolean;
  tipo?: string;
}

interface ChapaLayout {
  aproveitamento: number;
  pecas: PecaLayout[];
}

interface NestingGroup {
  key?: string;
  chapa_l: number;
  chapa_c: number;
  total_chapas: number;
  aproveitamento_medio: number;
  chapas: ChapaLayout[];
}

interface NestingVisualizerProps {
  nestingGroups: NestingGroup[];
}

export default function NestingVisualizer({ nestingGroups }: NestingVisualizerProps) {
  if (!nestingGroups || nestingGroups.length === 0) {
    return (
      <div className="py-16 text-center text-slate-500 font-semibold bg-white/[0.01] border border-white/5 rounded-xl flex flex-col gap-2 items-center">
        <span>Nenhum arranjo disponível.</span>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      {nestingGroups.map((group, gIdx) => (
        <div key={gIdx} className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">
          <div className="bg-slate-50 border-b border-gray-200 px-6 py-4 flex justify-between items-center">
            <span className="font-bold text-slate-800">{group.key || `Grupo ${gIdx + 1}`}</span>
            <span className="text-xs font-bold text-emerald-600 bg-emerald-50 border border-emerald-200 px-2.5 py-1 rounded-full">
              Aproveitamento Médio: {group.aproveitamento_medio}%
            </span>
          </div>
          
          <div className="p-6 flex flex-col gap-6">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-xs bg-slate-50 border border-gray-200 p-4 rounded-xl">
              <div>
                <span className="text-slate-500 block font-semibold mb-0.5">Medida da Chapa</span>
                <span className="font-bold text-slate-800">{group.chapa_l} x {group.chapa_c} mm</span>
              </div>
              <div>
                <span className="text-slate-500 block font-semibold mb-0.5">Chapas Ocupadas</span>
                <span className="font-bold text-slate-800">{group.total_chapas} chapa(s)</span>
              </div>
              <div>
                <span className="text-slate-500 block font-semibold mb-0.5">Espaçamento (Gap)</span>
                <span className="font-bold text-slate-800">5.0 mm</span>
              </div>
              <div>
                <span className="text-slate-500 block font-semibold mb-0.5">Disposição Visual</span>
                <span className="font-bold text-slate-800">Horizontal (Comprimento X Largura)</span>
              </div>
            </div>

            <div className="flex flex-col gap-6">
              {group.chapas.map((chapa, cIdx) => (
                <div key={cIdx} className="flex flex-col gap-3 bg-white border border-gray-100 p-5 rounded-xl shadow-sm">
                  <div className="flex justify-between items-center text-xs font-bold">
                    <span className="text-slate-800">Layout da Chapa #{cIdx + 1}</span>
                    <span className="text-blue-600 bg-blue-50 border border-blue-200 px-2 py-0.5 rounded-full">
                      Eficiência: {chapa.aproveitamento}%
                    </span>
                  </div>

                  <div className="relative w-full border border-slate-300 bg-slate-50 rounded-lg overflow-hidden shadow-inner flex items-center justify-center p-4">
                    <div
                      style={{
                        width: "100%",
                        maxWidth: "800px",
                        aspectRatio: `${group.chapa_c} / ${group.chapa_l}`,
                        position: "relative",
                        border: "2px dashed #94a3b8",
                        backgroundColor: "#ffffff",
                      }}
                    >
                      {chapa.pecas.map((peca, pIdx) => {
                        const isRetalho = peca.tipo === 'retalho';
                        return (
                          <div
                            key={pIdx}
                            style={{
                              position: "absolute",
                              left: `${(peca.y / group.chapa_c) * 100}%`,
                              top: `${(peca.x / group.chapa_l) * 100}%`,
                              width: `${(peca.h / group.chapa_c) * 100}%`,
                              height: `${(peca.w / group.chapa_l) * 100}%`,
                              backgroundColor: isRetalho ? "rgba(34, 197, 94, 0.2)" : (peca.rotacionado ? "rgba(245, 158, 11, 0.15)" : "rgba(59, 130, 246, 0.15)"),
                              border: isRetalho ? "2px solid rgba(34, 197, 94, 0.8)" : (peca.rotacionado ? "1px solid rgba(245, 158, 11, 0.6)" : "1px solid rgba(59, 130, 246, 0.6)"),
                              borderRadius: "2px",
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              padding: "2px",
                              boxSizing: "border-box",
                              overflow: "hidden",
                            }}
                            title={`${peca.id}: ${Math.round(peca.w)}x${Math.round(peca.h)}mm ${peca.rotacionado ? '(Rotacionado 90°)' : ''} ${isRetalho ? '(Retalho Utilizável)' : ''}`}
                          >
                            <div className="flex flex-col items-center justify-center text-center select-none w-full h-full">
                              <span className={`text-[9px] md:text-[11px] font-bold ${isRetalho ? 'text-green-800' : 'text-slate-800'} truncate max-w-full leading-tight`}>
                                {isRetalho ? "RETALHO" : peca.id}
                              </span>
                              <span className={`text-[8px] md:text-[9px] ${isRetalho ? 'text-green-700' : 'text-slate-600'} font-semibold mt-0.5`}>
                                {Math.round(peca.w)}x{Math.round(peca.h)}
                              </span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
