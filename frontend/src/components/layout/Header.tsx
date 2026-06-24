"use client";

import React from "react";
import { usePathname } from "next/navigation";
import { ChevronRight, Calendar } from "lucide-react";

export const Header: React.FC = () => {
  const pathname = usePathname();
  
  // Mapear caminhos para títulos amigáveis
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
      else if (/^[0-9a-fA-F-]{36}$/.test(part)) label = "Detalhes"; // IDs UUID
      
      breadcrumbs.push({ label, href: currentPath });
    }

    return breadcrumbs;
  };

  const breadcrumbs = getBreadcrumbs();
  const pageTitle = breadcrumbs[breadcrumbs.length - 1]?.label || "MetalCut Pro";
  const currentDate = new Date().toLocaleDateString("pt-BR", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  return (
    <header className="h-16 border-b border-white/5 flex items-center justify-between px-8 bg-[#0a0a0f]/50 backdrop-blur-md sticky top-0 z-20">
      {/* Breadcrumbs */}
      <div className="flex items-center gap-1.5 text-xs text-slate-500 font-medium">
        <span className="text-slate-400">MetalCut Pro</span>
        {breadcrumbs.map((bc, idx) => (
          <React.Fragment key={bc.href}>
            <ChevronRight className="h-3 w-3" />
            <span className={idx === breadcrumbs.length - 1 ? "text-slate-200" : "text-slate-400"}>
              {bc.label}
            </span>
          </React.Fragment>
        ))}
      </div>

      {/* Date / Metadata Info */}
      <div className="flex items-center gap-2.5 text-slate-400 text-xs font-semibold bg-white/[0.02] border border-white/5 rounded-full px-4 py-1.5">
        <Calendar className="h-3.5 w-3.5 text-blue-500" />
        <span className="capitalize">{currentDate}</span>
      </div>
    </header>
  );
};
export default Header;
