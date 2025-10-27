import { NavLink, useLocation } from "react-router-dom";
import { 
  LayoutDashboard, 
  TrendingUp, 
  Shield, 
  Target, 
  FolderKanban,
  ChevronRight
} from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";

interface DashboardSidebarProps {
  onNavigate: (section: string) => void;
  currentSection: string;
}

const menuItems = [
  { 
    title: "Visão Geral", 
    id: "overview", 
    icon: LayoutDashboard,
    description: "KPIs e resumo executivo"
  },
  { 
    title: "Performance", 
    id: "performance", 
    icon: TrendingUp,
    description: "Análise de retornos"
  },
  { 
    title: "Gestão de Riscos", 
    id: "risk", 
    icon: Shield,
    description: "Indicadores de risco"
  },
  { 
    title: "Política de Investimentos", 
    id: "policy", 
    icon: Target,
    description: "Aderência à política"
  },
  { 
    title: "Portfólio Detalhado", 
    id: "portfolio", 
    icon: FolderKanban,
    description: "Posições e ativos"
  },
];

export function DashboardSidebar({ onNavigate, currentSection }: DashboardSidebarProps) {
  const { state } = useSidebar();
  const collapsed = state === "collapsed";

  return (
    <Sidebar className="border-r border-border/40 bg-card/30 backdrop-blur-sm">
      <SidebarContent className="pt-6">
        <SidebarGroup>
          <SidebarGroupLabel className="text-xs uppercase tracking-wider text-muted-foreground px-3">
            {!collapsed && "Navegação"}
          </SidebarGroupLabel>
          <SidebarGroupContent className="mt-2">
            <SidebarMenu className="space-y-1">
              {menuItems.map((item) => {
                const isActive = currentSection === item.id;
                return (
                  <SidebarMenuItem key={item.id}>
                    <SidebarMenuButton
                      onClick={() => onNavigate(item.id)}
                      className={`
                        group relative w-full transition-all duration-200
                        ${isActive 
                          ? 'bg-primary text-primary-foreground hover:bg-primary/90 shadow-sm' 
                          : 'hover:bg-accent/50 text-foreground/80 hover:text-foreground'
                        }
                      `}
                    >
                      <item.icon className={`h-4 w-4 ${isActive ? 'text-primary-foreground' : 'text-foreground/60'}`} />
                      {!collapsed && (
                        <div className="flex-1 flex items-center justify-between">
                          <div className="flex flex-col items-start">
                            <span className="text-sm font-medium">{item.title}</span>
                            {!isActive && (
                              <span className="text-xs text-muted-foreground">{item.description}</span>
                            )}
                          </div>
                          {isActive && <ChevronRight className="h-3 w-3" />}
                        </div>
                      )}
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
}
