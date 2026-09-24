# NESTING CANVAS ARCHITECTURE (v0.2.0)

Este documento descreve a arquitetura do motor CAD/CAM web integrado ao sistema POPUP SaaS.

## 1. Arquitetura do Módulo
O módulo é fundamentado em **React-Konva** (para renderização via Canvas 2D/WebGL) gerenciado globalmente pelo **Zustand** (para estado reativo desacoplado). Todas as interações gráficas de arrastar e soltar (`drag`) não acionam re-renderizações no Virtual DOM do React até o fim do movimento (`onDragEnd`), garantindo escalabilidade de 60 FPS com alto volume de peças.

## 2. Fluxo DXF → Polygon → Canvas
- **Upload:** DXFs são passados e convertidos primariamente em um Array de `Polygon`.
- **Zustand:** As peças são injetadas em `parts: PartConfig[]`. Todas as medidas e coordenadas absolutas armazenadas dentro deste state são **estritamente expressadas em milímetros**. O escalonamento (`stageScale`) age independentemente, o que garante a precisão exigida no corte industrial.

## 3. Histórico e Zustand
Para prevenir estouro de memória, um sistema proprietário de Histórico (`useHistory`) gerencia as pilhas `past` e `future` (limitado a 100).
Diferentemente de pacotes como `zundo`, este hook salva apenas **variáveis espaciais transformadas** (`x`, `y`, `rotation`, `mirrorX`, `mirrorY`, `locked`) economizando drasticamente alocação de heap.

## 4. Snap
A aproximação magnética em malha industrial. Suporta aderência `vértice-vértice`, `borda da chapa` e `grid`, descontando proceduralmente o valor do *Kerf* (espessura do laser) no momento da acoplagem.

## 5. Auto Save
Implementado nativamente via `useAutoSave.ts`. Utiliza *debounce* rigoroso de 500ms para rastrear o estado modificado e fazer commit assíncrono exclusivamente no `localStorage` do browser do cliente (formato `popup:nesting:draft:{id}:{sheetId}`). **Isso isenta o backend Python de chamadas excessivas desnecessárias.**

## 6. Adapter
Para evitar quebras no ecossistema e retrocompatibilidade com orçamentos antigos, o `NestingViewerAdapter.tsx` traduz os objetos antigos baseados em `Bounding Box` nua do Python para `Polygons` fechados que a nova engine compreende.

## 7. Limitações Atuais e Sprint 3 (True Shape)
Atualmente o módulo suporta Bounding Box Collision e operações básicas. Funcionalidades baseadas em algoritmos de aproximação geométrica orgânica (Separating Axis Theorem - SAT, SVGNest, Clipper.js, Exportação G-Code NC) estão arquiteturalmente preparadas mas formalmente desabilitadas para serem injetadas com segurança na **Sprint 3 (True Shape Nesting)**.
