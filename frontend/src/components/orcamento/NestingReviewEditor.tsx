"use client";
import React, { useRef, useState } from 'react';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { api } from '@/lib/api';

export default function NestingReviewEditor({ payload, initial, onClose, onConfirm, onUseConventional }: {
  payload: any; initial: any; onClose: () => void; onConfirm: (result: any, mode: string) => void; onUseConventional: () => void;
}) {
  const [bins, setBins] = useState<any[]>(initial?.bins_utilizados || []);
  const canvas = useRef<SVGSVGElement>(null);
  const [sheetIndex, setSheetIndex] = useState(0);
  const [selected, setSelected] = useState<number | null>(null);
  const [mode, setMode] = useState(initial?.bins_utilizados?.[0]?.modo_cobranca || 'individual');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const sheet = bins[sheetIndex];
  const parts = sheet?.nesting_result?.pecas_posicionadas || [];
  const change = (index: number, changes: any) => setBins(old => old.map((b, i) => i !== sheetIndex ? b : {
    ...b, nesting_result: { ...b.nesting_result, pecas_posicionadas: b.nesting_result.pecas_posicionadas.map((p: any, j: number) => j === index ? {...p, ...changes} : p) },
  }));
  const run = async (confirm: boolean) => {
    setBusy(true); setError('');
    try {
      const result = await api.revisarNesting({...payload, modo_cobranca_nesting: mode, layout_revisao: confirm ? bins : null});
      setBins(result.bins_utilizados); setSheetIndex(0); setSelected(null);
      if (!result.completo) {
        const missing = (result.pecas_nao_suportadas || []).slice(0, 5).map((p: any) => {
          const item = payload.itens[p.id];
          return `${item?.descricao || `Peça ${Number(p.id) + 1}`} (${p.largura} × ${p.comprimento} mm)`;
        });
        const first = payload.itens[0];
        setError(`Há peças não posicionadas${missing.length ? `: ${missing.join('; ')}` : ''}. Chapa informada: ${first?.chapa_l || 0} × ${first?.chapa_c || 0} mm. Confira as dimensões da peça, da chapa e a margem de corte.`);
      }
      if (confirm && result.completo) onConfirm(result, mode);
    } catch (e: any) { setError(e.message || 'Não foi possível validar o arranjo.'); }
    finally { setBusy(false); }
  };
  const download = () => {
    const rows = [['Chapa','Material','Espessura mm','Largura mm','Comprimento mm','Peças','Aproveitamento %','Largura ocupada mm','Comprimento ocupado mm']];
    bins.forEach((b, i) => {
      const ps = b.nesting_result.pecas_posicionadas;
      const item = payload.itens[ps[0]?.id];
      const w = Math.max(...ps.map((p: any) => p.x+p.w))-Math.min(...ps.map((p: any) => p.x));
      const h = Math.max(...ps.map((p: any) => p.y+p.h))-Math.min(...ps.map((p: any) => p.y));
      rows.push([String(i+1),item?.material,String(item?.espessura),...b.dimensao.map(String),String(ps.length),String((100*ps.reduce((a: number,p: any)=>a+p.w*p.h,0)/(b.dimensao[0]*b.dimensao[1])).toFixed(2)),String(w),String(h)]);
    });
    rows.push([], ['Chapa','Peça','Quantidade']);
    bins.forEach((b, i) => {
      const counts: Record<string,number> = {};
      b.nesting_result.pecas_posicionadas.forEach((p: any) => counts[p.id]=(counts[p.id] || 0)+1);
      Object.entries(counts).forEach(([id, qty]) => rows.push([String(i+1),payload.itens[Number(id)]?.descricao || id,String(qty)]));
    });
    const url = URL.createObjectURL(new Blob(['\ufeff'+rows.map(r=>r.map(v=>'"'+String(v ?? '').replace(/^[=+@-]/,"'$&").replace(/"/g,'""')+'"').join(';')).join('\r\n')], {type:'text/csv;charset=utf-8'}));
    const a = document.createElement('a'); a.href=url; a.download='relatorio-nesting.csv'; a.click(); URL.revokeObjectURL(url);
  };
  return <Modal isOpen onClose={onClose} title="Nesting — organizar peças e escolher cobrança" size="full">
    <div className="flex flex-wrap gap-3 mb-4">
      <Button onClick={()=>run(false)} disabled={busy}>{busy ? 'Calculando…' : 'Organizar automaticamente'}</Button>
      <Button variant="secondary" disabled={busy} onClick={()=>{
        const groups: Record<string, any> = {};
        payload.itens.forEach((it: any,id: number)=>{
          const key=JSON.stringify([it.material,it.espessura,it.chapa_l,it.chapa_c,it.preco_kg,it.beneficiamento]);
          groups[key] ||= {dimensao:[it.chapa_l,it.chapa_c],nesting_result:{pecas_posicionadas:[]}};
          for(let n=0;n<it.quantidade;n++) groups[key].nesting_result.pecas_posicionadas.push({id,x:0,y:0,w:it.largura,h:it.comprimento,rotacionado:false});
        });
        setBins(Object.values(groups));setSheetIndex(0);setSelected(null);
        setError('Montagem manual: as peças começam na origem. Selecione cada peça na lista para posicioná-la sem sobreposição.');
      }}>Iniciar montagem manual</Button>
      <Button variant="secondary" onClick={download} disabled={!bins.length || busy}>Baixar relatório de chapas (CSV)</Button>
      <Button variant="secondary" disabled={!sheet || busy} onClick={()=>{
        if(!canvas.current) return;
        const svg=canvas.current.cloneNode(true) as SVGSVGElement;
        svg.setAttribute('xmlns','http://www.w3.org/2000/svg');svg.removeAttribute('class');
        svg.setAttribute('width',String(sheet.dimensao[0]));svg.setAttribute('height',String(sheet.dimensao[1]));
        const url=URL.createObjectURL(new Blob([new XMLSerializer().serializeToString(svg)],{type:'image/svg+xml'}));
        const a=document.createElement('a');a.href=url;a.download=`chapa-${sheetIndex+1}.svg`;a.click();URL.revokeObjectURL(url);
      }}>Baixar desenho da chapa (SVG)</Button>
      <Button variant="secondary" disabled={!sheet || busy} onClick={()=>setBins(old=>[...old,{...sheet,nesting_result:{pecas_posicionadas:[]}}])}>Adicionar chapa igual</Button>
      <span>{bins.length} chapas · {bins.reduce((n,b)=>n+b.nesting_result.pecas_posicionadas.length,0)} peças posicionadas de {payload.itens.reduce((n: number,i: any)=>n+i.quantidade,0)}</span>
    </div>
    <p className="text-sm mb-4">Arraste as peças para ajustar o arranjo. Selecione uma peça para girar ou ajustar sua posição. O servidor verifica o arranjo ao confirmar.</p>
    {error && <p role="alert" className="bg-red-50 text-red-700 p-3 mb-3">{error}</p>}
    <div className="flex flex-wrap gap-2 mb-3">{bins.map((b,i)=><Button key={i} variant={i===sheetIndex?'primary':'secondary'} onClick={()=>{setSheetIndex(i);setSelected(null);}}>Chapa {i+1} · {b.dimensao.join(' × ')} mm</Button>)}</div>
    {!!parts.length && <label className="block mb-3">Selecionar peça <select disabled={busy} className="border p-2" value={selected ?? ''} onChange={e=>setSelected(e.target.value===''?null:Number(e.target.value))}>
      <option value="">Escolha uma peça</option>{parts.map((p:any,i:number)=><option key={i} value={i}>{i+1} — {payload.itens[p.id]?.descricao} ({p.w} × {p.h} mm)</option>)}
    </select></label>}
    {sheet && <svg ref={canvas} aria-label="Editor de posições das peças na chapa" viewBox={`0 0 ${sheet.dimensao[0]} ${sheet.dimensao[1]}`} className="w-full h-[45vh] bg-slate-100 border touch-none" onPointerMove={e=>{
      if (!e.buttons || selected === null || busy) return;
      const matrix=e.currentTarget.getScreenCTM(); if (!matrix) return;
      const point=new DOMPoint(e.clientX,e.clientY).matrixTransform(matrix.inverse());
      change(selected,{x:Math.round(Math.max(0,Math.min(sheet.dimensao[0]-parts[selected].w,point.x-parts[selected].w/2))),y:Math.round(Math.max(0,Math.min(sheet.dimensao[1]-parts[selected].h,point.y-parts[selected].h/2)))});
    }}>
      <rect width={sheet.dimensao[0]} height={sheet.dimensao[1]} fill="white" stroke="#64748b"/>
      {parts.map((p: any,i: number)=><g key={i} onPointerDown={e=>{if(busy)return;setSelected(i);e.currentTarget.setPointerCapture(e.pointerId);}} style={{cursor:'move'}}>
        <rect x={p.x} y={p.y} width={p.w} height={p.h} fill={selected===i?'#99f6e4':'#cbd5e1'} stroke="#0f766e" strokeWidth={2}/>
        {payload.itens[p.id]?.vetor_svg?.trim().startsWith('<svg') && <image
          pointerEvents="none" href={'data:image/svg+xml;charset=utf-8,'+encodeURIComponent(payload.itens[p.id].vetor_svg)}
          transform={p.rotacionado ? `translate(${p.x+p.w} ${p.y}) rotate(90)` : `translate(${p.x} ${p.y})`}
          width={p.rotacionado?p.h:p.w} height={p.rotacionado?p.w:p.h} preserveAspectRatio="none" />}
        <text pointerEvents="none" x={p.x+p.w/2} y={p.y+p.h/2} textAnchor="middle" fontSize={Math.max(8,Math.min(p.w/7,p.h/4,24))}>{payload.itens[p.id]?.descricao || `Peça ${p.id+1}`}</text>
      </g>)}
    </svg>}
    {selected!==null && parts[selected] && <div className="flex gap-3 items-center my-3">
      {(['x','y'] as const).map(k=><label key={k}>{k.toUpperCase()} (mm) <input type="number" className="border w-24 p-1" value={parts[selected][k]} disabled={busy} onChange={e=>change(selected,{[k]:Number(e.target.value)})}/></label>)}
      <Button variant="secondary" disabled={busy} onClick={()=>change(selected,{w:parts[selected].h,h:parts[selected].w,rotacionado:!parts[selected].rotacionado})}>Girar 90°</Button>
      <label>Mover para <select value="" disabled={busy} onChange={e=>{
        const target=Number(e.target.value); const part={...parts[selected],x:0,y:0};
        setBins(old=>old.map((b,i)=>({...b,nesting_result:{...b.nesting_result,pecas_posicionadas:i===target?[...b.nesting_result.pecas_posicionadas,part]:i===sheetIndex?b.nesting_result.pecas_posicionadas.filter((_:any,j:number)=>j!==selected):b.nesting_result.pecas_posicionadas}})));
        setSheetIndex(target);setSelected(null);
      }}><option value="">Escolher chapa</option>{bins.map((_,i)=>i!==sheetIndex&&<option key={i} value={i}>Chapa {i+1}</option>)}</select></label>
    </div>}
    {sheet && !parts.length && <Button variant="secondary" onClick={()=>{setBins(old=>old.filter((_,i)=>i!==sheetIndex));setSheetIndex(0);}}>Remover chapa vazia</Button>}
    <div className="flex flex-wrap items-center gap-4 mt-5 border-t pt-4">
      <label>Cobrar por <select className="border rounded p-2 ml-2" value={mode} disabled={busy} onChange={e=>setMode(e.target.value)}>
        <option value="individual">Peças — cálculo convencional</option><option value="chapa_inteira">Chapa inteira</option><option value="retalho_arranjado">Retalho arranjado — retângulo ocupado</option>
      </select></label>
      <Button onClick={()=>run(true)} disabled={!bins.length || busy}>Validar arranjo e aplicar cobrança</Button>
      <Button variant="secondary" disabled={busy} onClick={onUseConventional}>Continuar sem nesting</Button>
    </div>
  </Modal>;
}
