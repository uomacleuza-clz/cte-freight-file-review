import { createFileRoute } from "@tanstack/react-router";
import { useRef, useState } from "react";
import { Upload, CheckCircle2, Play, Trash2, AlertTriangle, XCircle, Info } from "lucide-react";
import { AppShell, EmptyState } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { validarConemb, type CteInfo, type MsgTipo } from "@/lib/conemb";

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

type Status = "aguardando" | "valido" | "avisos" | "erros";
type Item = { file: File; selectedAt: Date; status: Status };
type MensagemArq = { arquivo: string; tipo: MsgTipo; texto: string };
type CteArq = CteInfo & { arquivo: string };

function formatSize(b: number) {
  if (b < 1024) return `${b} B`;
  if (b < 1024 * 1024) return `${(b / 1024).toFixed(1)} KB`;
  return `${(b / 1024 / 1024).toFixed(2)} MB`;
}

function StatusBadge({ status }: { status: Status }) {
  if (status === "valido") return <Badge>Válido</Badge>;
  if (status === "avisos") return <Badge variant="outline">Válido com avisos</Badge>;
  if (status === "erros") return <Badge variant="destructive">Com erros</Badge>;
  return <Badge variant="secondary">Aguardando validação</Badge>;
}

const msgIcon = (tipo: MsgTipo) =>
  tipo === "erro" ? (
    <XCircle className="mt-0.5 h-4 w-4 shrink-0 text-destructive" />
  ) : tipo === "aviso" ? (
    <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
  ) : (
    <Info className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
  );

function Index() {
  const [items, setItems] = useState<Item[]>([]);
  const [mensagens, setMensagens] = useState<MensagemArq[]>([]);
  const [ctes, setCtes] = useState<CteArq[]>([]);
  const [validando, setValidando] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const onSelect = (files: FileList | null) => {
    if (!files) return;
    const now = new Date();
    setItems((prev) => [...prev, ...Array.from(files).map((file) => ({ file, selectedAt: now, status: "aguardando" as Status }))]);
    if (inputRef.current) inputRef.current.value = "";
  };

  const limpar = () => {
    setItems([]);
    setMensagens([]);
    setCtes([]);
  };

  const validar = async () => {
    setValidando(true);
    const novasMensagens: MensagemArq[] = [];
    const novosCtes: CteArq[] = [];
    const novosItens: Item[] = [];
    for (const it of items) {
      try {
        const texto = await it.file.text();
        const r = validarConemb(texto);
        novasMensagens.push({
          arquivo: it.file.name,
          tipo: "info",
          texto: `${r.totalLinhas} linha(s) · ${r.ctes.length} CT-e(s) identificado(s) · ${r.erros} erro(s) · ${r.avisos} aviso(s)`,
        });
        r.mensagens.forEach((m) => novasMensagens.push({ arquivo: it.file.name, ...m }));
        r.ctes.forEach((c) => novosCtes.push({ arquivo: it.file.name, ...c }));
        novosItens.push({ ...it, status: r.erros > 0 ? "erros" : r.avisos > 0 ? "avisos" : "valido" });
      } catch {
        novasMensagens.push({ arquivo: it.file.name, tipo: "erro", texto: "Não foi possível ler o arquivo." });
        novosItens.push({ ...it, status: "erros" });
      }
    }
    setItems(novosItens);
    setMensagens(novasMensagens);
    setCtes(novosCtes);
    setValidando(false);
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
            <Button variant="outline" size="sm" disabled={!items.length || validando} onClick={limpar}>
              <Trash2 /> Limpar
            </Button>
            <Button size="sm" disabled={!items.length || validando} onClick={validar}>
              <CheckCircle2 /> {validando ? "Validando..." : "Validar Arquivos"}
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
                    <td className="px-4 py-2"><StatusBadge status={it.status} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
            {!items.length && <EmptyState text="Nenhum arquivo selecionado." />}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">Pré-visualização dos CT-es{ctes.length ? ` (${ctes.length})` : ""}</CardTitle></CardHeader>
        <CardContent>
          <div className="overflow-x-auto rounded-md border">
            <table className="w-full text-sm">
              <thead className="bg-muted text-left text-muted-foreground">
                <tr>
                  {["Arquivo", "Nº CT-e", "Série", "Emissão", "Transportadora (CNPJ)", "Remetente", "Destinatário", "Valor do frete"].map((h) => (
                    <th key={h} className="px-4 py-2 font-medium whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {ctes.map((c, i) => (
                  <tr key={i} className="border-t">
                    <td className="px-4 py-2 whitespace-nowrap">{c.arquivo}</td>
                    <td className="px-4 py-2">{c.numero || "—"}</td>
                    <td className="px-4 py-2">{c.serie || "—"}</td>
                    <td className="px-4 py-2 whitespace-nowrap">{c.emissao || "—"}</td>
                    <td className="px-4 py-2 whitespace-nowrap">{c.transportadora ? `${c.transportadora} (${c.cnpjEmissor})` : c.cnpjEmissor || "—"}</td>
                    <td className="px-4 py-2 whitespace-nowrap">{c.remetente || "—"}</td>
                    <td className="px-4 py-2 whitespace-nowrap">{c.destinatario || "—"}</td>
                    <td className="px-4 py-2 whitespace-nowrap text-right">{c.valorFrete !== null ? c.valorFrete.toLocaleString("pt-BR", { style: "currency", currency: "BRL" }) : "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {!ctes.length && <EmptyState text="Os CT-es encontrados serão exibidos aqui após a validação dos arquivos." />}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base flex items-center gap-2"><AlertTriangle className="h-4 w-4 text-destructive" /> Erros e avisos</CardTitle></CardHeader>
        <CardContent>
          <div className="rounded-md border bg-muted/30">
            {mensagens.length ? (
              <ul className="max-h-72 space-y-2 overflow-y-auto p-4 text-sm">
                {mensagens.map((m, i) => (
                  <li key={i} className="flex items-start gap-2">
                    {msgIcon(m.tipo)}
                    <span>
                      <span className="font-medium text-foreground">{m.arquivo}:</span>{" "}
                      <span className={m.tipo === "erro" ? "text-destructive" : "text-muted-foreground"}>{m.texto}</span>
                    </span>
                  </li>
                ))}
              </ul>
            ) : (
              <EmptyState text="Nenhuma mensagem no momento." />
            )}
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
