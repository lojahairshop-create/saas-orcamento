# TRUE SHAPE PROCESS ISOLATION

## Arquitetura de Isolamento (Sprint 3.5)
Durante a homologação pré-deploy, descobrimos que a biblioteca GEOS/Shapely opera em nível C, ignorando o `KeyboardInterrupt` e monopolizando a GIL do Python. Mais crítico ainda: o contexto `concurrent.futures.ProcessPoolExecutor` realiza um block obrigatório na thread principal do FastAPI (`executor.shutdown(wait=True)`) quando o contexto `with` é encerrado, mesmo que a *Future* retorne um `TimeoutError`. 
Isso causaria o congelamento absoluto dos workers da API.

A solução implementada nesta Sprint utiliza primitivas de nível de SO puras: `multiprocessing.Process` em conjunto com `multiprocessing.Queue`.

### Lifecycle do Processo Filho
1. **Spawn:** O `TrueShapeOrchestrator` adquire um semáforo de capacidade (default: 2) e invoca um processo dedicado.
2. **IPC:** Nenhum objeto Shapely atravessa a fronteira do processo. Os dados (`CanonicalPartGeometry`) são injetados como `dict`.
3. **Execução:** O worker computa NFP e converte os resultados `Placement` para `dict`, os postando na `Queue`.
4. **Hard Timeout Real:** O processo pai chama `queue.get(timeout=20)`. Se ocorrer Timeout, ou erro fatal, o pai executa um *Clean Kill*:
   - `process.terminate()`
   - `process.join(timeout=1.0)`
   - Se ainda vivo (e.g. GEOS preso em laço C infinito), executa `process.kill()` via OS signal (e via `psutil.kill()` para compatibilidade estrita em Windows).
5. **Fallback Transactional:** O resultado parcial na RAM é evaporado junto com a aniquilação do PID filho. O BoundingBox legado executa a carga inteira in-thread em <0.1s.

### Resource Governance e Backpressure
- O `multiprocessing.Process` incorre em ~40 MB de overhead de RAM por worker.
- O CPU é intensivo (um núcleo inteiro a 100% por arranjo longo).
- **Semáforo (`TRUE_SHAPE_MAX_CONCURRENT_JOBS`):** Foi injetado no nível da Aplicação. Rejeita *fail-fast* de novas tentativas assim que os slots esgotam. O cliente sequer aguarda na fila: o sistema aciona fallback BBox imediatamente, garantindo que o orçamento responda na hora sem timeout.
  - *Nota Arquitetural:* Em arquiteturas ASGI (ex: Gunicorn com 4 workers), este semáforo é local ao worker process pai. O teto real na máquina seria `4 * MAX_CONCURRENT_JOBS`.

### Crash Parent vs Child
- **Child Crash:** Totalmente isolado. A queue joga `Empty` no get ou erro de IPC; fallback assume na hora.
- **Parent Crash (Linux/Windows):** Em caso de OOM fatal ou `kill -9` no Uvicorn/Gunicorn, processos `multiprocessing.Process` costumam sofrer SIGTERM cascata no Linux. No Windows, o processo pode ficar *orphan* se o python master cair duramente, contudo o SO tende a varrê-lo. Uma checagem de zombie collector em Background Task pode ser avaliada para ambientes Windows Server em produção.

### Telemetria e Logs
Todo processo abortado loga exatamente por que caiu:
- `DEBUG: Process <PID> is alive. Terminating...`
- `DEBUG: Process <PID> resisted terminate. Killing...`
- `[TRUE SHAPE] Capacity rejected: TRUE_SHAPE_MAX_CONCURRENT_JOBS exceeded.`
- `[TRUE SHAPE] Multiple independent contours found in a single part. Falling back to Bounding Box...`

O sistema está blindado e não bloqueará a API principal.
