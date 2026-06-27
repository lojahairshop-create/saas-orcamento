import {
  User,
  Orcamento,
  ConfigGlobais,
  ImpostoEstado,
  Material,
  ParametroLaser,
  CustoOperacao,
  MedidaChapa,
  DashboardResumo,
  DXFResult,
  NestingResult,
} from "@/types";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

class ApiClient {
  private getHeaders(contentType: string | null = "application/json"): HeadersInit {
    const headers: HeadersInit = {};
    if (contentType) {
      headers["Content-Type"] = contentType;
    }
    const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;
    if (token) {
      headers["Authorization"] = `Bearer ${token}`;
    }
    return headers;
  }

  private async handleResponse<T>(response: Response): Promise<T> {
    if (response.status === 204) {
      return {} as T;
    }
    if (!response.ok) {
      let errorMessage = "Erro na requisição";
      try {
        const errData = await response.json();
        errorMessage = errData.detail || errorMessage;
      } catch {
        // Ignorar se não for JSON
      }
      throw new Error(errorMessage);
    }
    return response.json();
  }

  // -------------------------------------------------------------------------
  // Autenticação
  // -------------------------------------------------------------------------
  
  async login(email: string, password: string): Promise<{ access_token: string; user: User }> {
    const res = await fetch(`${API_BASE_URL}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });
    const data = await this.handleResponse<{ access_token: string; user: User }>(res);
    if (data.access_token) {
      localStorage.setItem("token", data.access_token);
    }
    return data;
  }

  async logout(): Promise<void> {
    localStorage.removeItem("token");
  }

  async getMe(): Promise<User> {
    const res = await fetch(`${API_BASE_URL}/auth/me`, {
      method: "GET",
      headers: this.getHeaders(),
    });
    return this.handleResponse<User>(res);
  }

  // -------------------------------------------------------------------------
  // Orçamentos
  // -------------------------------------------------------------------------

  async createOrcamento(data: any): Promise<Orcamento> {
    const res = await fetch(`${API_BASE_URL}/orcamentos/`, {
      method: "POST",
      headers: this.getHeaders(),
      body: JSON.stringify(data),
    });
    return this.handleResponse<Orcamento>(res);
  }

  async getOrcamentos(status?: string, page = 1, perPage = 20): Promise<{ items: any[]; total: number; page: number; per_page: number }> {
    const query = new URLSearchParams({
      page: page.toString(),
      per_page: perPage.toString(),
    });
    if (status) {
      query.append("status", status);
    }
    const res = await fetch(`${API_BASE_URL}/orcamentos/?${query.toString()}`, {
      method: "GET",
      headers: this.getHeaders(),
    });
    return this.handleResponse(res);
  }

  async getItensParaNesting(status?: string, orcamentos?: string): Promise<any[]> {
    const query = new URLSearchParams();
    if (status) {
      query.append("status", status);
    }
    if (orcamentos) {
      query.append("orcamentos", orcamentos);
    }
    const res = await fetch(`${API_BASE_URL}/orcamentos/itens-para-nesting?${query.toString()}`, {
      method: "GET",
      headers: this.getHeaders(),
    });
    return this.handleResponse<any[]>(res);
  }

  async updateItemNesting(itemId: string, data: any): Promise<any> {
    const res = await fetch(`${API_BASE_URL}/orcamentos/itens/${itemId}`, {
      method: "PUT",
      headers: this.getHeaders(),
      body: JSON.stringify(data),
    });
    return this.handleResponse<any>(res);
  }

  async bulkUpdateItemsNesting(itemIds: string[], fields: any): Promise<{ status: string; updated_count: number }> {
    const res = await fetch(`${API_BASE_URL}/orcamentos/itens/bulk-update`, {
      method: "POST",
      headers: this.getHeaders(),
      body: JSON.stringify({ item_ids: itemIds, fields }),
    });
    return this.handleResponse<{ status: string; updated_count: number }>(res);
  }

  async getOrcamento(id: string): Promise<Orcamento> {
    const res = await fetch(`${API_BASE_URL}/orcamentos/${id}`, {
      method: "GET",
      headers: this.getHeaders(),
    });
    return this.handleResponse<Orcamento>(res);
  }

  async updateOrcamento(id: string, data: any): Promise<Orcamento> {
    const res = await fetch(`${API_BASE_URL}/orcamentos/${id}`, {
      method: "PUT",
      headers: this.getHeaders(),
      body: JSON.stringify(data),
    });
    return this.handleResponse<Orcamento>(res);
  }

  async updateStatus(id: string, status: string): Promise<Orcamento> {
    const res = await fetch(`${API_BASE_URL}/orcamentos/${id}/status`, {
      method: "PATCH",
      headers: this.getHeaders(),
      body: JSON.stringify({ status }),
    });
    return this.handleResponse<Orcamento>(res);
  }

  async deleteOrcamento(id: string): Promise<void> {
    const res = await fetch(`${API_BASE_URL}/orcamentos/${id}`, {
      method: "DELETE",
      headers: this.getHeaders(),
    });
    return this.handleResponse<void>(res);
  }

  async downloadPdf(id: string, filename: string): Promise<void> {
    const token = localStorage.getItem("token");
    const res = await fetch(`${API_BASE_URL}/orcamentos/${id}/pdf`, {
      method: "GET",
      headers: {
        "Authorization": `Bearer ${token}`
      }
    });
    if (!res.ok) {
      throw new Error("Erro ao baixar PDF");
    }
    const blob = await res.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename.endsWith(".pdf") ? filename : `${filename}.pdf`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    window.URL.revokeObjectURL(url);
  }

  // -------------------------------------------------------------------------
  // Configurações Globais e Auxiliares
  // -------------------------------------------------------------------------

  async getConfigGlobais(): Promise<ConfigGlobais> {
    const res = await fetch(`${API_BASE_URL}/configuracoes/globais`, {
      method: "GET",
      headers: this.getHeaders(),
    });
    return this.handleResponse<ConfigGlobais>(res);
  }

  async saveConfigGlobais(data: ConfigGlobais): Promise<ConfigGlobais> {
    const res = await fetch(`${API_BASE_URL}/configuracoes/globais`, {
      method: "POST",
      headers: this.getHeaders(),
      body: JSON.stringify(data),
    });
    return this.handleResponse<ConfigGlobais>(res);
  }

  async getImpostosEstados(): Promise<ImpostoEstado[]> {
    const res = await fetch(`${API_BASE_URL}/configuracoes/impostos-estados`, {
      method: "GET",
      headers: this.getHeaders(),
    });
    return this.handleResponse<ImpostoEstado[]>(res);
  }

  async updateImpostoEstado(uf: string, data: any): Promise<ImpostoEstado> {
    const res = await fetch(`${API_BASE_URL}/configuracoes/impostos-estados/${uf}`, {
      method: "PUT",
      headers: this.getHeaders(),
      body: JSON.stringify(data),
    });
    return this.handleResponse<ImpostoEstado>(res);
  }

  async getMateriais(): Promise<Material[]> {
    const res = await fetch(`${API_BASE_URL}/configuracoes/materiais`, {
      method: "GET",
      headers: this.getHeaders(),
    });
    return this.handleResponse<Material[]>(res);
  }

  async createMaterial(data: any): Promise<Material> {
    const res = await fetch(`${API_BASE_URL}/configuracoes/materiais`, {
      method: "POST",
      headers: this.getHeaders(),
      body: JSON.stringify(data),
    });
    return this.handleResponse<Material>(res);
  }

  async updateMaterial(id: string, data: any): Promise<Material> {
    const res = await fetch(`${API_BASE_URL}/configuracoes/materiais/${id}`, {
      method: "PUT",
      headers: this.getHeaders(),
      body: JSON.stringify(data),
    });
    return this.handleResponse<Material>(res);
  }

  async deleteMaterial(id: string): Promise<void> {
    const res = await fetch(`${API_BASE_URL}/configuracoes/materiais/${id}`, {
      method: "DELETE",
      headers: this.getHeaders(),
    });
    return this.handleResponse<void>(res);
  }

  async getParametrosLaser(material?: string): Promise<ParametroLaser[]> {
    const url = material 
      ? `${API_BASE_URL}/configuracoes/parametros-laser?material=${encodeURIComponent(material)}` 
      : `${API_BASE_URL}/configuracoes/parametros-laser`;
    const res = await fetch(url, {
      method: "GET",
      headers: this.getHeaders(),
    });
    return this.handleResponse<ParametroLaser[]>(res);
  }

  async createParametroLaser(data: any): Promise<ParametroLaser> {
    const res = await fetch(`${API_BASE_URL}/configuracoes/parametros-laser`, {
      method: "POST",
      headers: this.getHeaders(),
      body: JSON.stringify(data),
    });
    return this.handleResponse<ParametroLaser>(res);
  }

  async updateParametroLaser(id: string, data: any): Promise<ParametroLaser> {
    const res = await fetch(`${API_BASE_URL}/configuracoes/parametros-laser/${id}`, {
      method: "PUT",
      headers: this.getHeaders(),
      body: JSON.stringify(data),
    });
    return this.handleResponse<ParametroLaser>(res);
  }

  async deleteParametroLaser(id: string): Promise<void> {
    const res = await fetch(`${API_BASE_URL}/configuracoes/parametros-laser/${id}`, {
      method: "DELETE",
      headers: this.getHeaders(),
    });
    return this.handleResponse<void>(res);
  }

  async getCustosOperacao(): Promise<CustoOperacao[]> {
    const res = await fetch(`${API_BASE_URL}/configuracoes/custos-operacao`, {
      method: "GET",
      headers: this.getHeaders(),
    });
    return this.handleResponse<CustoOperacao[]>(res);
  }

  async updateCustoOperacao(id: string, data: any): Promise<CustoOperacao> {
    const res = await fetch(`${API_BASE_URL}/configuracoes/custos-operacao/${id}`, {
      method: "PUT",
      headers: this.getHeaders(),
      body: JSON.stringify(data),
    });
    return this.handleResponse<CustoOperacao>(res);
  }

  async getMedidasChapas(): Promise<MedidaChapa[]> {
    const res = await fetch(`${API_BASE_URL}/configuracoes/medidas-chapas`, {
      method: "GET",
      headers: this.getHeaders(),
    });
    return this.handleResponse<MedidaChapa[]>(res);
  }

  async createMedidaChapa(data: any): Promise<MedidaChapa> {
    const res = await fetch(`${API_BASE_URL}/configuracoes/medidas-chapas`, {
      method: "POST",
      headers: this.getHeaders(),
      body: JSON.stringify(data),
    });
    return this.handleResponse<MedidaChapa>(res);
  }

  async deleteMedidaChapa(id: string): Promise<void> {
    const res = await fetch(`${API_BASE_URL}/configuracoes/medidas-chapas/${id}`, {
      method: "DELETE",
      headers: this.getHeaders(),
    });
    return this.handleResponse<void>(res);
  }

  // -------------------------------------------------------------------------
  // Estoque
  // -------------------------------------------------------------------------

  async getEstoque(): Promise<any[]> {
    const res = await fetch(`${API_BASE_URL}/estoque/`, {
      method: "GET",
      headers: this.getHeaders(),
    });
    return this.handleResponse<any[]>(res);
  }

  async createEstoque(data: any): Promise<any> {
    const res = await fetch(`${API_BASE_URL}/estoque/`, {
      method: "POST",
      headers: this.getHeaders(),
      body: JSON.stringify(data),
    });
    return this.handleResponse<any>(res);
  }

  async updateEstoque(id: string, data: any): Promise<any> {
    const res = await fetch(`${API_BASE_URL}/estoque/${id}`, {
      method: "PUT",
      headers: this.getHeaders(),
      body: JSON.stringify(data),
    });
    return this.handleResponse<any>(res);
  }

  async deleteEstoque(id: string): Promise<void> {
    const res = await fetch(`${API_BASE_URL}/estoque/${id}`, {
      method: "DELETE",
      headers: this.getHeaders(),
    });
    return this.handleResponse<void>(res);
  }

  async obterSugestaoEstoque(data: any): Promise<any> {
    const res = await fetch(`${API_BASE_URL}/estoque/sugestao`, {
      method: "POST",
      headers: this.getHeaders(),
      body: JSON.stringify(data),
    });
    return this.handleResponse<any>(res);
  }

  // -------------------------------------------------------------------------
  // Engenharia
  // -------------------------------------------------------------------------

  async processarDxf(file: File, splitParts: boolean = false): Promise<any> {
    const formData = new FormData();
    formData.append("file", file);

    const url = splitParts 
      ? `${API_BASE_URL}/engenharia/processar-dxf?split_parts=true` 
      : `${API_BASE_URL}/engenharia/processar-dxf`;

    const res = await fetch(url, {
      method: "POST",
      headers: this.getHeaders(null), // Sem content-type JSON para deixar o browser definir multipart/form-data
      body: formData,
    });
    return this.handleResponse<any>(res);
  }

  async calcularNesting(data: any): Promise<NestingResult> {
    const res = await fetch(`${API_BASE_URL}/engenharia/nesting`, {
      method: "POST",
      headers: this.getHeaders(),
      body: JSON.stringify(data),
    });
    return this.handleResponse<NestingResult>(res);
  }

  async darBaixaNesting(data: any): Promise<{ status: string; avisos: string[] }> {
    const res = await fetch(`${API_BASE_URL}/engenharia/dar-baixa-nesting`, {
      method: "POST",
      headers: this.getHeaders(),
      body: JSON.stringify(data),
    });
    return this.handleResponse<{ status: string; avisos: string[] }>(res);
  }

  // -------------------------------------------------------------------------
  // Dashboard
  // -------------------------------------------------------------------------

  async getDashboardResumo(): Promise<DashboardResumo> {
    const res = await fetch(`${API_BASE_URL}/dashboard/resumo`, {
      method: "GET",
      headers: this.getHeaders(),
    });
    return this.handleResponse<DashboardResumo>(res);
  }
}

export const api = new ApiClient();
