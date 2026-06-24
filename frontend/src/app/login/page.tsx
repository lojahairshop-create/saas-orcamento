"use client";

import React, { useState } from "react";
import { useAuth, AuthProvider } from "@/hooks/useAuth";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Cpu, Mail, Lock, AlertTriangle } from "lucide-react";

function LoginContent() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      setError("Por favor, preencha todos os campos.");
      return;
    }

    setError(null);
    setLoading(true);
    try {
      await login(email, password);
    } catch (err: any) {
      setError(err.message || "Falha ao fazer login. Verifique seu e-mail e senha.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0a0a0f] flex items-center justify-center p-4 bg-gradient-radial-dark relative overflow-hidden">
      {/* Background Animated Orb */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[400px] h-[400px] bg-blue-600/10 rounded-full blur-[100px] pointer-events-none animate-pulse" />

      <div className="w-full max-w-md z-10">
        {/* Logo and Tagline */}
        <div className="flex flex-col items-center mb-8">
          <div className="h-12 w-12 rounded-xl bg-blue-600/15 border border-blue-500/30 flex items-center justify-center text-blue-400 mb-3 shadow-[0_0_20px_rgba(59,130,246,0.15)] animate-float">
            <Cpu className="h-6 w-6" />
          </div>
          <h1 className="text-2xl font-bold text-slate-100 tracking-tight">
            Metal<span className="text-blue-500">Cut</span> Pro
          </h1>
          <p className="text-slate-400 text-xs mt-1.5 font-medium">
            Sistema de Orçamentos Metalúrgicos
          </p>
        </div>

        {/* Login Card */}
        <div className="glass-card p-8 bg-[#0c0c14]/50 border-white/10 shadow-2xl">
          <h2 className="text-lg font-bold text-slate-100 mb-6">Acesse sua Conta</h2>
          
          <form onSubmit={handleSubmit} className="space-y-4">
            <Input
              label="E-mail"
              type="email"
              placeholder="seuemail@empresa.com.br"
              icon={<Mail className="h-4 w-4" />}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={loading}
              required
            />
            
            <Input
              label="Senha"
              type="password"
              placeholder="••••••••"
              icon={<Lock className="h-4 w-4" />}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={loading}
              required
            />

            {error && (
              <div className="flex items-start gap-2.5 bg-red-950/20 border border-red-900/30 rounded-lg p-3 text-xs text-red-400 font-medium">
                <AlertTriangle className="h-4 w-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <Button
              type="submit"
              className="w-full mt-2"
              loading={loading}
            >
              Entrar no Sistema
            </Button>
          </form>
        </div>

        <div className="text-center mt-6">
          <p className="text-[10px] text-slate-500 font-medium">
            &copy; 2026 MetalCut Pro. Todos os direitos reservados.
          </p>
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <AuthProvider>
      <LoginContent />
    </AuthProvider>
  );
}
