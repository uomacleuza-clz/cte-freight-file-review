// Validação estrutural de arquivos CONEMB 5.0 (CT-e).
// Registros de largura fixa; a largura e os tipos abaixo seguem o padrão CONEMB.

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
  chave: string;
}

export interface ValidationResult {
  mensagens: Mensagem[];
  ctes: CteInfo[];
  totalLinhas: number;
  erros: number;
  avisos: number;
}

export const LARGURA_REGISTRO = 120;

// Tipos de registro reconhecidos no layout CONEMB 5.0
const TIPOS_REGISTRO: Record<string, string> = {
  "000": "Cabeçalho (remetente)",
  "310": "Dados do conhecimento (CT-e)",
  "311": "Dados complementares",
  "312": "Dados das mercadorias",
  "313": "Componentes do valor da prestação",
  "314": "Dados de seguros",
  "315": "Conhecimentos anexos",
  "316": "Dados de CT-e globalizado",
  "317": "Outros embarcadores",
  "318": "Dados de cobrança",
  "319": "Outros dados de cobrança",
  "331": "Documentos fiscais (NF-e)",
  "332": "Documentos fiscais (NF-e)",
  "333": "Documentos fiscais (NF-e)",
  "334": "Documentos fiscais (NF-e)",
  "335": "Documentos fiscais (NF-e)",
  "336": "Documentos fiscais (NF-e)",
  "337": "Documentos fiscais (NF-e)",
  "338": "Documentos fiscais (NF-e)",
  "339": "Documentos fiscais (NF-e)",
  "340": "Documentos fiscais (NF-e)",
  "999": "Total de documentos (trailer)",
};

/** Extrai campo 1-based inclusivo: sub(3, 5) => posições 3 a 5. */
function sub(linha: string, ini: number, fim: number): string {
  return linha.substring(ini - 1, fim);
}

/** Valida dígitos verificadores de CNPJ (14 dígitos). */
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

  // Normaliza quebras de linha e remove linha vazia final
  const linhas = conteudo.replace(/\r\n/g, "\n").replace(/\r/g, "\n").split("\n");
  if (linhas.length && linhas[linhas.length - 1].trim() === "") linhas.pop();

  const totalLinhas = linhas.length;

  if (totalLinhas === 0 || (totalLinhas === 1 && linhas[0].trim() === "")) {
    add("erro", "O arquivo está vazio.");
    return resumo(mensagens, ctes, totalLinhas);
  }

  // Linhas em branco no meio do arquivo
  linhas.forEach((l, i) => {
    if (l.trim() === "") add("erro", `Linha ${i + 1}: linha em branco não é permitida.`);
  });

  // Largura dos registros
  const largurasErradas: number[] = [];
  linhas.forEach((l, i) => {
    if (l.trim() !== "" && l.length !== LARGURA_REGISTRO) largurasErradas.push(i + 1);
  });
  if (largurasErradas.length) {
    const amostra = largurasErradas.slice(0, 5).join(", ");
    const extra = largurasErradas.length > 5 ? ` e mais ${largurasErradas.length - 5}` : "";
    add(
      "erro",
      `${largurasErradas.length} linha(s) fora do tamanho padrão de ${LARGURA_REGISTRO} caracteres (linhas: ${amostra}${extra}).`
    );
  }

  // Tipos de registro
  linhas.forEach((l, i) => {
    if (l.trim() === "") return;
    const tipo = sub(l, 1, 3);
    if (!TIPOS_REGISTRO[tipo]) add("erro", `Linha ${i + 1}: tipo de registro "${tipo}" não reconhecido no layout CONEMB.`);
  });

  // Cabeçalho 000
  const idx000 = linhas.findIndex((l) => sub(l, 1, 3) === "000");
  if (idx000 === -1) {
    add("erro", "Registro 000 (cabeçalho/remetente) não encontrado.");
  } else {
    if (idx000 !== 0) add("erro", `O registro 000 (cabeçalho) deve ser a primeira linha do arquivo (encontrado na linha ${idx000 + 1}).`);
    const qtd000 = linhas.filter((l) => sub(l, 1, 3) === "000").length;
    if (qtd000 > 1) add("erro", `Foram encontrados ${qtd000} registros 000; o arquivo deve ter apenas um cabeçalho.`);
  }

  // Trailer 999
  const idx999 = linhas.map((l, i) => (sub(l, 1, 3) === "999" ? i : -1)).filter((i) => i >= 0);
  if (!idx999.length) {
    add("erro", "Registro 999 (total de documentos/trailer) não encontrado.");
  } else {
    if (idx999[idx999.length - 1] !== linhas.length - 1) {
      add("erro", `O registro 999 (trailer) deve ser a última linha do arquivo (encontrado na linha ${idx999[idx999.length - 1] + 1}).`);
    }
    if (idx999.length > 1) add("erro", `Foram encontrados ${idx999.length} registros 999; o arquivo deve ter apenas um trailer.`);
  }

  // CT-es: registro 310 (dados do conhecimento)
  linhas.forEach((l) => {
    if (sub(l, 1, 3) !== "310") return;
    const cnpj = sub(l, 4, 17).trim();
    ctes.push({ numero: "", serie: "", emissao: "", cnpjEmissor: cnpj, chave: "" });
  });

  if (!ctes.length) {
    add("aviso", "Nenhum CT-e (registro 310) foi encontrado no arquivo.");
  } else {
    ctes.forEach((c, i) => {
      if (!/^\d{14}$/.test(c.cnpjEmissor)) {
        add("erro", `CT-e ${i + 1}: CNPJ da transportadora emissora ("${c.cnpjEmissor || "vazio"}") não é numérico de 14 dígitos.`);
      } else if (!cnpjValido(c.cnpjEmissor)) {
        add("erro", `CT-e ${i + 1}: CNPJ da transportadora emissora (${c.cnpjEmissor}) está com dígito verificador inválido.`);
      }
    });
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
