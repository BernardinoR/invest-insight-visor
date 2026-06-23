import { Document, Page, Text, View, StyleSheet } from "@react-pdf/renderer";

export interface ReportData {
  clientName: string;
  competencia: string; // MM/YYYY
  competenciaLabel: string; // "Junho/2026"
  emittedAt: string;
  mes: {
    patrimonioInicial: number;
    movimentacao: number;
    ganho: number;
    rendimentoPct: number;
    patrimonioFinal: number;
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
const COLOR_BORDER = "#E2E8F0";
const COLOR_SOFT_BG = "#F8FAFC";
const COLOR_POSITIVE = "#15803D";
const COLOR_NEGATIVE = "#B91C1C";
const COLOR_ACCENT = "#1E40AF";

const styles = StyleSheet.create({
  page: {
    paddingTop: 52,
    paddingBottom: 44,
    paddingHorizontal: 52,
    fontFamily: "Helvetica",
    color: COLOR_TEXT,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-end",
    borderBottomWidth: 1,
    borderBottomColor: COLOR_BORDER,
    paddingBottom: 18,
    marginBottom: 32,
  },
  clientName: { fontSize: 22, fontFamily: "Helvetica-Bold", letterSpacing: -0.3 },
  reportLabel: { fontSize: 10, color: COLOR_MUTED, marginTop: 6 },
  emittedAt: { fontSize: 9, color: COLOR_MUTED, textAlign: "right" },
  sectionTitle: {
    fontSize: 9,
    color: COLOR_MUTED,
    letterSpacing: 1.4,
    marginBottom: 16,
    textTransform: "uppercase",
  },
  block: { marginBottom: 32 },

  // Anchor (date) row
  anchor: {
    paddingTop: 14,
    paddingBottom: 14,
    borderTopWidth: 1,
    borderTopColor: COLOR_TEXT,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "baseline",
  },
  anchorDate: { fontSize: 14, fontFamily: "Helvetica-Bold", color: COLOR_ACCENT, letterSpacing: 0.4 },
  anchorLabel: { fontSize: 10, color: COLOR_MUTED, textTransform: "uppercase", letterSpacing: 1 },
  anchorValue: { fontSize: 18, fontFamily: "Helvetica-Bold" },

  // Middle (movement + result) block
  middle: {
    backgroundColor: COLOR_SOFT_BG,
    paddingHorizontal: 18,
    paddingVertical: 16,
  },
  middleRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    paddingVertical: 8,
  },
  middleRowDivider: {
    borderTopWidth: 0.5,
    borderTopColor: COLOR_BORDER,
  },
  middleLabel: { fontSize: 11, color: COLOR_TEXT },
  middleSubLabel: { fontSize: 9, color: COLOR_MUTED, marginTop: 2 },
  middleValue: { fontSize: 13, fontFamily: "Helvetica-Bold" },
  middleValueMuted: { fontSize: 13, color: COLOR_MUTED },
  middleResultWrap: { flexDirection: "row", alignItems: "baseline" },
  middleResultPct: { fontSize: 16, fontFamily: "Helvetica-Bold" },
  middleResultBrl: { fontSize: 10, color: COLOR_MUTED, marginLeft: 8 },

  // Accumulated
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 10,
    borderBottomWidth: 0.5,
    borderBottomColor: COLOR_BORDER,
  },
  rowLabel: { fontSize: 11, color: COLOR_TEXT },
  rowValue: { fontSize: 13, fontFamily: "Helvetica-Bold" },
  rowValueMuted: { fontSize: 13, color: COLOR_MUTED },
  highlight: {
    marginTop: 16,
    backgroundColor: COLOR_SOFT_BG,
    padding: 18,
    flexDirection: "row",
    justifyContent: "space-between",
  },
  highlightItem: { flex: 1 },
  highlightLabel: { fontSize: 8, color: COLOR_MUTED, letterSpacing: 1, textTransform: "uppercase", marginBottom: 8 },
  highlightValue: { fontSize: 22, fontFamily: "Helvetica-Bold" },

  footer: {
    position: "absolute",
    bottom: 24,
    left: 52,
    right: 52,
    borderTopWidth: 0.5,
    borderTopColor: COLOR_BORDER,
    paddingTop: 8,
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

// Last day of the competence month (MM/YYYY) → "DD/MM/YYYY"
function lastDayOfCompetencia(c: string): string {
  const [m, y] = c.split("/").map(Number);
  const d = new Date(y, m, 0); // day 0 of next month = last day of m
  return `${pad2(d.getDate())}/${pad2(d.getMonth() + 1)}/${d.getFullYear()}`;
}

// Last day of the month BEFORE the competence → opening balance date
function lastDayOfPreviousMonth(c: string): string {
  const [m, y] = c.split("/").map(Number);
  const d = new Date(y, m - 1, 0); // day 0 of competence month = last day of previous
  return `${pad2(d.getDate())}/${pad2(d.getMonth() + 1)}/${d.getFullYear()}`;
}

export function ClientReportPDF({ data }: { data: ReportData }) {
  const { mes, acumulado } = data;

  const dataInicial = lastDayOfPreviousMonth(data.competencia);
  const dataFinal = lastDayOfCompetencia(data.competencia);

  const ganhoColor = mes.ganho >= 0 ? COLOR_POSITIVE : COLOR_NEGATIVE;
  const acimaInflColor = acumulado.acimaInflacaoPct >= 0 ? COLOR_POSITIVE : COLOR_NEGATIVE;
  const vsMetaColor = acumulado.vsMetaPct >= 0 ? COLOR_POSITIVE : COLOR_NEGATIVE;

  const movLabel =
    mes.movimentacao > 0
      ? "Aportes no mês"
      : mes.movimentacao < 0
      ? "Resgates no mês"
      : "Aportes – Resgates no mês";

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <View style={styles.header}>
          <View>
            <Text style={styles.clientName}>{data.clientName}</Text>
            <Text style={styles.reportLabel}>Relatório de {data.competenciaLabel}</Text>
          </View>
          <Text style={styles.emittedAt}>Emitido em {data.emittedAt}</Text>
        </View>

        <View style={styles.block}>
          <Text style={styles.sectionTitle}>O Mês</Text>

          {/* Anchor 1: opening */}
          <View style={styles.anchor}>
            <View>
              <Text style={styles.anchorDate}>{dataInicial}</Text>
              <Text style={styles.anchorLabel}>Patrimônio</Text>
            </View>
            <Text style={styles.anchorValue}>{formatBRL(mes.patrimonioInicial)}</Text>
          </View>

          {/* Middle: movement + result */}
          <View style={styles.middle}>
            <View style={styles.middleRow}>
              <Text style={styles.middleLabel}>{movLabel}</Text>
              {mes.movimentacao === 0 ? (
                <Text style={styles.middleValueMuted}>Sem movimentação</Text>
              ) : (
                <Text style={styles.middleValue}>{formatBRL(mes.movimentacao)}</Text>
              )}
            </View>

            <View style={[styles.middleRow, styles.middleRowDivider]}>
              <View style={{ flex: 1, paddingRight: 12 }}>
                <Text style={styles.middleLabel}>Resultado financeiro</Text>
                <Text style={styles.middleSubLabel}>
                  de {dataInicial} até {dataFinal}
                </Text>
              </View>
              <View style={styles.middleResultWrap}>
                <Text style={[styles.middleResultPct, { color: ganhoColor }]}>
                  {formatPct(mes.rendimentoPct, true)}
                </Text>
                <Text style={styles.middleResultBrl}>({formatBRL(mes.ganho)})</Text>
              </View>
            </View>
          </View>

          {/* Anchor 2: closing */}
          <View style={styles.anchor}>
            <View>
              <Text style={styles.anchorDate}>{dataFinal}</Text>
              <Text style={styles.anchorLabel}>Patrimônio</Text>
            </View>
            <Text style={styles.anchorValue}>{formatBRL(mes.patrimonioFinal)}</Text>
          </View>
        </View>

        <View style={styles.block}>
          <Text style={styles.sectionTitle}>
            Desde o início ({acumulado.primeiraCompetencia} — {acumulado.mesesContados} meses)
          </Text>

          <View style={styles.row}>
            <Text style={styles.rowLabel}>Rentabilidade acumulada</Text>
            <Text style={styles.rowValue}>{formatPct(acumulado.rentabilidadePct)}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.rowLabel}>Meta acumulada ({acumulado.metaLabel || "—"})</Text>
            <Text style={styles.rowValueMuted}>{formatPct(acumulado.metaPct)}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.rowLabel}>IPCA acumulado</Text>
            <Text style={styles.rowValueMuted}>{formatPct(acumulado.ipcaPct)}</Text>
          </View>

          <View style={styles.highlight}>
            <View style={styles.highlightItem}>
              <Text style={styles.highlightLabel}>Acima da inflação</Text>
              <Text style={[styles.highlightValue, { color: acimaInflColor }]}>
                {formatPct(acumulado.acimaInflacaoPct, true)}
              </Text>
            </View>
            <View style={styles.highlightItem}>
              <Text style={styles.highlightLabel}>Vs. meta</Text>
              <Text style={[styles.highlightValue, { color: vsMetaColor }]}>
                {formatPct(acumulado.vsMetaPct, true)}
              </Text>
            </View>
          </View>
        </View>

        <Text style={styles.footer} fixed>
          Relatório gerado automaticamente. Valores em reais (R$).
        </Text>
      </Page>
    </Document>
  );
}
