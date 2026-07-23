"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import {
  BarChart3, FilePlus, ClipboardList, Layers, Settings, LogOut, Cpu, User as UserIcon, Database,
} from "lucide-react";

export const Sidebar: React.FC = () => {
  const pathname = usePathname();
  const { user, logout } = useAuth();

  const navItems = [
    { label: "Dashboard", href: "/dashboard", icon: BarChart3 },
    { label: "Novo Orçamento", href: "/orcamentos/novo", icon: FilePlus },
    { label: "Orçamentos", href: "/orcamentos", icon: ClipboardList },
    { label: "Arranjo de Chapas", href: "/arranjo-chapas", icon: Layers },
    { label: "Estoque de Chapas", href: "/estoque", icon: Database },
    { label: "Configurações", href: "/configuracoes", icon: Settings },
  ];

  return (
    <aside className="w-64 bg-white border-r border-gray-100 shadow-lg shadow-gray-200/50 flex flex-col h-screen fixed left-0 top-0 z-30">
      <div className="h-16 flex items-center gap-2.5 px-6 border-b border-gray-100">
        <Cpu className="h-6 w-6 text-teal-500 animate-pulse" />
        <span className="text-lg font-bold text-slate-800 tracking-tight">
          Metal<span className="text-teal-500">Cut</span> Pro
        </span>
      </div>
      <nav className="flex-1 px-4 py-6 space-y-1.5 overflow-y-auto">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.href || pathname.startsWith(item.href + "/");
          return (
            <Link key={item.href} href={item.href}
              className={`flex items-center gap-3.5 px-4 py-3 rounded-lg text-sm font-medium transition-all duration-150 ${
                isActive
                  ? "bg-teal-50 text-teal-600 border border-teal-200"
                  : "text-slate-500 hover:text-slate-800 hover:bg-slate-50 border border-transparent"
              }`}
            >
              <Icon className="h-4 w-4" />
              {item.label}
            </Link>
          );
        })}
      </nav>
      {user && (
        <div className="p-4 border-t border-gray-100 flex flex-col gap-3 bg-gray-50/50">
          <div className="flex items-center gap-3 px-2">
            <div className="h-9 w-9 rounded-full bg-teal-50 border border-teal-100 flex items-center justify-center text-teal-600">
              <UserIcon className="h-4.5 w-4.5" />
            </div>
            <div className="flex flex-col min-w-0">
              <span className="text-xs font-semibold text-slate-800 truncate">{user.nome || "Usuário"}</span>
              <span className="text-[10px] text-slate-600 truncate">{user.email}</span>
            </div>
          </div>
          <button onClick={logout}
            className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-xs font-medium text-slate-500 hover:text-red-500 hover:bg-red-50 border border-transparent hover:border-red-100 transition-all duration-150 cursor-pointer"
          >
            <LogOut className="h-3.5 w-3.5" />
            Sair do Sistema
          </button>
        </div>
      )}
    </aside>
  );
};
export default Sidebar;
