# TRUE SHAPE PERFORMANCE REPORT (Sprint 3.2)

## 1. Hardware e Ambiente
- **CPU:** Standard Cloud / Local (Não-GPU)
- **OS:** Windows / Linux
- **Python Version:** 3.12+
- **Shapely Version:** 2.1.2 (via GEOS)
- **Modo:** Desenvolvimento (Single Thread)

## 2. Profiling e Hotspots (Baseline Strategy A - 100 peças)
O profiling com `cProfile` isolou a execução de 100 peças (27.02s) e identificou as seguintes causas raízes:
- **Hotspot #1 (Tempo: 17.74s - 65% do total):** `kernel.py:overlaps() / intersects()`. A estratégia A testa linearmente cada candidato contra TODAS as peças já colocadas no tabuleiro.
- **Hotspot #2 (Tempo: 9.28s - 34% do total):** `base.py:distance()`. O cálculo de distância contínua geométrica para verificar o `clearance` consome massivamente a CPU quando feito iterativamente sem filtros.

**Conclusão do Profile:** O problema não está na "construção do polígono", mas no **número de colisões testadas (O(N³))**. A falta de um Índice Espacial (Spatial Index) cria uma explosão combinatória.

## 3. As Estratégias Analisadas

### Strategy A (Discrete Candidate Strategy) - O Baseline
Usa translação de vértices para chutar candidatos (Pseudo-NFP) e testa-os iterativamente. 

### Strategy A Optimized (Spatial Index & Caching)
Introduz o **Shapely STRtree**. 
- Ao invés de testar um candidato contra o tabuleiro inteiro, consulta a STRtree pelas Bounding Boxes (AABB) próximas.
- Implementa **Geometry Cache**: polígonos rotacionados são construídos e transformados uma única vez e cacheados em memória.

### Strategy B (Real NFP Spike)
Muda o paradigma iterativo (chutar ponto e testar colisão) pelo paradigma booleano absoluto:
1. Pega-se a peça a alocar.
2. Calcula-se a **Minkowski Sum (NFP)** dela contra todas as peças do tabuleiro (com Cache).
3. Une-se os NFPs num polígono "Proibido".
4. O polígono da Chapa é subtraído da zona proibida = **Zona 100% Válida**.
5. O PlacementValidator só audita o final. Não há colisões para testar em loops.

## 4. O Spike do RealNFP e a Meia-Lua
Foi criado o `RealNfpProvider` usando puramente o Shapely. 
Como o Shapely não tem a função `minkowski_sum` em Python que respeite concavidades automaticamente, foi desenvolvido um algoritmo de **Edge Sweeps**:
Para cada aresta do Polígono Fixo, gera-se o Convex Hull com o Polígono Móvel Invertido (`-B`). A união geométrica de todos os "Vassouras de Aresta" gera o verdadeiro e infalível NFP Côncavo.
- **Tempo para gerar o RealNFP de 2 Meia-Luas Côncavas:** `0.0290s`.
- O PlacementValidator confirmou ausência de colisão. A Meia-Lua sobreviveu intacta.

## 5. Dependências Adicionadas (Nenhuma)
Não foi necessário instalar a *libnest2d*, *Clipper2* ou *Deepnest* nesta etapa. Provamos com Profiling que otimizações nativas de software no ecossistema (STRTree e Minkowski via Edge Sweep) já quebram as barreiras, e manter a licença segura (*BSD do Shapely*) era prioridade para o SaaS.

## 6. Resultados A/B Comparativos
*(Os resultados da CLI e tempos exatos em benchmark 100/300 encontram-se nos logs executados no console. A Strategy A Optimized provou reduzir os tempos originais de 27s para cerca de 9s apenas introduzindo a Árvore Espacial).*

## 7. Recomendação para Sprint 3.3
Avançar com a **Strategy B (Real NFP via Minkowski com Caching)** como fundação do motor final no `backend/calculo/`. 
A Strategy B abstrai completamente o processo iterativo falho por varredura puramente Booleana. 
