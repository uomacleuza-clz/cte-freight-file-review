// Validação de arquivos CONEMB 5.0 (layout TIVIT, 31/07/2008).
// Registros de largura fixa com 350 caracteres; identificadores 000, 520–529.

export type MsgTipo = "erro" | "aviso" | "info";

export interface Mensagem {
  tipo: MsgTipo;
  texto: string;
}

export interface CteInfo {
  numero: string;
  serie: string;
  emissao: string;
  cnpjEmissor: string;
  transportadora: string;
  remetente: string;
  destinatario: string;
  valorFrete: number | null;
  chave: string;
}

export interface ValidationResult {
  mensagens: Mensagem[];
  ctes: CteInfo[];
  totalLinhas: number;
  erros: number;
  avisos: number;
}

export const LARGURA_REGISTRO = 350;

const TIPOS_REGISTRO: Record<string, string> = {
  "000": "Cabeçalho de intercâmbio",
  "520": "Cabeçalho de documento",
  "521": "Dados da transportadora",
  "522": "Conhecimentos embarcados",
  "523": "Valores do conhecimento",
  "524": "Notas componentes do conhecimento",
  "525": "Entrega casada/redespacho",
  "527": "Dados do consignatário",
  "529": "Total de conhecimentos embarcados",
};

/** Campo 1-based: posição inicial e tamanho, como no manual. */
function campo(linha: string, pos: number, tam: number): string {
  return linha.substring(pos - 1, pos - 1 + tam);
}

/** Número N inteiros,decimais (ex.: 13,2 ocupa 15 posições, sem vírgula). */
function numero(linha: string, pos: number, inteiros: number, decimais: number): number | null {
  const s = campo(linha, pos, inteiros + decimais).trim();
  if (!/^\d+$/.test(s)) return null;
  return Number(s) / 10 ** decimais;
}

function dataValida(ddmmaaaa: string): boolean {
  if (!/^\d{8}$/.test(ddmmaaaa)) return false;
  const d = +ddmmaaaa.slice(0, 2), m = +ddmmaaaa.slice(2, 4), a = +ddmmaaaa.slice(4);
  const dt = new Date(a, m - 1, d);
  return dt.getFullYear() === a && dt.getMonth() === m - 1 && dt.getDate() === d;
}

const fmtData = (s: string) => (dataValida(s) ? `${s.slice(0, 2)}/${s.slice(2, 4)}/${s.slice(4)}` : s);

export function cnpjValido(cnpj: string): boolean {
  const d = cnpj.replace(/\D/g, "");
  if (d.length !== 14 || /^(\d)\1{13}$/.test(d)) return false;
  const calc = (base: string, pesos: number[]) =>
    base.split("").reduce((acc, n, i) => acc + Number(n) * pesos[i], 0);
  const p1 = [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
  const p2 = [6, ...p1];
  let r = calc(d.slice(0, 12), p1) % 11;
  const dv1 = r < 2 ? 0 : 11 - r;
  r = calc(d.slice(0, 12) + dv1, p2) % 11;
  const dv2 = r < 2 ? 0 : 11 - r;
  return Number(d[12]) === dv1 && Number(d[13]) === dv2;
}

export function validarConemb(conteudo: string): ValidationResult {
  const mensagens: Mensagem[] = [];
  const ctes: CteInfo[] = [];
  const add = (tipo: MsgTipo, texto: string) => mensagens.push({ tipo, texto });

  const brutas = conteudo.replace(/\r\n/g, "\n").replace(/\r/g, "\n").split("\n");
  while (brutas.length && brutas[brutas.length - 1].trim() === "") brutas.pop();
  const totalLinhas = brutas.length;

  if (totalLinhas === 0) {
    add("erro", "O arquivo está vazio.");
    return resumo(mensagens, ctes, totalLinhas);
  }

  // Largura: maior que 350 é erro; menor é aceito (espaços finais cortados) com aviso.
  const longas: number[] = [];
  const curtas: number[] = [];
  const linhas = brutas.map((l, i) => {
    if (l.length > LARGURA_REGISTRO) longas.push(i + 1);
    else if (l.length < LARGURA_REGISTRO && l.trim() !== "") curtas.push(i + 1);
    return l.padEnd(LARGURA_REGISTRO, " ");
  });
  const lista = (n: number[]) => n.slice(0, 5).join(", ") + (n.length > 5 ? ` e mais ${n.length - 5}` : "");
  if (longas.length) add("erro", `${longas.length} linha(s) com mais de ${LARGURA_REGISTRO} caracteres (linhas: ${lista(longas)}).`);
  if (curtas.length) add("aviso", `${curtas.length} linha(s) com menos de ${LARGURA_REGISTRO} caracteres; completadas com espaços (linhas: ${lista(curtas)}).`);

  let transportadoraCnpj = "";
  let transportadoraNome = "";
  let atual: CteInfo | null = null;
  let qtd529: number | null = null;
  let valor529: number | null = null;
  let tem520 = false, tem521 = false;

  linhas.forEach((l, i) => {
    const n = i + 1;
    if (l.trim() === "") return add("erro", `Linha ${n}: linha em branco não é permitida.`);
    const tipo = campo(l, 1, 3);
    if (!TIPOS_REGISTRO[tipo]) return add("erro", `Linha ${n}: identificador de registro "${tipo}" não existe no CONEMB 5.0.`);

    switch (tipo) {
      case "000":
        if (i !== 0) add("erro", `Linha ${n}: o registro 000 deve ser a primeira linha do arquivo.`);
        break;
      case "520":
        tem520 = true;
        break;
      case "521":
        tem521 = true;
        if (!tem520) add("erro", `Linha ${n}: registro 521 sem o registro 520 antes.`);
        transportadoraCnpj = campo(l, 4, 14).trim();
        transportadoraNome = campo(l, 18, 50).trim();
        if (!cnpjValido(transportadoraCnpj)) add("erro", `Linha ${n}: CNPJ da transportadora (${transportadoraCnpj || "vazio"}) é inválido.`);
        break;
      case "522": {
        if (!tem521) add("erro", `Linha ${n}: registro 522 sem o registro 521 (transportadora) antes.`);
        const num = campo(l, 19, 12).trim();
        const emissao = campo(l, 31, 8);
        const cnpjEmissor = campo(l, 40, 14).trim();
        atual = {
          numero: num,
          serie: campo(l, 14, 5).trim(),
          emissao: fmtData(emissao),
          cnpjEmissor,
          transportadora: transportadoraNome || transportadoraCnpj,
          remetente: campo(l, 54, 14).trim(),
          destinatario: campo(l, 82, 14).trim(),
          valorFrete: null,
          chave: campo(l, 219, 45).trim(),
        };
        ctes.push(atual);
        const ref = `Linha ${n} (CT-e ${num || "sem número"})`;
        if (!num) add("erro", `${ref}: número do conhecimento não informado.`);
        if (!dataValida(emissao)) add("erro", `${ref}: data de emissão "${emissao.trim()}" inválida (esperado DDMMAAAA).`);
        if (!/^[CF]$/.test(campo(l, 39, 1))) add("erro", `${ref}: condição de frete deve ser C (CIF) ou F (FOB).`);
        if (!cnpjValido(cnpjEmissor)) add("erro", `${ref}: CNPJ da filial emissora (${cnpjEmissor || "vazio"}) é inválido.`);
        if (!cnpjValido(atual.remetente)) add("erro", `${ref}: CNPJ do emissor da nota fiscal (${atual.remetente || "vazio"}) é inválido.`);
        if (atual.destinatario && !cnpjValido(atual.destinatario)) add("aviso", `${ref}: CNPJ do destinatário (${atual.destinatario}) é inválido.`);
        if (!campo(l, 110, 5).trim()) add("erro", `${ref}: CFOP não informado.`);
        if (atual.chave && !/^\d{44}/.test(atual.chave)) add("aviso", `${ref}: chave do CT-e não tem 44 dígitos.`);
        break;
      }
      case "523": {
        if (!atual) { add("erro", `Linha ${n}: registro 523 sem um conhecimento (522) antes.`); break; }
        const v = numero(l, 41, 13, 2);
        if (v === null) add("erro", `Linha ${n} (CT-e ${atual.numero}): valor total do frete não é numérico.`);
        atual.valorFrete = v;
        break;
      }
      case "524":
        if (!atual) add("erro", `Linha ${n}: registro 524 sem um conhecimento (522) antes.`);
        else if (!/^\d{9}$/.test(campo(l, 18, 9).trim().padStart(9, "0"))) add("erro", `Linha ${n} (CT-e ${atual.numero}): número da nota fiscal inválido.`);
        break;
      case "529":
        qtd529 = numero(l, 4, 4, 0);
        valor529 = numero(l, 8, 13, 2);
        if (i !== linhas.length - 1) add("aviso", `Linha ${n}: registro 529 (total) não é a última linha do arquivo.`);
        break;
    }
  });

  if (campo(linhas[0], 1, 3) !== "000") add("erro", "Registro 000 (cabeçalho de intercâmbio) não encontrado na primeira linha.");
  if (!tem520) add("erro", "Registro 520 (cabeçalho de documento) não encontrado.");
  if (!tem521) add("erro", "Registro 521 (dados da transportadora) não encontrado.");
  ctes.forEach((c) => { if (c.valorFrete === null) add("erro", `CT-e ${c.numero || "sem número"}: falta o registro 523 (valores).`); });

  if (!ctes.length) add("aviso", "Nenhum conhecimento (registro 522) foi encontrado no arquivo.");

  if (qtd529 === null && valor529 === null) {
    add("erro", "Registro 529 (total de conhecimentos) não encontrado.");
  } else {
    if (qtd529 !== ctes.length) add("erro", `Registro 529 informa ${qtd529 ?? "?"} conhecimento(s), mas o arquivo tem ${ctes.length}.`);
    const soma = ctes.reduce((s, c) => s + (c.valorFrete ?? 0), 0);
    if (valor529 === null || Math.abs(valor529 - soma) > 0.005) {
      add("erro", `Registro 529 informa valor total ${valor529?.toFixed(2) ?? "?"}, mas a soma dos fretes é ${soma.toFixed(2)}.`);
    }
  }

  return resumo(mensagens, ctes, totalLinhas);
}

function resumo(mensagens: Mensagem[], ctes: CteInfo[], totalLinhas: number): ValidationResult {
  return {
    mensagens,
    ctes,
    totalLinhas,
    erros: mensagens.filter((m) => m.tipo === "erro").length,
    avisos: mensagens.filter((m) => m.tipo === "aviso").length,
  };
}
