import { useState } from "react";
import { Button } from "@/components/ui/button";
import { FileDown, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { pdf } from "@react-pdf/renderer";
import { ClientReportPDF, type ReportData } from "./ClientReportPDF";
import { useToast } from "@/hooks/use-toast";

interface Props {
  clientName: string;
}

const MESES_PT = [
  "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro",
];

const compToDate = (c: string) => {
  const [m, y] = c.split("/").map(Number);
  return new Date(y, m - 1, 1);
};

const sortComps = (a: string, b: string) => compToDate(a).getTime() - compToDate(b).getTime();

const formatCompetenciaLabel = (c: string) => {
  const [m, y] = c.split("/").map(Number);
  return `${MESES_PT[m - 1]}/${y}`;
};

const formatBcbDate = (d: Date) =>
  `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}/${d.getFullYear()}`;

async function fetchIpcaMap(start: Date, end: Date): Promise<Map<string, number>> {
  const url = `https://api.bcb.gov.br/dados/serie/bcdata.sgs.433/dados?formato=json&dataInicial=${formatBcbDate(start)}&dataFinal=${formatBcbDate(end)}`;
  try {
    const r = await fetch(url);
    if (!r.ok) return new Map();
    const arr: Array<{ data: string; valor: string }> = await r.json();
    const map = new Map<string, number>();
    arr.forEach((it) => {
      const [d, m, y] = it.data.split("/");
      const comp = `${m}/${y}`;
      const v = parseFloat(it.valor) / 100;
      if (!isNaN(v)) map.set(comp, v);
    });
    return map;
  } catch {
    return new Map();
  }
}

function parseMetaAnnual(meta: string | null | undefined): { value: number; label: string } {
  if (!meta) return { value: 0, label: "" };
  const match = meta.match(/IPCA\s*\+\s*(\d+(?:[.,]\d+)?)/i);
  if (!match) return { value: 0, label: meta };
  return { value: parseFloat(match[1].replace(",", ".")), label: meta };
}

export function GenerateReportButton({ clientName }: Props) {
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const handleGenerate = async () => {
    setLoading(true);
    try {
      // 1. ConsolidadoPerformance + Meta
      const [{ data: consolidado, error: errC }, { data: pol }] = await Promise.all([
        supabase
          .from("ConsolidadoPerformance")
          .select('Competencia, "Patrimonio Inicial", "Movimentação", "Impostos", "Patrimonio Final", "Ganho Financeiro", Moeda')
          .eq("Nome", clientName)
          .limit(20000),
        supabase
          .from("PoliticaInvestimentos")
          .select('"Meta de Retorno"')
          .eq("Cliente", clientName)
          .limit(1),
      ]);

      if (errC) throw errC;
      if (!consolidado || consolidado.length === 0) {
        toast({ title: "Sem dados", description: "Não há dados consolidados para este cliente.", variant: "destructive" });
        return;
      }

      // Filtrar apenas BRL (relatório v1 em reais)
      const rows = consolidado.filter((r: any) => (r.Moeda ?? "Real") === "Real");
      if (rows.length === 0) {
        toast({ title: "Sem dados em BRL", description: "Apenas posições em moeda estrangeira encontradas.", variant: "destructive" });
        return;
      }

      // Agrupar por competência
      const byComp = new Map<string, { pi: number; mov: number; impostos: number; ganho: number; pf: number }>();
      rows.forEach((r: any) => {
        const c = r.Competencia as string;
        if (!c) return;
        const cur = byComp.get(c) ?? { pi: 0, mov: 0, impostos: 0, ganho: 0, pf: 0 };
        cur.pi += Number(r["Patrimonio Inicial"]) || 0;
        cur.mov += Number(r["Movimentação"]) || 0;
        cur.impostos += Number(r["Impostos"]) || 0;
        cur.ganho += Number(r["Ganho Financeiro"]) || 0;
        cur.pf += Number(r["Patrimonio Final"]) || 0;
        byComp.set(c, cur);
      });


      const comps = Array.from(byComp.keys()).sort(sortComps);
      const ultimaComp = comps[comps.length - 1];
      const primeiraComp = comps[0];
      const ultimo = byComp.get(ultimaComp)!;

      // Rendimento mensal por compet̂encia: ganho / (PI + max(mov, 0)) - aproximação simples e estável
      const rendimentos = comps.map((c) => {
        const v = byComp.get(c)!;
        const base = v.pi + Math.max(0, v.mov);
        return base > 0 ? v.ganho / base : 0;
      });

      const rentAcumulada = rendimentos.reduce((acc, r) => (1 + acc) * (1 + r) - 1, 0);
      const rendMes = rendimentos[rendimentos.length - 1];

      // 2. IPCA
      const ipcaMap = await fetchIpcaMap(compToDate(primeiraComp), compToDate(ultimaComp));

      const ipcasMensais = comps.map((c) => ipcaMap.get(c) ?? 0);
      const ipcaAcumulado = ipcasMensais.reduce((acc, r) => (1 + acc) * (1 + r) - 1, 0);

      // 3. Meta = IPCA + X% a.a. composta mês a mês
      const metaParsed = parseMetaAnnual(pol?.[0]?.["Meta de Retorno"]);
      const monthlyExtra = metaParsed.value > 0 ? Math.pow(1 + metaParsed.value / 100, 1 / 12) - 1 : 0;
      const metaAcumulada = comps.reduce((acc, c) => {
        const ipca = ipcaMap.get(c) ?? 0;
        const mensal = (1 + ipca) * (1 + monthlyExtra) - 1;
        return (1 + acc) * (1 + mensal) - 1;
      }, 0);

      const data: ReportData = {
        clientName,
        competencia: ultimaComp,
        competenciaLabel: formatCompetenciaLabel(ultimaComp),
        emittedAt: new Date().toLocaleDateString("pt-BR"),
        mes: {
          patrimonioInicial: ultimo.pi,
          movimentacao: ultimo.mov,
          ganho: ultimo.ganho,
          rendimentoPct: rendMes,
          patrimonioFinal: ultimo.pf,
        },
        acumulado: {
          rentabilidadePct: rentAcumulada,
          metaPct: metaAcumulada,
          ipcaPct: ipcaAcumulado,
          acimaInflacaoPct: rentAcumulada - ipcaAcumulado,
          vsMetaPct: rentAcumulada - metaAcumulada,
          metaLabel: metaParsed.label,
          mesesContados: comps.length,
          primeiraCompetencia: formatCompetenciaLabel(primeiraComp),
        },
      };


      const blob = await pdf(<ClientReportPDF data={data} />).toBlob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      const safeName = clientName.replace(/[^\w\-]+/g, "_");
      a.href = url;
      a.download = `relatorio-${safeName}-${ultimaComp.replace("/", "-")}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      toast({ title: "Relatório gerado", description: `Relatório de ${formatCompetenciaLabel(ultimaComp)} baixado.` });
    } catch (err) {
      console.error("Erro ao gerar relatório:", err);
      toast({
        title: "Erro ao gerar relatório",
        description: err instanceof Error ? err.message : "Tente novamente.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Button
      variant="outline"
      onClick={handleGenerate}
      disabled={loading}
      className="bg-card/50 border-primary/20 hover:bg-primary/10"
    >
      {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <FileDown className="mr-2 h-4 w-4" />}
      {loading ? "Gerando..." : "Gerar Relatório PDF"}
    </Button>
  );
}
