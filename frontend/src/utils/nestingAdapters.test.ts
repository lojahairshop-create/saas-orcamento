import { adaptBudgetNesting } from './nestingAdapters';

describe('nestingAdapters', () => {
  it('1 e 7. nesting vazio e orcamento legado', () => {
    expect(adaptBudgetNesting([], [])).toEqual({ sheets: [] });
    expect(adaptBudgetNesting(null as any, [])).toEqual({ sheets: [] });
    expect(adaptBudgetNesting(undefined as any, [])).toEqual({ sheets: [] });
  });

  it('2. um bin / uma peça', () => {
    const nestingJson = [{
      tipo: 'chapa_nova',
      id: 'bin_1',
      dimensao: [3000, 1500],
      nesting_result: {
        aproveitamento_percentual: 50,
        pecas_posicionadas: [{ id: 0, x: 10, y: 10, w: 100, h: 200, rotacionado: false }]
      }
    }];
    const itens = [{ descricao: 'Peca 1', material: 'Aço', espessura: 2 }];

    const result = adaptBudgetNesting(nestingJson, itens);
    expect(result.sheets.length).toBe(1);
    const sheet = result.sheets[0];
    expect(sheet.width).toBe(3000);
    expect(sheet.height).toBe(1500);
    expect(sheet.utilization).toBe(50);
    expect(sheet.material).toBe('Aço');
    expect(sheet.thickness).toBe(2);
    
    expect(sheet.placements.length).toBe(1);
    const placement = sheet.placements[0];
    expect(placement.id).toBe('bin_1-0-0');
    expect(placement.name).toBe('Peca 1');
    expect(placement.x).toBe(10);
    expect(placement.width).toBe(100);
    expect(placement.rotation).toBe(0);
  });

  it('3. vários bins', () => {
    const nestingJson = [
      { id: 'b1', dimensao: [1, 1], nesting_result: { pecas_posicionadas: [] } },
      { id: 'b2', dimensao: [2, 2], nesting_result: { pecas_posicionadas: [] } }
    ];
    const result = adaptBudgetNesting(nestingJson, []);
    expect(result.sheets.length).toBe(2);
  });

  it('4. peça rotacionada', () => {
    const nestingJson = [{
      nesting_result: {
        pecas_posicionadas: [{ id: 0, rotacionado: true }]
      }
    }];
    const result = adaptBudgetNesting(nestingJson, []);
    expect(result.sheets[0].placements[0].rotation).toBe(0);
    expect(result.sheets[0].placements[0].engineRotated).toBe(true);
  });

  it('5. sourceItemIndex válido', () => {
    const nestingJson = [{ nesting_result: { pecas_posicionadas: [{ id: '1' }] } }];
    const itens = [null, { material: 'Inox' }];
    const result = adaptBudgetNesting(nestingJson, itens);
    expect(result.sheets[0].placements[0].sourceItemIndex).toBe(1);
    expect(result.sheets[0].placements[0].material).toBe('Inox');
  });

  it('6. sourceItemIndex inválido', () => {
    const nestingJson = [{ nesting_result: { pecas_posicionadas: [{ id: 'invalido' }] } }];
    const result = adaptBudgetNesting(nestingJson, []);
    expect(result.sheets[0].placements[0].sourceItemIndex).toBeUndefined();
    expect(result.sheets[0].placements[0].name).toBe('Peça invalido');
  });

  it('8 e 9. bin sem aproveitamento e dimensões válidas', () => {
    const nestingJson = [{ dimensao: [2000, 1000] }]; // No nesting_result
    const result = adaptBudgetNesting(nestingJson, []);
    expect(result.sheets[0].utilization).toBeUndefined();
    expect(result.sheets[0].width).toBe(2000);
    expect(result.sheets[0].height).toBe(1000);
    expect(result.sheets[0].placements).toEqual([]);
  });

  it('10. ausência de polygon', () => {
    const nestingJson = [{ nesting_result: { pecas_posicionadas: [{ id: 0 }] } }];
    const result = adaptBudgetNesting(nestingJson, []);
    expect(result.sheets[0].placements[0].polygon).toBeUndefined();
  });

  it('não muta parâmetros originais', () => {
    const nestingJson = [{ id: 'b1', dimensao: [1000, 1000], nesting_result: { pecas_posicionadas: [{ id: 0 }] } }];
    const itens = [{ material: 'Ouro' }];
    const cloneNesting = JSON.parse(JSON.stringify(nestingJson));
    const cloneItens = JSON.parse(JSON.stringify(itens));

    adaptBudgetNesting(nestingJson, itens);

    expect(nestingJson).toEqual(cloneNesting);
    expect(itens).toEqual(cloneItens);
  });
});
