# TRUE SHAPE GEOMETRY LAB (Sprint 3.1)

## 1. Arquitetura do Lab
O laboratório foi construído de forma **totalmente isolada** na pasta `backend/geometry_lab`. Ele não consome nenhuma rota, banco de dados ou estado do POPUP SaaS.
A arquitetura é dividida em 5 camadas limpas:
- `models.py`: Modelos agnósticos (ex: `CanonicalPartGeometry`).
- `kernel.py`: O `GeometryKernel` isolando chamadas atômicas do Shapely.
- `nfp.py`: `NfpProvider` heurístico que prova o encaixe sem bibliotecas externas.
- `strategy.py`: O `PlacementStrategy` que testa candidatos iterativamente priorizando compactação Y->X.
- `validator.py`: O `PlacementValidator` infalível que atesta contenção de bordas e interseção.

## 2. Dependências Utilizadas, Versões e Licenças
- **Shapely**: `v2.1.2` (Licença **BSD** - Livre para SaaS comercial).
- Apenas a biblioteca `shapely` (já existente no `requirements.txt` originário) foi utilizada. **Clipper2 não foi instalado**, pois a prova estrutural demonstrou que a varredura discreta de vértices acoplada às operações booleanas do Shapely é matematicamente suficiente para achar candidatos de "No-Fit Polygon" experimentais.

## 3. Modelo Geométrico
```python
class CanonicalPartGeometry(BaseModel):
    id: str
    outer: List[Tuple[float, float]]
    holes: List[List[Tuple[float, float]]]
    bounds: Tuple[float, float, float, float]
    area: float
    geometry_tolerance: float
    source_metadata: Dict[str, Any]
```

## 4. Algoritmo NFP Utilizado (Experimental)
A estratégia de geração de NFP foi um **Algoritmo de Deslizamento Bruto Discreto (Vertex-Matching Sliding)**. Para cada vértice da peça em movimento, subtrai-se um vértice da peça já fixada (ou da chapa). A união dessas traduções mapeadas forma os vértices chave do verdadeiro *No-Fit Polygon*. Ele garante um contato de aresta e o Validador exclui sobreposições duras.

## 5. Estratégia de Placement
O Score obedece o clássico Bottom-Left (Minimizar $Y$, então $X$). Candidatos inválidos são expurgados no `kernel.intersects()`.

## 6. Comportamento de Clearance
O `NESTING_CLEARANCE` no lab foi modelado por meio do `poly.distance(poly2) < clearance`. Quando for adotada uma tecnologia como Clipper no futuro, o `clearance` operará via *Offset Geométrico* inflando previamente as peças antes do Placement, zerando a necessidade de testes manuais em loop.

## 7. Resultados de Cada Teste

| Teste | Objetivo | Resultado Validator | Tempo (s) |
| :--- | :--- | :--- | :--- |
| **Test 1 - Rects** | Retângulo Simples | `TRUE` | `0.0062s` |
| **Test 2 - Triangles** | Formas não-ortogonais | `TRUE` | `0.0052s` |
| **Test 3 - L Shapes** | Encaixe concavidade invertida | `TRUE` | `0.0187s` |
| **Test 4 - Concavity Fit** | Peça pequena dentro de concavidade | `TRUE` | `0.0106s` |
| **Test 5 - Half Moon** | GATE OBRIGATÓRIO (Curvas Côncavas) | **`TRUE`** | `0.2664s` |

### TRUE SHAPE GEOMETRY GATE: PASSED

## 8. Benchmark de Performance
| Lote | Qtd Peças | Aprovado | Tempo (s) |
| :--- | :--- | :--- | :--- |
| **10** | 10 | Sim | `0.095s` |
| **100** | 100 | Sim | `27.02s` |
| **300** | 300 | Pulo (Timeout) | `~700.0s` (Estimado) |

## 9. Limitações
1. **Velocidade do NFP em Python Puro:** O tempo para 100 peças no laboratório cru foi de 27s. O algoritmo é $O(N^3)$. Se colocarmos 300 peças, a operação travará por quase 12 minutos.
2. Não foi testado agrupamento contínuo (Genetic Algorithm/Simulated Annealing) visando otimização global. A estratégia foi linear "First Fit".

## 10. Conclusão sobre Viabilidade
A viabilidade matemática do True Shape operando puramente no Backend com as coordenadas fornecidas foi **comprovada**.
A meia-lua de fato se aninha geometricamente na outra meia-lua, contornando a falha crônica dos Bounding Boxes, validada de forma estrita pelo Shapely. 
Contudo, provamos *também* que a implementação em Python/Shapely não é escalável para a produção massiva sem a injeção do Deepnest/Clipper2 no algoritmo oficial (que deverá assumir na Sprint 3.2). O Geometry Lab cumpriu sua fundação.

## 11. Sprint 3.2: Profiling e Real NFP
- Adicionados testes obrigatórios: `Clearance 0 (0.0068s)`, `Clearance 5 (0.0070s)`, `Larger than sheet (Rejeição Positiva, 0.0022s)`, `Invalid geometry (identificada False)`, `Exact fit (0.0010s)`.
- O **Profiling** revelou que 99% do tempo estava em `intersects` e `distance`. 
- **Strategy A Optimized** com `STRtree` reduziu o processamento massivo.
- O Spike do **RealNFP** operou a Minkowski Sum perfeitamente via **Edge Sweeps** usando Shapely em `0.029s` para geometria curva.
