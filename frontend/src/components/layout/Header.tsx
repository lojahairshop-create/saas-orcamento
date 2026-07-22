"use client";
import React from "react";
import { usePathname } from "next/navigation";
import { ChevronRight, Calendar, Search, Bell } from "lucide-react";

export const Header: React.FC = () => {
  const pathname = usePathname();
  const getBreadcrumbs = () => {
    const parts = pathname.split("/").filter(Boolean);
    const breadcrumbs = [];
    let currentPath = "";
    for (let i = 0; i < parts.length; i++) {
      const part = parts[i];
      currentPath += `/${part}`;
      let label = part;
      if (part === "dashboard") label = "Dashboard";
      else if (part === "orcamentos") label = "Orçamentos";
      else if (part === "novo") label = "Novo Orçamento";
      else if (part === "configuracoes") label = "Configurações";
      else if (/^[0-9a-fA-F-]{36}$/.test(part)) label = "Detalhes";
      breadcrumbs.push({ label, href: currentPath });
    }
    return breadcrumbs;
  };

  const breadcrumbs = getBreadcrumbs();
  const currentDate = new Date().toLocaleDateString("pt-BR", { weekday: "long", year: "numeric", month: "long", day: "numeric" });

  return (
    <header className="h-16 border-b border-gray-200 flex items-center justify-between px-8 bg-white/90 backdrop-blur-md sticky top-0 z-20">
      <div className="flex items-center gap-1.5 text-xs text-slate-500 font-medium">
        <span className="text-slate-600">MetalCut Pro</span>
        {breadcrumbs.map((bc, idx) => (
          <React.Fragment key={bc.href}>
            <ChevronRight className="h-3 w-3" />
            <span className={idx === breadcrumbs.length - 1 ? "text-slate-800" : "text-slate-500"}>{bc.label}</span>
          </React.Fragment>
        ))}
      </div>
      
      <div className="flex items-center gap-4">
        <div className="relative hidden md:block">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input 
            type="text" 
            placeholder="Buscar..." 
            className="pl-9 pr-4 py-1.5 bg-gray-50 border border-gray-200 rounded-full text-sm focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 text-slate-700 w-64"
          />
        </div>
        
        <button className="relative p-2 text-slate-400 hover:text-slate-600 hover:bg-gray-50 rounded-full transition-colors">
          <Bell className="h-5 w-5" />
          <span className="absolute top-1.5 right-1.5 h-2 w-2 bg-red-500 rounded-full border border-white"></span>
        </button>

        <div className="flex items-center gap-2.5 text-slate-600 text-xs font-semibold bg-gray-50 border border-gray-200 rounded-full px-4 py-1.5">
          <Calendar className="h-3.5 w-3.5 text-teal-500" />
          <span className="capitalize">{currentDate}</span>
        </div>
      </div>
    </header>
  );
};
export default Header;
