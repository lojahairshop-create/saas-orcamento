import pyxlsb
import json

wb_path = r"PLANILHA DE CUSTO  EXCLISIVO  DA GERENCIA COMERCIAL  (1).xlsb"

with pyxlsb.open_workbook(wb_path) as wb:
    print("=== SHEET NAMES ===")
    print(wb.sheets)
    
    # Read first sheet
    sheet_name = wb.sheets[0]
    print(f"\n=== READING SHEET: {sheet_name} ===\n")
    
    with wb.get_sheet(sheet_name) as sheet:
        rows_data = []
        for row_idx, row in enumerate(sheet.rows()):
            row_vals = []
            for col_idx, cell in enumerate(row):
                if cell.v is not None:
                    row_vals.append({
                        "row": row_idx + 1,
                        "col": col_idx + 1,
                        "value": str(cell.v) if cell.v is not None else None,
                        "formula": str(cell.f) if hasattr(cell, 'f') and cell.f else None
                    })
            if row_vals:
                rows_data.append(row_vals)
        
        print(f"Total rows with data: {len(rows_data)}")
        print("\n=== ALL DATA ===\n")
        for row in rows_data:
            for cell in row:
                col_letter = chr(64 + cell['col']) if cell['col'] <= 26 else f"C{cell['col']}"
                formula_str = f" [F: {cell['formula']}]" if cell['formula'] else ""
                print(f"  {col_letter}{cell['row']}: {cell['value']}{formula_str}")
            print()
