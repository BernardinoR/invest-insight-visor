import { Document, Page, Text, View, StyleSheet, Svg, Polyline, Line as SvgLine } from "@react-pdf/renderer";

export interface ReportData {
  clientName: string;
  competencia: string; // MM/YYYY
  competenciaLabel: string; // "Abril/2026"
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
  serie: Array<{ competencia: string; patrimonio: number }>;
}

const COLOR_TEXT = "#0F172A";
const COLOR_MUTED = "#64748B";
const COLOR_BORDER = "#E2E8F0";
const COLOR_POSITIVE = "#15803D";
const COLOR_NEGATIVE = "#B91C1C";
const COLOR_ACCENT = "#1E40AF";

const styles = StyleSheet.create({
  page: {
    paddingTop: 48,
    paddingBottom: 36,
    paddingHorizontal: 48,
    fontFamily: "Helvetica",
    color: COLOR_TEXT,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-end",
    borderBottomWidth: 1,
    borderBottomColor: COLOR_BORDER,
    paddingBottom: 16,
    marginBottom: 28,
  },
  clientName: { fontSize: 20, fontFamily: "Helvetica-Bold" },
  reportLabel: { fontSize: 10, color: COLOR_MUTED, marginTop: 4 },
  emittedAt: { fontSize: 9, color: COLOR_MUTED, textAlign: "right" },
  sectionTitle: {
    fontSize: 9,
    color: COLOR_MUTED,
    letterSpacing: 1.2,
    marginBottom: 12,
    textTransform: "uppercase",
  },
  block: { marginBottom: 28 },
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
  rowValuePositive: { fontSize: 13, fontFamily: "Helvetica-Bold", color: COLOR_POSITIVE },
  rowValueNegative: { fontSize: 13, fontFamily: "Helvetica-Bold", color: COLOR_NEGATIVE },
  highlight: {
    marginTop: 14,
    backgroundColor: "#F8FAFC",
    padding: 16,
    flexDirection: "row",
    justifyContent: "space-between",
  },
  highlightItem: { flex: 1 },
  highlightLabel: { fontSize: 8, color: COLOR_MUTED, letterSpacing: 1, textTransform: "uppercase", marginBottom: 6 },
  highlightValue: { fontSize: 22, fontFamily: "Helvetica-Bold" },
  chartCaption: { fontSize: 8, color: COLOR_MUTED, marginTop: 6 },
  footer: {
    position: "absolute",
    bottom: 24,
    left: 48,
    right: 48,
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

function ChartPatrimonio({ serie }: { serie: ReportData["serie"] }) {
  const width = 500;
  const height = 160;
  const padL = 8;
  const padR = 8;
  const padT = 8;
  const padB = 20;

  if (serie.length < 2) {
    return (
      <Text style={{ fontSize: 10, color: COLOR_MUTED }}>
        Histórico insuficiente para exibir gráfico.
      </Text>
    );
  }

  const values = serie.map((s) => s.patrimonio);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;

  const innerW = width - padL - padR;
  const innerH = height - padT - padB;

  const points = serie
    .map((s, i) => {
      const x = padL + (i / (serie.length - 1)) * innerW;
      const y = padT + innerH - ((s.patrimonio - min) / range) * innerH;
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(" ");

  const firstLabel = serie[0].competencia;
  const lastLabel = serie[serie.length - 1].competencia;

  return (
    <View>
      <Svg width={width} height={height} viewBox={`0 0 ${width} ${height}`}>
        <SvgLine
          x1={padL}
          y1={padT + innerH}
          x2={padL + innerW}
          y2={padT + innerH}
          stroke={COLOR_BORDER}
          strokeWidth={0.5}
        />
        <Polyline
          points={points}
          fill="none"
          stroke={COLOR_ACCENT}
          strokeWidth={1.5}
        />
      </Svg>
      <View style={{ flexDirection: "row", justifyContent: "space-between", marginTop: 4 }}>
        <Text style={styles.chartCaption}>{firstLabel}</Text>
        <Text style={styles.chartCaption}>{lastLabel}</Text>
      </View>
    </View>
  );
}

export function ClientReportPDF({ data }: { data: ReportData }) {
  const { mes, acumulado } = data;
  const ganhoStyle = mes.ganho >= 0 ? styles.rowValuePositive : styles.rowValueNegative;
  const acimaInflStyle = acumulado.acimaInflacaoPct >= 0 ? { color: COLOR_POSITIVE } : { color: COLOR_NEGATIVE };
  const vsMetaStyle = acumulado.vsMetaPct >= 0 ? { color: COLOR_POSITIVE } : { color: COLOR_NEGATIVE };

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

          <View style={styles.row}>
            <Text style={styles.rowLabel}>Patrimônio inicial</Text>
            <Text style={styles.rowValue}>{formatBRL(mes.patrimonioInicial)}</Text>
          </View>

          <View style={styles.row}>
            <Text style={styles.rowLabel}>
              {mes.movimentacao > 0 ? "Aporte no mês" : mes.movimentacao < 0 ? "Resgate no mês" : "Movimentação no mês"}
            </Text>
            {mes.movimentacao === 0 ? (
              <Text style={styles.rowValueMuted}>Sem movimentação</Text>
            ) : (
              <Text style={styles.rowValue}>{formatBRL(mes.movimentacao)}</Text>
            )}
          </View>

          <View style={styles.row}>
            <Text style={styles.rowLabel}>Ganho financeiro</Text>
            <Text style={ganhoStyle}>
              {formatBRL(mes.ganho)}  ({formatPct(mes.rendimentoPct, true)})
            </Text>
          </View>

          <View style={[styles.row, { borderBottomWidth: 0, paddingTop: 14 }]}>
            <Text style={[styles.rowLabel, { fontFamily: "Helvetica-Bold" }]}>Patrimônio final</Text>
            <Text style={[styles.rowValue, { fontSize: 16 }]}>{formatBRL(mes.patrimonioFinal)}</Text>
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
              <Text style={[styles.highlightValue, acimaInflStyle]}>
                {formatPct(acumulado.acimaInflacaoPct, true)}
              </Text>
            </View>
            <View style={styles.highlightItem}>
              <Text style={styles.highlightLabel}>Vs. meta</Text>
              <Text style={[styles.highlightValue, vsMetaStyle]}>
                {formatPct(acumulado.vsMetaPct, true)}
              </Text>
            </View>
          </View>
        </View>

        <View style={styles.block}>
          <Text style={styles.sectionTitle}>Evolução do Patrimônio</Text>
          <ChartPatrimonio serie={data.serie} />
        </View>

        <Text style={styles.footer}>
          Relatório gerado automaticamente. Valores em reais (R$).
        </Text>
      </Page>
    </Document>
  );
}
