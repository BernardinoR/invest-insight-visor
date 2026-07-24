// Ponte pro canônico (Journey via broker no CRM). Dual-write: o visor edita
// classe/liquidez/vencimento localmente (RAG_Processador + DadosPerformance)
// e ADICIONALMENTE encaminha pro Journey através de
// `POST /api/visor-bridge/classificacao` no CRM. Nunca reverte o write local
// — a falha aqui é só avisada ao usuário (ver chamadores em DataManagement.tsx).

export interface Liquidez {
  calendarDays: string | null;
  businessDays: string | null;
  closed: boolean;
}

export interface PostClassificacaoInput {
  ativo: string;
  classePT: string;
  liquidez?: Liquidez;
  vencimento?: string; // YYYY-MM-DD
}

export async function postClassificacao(input: PostClassificacaoInput): Promise<void> {
  const base = import.meta.env.VITE_VISOR_BRIDGE_URL;
  const secret = import.meta.env.VITE_VISOR_BRIDGE_SECRET;
  if (!base || !secret) {
    throw new Error(
      "VITE_VISOR_BRIDGE_URL/VITE_VISOR_BRIDGE_SECRET ausentes — não foi possível sincronizar com o Journey"
    );
  }

  const res = await fetch(`${base}/api/visor-bridge/classificacao`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-visor-secret": secret,
    },
    body: JSON.stringify(input),
  });

  if (!res.ok) {
    throw new Error(`Falha ao sincronizar classificação com o Journey (HTTP ${res.status})`);
  }
}

// Fluxo 2: o visor edita override manual por ativo (escopo profileId+institution+
// ativoOriginal — chave composta do Journey, NUNCA o id local da tabela
// `asset_overrides`). Mesmo dual-write: grava local e ADICIONALMENTE encaminha
// pro Journey através de `POST /api/visor-bridge/override` no CRM.

/** Chave composta do override no Journey — nunca o id local. */
export interface OverrideCompositeKey {
  profileId: string;
  institution?: string | null;
  ativoOriginal: string;
}

export interface PostOverrideInput extends OverrideCompositeKey {
  nomeAjustado?: string | null;
  classePT?: string | null;
  emissor?: string | null;
  taxa?: string | null;
  vencimento?: string | null; // YYYY-MM-DD
  liquidez?: string | null;
  active?: boolean;
  observacao?: string | null;
}

export async function postOverride(input: PostOverrideInput): Promise<void> {
  const base = import.meta.env.VITE_VISOR_BRIDGE_URL;
  const secret = import.meta.env.VITE_VISOR_BRIDGE_SECRET;
  if (!base || !secret) {
    throw new Error(
      "VITE_VISOR_BRIDGE_URL/VITE_VISOR_BRIDGE_SECRET ausentes — não foi possível sincronizar com o Journey"
    );
  }

  const res = await fetch(`${base}/api/visor-bridge/override`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-visor-secret": secret,
    },
    body: JSON.stringify(input),
  });

  if (!res.ok) {
    throw new Error(`Falha ao sincronizar override com o Journey (HTTP ${res.status})`);
  }
}

// Não existe verbo DELETE no broker — desativação/exclusão é um POST comum
// com `active: false`, sempre pela chave composta (nunca o id local).
export async function deleteOverride(input: OverrideCompositeKey): Promise<void> {
  await postOverride({ ...input, active: false });
}

/** Linha mínima de `DadosPerformance` necessária pra resolver o profile_id do cliente. */
export interface DadosPerformanceRow {
  Nome?: string | null;
  profile_id?: string | null;
}

/**
 * Resolve o `profile_id` (carimbado pelo motor em DadosPerformance) a partir
 * das linhas do cliente. Devolve `null` quando nenhuma linha do cliente tem
 * profile_id — sinal de que o cliente ainda não foi reconsolidado no motor e
 * o editor de override deve ficar bloqueado.
 */
export function resolveProfileId(
  dadosRows: readonly DadosPerformanceRow[],
  nome: string
): string | null {
  for (const row of dadosRows) {
    if (row.Nome !== nome) continue;
    if (typeof row.profile_id === "string" && row.profile_id.trim() !== "") {
      return row.profile_id;
    }
  }
  return null;
}
