"use client";

import React from "react";
import { useAuth, AuthProvider } from "@/hooks/useAuth";
import Sidebar from "./Sidebar";
import Header from "./Header";

const LayoutContent: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0a0a0f] flex flex-col items-center justify-center gap-4">
        {/* Loading Spinner */}
        <div className="relative w-12 h-12 flex items-center justify-center">
          <div className="absolute inset-0 rounded-full border-2 border-blue-500/10 border-t-blue-500 animate-spin" />
          <div className="w-5 h-5 rounded-full bg-blue-500/10 animate-ping" />
        </div>
        <span className="text-xs font-semibold text-slate-500 tracking-wider uppercase animate-pulse">
          Carregando Sessão...
        </span>
      </div>
    );
  }

  if (!isAuthenticated) {
    //useAuth redireciona automaticamente para /login
    return null;
  }

  return (
    <div className="min-h-screen bg-[#0a0a0f] text-slate-100 flex">
      {/* Sidebar Navigation */}
      <Sidebar />

      {/* Main Wrapper */}
      <div className="flex-1 pl-64 flex flex-col min-h-screen">
        <Header />
        <main className="flex-1 p-8 overflow-y-auto">
          {children}
        </main>
      </div>
    </div>
  );
};

export const AppLayout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return (
    <AuthProvider>
      <LayoutContent>{children}</LayoutContent>
    </AuthProvider>
  );
};
export default AppLayout;
