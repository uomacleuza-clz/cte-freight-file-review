import { createFileRoute } from "@tanstack/react-router";
import { useRef, useState } from "react";
import { Upload, CheckCircle2, Play, Trash2, AlertTriangle } from "lucide-react";
import { AppShell, EmptyState } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Importação CONEMB 5.0 — Controle de Fretes" },
      { name: "description", content: "Importação de arquivos CONEMB 5.0 de CT-e." },
      { property: "og:title", content: "Importação CONEMB 5.0 — Controle de Fretes" },
      { property: "og:description", content: "Importação de arquivos CONEMB 5.0 de CT-e." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Index,
});

type Item = { file: File; selectedAt: Date };

function formatSize(b: number) {
  if (b < 1024) return `${b} B`;
  if (b < 1024 * 1024) return `${(b / 1024).toFixed(1)} KB`;
  return `${(b / 1024 / 1024).toFixed(2)} MB`;
}

function Index() {
  const [items, setItems] = useState<Item[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);

  const onSelect = (files: FileList | null) => {
    if (!files) return;
    const now = new Date();
    setItems((prev) => [...prev, ...Array.from(files).map((file) => ({ file, selectedAt: now }))]);
    if (inputRef.current) inputRef.current.value = "";
  };

  return (
    <AppShell>
      <div>
        <h2 className="text-2xl font-semibold text-foreground">Importação CONEMB 5.0</h2>
        <p className="text-sm text-muted-foreground">Selecione os arquivos TXT no layout CONEMB 5.0 para validação e processamento.</p>
      </div>

      <Card>
        <CardHeader><CardTitle className="text-base">Seleção de arquivos</CardTitle></CardHeader>
        <CardContent>
          <label className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed border-input bg-muted/40 px-6 py-10 text-center hover:bg-muted">
            <Upload className="h-8 w-8 text-primary" />
            <span className="font-medium text-foreground">Clique para selecionar arquivos TXT</span>
            <span className="text-xs text-muted-foreground">É possível selecionar vários arquivos ao mesmo tempo</span>
            <input ref={inputRef} type="file" accept=".txt,text/plain" multiple className="hidden" onChange={(e) => onSelect(e.target.files)} />
          </label>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-base">Arquivos selecionados ({items.length})</CardTitle>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" disabled={!items.length} onClick={() => setItems([])}>
              <Trash2 /> Limpar
            </Button>
            <Button size="sm" disabled={!items.length}>
              <CheckCircle2 /> Validar Arquivos
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto rounded-md border">
            <table className="w-full text-sm">
              <thead className="bg-muted text-left text-muted-foreground">
                <tr>
                  <th className="px-4 py-2 font-medium">Nome do arquivo</th>
                  <th className="px-4 py-2 font-medium">Tamanho</th>
                  <th className="px-4 py-2 font-medium">Data da seleção</th>
                  <th className="px-4 py-2 font-medium">Situação</th>
                </tr>
              </thead>
              <tbody>
                {items.map((it, i) => (
                  <tr key={i} className="border-t">
                    <td className="px-4 py-2 font-medium text-foreground">{it.file.name}</td>
                    <td className="px-4 py-2">{formatSize(it.file.size)}</td>
                    <td className="px-4 py-2">{it.selectedAt.toLocaleString("pt-BR")}</td>
                    <td className="px-4 py-2"><Badge variant="secondary">Aguardando validação</Badge></td>
                  </tr>
                ))}
              </tbody>
            </table>
            {!items.length && <EmptyState text="Nenhum arquivo selecionado." />}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">Pré-visualização dos CT-es</CardTitle></CardHeader>
        <CardContent>
          <div className="overflow-x-auto rounded-md border">
            <table className="w-full text-sm">
              <thead className="bg-muted text-left text-muted-foreground">
                <tr>
                  {["Arquivo", "Nº CT-e", "Série", "Emissão", "Transportadora", "Remetente", "Destinatário", "Valor do frete"].map((h) => (
                    <th key={h} className="px-4 py-2 font-medium whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
            </table>
            <EmptyState text="Os CT-es encontrados serão exibidos aqui após a validação dos arquivos." />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base flex items-center gap-2"><AlertTriangle className="h-4 w-4 text-destructive" /> Erros e avisos</CardTitle></CardHeader>
        <CardContent>
          <div className="rounded-md border bg-muted/30">
            <EmptyState text="Nenhuma mensagem no momento." />
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button size="lg" disabled>
          <Play /> Processar Arquivos
        </Button>
      </div>
    </AppShell>
  );
}
