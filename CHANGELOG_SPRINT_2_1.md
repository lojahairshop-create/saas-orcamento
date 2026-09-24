# CHANGELOG - SPRINT 2.1 (Ferramentas CAD Web)

**Data:** 23 de Setembro de 2026
**Tag:** v0.2.0-nesting-canvas

### ✨ Funcionalidades
- **Histórico Nível CAD (Undo/Redo):** Inserção do `useHistory.ts` e atalhos globais (Ctrl+Z, Ctrl+Shift+Z, Ctrl+Y).
- **Clipboard Inteligente:** Opções de Copy, Paste e Duplicate injetados via `useClipboard.ts` com offset matemático (+20mm) para visualização amigável de cópias em massa.
- **Caixa de Seleção AutoCAD:** Renderização condicional bidirecional via `useSelectionBox.ts` (L->R = Azul/Contido, R->L = Verde/Intersecção).
- **Snap Magnético e Kerf:** Algoritmo `snap.ts` aprimorado para travamento industrial respeitando aderência de kerf/grid.
- **Auto Save Transparente:** Sistema autônomo sem payload de rede via `useAutoSave.ts` no LocalStorage com Restauro Dinâmico por chapas.
- **Modo Debug de Geometria:** Expansão da Flag `IS_DEV` injetando informações vitais de vetores (Labels `X/Y/R` flutuantes, Bounding Box Tracejada, Círculo Central, Colisões via cores Laranja/Vermelha).
- **Régua CAD (MeasureLayer):** Base arquitetural fixada nos contornos do canvas.
- **Painel Estatístico Dinâmico:** Leitura em tempo real na aba lateral atrelada ao `store/nestingStore.ts` sem gargalos.

### 🐛 Bugs Corrigidos
- Corrigido evento TS na prop `onSelect` das instâncias Konva `KonvaEventObject<MouseEvent | TouchEvent>`.
- Reescrita do `PartLayer.tsx` para evitar *Re-render Hell* global de todo o documento ao arrastar uma única peça, isolando em `React.memo(PartItem)`.

### 🚀 Melhorias de Performance
- O Componente `PartLayer` foi inteiramente refatorado garantindo suporte sustentável e frame rate bloqueado no teto do monitor em testes de `+300 peças`.

### ⚠️ Breaking Changes
- `NestingVisualizer` obsoleto substituído integralmente pelo novo Adapter `<NestingViewerAdapter />` dentro do painel `[id]/page.tsx`.
