"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import {
  BarChart3,
  FilePlus,
  ClipboardList,
  Layers,
  Settings,
  LogOut,
  Cpu,
  User as UserIcon,
} from "lucide-react";

export const Sidebar: React.FC = () => {
  const pathname = usePathname();
  const { user, logout } = useAuth();

  const navItems = [
    {
      label: "Dashboard",
      href: "/dashboard",
      icon: BarChart3,
    },
    {
      label: "Novo Orçamento",
      href: "/orcamentos/novo",
      icon: FilePlus,
    },
    {
      label: "Orçamentos",
      href: "/orcamentos",
      icon: ClipboardList,
    },
    {
      label: "Arranjo de Chapas",
      href: "/arranjo-chapas",
      icon: Layers,
    },
    {
      label: "Configurações",
      href: "/configuracoes",
      icon: Settings,
    },
  ];

  return (
    <aside className="w-64 bg-[#0a0a0f] border-r border-white/5 flex flex-col h-screen fixed left-0 top-0 z-30">
      {/* Brand Logo */}
      <div className="h-16 flex items-center gap-2.5 px-6 border-b border-white/5">
        <Cpu className="h-6 w-6 text-blue-500 animate-pulse" />
        <span className="text-lg font-bold text-slate-100 tracking-tight">
          Metal<span className="text-blue-500">Cut</span> Pro
        </span>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-4 py-6 space-y-1.5 overflow-y-auto">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.href || pathname.startsWith(item.href + "/");
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3.5 px-4 py-3 rounded-lg text-sm font-medium transition-all duration-150 ${
                isActive
                  ? "bg-blue-600/10 text-blue-400 border border-blue-500/20 shadow-[0_0_15px_rgba(59,130,246,0.05)]"
                  : "text-slate-400 hover:text-slate-100 hover:bg-white/5 border border-transparent"
              }`}
            >
              <Icon className="h-4 w-4" />
              {item.label}
            </Link>
          );
        })}
      </nav>

      {/* User Session Footer */}
      {user && (
        <div className="p-4 border-t border-white/5 flex flex-col gap-3 bg-white/[0.01]">
          <div className="flex items-center gap-3 px-2">
            <div className="h-9 w-9 rounded-full bg-blue-600/20 border border-blue-500/30 flex items-center justify-center text-blue-400">
              <UserIcon className="h-4.5 w-4.5" />
            </div>
            <div className="flex flex-col min-w-0">
              <span className="text-xs font-semibold text-slate-200 truncate">
                {user.nome || "Usuário"}
              </span>
              <span className="text-[10px] text-slate-500 truncate">
                {user.email}
              </span>
            </div>
          </div>
          <button
            onClick={logout}
            className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-xs font-medium text-slate-400 hover:text-red-400 hover:bg-red-950/20 border border-transparent hover:border-red-900/25 transition-all duration-150 cursor-pointer"
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
