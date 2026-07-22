"use client";

import React from "react";
import { useAuth, AuthProvider } from "@/hooks/useAuth";
import Sidebar from "./Sidebar";
import Header from "./Header";

const LayoutContent: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-[#f8f9fc] flex flex-col items-center justify-center gap-4">
        <div className="relative w-12 h-12 flex items-center justify-center">
          <div className="absolute inset-0 rounded-full border-2 border-[#2ec4b6]/20 border-t-[#2ec4b6] animate-spin" />
          <div className="w-5 h-5 rounded-full bg-[#2ec4b6]/20 animate-ping" />
        </div>
        <span className="text-xs font-semibold text-slate-500 tracking-wider uppercase animate-pulse">
          Carregando Sessão...
        </span>
      </div>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  return (
    <div className="min-h-screen bg-[#f8f9fc] text-slate-800 flex">
      <Sidebar />
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
