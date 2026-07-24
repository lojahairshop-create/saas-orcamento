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
        created_at_dt = orcamento_response.created_at
        if isinstance(created_at_dt, str):
            try:
                # Tenta parsear string ISO
                created_at_dt = datetime.fromisoformat(created_at_dt.replace("Z", "+00:00"))
            except Exception:
                created_at_dt = datetime.now()
        elif not created_at_dt:
            created_at_dt = datetime.now()
            
        validade_dias = orcamento_response.validade or 30
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
        )

        if WEASYPRINT_DISPONIVEL:
            try:
                # Compilar HTML renderizado para PDF
                pdf_bytes = HTML(string=html_rendered).write_pdf()
                return pdf_bytes
            except Exception as exc:
                # Se falhar em tempo de execução por falta de bibliotecas C, caímos no fallback
                print(f"Erro ao compilar PDF com WeasyPrint: {str(exc)}")
                pass

        # FALLBACK: Se o WeasyPrint não estiver disponível ou falhar, retornamos o próprio HTML
        # decodificado em PDF falso ou geramos um HTML limpo para que o navegador renderize.
        # Para que a API responda algo legível, vamos simular os bytes do PDF ou
        # escrever uma mensagem de erro em formato PDF básico usando reportlab (se disponível),
        # ou apenas criar um arquivo PDF simples contendo a representação em texto.
        try:
            # Fallback usando ReportLab caso esteja disponível, que é pure-python e livre de C libraries
            from reportlab.lib.pagesizes import letter
            from reportlab.pdfgen import canvas
            import io

            buffer = io.BytesIO()
            p = canvas.Canvas(buffer, pagesize=letter)
            p.drawString(100, 750, f"ORÇAMENTO COMERCIAL: {orcamento_response.numero}")
            p.drawString(100, 730, f"Cliente: {orcamento_response.cliente.nome}")
            p.drawString(100, 710, f"Total Preço: R$ {orcamento_response.total_preco:.2f}")
            p.drawString(100, 690, f"Total NF: R$ {orcamento_response.total_nf:.2f}")
            p.drawString(100, 670, f"Validade: {validade_str}")
            p.drawString(100, 650, "[NOTA: Instale GTK+ / WeasyPrint no servidor para habilitar o PDF completo]")
            
            y_offset = 610
            p.drawString(100, y_offset, "Itens:")
            y_offset -= 20
            
            for item in orcamento_response.itens[:10]:
                p.drawString(120, y_offset, f"- {item.quantidade}x {item.descricao} ({item.material}): R$ {item.preco_total:.2f}")
                y_offset -= 15
                if y_offset < 100:
                    break
                    
            p.showPage()
            p.save()
            return buffer.getvalue()
        except Exception:
            # Se nem o reportlab funcionar, retorna os bytes do HTML cru para o cliente,
            # ou um PDF binário dummy.
            return html_rendered.encode("utf-8")
