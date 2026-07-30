"""
Módulo para geração de orçamentos em formato PDF a partir do template HTML e WeasyPrint.
"""

import os
from datetime import datetime, timedelta
from typing import Any
from jinja2 import Environment, FileSystemLoader

# Tratamento robusto caso as dependências do WeasyPrint (como Pango/Cairo) não estejam no sistema.
try:
    from weasyprint import HTML
    WEASYPRINT_DISPONIVEL = True
except Exception:
    WEASYPRINT_DISPONIVEL = False


def fmt_br(val, decimals=2):
    if val is None:
        return "0,00"
    try:
        val_f = float(val)
        fmt_str = f"{{:,.{decimals}f}}"
        res = fmt_str.format(val_f)
        return res.replace(",", "X").replace(".", ",").replace("X", ".")
    except Exception:
        return "0,00"


def fmt_dim(val):
    if val is None:
        return "0"
    try:
        val_f = float(val)
        if val_f.is_integer():
            return f"{int(val_f):,}".replace(",", ".")
        s = f"{val_f:,.2f}".rstrip("0").rstrip(".")
        return s.replace(",", "X").replace(".", ",").replace("X", ".")
    except Exception:
        return "0"


class PDFGenerator:
    """Gera arquivos PDF profissionais para orçamentos comerciais."""

    @staticmethod
    def gerar_pdf_orcamento(orcamento_response: Any) -> bytes:
        """
        Renderiza o template HTML com os dados do orçamento e compila para PDF.
        Retorna os bytes do PDF gerado.
        """
        # Obter o caminho do template HTML
        template_dir = os.path.join(os.path.dirname(__file__), "templates")
        
        # Inicializar ambiente Jinja2
        env = Environment(loader=FileSystemLoader(template_dir))
        template = env.get_template("orcamento.html")

        # Calcular data de validade
        if isinstance(orcamento_response, dict):
            created_at_dt = orcamento_response.get("created_at")
            validade_dias = orcamento_response.get("validade") or 30
        else:
            created_at_dt = getattr(orcamento_response, "created_at", None)
            validade_dias = getattr(orcamento_response, "validade", 30) or 30

        if isinstance(created_at_dt, str):
            try:
                # Tenta parsear string ISO
                created_at_dt = datetime.fromisoformat(created_at_dt.replace("Z", "+00:00"))
            except Exception:
                created_at_dt = datetime.now()
        elif not created_at_dt:
            created_at_dt = datetime.now()
            
        validade_dt = created_at_dt + timedelta(days=validade_dias)
        validade_str = validade_dt.strftime("%d/%m/%Y")

        # Carregar logo padrão aprimorada se não houver no banco
        logo_default_b64 = ""
        logo_b64_path = os.path.join(template_dir, "logo_base64.txt")
        if os.path.exists(logo_b64_path):
            try:
                with open(logo_b64_path, "r", encoding="utf-8") as f:
                    logo_default_b64 = f.read().strip()
            except Exception:
                pass

        # Carregar as configurações gerais do banco (inclui a logo e dados da empresa)
        from app.database import get_supabase_service_client
        try:
            supabase = get_supabase_service_client()
            configs_res = supabase.table("configuracoes").select("*").limit(1).execute()
            configs_globais = configs_res.data[0] if configs_res.data else None
        except Exception as err:
            print(f"Erro ao carregar configuracoes gerais para o PDF: {err}")
            configs_globais = None

        # Renderizar HTML com dados
        html_rendered = template.render(
            orcamento=orcamento_response,
            validade_data=validade_str,
            datetime=datetime,
            configs_globais=configs_globais,
            logo_default_b64=logo_default_b64,
            fmt=fmt_br,
            fmt_dim=fmt_dim,
        )

        if WEASYPRINT_DISPONIVEL:
            try:
                # Compilar HTML renderizado para PDF
                pdf_bytes = HTML(string=html_rendered).write_pdf()
                return pdf_bytes
            except Exception as exc:
                print(f"Erro ao compilar PDF com WeasyPrint: {str(exc)}")
                pass

        # FALLBACK: ReportLab canvas caso WeasyPrint não esteja instalado no sistema
        try:
            from reportlab.lib.pagesizes import letter
            from reportlab.pdfgen import canvas
            import io

            buffer = io.BytesIO()
            p = canvas.Canvas(buffer, pagesize=letter)
            
            num = getattr(orcamento_response, 'numero', None) or (orcamento_response.get('numero') if isinstance(orcamento_response, dict) else '')
            cli = getattr(orcamento_response, 'cliente', None)
            cli_nome = getattr(cli, 'nome', '') if cli else (orcamento_response.get('cliente', {}).get('nome', '') if isinstance(orcamento_response, dict) else '')
            tot_p = getattr(orcamento_response, 'total_preco', 0) or (orcamento_response.get('total_preco', 0) if isinstance(orcamento_response, dict) else 0)
            tot_nf = getattr(orcamento_response, 'total_nf', 0) or (orcamento_response.get('total_nf', 0) if isinstance(orcamento_response, dict) else 0)
            itens_lst = getattr(orcamento_response, 'itens', []) or (orcamento_response.get('itens', []) if isinstance(orcamento_response, dict) else [])

            p.drawString(100, 750, f"ORÇAMENTO COMERCIAL: {num}")
            p.drawString(100, 730, f"Cliente: {cli_nome}")
            p.drawString(100, 710, f"Total Preço: R$ {tot_p:.2f}")
            p.drawString(100, 690, f"Total NF: R$ {tot_nf:.2f}")
            p.drawString(100, 670, f"Validade: {validade_str}")
            
            y_offset = 610
            p.drawString(100, y_offset, "Itens:")
            y_offset -= 20
            
            for item in itens_lst[:10]:
                it_q = getattr(item, 'quantidade', None) or (item.get('quantidade') if isinstance(item, dict) else 1)
                it_desc = getattr(item, 'descricao', '') or (item.get('descricao', '') if isinstance(item, dict) else '')
                it_mat = getattr(item, 'material', '') or (item.get('material', '') if isinstance(item, dict) else '')
                it_tot = getattr(item, 'preco_total', 0) or (item.get('preco_total', 0) if isinstance(item, dict) else 0)
                p.drawString(120, y_offset, f"- {it_q}x {it_desc} ({it_mat}): R$ {it_tot:.2f}")
                y_offset -= 15
                if y_offset < 100:
                    break
                    
            p.showPage()
            p.save()
            return buffer.getvalue()
        except Exception:
            return html_rendered.encode("utf-8")
