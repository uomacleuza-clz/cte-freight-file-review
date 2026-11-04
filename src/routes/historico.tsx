import { createFileRoute } from "@tanstack/react-router";
import { AppShell, EmptyState } from "@/components/AppShell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export const Route = createFileRoute("/historico")({
  head: () => ({
    meta: [
      { title: "Histórico de Importações — Controle de Fretes" },
      { name: "description", content: "Histórico das importações de arquivos CONEMB." },
      { property: "og:title", content: "Histórico de Importações — Controle de Fretes" },
      { property: "og:description", content: "Histórico das importações de arquivos CONEMB." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: () => (
    <AppShell>
      <h2 className="text-2xl font-semibold text-foreground">Histórico de Importações</h2>
      <Card>
        <CardHeader><CardTitle className="text-base">Importações realizadas</CardTitle></CardHeader>
        <CardContent><EmptyState text="Nenhuma importação registrada." /></CardContent>
      </Card>
    </AppShell>
  ),
});
