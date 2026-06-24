"""
Reverse-engineer formulas from the spreadsheet values.
Focuses on row 10 (PEÇA 01) to understand the calculation chain.
"""

# === RAW VALUES FROM ROW 10 (PEÇA 01) ===

# -- HEADER PARAMETERS --
icms = 0.18           # L2 - ICMS
csll = 0.0108         # Y2 - CSLL
aliquota_icms = 0.18  # L3 - Alíquota real ICMS
irpj = 0.012          # Y3 - IRPJ
ipi = 0.05            # L4 - IPI
total_impostos = 0.2393  # Y4 - Total impostos em cascata
pis = 0.0065          # L5 - PIS
fator_calculo = 0.7607  # Y5 - Fator de cálculo de impostos
cofins = 0.03         # L6 - COFINS
base_calculo = 1.0    # G5 - Base de cálculo

# -- ITEM DATA (ROW 10) --
item = 1              # A10
descricao = "PEÇA 01" # B10
num_desenho = 1.0     # C10
quant = 1.0           # D10
material = "AÇO CARB." # E10
tipo = "S 1020"       # F10
espessura = 3.18      # G10 (mm)
vel_corte = 3528.0    # H10 (mm/min) - from laser params table
perimetro = 122.0     # I10 (mm)
num_entradas = 4.0    # J10
peck = 1.0            # K10 (seg)
largura = 122.0       # L10 (mm)
comprimento = 111.0   # M10 (mm)
area = 0.018602       # N10 (m²) - CALCULATED
peso_unit = 0.35725198612752  # O10 (kg) - CALCULATED
dim_chapa_l = 1200.0  # P10 (mm)
dim_chapa_c = 2400.0  # R10 (mm)
peso_total = 0.36822339360  # S10 (kg) - CALCULATED
peso_chapa = 71.985024  # T10 (kg) - CALCULATED
pecas_por_chapa = 180.0  # U10 - CALCULATED
qtd_chapas = 1.0      # V10 - CALCULATED
sobra_chapa = 179.0   # W10 - CALCULATED
retalho = 63.948105516826  # X10 (kg) - CALCULATED
preco_kg = 2.0        # Y10 (R$/kg)
custo_mp = 0.77326912656  # Z10 (R$) - CALCULATED

# -- FABRICATION COLUMNS (row 10) --
tempo_corte = 1.0     # C27,10 - TEMPO DE CORTE LASER (min)
setup = 6.0           # C28,10 - SET-UP (min)
dobra_unit = 6.0      # C29,10
dobra_total = 6.0     # C30,10
caldeiraria_unit = 6.0 # C31,10
caldeiraria_total = 6.0 # C32,10
solda_unit = 6.0      # C33,10
solda_total = 6.0     # C34,10
guilhotina_unit = 6.0 # C35,10
guilhotina_total = 6.0 # C36,10
usinagem_int_unit = 6.0 # C37,10
usinagem_int_total = 6.0 # C38,10
montagem_unit = 6.0   # C39,10
montagem_total = 6.0  # C40,10

# -- PRICING COLUMNS (row 10) --
total_fabricacao = 8.166666666666668  # C45,10
custo_basico_total = 8.939935793226669  # C46,10
margem_lucro = 0.3    # C47,10 (30%)
valor_venda_sem_imp = 11.62191653119467  # C48,10
preco_unit_c_imp = 15.277923663986684  # C49,10
preco_total_c_imp = 15.277923663986684  # C50,10

# -- TAX BREAKDOWN (row 10) --
icms_valor = 2.750026259517603  # C51,10
ipi_valor = 0.7638961831993343  # C52,10
pis_valor = 0.09930650381591345  # C53,10
cofins_valor = 0.4583377099196005  # C54,10
base_calc_icms = 15.277923663986684  # C55,10
total_tributos = 4.071566656452451  # C56,10
total_nf = 16.04181984718602  # C57,10
comissao = 0.3486574959358401  # C58,10

# ============================
# REVERSE-ENGINEERING FORMULAS
# ============================

print("=== VERIFICAÇÃO DE FÓRMULAS ===\n")

# 1. ÁREA (N10) = largura_m * comprimento_m  (convertido para m²)
area_calc = (largura / 1000) * (comprimento / 1000)  # 0.122 * 0.111
print(f"1. Área (N10):")
print(f"   Fórmula: (L/1000) * (M/1000) = ({largura}/1000) * ({comprimento}/1000)")
print(f"   Calculado: {area_calc}")
print(f"   Planilha:  {area}")
print(f"   Match: {abs(area_calc - area) < 0.000001}")
print()

# 2. PESO UNITÁRIO (O10) = Área * Espessura(m) * Densidade
# Density of steel ~ 7850 kg/m³
# Alternatively: Área(m²) * Espessura(mm) * 7.85 (density factor)
densidade_aco = 7850  # kg/m³
peso_calc = area * (espessura / 1000) * densidade_aco
print(f"2. Peso Unitário (O10):")
print(f"   Fórmula: Área(m²) * Espessura(m) * Densidade")
print(f"   = {area} * {espessura/1000} * {densidade_aco}")
print(f"   Calculado: {peso_calc}")
print(f"   Planilha:  {peso_unit}")

# Try with density factor applied to different units
peso_calc2 = (largura/1000) * (comprimento/1000) * (espessura/1000) * 7850
print(f"   Alt calc:  {peso_calc2}")

# Maybe density is slightly different  
density_needed = peso_unit / (area * espessura / 1000)
print(f"   Density needed: {density_needed}")

# Let me try: L(mm) * M(mm) * G(mm) * 0.0000000078 (7.8 g/cm³ in kg/mm³)
peso_calc3 = largura * comprimento * espessura * 0.00000785
print(f"   Alt calc3: {peso_calc3}")
print()

# Another try: Peso = Área(m²) * Espessura(mm) * Peso específico
# peso específico de chapas: espessura * 7.85 = kg/m²
peso_esp = espessura * 7.85  # kg/m² para 3.18mm
peso_calc4 = area * peso_esp
print(f"   Peso esp ({espessura}mm): {peso_esp} kg/m²")
print(f"   Alt calc4: {peso_calc4}")
print(f"   Diff: {abs(peso_calc4 - peso_unit)}")

# From the calc: 0.018602 * 3.18 * 7.85 * something?
# 0.018602 * 3.18/1000 * 7850 = 
peso_calc5 = area * (espessura/1000) * 7850
print(f"   calc5: {peso_calc5}")

# Try: multiply by quantity of cuts from chapa
# Peso Unitário seems to be area * density
# 0.018602 * 19.2 = 0.357
factor = peso_unit / area
print(f"   Factor peso/area: {factor}")
print(f"   Espessura * 7.85 * (L+M)*2/perimetro?")

# Direct: 0.122 * 0.111 * 0.00318 * 7850 = 0.3382
# But value is 0.3572
# Try density = 8304 or some other
d = peso_unit / (0.122 * 0.111 * 0.00318)
print(f"   Required density: {d}")

print()

# 3. PESO TOTAL (S10) = Peso Unitário * Quantidade? No...
# S10 = 0.36822339360
# O10 * D10 = 0.35725198612752 * 1 = 0.35725
# Difference: 0.01097 ~ peck/piercing time weight?
peso_total_calc = peso_unit * quant
print(f"3. Peso Total (S10):")
print(f"   O10 * D10 = {peso_total_calc}")
print(f"   Planilha:  {peso_total}")
# Hmm, not exact. Let's check if it includes the weight of scrap
# Maybe peso total = weight of entire sheet consumed  
peso_total_alt = peso_chapa * qtd_chapas / pecas_por_chapa * quant
print(f"   Alt (peso_chapa/pecas_chapa * qty): {peso_total_alt}")

print()

# 4. PESO DA CHAPA (T10) 
# T10 = 71.985024
# Chapa: 1200mm x 2400mm, espessura 3.18mm
peso_chapa_calc = (dim_chapa_l/1000) * (dim_chapa_c/1000) * (espessura/1000) * 7850
print(f"4. Peso da Chapa (T10):")
print(f"   1.2 * 2.4 * 0.00318 * 7850 = {peso_chapa_calc}")
print(f"   Planilha: {peso_chapa}")
# 1.2 * 2.4 * 0.00318 * 7850 = 71.88
# Close but not exact
d_chapa = peso_chapa / (1.2 * 2.4 * 0.00318)
print(f"   Density from chapa: {d_chapa}")
# 7860.8? Let's try: 
peso_chapa_calc2 = 1.2 * 2.4 * 3.18 * 7.85
print(f"   1.2 * 2.4 * 3.18 * 7.85 = {peso_chapa_calc2}")
# = 71.9... very close!
print()

# 5. PEÇAS POR CHAPA (U10) = floor(chapa_L/peça_L) * floor(chapa_C/peça_C)
# Or maybe more complex nesting
pecas_L = int(dim_chapa_l / largura)  # 1200/122 = 9
pecas_C = int(dim_chapa_c / comprimento)  # 2400/111 = 21
pecas_calc = pecas_L * pecas_C
print(f"5. Peças por Chapa (U10):")
print(f"   floor(1200/122) * floor(2400/111) = {pecas_L} * {pecas_C} = {pecas_calc}")
print(f"   Planilha: {pecas_por_chapa}")
# Also try rotated
pecas_L2 = int(dim_chapa_l / comprimento)  # 1200/111 = 10
pecas_C2 = int(dim_chapa_c / largura)  # 2400/122 = 19
pecas_calc2 = pecas_L2 * pecas_C2
print(f"   Rotated: {pecas_L2} * {pecas_C2} = {pecas_calc2}")
# Best of both
print(f"   Best: {max(pecas_calc, pecas_calc2)}")
print()

# 6. QTD DE CHAPAS (V10) = CEILING(Quant / Peças por chapa)
import math
qtd_chapas_calc = math.ceil(quant / pecas_por_chapa)
print(f"6. Qtd Chapas (V10): ceil({quant}/{pecas_por_chapa}) = {qtd_chapas_calc}")
print(f"   Planilha: {qtd_chapas}")
print()

# 7. SOBRA DA CHAPA (W10)
sobra_calc = pecas_por_chapa * qtd_chapas - quant
print(f"7. Sobra (W10): {pecas_por_chapa}*{qtd_chapas} - {quant} = {sobra_calc}")
print(f"   Planilha: {sobra_chapa}")
print()

# 8. RETALHO (X10)
# X10 = 63.948
# Retalho = sobra * peso_unit? 
retalho_calc = sobra_chapa * peso_unit
print(f"8. Retalho (X10): sobra * peso_unit = {sobra_chapa} * {peso_unit} = {retalho_calc}")
print(f"   Planilha: {retalho}")
# Hmm diff. Let's try peso_chapa - (pecas used * peso_unit * quant)
retalho_alt = (peso_chapa * qtd_chapas) - (quant * peso_unit)
print(f"   Alt: peso_chapa - (qty*peso_unit) = {retalho_alt}")
# Or: peso_chapa - (area_total_pecas_usadas * espessura * density)

# Retalho per chapa: area not used
area_chapa = (dim_chapa_l/1000) * (dim_chapa_c/1000)  # 2.88 m²
area_usada = pecas_por_chapa * area  # 180 * 0.018602
area_sobra = area_chapa - area_usada
peso_retalho = area_sobra * (espessura/1000) * 7850
print(f"   Area chapa: {area_chapa} m²")
print(f"   Area usada por chapa: {pecas_por_chapa * area} m²")
print(f"   Area sobra: {area_sobra} m²")
print(f"   Retalho (unused area weight): {peso_retalho}")
# Or simply: peso_chapa - (pecas_needed * peso_unit)
# But only 1 piece out of 180 is used, so retalho = peso_chapa - 1*peso_unit?
print(f"   peso_chapa - peso_unit: {peso_chapa - peso_unit}")
# 71.985 - 0.357 = 71.628 -- not matching either
# Let's try: sobra * peso_unit
print(f"   179 * 0.3572 = {179 * peso_unit}")
# = 63.948 MATCH!
print()

# 9. CUSTO MAT. PRIMA (Z10)
# Z10 = 0.7732691265600001
# = peso_total * preco_kg? 
custo_calc = peso_total * preco_kg
print(f"9. Custo MP (Z10): peso_total * R$/kg = {peso_total} * {preco_kg} = {custo_calc}")
print(f"   Planilha: {custo_mp}")
# peso_total is 0.368, * 2 = 0.736 -- not matching
# Try: peso_chapa * preco_kg / pecas_por_chapa (amortized sheet cost)
custo_alt = (peso_chapa * preco_kg) / pecas_por_chapa * quant
print(f"   Alt (chapa cost / pecas): {custo_alt}")
# 71.985 * 2 / 180 = 0.7998 -- nope

# Try: (peso_unit * quant + retalho_peso_proporcional) * preco_kg
# Or simply peso_total * preco_kg where peso_total accounts for scrap allocation
# S10 = 0.36822... custo = 0.36822 * 2.0 = 0.7364 -- close but not exact
# Actually: peso da chapa * preco_kg * qtd_chapas / pecas_na_chapa?
# = 71.985024 * 2 / 180 = 0.7998336 -- nope

# Let me check if peso_total is actually different from peso_unit * qty
# S10 = 0.36822339360 vs O10*D10 = 0.35725198612752
# S10/preco_kg = 0.36822/2 = 0.18411... 
# Hmm. custo_mp = 0.77326
# custo_mp / preco_kg = 0.38663... 
# That's peso_total * preco_kg? 0.36822 * 2 = 0.73644 not 0.77326
# custo_mp / quant = 0.77326
# Try: (peso_chapa / pecas_por_chapa) * preco_kg
test = (peso_chapa / pecas_por_chapa) * preco_kg
print(f"   peso_chapa/pecas * preco_kg = {test}")
# = 71.985024/180 * 2 = 0.7998336 -- still not matching

# Hmm let me try custo_mp / (S10*2) = ?, or check S10 computation
# S10 = 0.36822339360
# O10 = 0.35725198612752
# Area * esp * 7850 = 0.018602 * 0.00318 * 7850 = 0.464
# No that's wrong
# 0.122 * 0.111 * 0.00318 * 7850 = ... let me just compute properly
# custo_mp = custo per piece when amortizing sheet
# qty_chapas * peso_chapa * preco_kg / (quant) 
# = 1 * 71.985 * 2 / 1 = 143.97 -- no, that's entire sheet cost

# Peso total calc: peso_unit * qty + (retalho weight / pecas) * qty ???
# Let me compare: S10 (0.36822) * 2.0 = 0.73644 != Z10 (0.77326)
# Z10 / S10 = 0.77326 / 0.36822 = 2.0996... slightly more than preco_kg

# Let me check: CUSTO MP includes peck (piercing) time cost?
# Or: Z10 = peso_chapa * preco_kg * qtd_chapas / pecas_usadas_nesta_chapa
# where pecas_usadas = min(quant, pecas_por_chapa) for each sheet
# For 1 sheet with 180 capacity, using 1 piece:
# But we need to account for sheets -- NO, you buy the whole sheet
# Cost = qtd_chapas * peso_chapa * preco_kg (total sheet cost)
# = 1 * 71.985 * 2 = 143.97
# That makes no sense for 1 piece.

# Wait: Maybe S10 IS the correct peso_total. Let me check the formula differently:
# S10 = O10 * D10 where O10 involves (perimetro + entradas) somehow?
# Let me see: 0.36822339360 / 1 = 0.36822339360
# vs peso_unit = 0.35725198612752
# Diff: 0.01097 -- this is small, maybe the formula IS O*D but using slightly different area
# Actually: S10 could be = area_chapa * espessura * density / pecas_per_chapa
# = (1.2*2.4) * 0.00318 * 7850 / 180 = 71.985/180 = 0.39991... nope

# Let me try: peso_total = D10 * N10 * G10 * density_factor
# = 1 * area(m²) * esp(mm) * 7.85 ??
st = quant * area * espessura * 7.85
print(f"   D10 * N10 * G10 * 7.85 = {st}")
# That's just peso_unit... hmm let me recheck density

# Exact density check for peso_chapa T10:
# T10 = dim_chapa_l * dim_chapa_c * espessura * density_factor
# 1200 * 2400 * 3.18 * factor = 71985024 * factor = 71.985024
# factor = 71.985024 / (1200*2400*3.18) = 71.985024 / 9158400 = 7.8600e-6
# In other words: L(mm)*C(mm)*esp(mm)*0.00000786 = peso_chapa
# Or: L(m)*C(m)*esp(mm)*7.86
factor_chapa = peso_chapa / (1.2 * 2.4 * 3.18)
print(f"\n   Density factor from chapa: {factor_chapa}")

# peso_unit = L(mm)*C(mm)*esp(mm)*factor
peso_from_factor = 122 * 111 * 3.18 * 0.00000786
print(f"   Peso unit from factor: {peso_from_factor}")
# Hmm not matching. Let me calculate:
# T10 = 1.2 * 2.4 * 3.18 * 7.86 = ?
t10_calc = 1.2 * 2.4 * 3.18 * 7.86
print(f"   T10 recalc: {t10_calc}")

# Exact: 71.985024 / (2.88 * 3.18) = 7.86
factor_exact = 71.985024 / (2.88 * 3.18)
print(f"   Exact factor: {factor_exact}")
# = 7.8600 -- this is the density in kg/(m²·mm)

# So peso_unit = area(m²) * espessura(mm) * 7.86?
pu = area * espessura * 7.86
print(f"   PU = area*esp*7.86 = {pu}")
# = 0.018602 * 3.18 * 7.86 = 0.4648... NO, too high

# Wait, area = 0.018602 m², but that's 122mm*111mm = 13542 mm² = 0.013542 m²
area_correct = 0.122 * 0.111
print(f"   Correct area: {area_correct}")
# = 0.013542
# But N10 = 0.018602 -- that's DIFFERENT!
# 0.018602 != 0.013542 
# So N10 is NOT simply L*M in m²!

# What gives 0.018602?  
# perimetro * something? 122 * 0.0001525 = 0.01860
# 122 * 111 = 13542; 0.018602 * 1000000 / 13542 = 1373.8? no
# Maybe it includes perimetro: (L+M)*2 = 466; area + perimetro margin?
# Or N10 = (L+2)*(M+2)/1000000? = 124*113/1000000 = 0.014012 no
# Or: N10 includes kerf/margin: (L+gap)*(M+gap)
# 0.018602 = x/1000000; x = 18602 mm²
# sqrt(18602) = 136.4; 
# 18602 / 122 = 152.5 -- not 111
# 18602 / 111 = 167.6 -- not 122
# Hmm. Let me try: 0.018602 * 1e6 = 18602
# 122 * 152.5 = 18605 ≈ 18602 -- so M is treated as 152.5?
# That's weird. Unless it's 122+30.5? or some margin

# Alternative: N could be computed differently
# What if N10 is an intermediate that's not pure area?
# Actually check: if area = 0.018602 and T10 (chapa) = 71.985024
# Then pecas_por_chapa = area_chapa / area = 2.88/0.018602 = 154.8
# But U10 = 180... so the area IS different from what we'd expect

# I think N is calculated including a margin/kerf width
# Standard kerf for laser: 0.2mm - 1mm
# If we add ~5mm margin on each side: (122+10)*(111+10) = 132*121 = 15972 still not 18602
# 18602 / 122 = 152.5; 152.5 - 111 = 41.5? Too much
# OR: N is in different units

# Let me reconsider: maybe N10 = L * M but in DIFFERENT unit convention
# If L and M are in cm: 12.2 * 11.1 = 135.42 cm² = 0.013542 m²
# Still not matching

# Maybe perimetro is being used: I10 = 122mm of cutting perimeter
# Not the same as width

# Hmm, maybe N10 is not L*M. Let me consider L10 and M10 are NOT width and length
# but rather something else, OR the extraction had some offset

# Let me reconsider if L10 and M10 are even the piece dimensions
# L10=122, M10=111 but I10 (perimetro) = 122 too -- same as L10!
# So maybe L10 is actually the perimeter (same value), not the width

# That means the piece dims might be elsewhere. Let me re-examine.
# Looking at the data pattern: I10(perimetro)=122, L10=122 -- coincidence or same meaning?

# More likely explanation: the piece happens to have width=perimeter=122mm
# (e.g., a square with side ~30.5: perimeter=122, but dimensions 122x111?)
# A rectangle 122x111 has perimeter = 2*(122+111) = 466mm, NOT 122
# So the perimeter of 122mm is NOT a rectangle's perimeter but the LASER CUT perimeter

# OK so L10=122 and M10=111 ARE the bounding box dimensions
# And I10=122 is the ACTUAL cut path length (perimeter of the cut geometry)
# For a complex shape, the cut perimeter can be much less than the bounding box perimeter

# Back to N10 = 0.018602
# 18602 mm² -- this doesn't match 122*111 = 13542
# Unless N10 is computed from drawing data, not from L*M
# OR: N10 = area with a different set of dimensions

# Let me try: dim_chapa (P,R) = 1200x2400
# T10 = peso_chapa = 1.2*2.4*3.18*7.86 ≈ 71.985 ✓
# U10 = peças_por_chapa = 180
# if pecas = floor(1200/122) * floor(2400/111) = 9*21 = 189 -- close to 180
# or floor(1200/111) * floor(2400/122) = 10*19 = 190
# Hmm, 180 = 9*20 or 10*18 or 12*15 or 15*12
# What if there's a margin between pieces? e.g., 5mm gap
# floor(1200/(122+5)) * floor(2400/(111+5)) = floor(1200/127)*floor(2400/116)
# = 9 * 20 = 180 ✓✓✓ MATCH!

print(f"\n=== PEÇAS POR CHAPA COM GAP ===")
gap = 5  # mm
ppc_1 = int(dim_chapa_l / (largura + gap)) * int(dim_chapa_c / (comprimento + gap))
ppc_2 = int(dim_chapa_l / (comprimento + gap)) * int(dim_chapa_c / (largura + gap))
print(f"   Com gap de {gap}mm:")
print(f"   Normal:  {int(dim_chapa_l / (largura + gap))} * {int(dim_chapa_c / (comprimento + gap))} = {ppc_1}")
print(f"   Rotated: {int(dim_chapa_l / (comprimento + gap))} * {int(dim_chapa_c / (largura + gap))} = {ppc_2}")

# So U10 = max(floor(P/(L+gap)) * floor(R/(M+gap)), floor(P/(M+gap)) * floor(R/(L+gap)))
# with gap = 5mm

# Now: N10 = 0.018602 = (122+gap)*(111+gap) / 1000000 = 127*116/1000000 = 0.014732
# Still not matching. Hmm.

# Let me try: N10 = area of piece + proportional scrap area
# = area_chapa / pecas_por_chapa = 2.88 / 180 = 0.016 -- closer but not exact
area_per_piece = 2.88 / 180
print(f"\n   Area per piece (chapa/pecas): {area_per_piece}")
# = 0.016 still not 0.018602

# Wait: maybe N is in a unit I'm not expecting
# Let me try: N10 = (L/1000) * (M/1000) * Quant = 0.013542 -- nope
# Or: N10 = L * M / 1e5 = 13542/100000 = 0.13542 -- nope  

# Actually re-reading the header: N9 = "ÁREA", so it IS area
# But 122*111 = 13542 mm² = 0.013542 m²... not 0.018602

# Unless L10 and M10 are NOT 122mm and 111mm as I assumed
# The column could represent something else
# Let me look: L9 = "LARGURA", M9 = "COMPR." -- those are width and length

# 0.018602 m² = 18602 mm² -- what rectangle gives this?
# Could be 122 * 152.5 = 18605 ≈ 18602
# Or 136.4 * 136.4 ≈ 18604 (square)
# Or 111 * 167.6 = 18603

# THIS IS PUZZLING. Let me just document what I found and move on.

print(f"\n=== PRICING FORMULAS ===")

# CUSTO/HORA DE FABRICAÇÃO (from row 5 of columns C37-C45)
custo_hora_laser = 10.0   # C37,5
custo_hora_setup = 10.0   # C38,5
custo_hora_dobra = 10.0   # C39,5
custo_hora_caldeiraria = 10.0  # C40,5
custo_hora_dobra2 = 10.0  # C41,5
custo_hora_solda = 10.0   # C42,5
custo_hora_guilhotina = 10.0  # C43,5
custo_hora_usinagem = 10.0  # C44,5
custo_hora_montagem = 10.0  # C45,5

# TOTAL DE FABRICAÇÃO (C45,10) = 8.166666...
# This seems to be: sum of all operation times in minutes * custo_hora / 60
# tempo_corte=1min, setup=6min, all others=6 each (7 operations * 6 = 42 + 1 = 43 min)
# But wait -- C28-C40 for row 10 ALL show 6.0
# Let me count: setup(6) + dobra_unit(6) + dobra_total(6) + caldeiraria(6) + ...
# That's 12 fields of 6 + tempo_corte of 1 = 73 min
# 73 min * 10 R$/h / 60 = 12.17 -- not 8.167

# Actually C45,10 = 8.166666666666668
# 8.166666 * 60 / 10 = 49 min
# Or: 8.1667 = some subset * rate
# 49/6 = 8.17 operations? 

# Hmm let me try: total_fab = tempo_corte_laser * custo_hora_laser / 60
# + other operations
# Maybe not all operations are active. The setup, dobra etc might be 0 for this piece

# Wait: C28-C40 show values, but maybe those columns represent the operation 
# times in TOTAL not per-piece. And the 6.0 values could be default placeholders

# TOTAL FABRICAÇÃO C45,10 = 8.166666...
# Let me try: (tempo_corte + peck_total) * custo/60
# tempo_corte = perimetro / velocidade = 122/3528 = 0.03458 min
# peck_total = num_entradas * peck_seconds / 60 = 4 * 1 / 60 = 0.0667 min
# laser_time = 0.03458 + 0.0667 = 0.1013 min
# That's way too small for 8.167

# Maybe total_fabricação is already in R$ not in time
# C45,10 = 8.166666 R$
# If custo_hora = 10 R$/h, and total time across all operations = 49 min
# 49 * 10/60 = 8.167 ✓✓✓ MATCH!

# So: total_fabricacao = sum(all operation times in min) * custo_hora / 60
total_min = 49.0  # Need to figure out which operations sum to 49
total_fab_calc = total_min * 10 / 60
print(f"   Total Fab: {total_min}min * 10/60 = {total_fab_calc}")
print(f"   Planilha: {total_fabricacao}")

print()

# CUSTO BÁSICO TOTAL (C46,10) = 8.9399
# = total_fabricacao + custo_mp = 8.1667 + 0.7733 = 8.9400 ✓
cbt_calc = total_fabricacao + custo_mp
print(f"   Custo Básico Total: fab + mp = {total_fabricacao} + {custo_mp} = {cbt_calc}")
print(f"   Planilha: {custo_basico_total}")
print()

# VALOR DE VENDA SEM IMPOSTOS (C48,10)
# = custo_basico / (1 - margem) = 8.9399 / (1 - 0.3) = 8.9399 / 0.7 = 12.771
vvsi_calc = custo_basico_total / (1 - margem_lucro)
print(f"   Venda s/ imp: custo / (1-margem) = {custo_basico_total} / {1-margem_lucro} = {vvsi_calc}")
print(f"   Planilha: {valor_venda_sem_imp}")
# Hmm 12.771 vs 11.622 -- doesn't match
# Maybe: valor_venda = custo * (1 + margem)?
vvsi_alt = custo_basico_total * (1 + margem_lucro)
print(f"   Alt: custo * (1+margem) = {vvsi_alt}")
# 8.94 * 1.3 = 11.622 ✓✓✓ MATCH!
print()

# PREÇO UNITÁRIO C/ IMPOSTOS (C49,10)
# = valor_venda_sem_imp / fator_calculo_impostos
# Y5 = 0.7607 = Fator de cálculo de impostos
# = 1 - total_impostos_cascata
# where total_impostos = ICMS + PIS + COFINS + CSLL + IRPJ
# = 0.18 + 0.0065 + 0.03 + 0.0108 + 0.012 = 0.2393 ✓
# fator = 1 - 0.2393 = 0.7607 ✓

# Preço c/ imp = valor_venda_sem_imp / fator
preco_ci_calc = valor_venda_sem_imp / fator_calculo
print(f"   Preço c/ imp: vvsi / fator = {valor_venda_sem_imp} / {fator_calculo} = {preco_ci_calc}")
print(f"   Planilha: {preco_unit_c_imp}")
# 11.622 / 0.7607 = 15.278 ✓✓✓ MATCH! -- This is the "MARGEM POR DENTRO"!
print()

# PREÇO TOTAL (C50,10) = preço_unit * quant
pt_calc = preco_unit_c_imp * quant
print(f"   Preço Total: {preco_unit_c_imp} * {quant} = {pt_calc}")
print(f"   Planilha: {preco_total_c_imp}")
print()

# TAX BREAKDOWN
print("=== TAX BREAKDOWN ===")
icms_calc = preco_total_c_imp * icms
print(f"   ICMS: {preco_total_c_imp} * {icms} = {icms_calc}")
print(f"   Planilha: {icms_valor}")

ipi_calc = preco_total_c_imp * ipi
print(f"   IPI: {preco_total_c_imp} * {ipi} = {ipi_calc}")
print(f"   Planilha: {ipi_valor}")

pis_calc = preco_total_c_imp * pis
print(f"   PIS: {preco_total_c_imp} * {pis} = {pis_calc}")
print(f"   Planilha: {pis_valor}")

cofins_calc = preco_total_c_imp * cofins
print(f"   COFINS: {preco_total_c_imp} * {cofins} = {cofins_calc}")
print(f"   Planilha: {cofins_valor}")

total_trib_calc = icms_calc + ipi_calc + pis_calc + cofins_calc
print(f"   Total tributos: {total_trib_calc}")
print(f"   Planilha: {total_tributos}")

# C57 = TOTAL NF = preço_total + IPI
total_nf_calc = preco_total_c_imp + ipi_calc
print(f"\n   Total NF: preco + IPI = {total_nf_calc}")
print(f"   Planilha: {total_nf}")

# C58 = COMISSÃO  
# 0.3487 / 15.2779 = 0.02283 (2.28%?)
# Or: 0.3487 / 16.0418 = 0.02174 (2.17%?)
# Or: 0.03 * valor_venda_sem_imp = 0.03 * 11.622 = 0.3487 ✓
comissao_rate = 0.03  # from C58,8 = 0.03 (this is the comissão rate)
comissao_calc = comissao_rate * valor_venda_sem_imp
print(f"\n   Comissão: {comissao_rate} * {valor_venda_sem_imp} = {comissao_calc}")
print(f"   Planilha: {comissao}")
