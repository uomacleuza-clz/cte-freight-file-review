import { Link } from "@tanstack/react-router";
import { FileUp, Search, History, Truck } from "lucide-react";
import type { ReactNode } from "react";

const items = [
  { to: "/", label: "Importação CT-e", icon: FileUp },
  { to: "/consulta", label: "Consulta CT-e", icon: Search },
  { to: "/historico", label: "Histórico de Importações", icon: History },
] as const;

export function AppShell({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen bg-background">
      <aside className="w-64 shrink-0 bg-sidebar text-sidebar-foreground flex flex-col">
        <div className="flex items-center gap-2 px-5 py-5 border-b border-sidebar-border">
          <Truck className="h-6 w-6 text-sidebar-primary" />
          <span className="font-semibold">Controle de Fretes</span>
        </div>
        <nav className="flex flex-col gap-1 p-3">
          {items.map(({ to, label, icon: Icon }) => (
            <Link
              key={to}
              to={to}
              activeOptions={{ exact: true }}
              className="flex items-center gap-3 rounded-md px-3 py-2 text-sm hover:bg-sidebar-accent"
              activeProps={{ className: "bg-sidebar-accent text-sidebar-primary font-medium" }}
            >
              <Icon className="h-4 w-4" />
              {label}
            </Link>
          ))}
        </nav>
      </aside>
      <div className="flex-1 flex flex-col min-w-0">
        <header className="border-b bg-card px-8 py-4">
          <h1 className="text-xl font-semibold text-foreground">Controle de Fretes — Importação CT-e</h1>
        </header>
        <main className="flex-1 p-8 space-y-6">{children}</main>
      </div>
    </div>
  );
}

export function EmptyState({ text }: { text: string }) {
  return <p className="py-8 text-center text-sm text-muted-foreground">{text}</p>;
}
