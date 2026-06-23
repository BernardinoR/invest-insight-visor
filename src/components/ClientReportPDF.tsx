import { Document, Page, Text, View, StyleSheet } from "@react-pdf/renderer";

export interface ReportData {
  clientName: string;
  competencia: string; // MM/YYYY
  competenciaLabel: string; // "Junho/2026"
  emittedAt: string;
  mes: {
    patrimonioInicial: number;
    movimentacao: number; // bruto: aportes − resgates (sem deduzir imposto)
    impostos: number; // sempre ≤ 0 (dedução)
    ganho: number;
    rendimentoPct: number;
    patrimonioFinal: number;
    diferencaCheck: number; // PF − (PI + Mov + GF + Imp). ~0 quando bate.
  };

  acumulado: {
    rentabilidadePct: number;
    metaPct: number;
    ipcaPct: number;
    acimaInflacaoPct: number;
    vsMetaPct: number;
    metaLabel: string;
    mesesContados: number;
    primeiraCompetencia: string;
  };
}

const COLOR_TEXT = "#0F172A";
const COLOR_MUTED = "#64748B";
const COLOR_DIVIDER = "#CBD5E1";
const COLOR_DIVIDER_SOFT = "#E2E8F0";
const COLOR_POSITIVE = "#15803D";
const COLOR_NEGATIVE = "#B91C1C";

const styles = StyleSheet.create({
  page: {
    paddingTop: 56,
    paddingBottom: 48,
    paddingHorizontal: 56,
    fontFamily: "Helvetica",
    color: COLOR_TEXT,
  },

  header: { marginBottom: 36 },
  clientName: { fontSize: 18, fontFamily: "Helvetica-Bold", letterSpacing: -0.2 },
  monthLabel: { fontSize: 11, color: COLOR_MUTED, marginTop: 4 },

  table: { marginBottom: 32 },
  tableTitle: {
    fontSize: 9,
    color: COLOR_MUTED,
    letterSpacing: 1.6,
    textTransform: "uppercase",
    marginBottom: 12,
  },
  tableRow: {
    flexDirection: "row",
    alignItems: "baseline",
    paddingVertical: 8,
    borderBottomWidth: 0.5,
    borderBottomColor: COLOR_DIVIDER_SOFT,
  },
  tableLabel: { fontSize: 11, color: COLOR_TEXT, flex: 1 },
  tableMidValue: { fontSize: 11, color: COLOR_TEXT, width: 80, textAlign: "right", marginRight: 16 },
  tableValue: { fontSize: 11, color: COLOR_TEXT, width: 140, textAlign: "right" },

  totalDivider: {
    borderTopWidth: 1,
    borderTopColor: COLOR_DIVIDER,
    marginTop: 2,
  },
  tableTotalRow: {
    flexDirection: "row",
    alignItems: "baseline",
    paddingVertical: 10,
  },
  tableTotalLabel: { fontSize: 11, fontFamily: "Helvetica-Bold", color: COLOR_TEXT, flex: 1 },
  tableTotalValue: { fontSize: 12, fontFamily: "Helvetica-Bold", width: 140, textAlign: "right" },

  footer: {
    position: "absolute",
    bottom: 24,
    left: 56,
    right: 56,
    fontSize: 8,
    color: COLOR_MUTED,
    textAlign: "center",
  },
});

const formatBRL = (v: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v);

const formatPct = (v: number, withSign = false) => {
  const sign = withSign && v > 0 ? "+" : "";
  return `${sign}${(v * 100).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}%`;
};

const pad2 = (n: number) => String(n).padStart(2, "0");

function lastDayOfCompetencia(c: string): string {
  const [m, y] = c.split("/").map(Number);
  const d = new Date(y, m, 0);
  return `${pad2(d.getDate())}/${pad2(d.getMonth() + 1)}/${d.getFullYear()}`;
}

function lastDayOfPreviousMonth(c: string): string {
  const [m, y] = c.split("/").map(Number);
  const d = new Date(y, m - 1, 0);
  return `${pad2(d.getDate())}/${pad2(d.getMonth() + 1)}/${d.getFullYear()}`;
}

function shortDate(ddmmyyyy: string): string {
  // "31/05/2026" → "31/05"
  const [d, m] = ddmmyyyy.split("/");
  return `${d}/${m}`;
}

export function ClientReportPDF({ data }: { data: ReportData }) {
  const { mes, acumulado } = data;

  const dataInicial = lastDayOfPreviousMonth(data.competencia);
  const dataFinal = lastDayOfCompetencia(data.competencia);

  const ganhoColor = mes.ganho >= 0 ? COLOR_POSITIVE : COLOR_NEGATIVE;
  const acimaMetaColor = acumulado.vsMetaPct >= 0 ? COLOR_POSITIVE : COLOR_NEGATIVE;
  const acimaInflColor = acumulado.acimaInflacaoPct >= 0 ? COLOR_POSITIVE : COLOR_NEGATIVE;

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <View style={styles.header}>
          <Text style={styles.clientName}>{data.clientName}</Text>
          <Text style={styles.monthLabel}>{data.competenciaLabel}</Text>
        </View>

        {/* O MÊS */}
        <View style={styles.table}>
          <Text style={styles.tableTitle}>O Mês</Text>

          <View style={styles.tableRow}>
            <Text style={styles.tableLabel}>Patrimônio em {dataInicial}</Text>
            <Text style={styles.tableValue}>{formatBRL(mes.patrimonioInicial)}</Text>
          </View>

          <View style={styles.tableRow}>
            <Text style={styles.tableLabel}>Movimentações</Text>
            {mes.movimentacao === 0 ? (
              <Text style={[styles.tableValue, { color: COLOR_MUTED }]}>—</Text>
            ) : (
              <Text style={styles.tableValue}>{formatBRL(mes.movimentacao)}</Text>
            )}
          </View>

          <View style={styles.tableRow}>
            <Text style={styles.tableLabel}>
              Rendimento ({shortDate(dataInicial)} → {shortDate(dataFinal)})
            </Text>
            <Text style={[styles.tableMidValue, { color: ganhoColor, fontFamily: "Helvetica-Bold" }]}>
              {formatPct(mes.rendimentoPct, true)}
            </Text>
            <Text style={[styles.tableValue, { color: ganhoColor }]}>{formatBRL(mes.ganho)}</Text>
          </View>

          <View style={styles.totalDivider} />
          <View style={styles.tableTotalRow}>
            <Text style={styles.tableTotalLabel}>Patrimônio em {dataFinal}</Text>
            <Text style={styles.tableTotalValue}>{formatBRL(mes.patrimonioFinal)}</Text>
          </View>
        </View>

        {/* DESDE O INÍCIO */}
        <View style={styles.table}>
          <Text style={styles.tableTitle}>
            Desde o início · {acumulado.primeiraCompetencia} · {acumulado.mesesContados} meses
          </Text>

          <View style={styles.tableRow}>
            <Text style={styles.tableLabel}>Carteira</Text>
            <Text style={styles.tableValue}>{formatPct(acumulado.rentabilidadePct)}</Text>
          </View>
          <View style={styles.tableRow}>
            <Text style={styles.tableLabel}>IPCA</Text>
            <Text style={[styles.tableValue, { color: COLOR_MUTED }]}>{formatPct(acumulado.ipcaPct)}</Text>
          </View>
          <View style={styles.tableRow}>
            <Text style={styles.tableLabel}>Meta ({acumulado.metaLabel || "—"})</Text>
            <Text style={[styles.tableValue, { color: COLOR_MUTED }]}>{formatPct(acumulado.metaPct)}</Text>
          </View>

          <View style={styles.totalDivider} />
          <View style={styles.tableTotalRow}>
            <Text style={styles.tableTotalLabel}>Acima da meta</Text>
            <Text style={[styles.tableTotalValue, { color: acimaMetaColor }]}>
              {formatPct(acumulado.vsMetaPct, true)}
            </Text>
          </View>
          <View style={styles.tableTotalRow}>
            <Text style={styles.tableTotalLabel}>Acima da inflação</Text>
            <Text style={[styles.tableTotalValue, { color: acimaInflColor }]}>
              {formatPct(acumulado.acimaInflacaoPct, true)}
            </Text>
          </View>
        </View>

        <Text style={styles.footer} fixed>
          Emitido em {data.emittedAt} · Valores em reais (R$)
        </Text>
      </Page>
    </Document>
  );
}
