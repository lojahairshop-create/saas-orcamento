"""Review layouts: select billable material; reuse all existing financial formulas."""
import copy
import hashlib
import json
import math
from collections import Counter

from fastapi import HTTPException
from app.calculo.engine import CalculoEngine, calcular_custo_mp
from app.calculo.nesting_engine import Nesting2DEngine


def calculate_review(items, config, mode, layout=None):
    engine = CalculoEngine()
    items = copy.deepcopy(items)
    for item in items:
        item['chapa_arranjada'] = False
        item.pop('custo_mp_override', None)
    groups = {}
    for i, item in enumerate(items):
        key = (item['material'], item['espessura'], item['chapa_l'], item['chapa_c'], item['preco_kg'], item.get('beneficiamento', False))
        groups.setdefault(key, []).append(i)
    bins = copy.deepcopy(layout) if layout is not None else []
    missing = []
    if layout is None:
        for key, indices in groups.items():
            parts = [dict(id=i, largura=items[i]['largura'], comprimento=items[i]['comprimento'], quantidade=items[i]['quantidade']) for i in indices]
            if any(p['largura'] <= 0 or p['comprimento'] <= 0 for p in parts):
                raise HTTPException(422, 'Preencha as dimensões de todas as peças antes de fazer nesting.')
            packed = Nesting2DEngine.otimizar_lote_multi_bin(parts, [], (key[2], key[3]), margem_corte=5)
            missing.extend(packed.get('pecas_nao_suportadas', []))
            bins.extend(packed['bins_utilizados'])
    counts = Counter()
    costs = Counter()
    for n, sheet in enumerate(bins):
        placements = sheet.get('nesting_result', {}).get('pecas_posicionadas', [])
        if not placements:
            raise HTTPException(422, 'Remova chapas vazias do arranjo.')
        dim = sheet.get('dimensao', [])
        if len(dim) != 2 or any(not math.isfinite(float(v)) or v <= 0 for v in dim):
            raise HTTPException(422, 'Dimensões da chapa inválidas.')
        ids = []
        for p in placements:
            idx = p.get('id')
            if not isinstance(idx, int) or idx < 0 or idx >= len(items):
                raise HTTPException(422, 'Peça desconhecida no arranjo.')
            it = items[idx]
            values = [p.get(k, -1) for k in ('x', 'y', 'w', 'h')]
            if any(not isinstance(v, (int, float)) or not math.isfinite(v) for v in values):
                raise HTTPException(422, 'Posição inválida no arranjo.')
            x, y, w, h = values
            expected = (it['comprimento'], it['largura']) if p.get('rotacionado') else (it['largura'], it['comprimento'])
            if abs(w-expected[0]) > .001 or abs(h-expected[1]) > .001:
                raise HTTPException(422, 'As dimensões da peça foram alteradas no arranjo.')
            if x < 0 or y < 0 or w <= 0 or h <= 0 or x+w > dim[0]+.001 or y+h > dim[1]+.001:
                raise HTTPException(422, 'Há peças fora da chapa.')
            ids.append(idx)
            counts[idx] += 1
        first = items[ids[0]]
        key = (first['material'], first['espessura'], first['chapa_l'], first['chapa_c'], first['preco_kg'], first.get('beneficiamento', False))
        if any(i not in groups[key] for i in ids) or list(dim) != [key[2], key[3]]:
            raise HTTPException(422, 'A chapa não corresponde ao material, espessura ou dimensão das peças.')
        for i, p in enumerate(placements):
            for q in placements[i+1:]:
                if p['x'] < q['x']+q['w']-.001 and q['x'] < p['x']+p['w']-.001 and p['y'] < q['y']+q['h']-.001 and q['y'] < p['y']+p['h']-.001:
                    raise HTTPException(422, 'Há peças sobrepostas no arranjo.')
        occupied_w = max(p['x']+p['w'] for p in placements)-min(p['x'] for p in placements)
        occupied_h = max(p['y']+p['h'] for p in placements)-min(p['y'] for p in placements)
        w, h = dim if mode == 'chapa_inteira' else (occupied_w, occupied_h)
        # Same density, material cost and area allocation used by the existing engine.
        weight = first['espessura'] * w * h * engine.get_densidade(first['material']) / 1_000_000
        cost = 0 if first.get('beneficiamento') else calcular_custo_mp(weight, first['preco_kg'], config['ipi_rate'])
        area = sum(p['w']*p['h'] for p in placements)
        for p in placements:
            costs[p['id']] += cost * p['w']*p['h']/area
        # Never accept stock identifiers or leftover claims supplied by the browser.
        sheet.clear()
        sheet.update(id=f'review-{n}', tipo='chapa_nova', dimensao=list(dim), material=first['material'], espessura=first['espessura'], modo_cobranca=mode, largura_ocupada=occupied_w, comprimento_ocupado=occupied_h,
                     nesting_result=dict(pecas_posicionadas=placements, aproveitamento_percentual=100*area/(dim[0]*dim[1])))
    complete = all(counts[i] == it['quantidade'] for i, it in enumerate(items))
    if any(counts[i] > it['quantidade'] for i, it in enumerate(items)):
        raise HTTPException(422, 'O arranjo contém peças duplicadas.')
    if layout is not None and not complete:
        raise HTTPException(422, 'Arranjo incompleto: posicione todas as peças antes de confirmar.')
    if mode != 'individual':
        for i, item in enumerate(items):
            item['custo_mp_override'] = costs[i]
    result = engine.calcular_orcamento(items, {**config, 'usar_nesting_2d': False})
    result['bins_utilizados'] = bins
    result['pecas_nao_suportadas'] = missing
    result['completo'] = complete
    payload = dict(items=items, config=config, mode=mode, bins=bins, result=result)
    result['fingerprint'] = hashlib.sha256(json.dumps(payload, sort_keys=True, allow_nan=False).encode()).hexdigest()
    return result
