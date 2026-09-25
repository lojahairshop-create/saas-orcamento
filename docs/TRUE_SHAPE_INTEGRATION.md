# TRUE SHAPE INTEGRATION (Sprint 3.4)

## 1. Arquitetura e Integração Experimental Controlada
A integração do mecanismo True Shape foi consolidada de maneira estritamente experimental sob a proteção térmica de uma *Feature Flag* Server-Side (`TRUE_SHAPE_ENABLED`).
O núcleo da integração ocorre no nível da Chapa (`otimizar_chapa_single_bin`), orquestrado por um Componente Seguro: `TrueShapeOrchestrator`.

- **Feature Flag OFF:** Comportamento canônico mantido inalterado. BoundingBox puro.
- **Feature Flag ON:** Invoca o Pipeline TrueShape. Se houver falha, *timeout*, overlap geométrico rejeitado, as peças do TrueShape são expurgadas, e o fluxo retrocede ao modelo BoundingBox intacto.

## 2. DXF → Canonical Pipeline
O `DXFProcessor` foi ajustado para exportar as *Primitives* originais debaixo do objeto `source_metadata` para persistir entre as camadas de abstração HTTP, sem violar o payload REST enviado pela UI. O orquestrador então utiliza o módulo `shapely` (`linemerge` + `polygonize`) para reconstituir cirurgicamente o `CanonicalPartGeometry` preservando Arcos discretizados, furos e reentrâncias.
Nenhuma geometria é "inventada", e dimensões simples geram simples Bound Boxes.

## 3. Isolamento e Proteção de Processo (Multiprocessing Timeout)
Funções baseadas na biblioteca GEOS/C (Shapely) executando em ambiente CPU-Bound costumam capturar a `GIL` do Python e ignorar `KeyboardInterrupt/ThreadTimeout`. 
A solução foi implementar `concurrent.futures.ProcessPoolExecutor` com uma função *Worker* global que processa tipos estritos serializáveis (`dict`), garantindo compatibilidade multiplataforma irrestrita (Windows Spawn / Linux Fork).
Se excedido o tempo de `TRUE_SHAPE_HARD_TIMEOUT_SECONDS`, a *Future* é abortada, o worker morre em background e o Orchestrator retorna gracefully, sem travar o ASGI e acionando o Fallback.

- **Soft Budget (Configurável):** (10.0s) A engine devolve Placements que já atingiu se estourar e deixa peças não-posicionadas.
- **Hard Timeout (Configurável):** (20.0s) Kill absoluto do ProcessPool.

## 4. Telemetria e Transacionalidade
Toda execução do TrueShape retorna metadados mapeados nos Logs (via Fallback outputs e stdout) registrando a *Reason* da falha ou sucesso. O Validator Geométrico continua sendo executado imediatamente após o cálculo (antes da aceitação do resultado).

## 5. Limitações e Shadow Mode
1. **Shadow Mode:** Pode ser emulado via script paralelo (`test_orchestrator.py` já o faz). Não foi injetado globalmente para não poluir os budgets de API desnecessariamente.
2. **Part-in-Hole:** `NOT SUPPORTED` nesta iteração.
3. **PDF / DWG:** `NOT YET IMPLEMENTED` (Somente DXF ou input de dimensões cru).
4. O Engine Côncavo ainda é O(N³) no número de geometrias, por isso a taxa de 10.0s atua violentamente em lotes >100 dependendo da densidade geométrica.

## 6. Cache
O Cache continua operando no *Geometry Hash*, o que significa que o NFP entre duas Meia-Luas rotacionadas será calculado somente uma vez por thread-worker, garantindo aceleração extrema em lotes padronizados.

## 7. Recomendação de Rollout
Não remover `Nesting2DEngine`. Habilitar a flag `TRUE_SHAPE_ENABLED = True` nos testes HML. Testar upload de um DXF com arco complexo, e validar na interface Canvas se as coordenadas de corte bateram perfeitamente com os espaços. Rollout sugerido gradual, por inquilino, não global.
