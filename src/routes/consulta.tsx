import { createFileRoute } from "@tanstack/react-router";
import { AppShell, EmptyState } from "@/components/AppShell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export const Route = createFileRoute("/consulta")({
  head: () => ({
    meta: [
      { title: "Consulta CT-e — Controle de Fretes" },
      { name: "description", content: "Consulta de CT-es importados." },
      { property: "og:title", content: "Consulta CT-e — Controle de Fretes" },
      { property: "og:description", content: "Consulta de CT-es importados." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: () => (
    <AppShell>
      <h2 className="text-2xl font-semibold text-foreground">Consulta CT-e</h2>
      <Card>
        <CardHeader><CardTitle className="text-base">CT-es importados</CardTitle></CardHeader>
        <CardContent><EmptyState text="Esta tela será disponibilizada em uma próxima etapa." /></CardContent>
      </Card>
    </AppShell>
  ),
});
