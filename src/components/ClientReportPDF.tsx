import { Document, Page, Text, View, StyleSheet } from "@react-pdf/renderer";

export interface ReportData {
  clientName: string;
  competencia: string; // MM/YYYY
  competenciaLabel: string; // "Junho/2026"
  emittedAt: string;
  mes: {
    patrimonioInicial: number;
    movimentacao: number; // já líquido de impostos
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
const COLOR_DIVIDER = "#E2E8F0";
const COLOR_POSITIVE = "#15803D";
const COLOR_NEGATIVE = "#B91C1C";

const styles = StyleSheet.create({
  page: {
    paddingTop: 64,
    paddingBottom: 56,
    paddingHorizontal: 64,
    fontFamily: "Helvetica",
    color: COLOR_TEXT,
  },

  header: { marginBottom: 48 },
  clientName: { fontSize: 18, fontFamily: "Helvetica-Bold", letterSpacing: -0.2 },
  monthLabel: { fontSize: 11, color: COLOR_MUTED, marginTop: 4 },

  block: { marginBottom: 28 },

  eyebrow: {
    fontSize: 9,
    color: COLOR_MUTED,
    letterSpacing: 1.6,
    textTransform: "uppercase",
    marginBottom: 8,
  },
  bigNumber: {
    fontSize: 30,
    fontFamily: "Helvetica-Bold",
    letterSpacing: -0.6,
  },
  sentence: {
    fontSize: 12,
    color: COLOR_TEXT,
    lineHeight: 1.5,
  },
  sentenceMuted: {
    fontSize: 10,
    color: COLOR_MUTED,
    marginTop: 2,
    lineHeight: 1.4,
  },
  rendeuRow: {
    flexDirection: "row",
    alignItems: "baseline",
    marginTop: 4,
  },
  rendeuLabel: { fontSize: 12, color: COLOR_TEXT, marginRight: 10 },
  rendeuPct: { fontSize: 18, fontFamily: "Helvetica-Bold", marginRight: 12 },
  rendeuBrl: { fontSize: 11, color: COLOR_MUTED },

  divider: {
    borderTopWidth: 0.5,
    borderTopColor: COLOR_DIVIDER,
    marginVertical: 36,
  },

  accRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "baseline",
    paddingVertical: 8,
  },
  accLabel: { fontSize: 12, color: COLOR_TEXT },
  accValue: { fontSize: 13, fontFamily: "Helvetica-Bold" },
  accValueMuted: { fontSize: 13, color: COLOR_MUTED },

  conclusion: {
    marginTop: 32,
    fontSize: 16,
    fontFamily: "Helvetica-Bold",
    letterSpacing: -0.2,
    lineHeight: 1.4,
  },

  footer: {
    position: "absolute",
    bottom: 28,
    left: 64,
    right: 64,
    fontSize: 8,
    color: COLOR_MUTED,
    textAlign: "center",
  },
});

const formatBRL = (v: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v);

const formatBRLAbs = (v: number) => formatBRL(Math.abs(v));

const formatPct = (v: number, withSign = false) => {
  const sign = withSign && v > 0 ? "+" : "";
  return `${sign}${(v * 100).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}%`;
};

export function ClientReportPDF({ data }: { data: ReportData }) {
  const { mes, acumulado } = data;

  const ganhoColor = mes.ganho >= 0 ? COLOR_POSITIVE : COLOR_NEGATIVE;
  const acimaInflColor = acumulado.acimaInflacaoPct >= 0 ? COLOR_POSITIVE : COLOR_NEGATIVE;

  // Frase da movimentação
  let movSentence: { main: string; sub: string } | null = null;
  if (mes.movimentacao > 0) {
    movSentence = {
      main: `Teve ${formatBRLAbs(mes.movimentacao)} de aportes`,
      sub: "(já descontando resgates e impostos)",
    };
  } else if (mes.movimentacao < 0) {
    movSentence = {
      main: `Teve ${formatBRLAbs(mes.movimentacao)} de saídas`,
      sub: "(resgates e impostos, descontados de aportes)",
    };
  } else {
    movSentence = { main: "Não teve aportes nem resgates no mês", sub: "" };
  }

  const acimaAbs = Math.abs(acumulado.acimaInflacaoPct * 100).toLocaleString("pt-BR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  const conclusionText =
    acumulado.acimaInflacaoPct >= 0
      ? `Você está ${acimaAbs}% acima da inflação.`
      : `Você está ${acimaAbs}% abaixo da inflação.`;

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <View style={styles.header}>
          <Text style={styles.clientName}>{data.clientName}</Text>
          <Text style={styles.monthLabel}>{data.competenciaLabel}</Text>
        </View>

        <View style={styles.block}>
          <Text style={styles.eyebrow}>Você começou o mês com</Text>
          <Text style={styles.bigNumber}>{formatBRL(mes.patrimonioInicial)}</Text>
        </View>

        <View style={styles.block}>
          <Text style={styles.sentence}>{movSentence.main}</Text>
          {movSentence.sub ? <Text style={styles.sentenceMuted}>{movSentence.sub}</Text> : null}

          <View style={styles.rendeuRow}>
            <Text style={styles.rendeuLabel}>Rendeu</Text>
            <Text style={[styles.rendeuPct, { color: ganhoColor }]}>
              {formatPct(mes.rendimentoPct, true)}
            </Text>
            <Text style={styles.rendeuBrl}>{formatBRL(mes.ganho)}</Text>
          </View>
        </View>

        <View style={styles.block}>
          <Text style={styles.eyebrow}>E fechou o mês com</Text>
          <Text style={styles.bigNumber}>{formatBRL(mes.patrimonioFinal)}</Text>
        </View>

        <View style={styles.divider} />

        <View>
          <Text style={styles.eyebrow}>
            Desde o início ({acumulado.primeiraCompetencia} · {acumulado.mesesContados} meses)
          </Text>

          <View style={styles.accRow}>
            <Text style={styles.accLabel}>Sua carteira rendeu</Text>
            <Text style={styles.accValue}>{formatPct(acumulado.rentabilidadePct)}</Text>
          </View>
          <View style={styles.accRow}>
            <Text style={styles.accLabel}>A inflação (IPCA) foi</Text>
            <Text style={styles.accValueMuted}>{formatPct(acumulado.ipcaPct)}</Text>
          </View>
          <View style={styles.accRow}>
            <Text style={styles.accLabel}>Sua meta era ({acumulado.metaLabel || "—"})</Text>
            <Text style={styles.accValueMuted}>{formatPct(acumulado.metaPct)}</Text>
          </View>

          <Text style={[styles.conclusion, { color: acimaInflColor }]}>{conclusionText}</Text>
        </View>

        <Text style={styles.footer} fixed>
          Emitido em {data.emittedAt} · Valores em reais (R$)
        </Text>
      </Page>
    </Document>
  );
}
