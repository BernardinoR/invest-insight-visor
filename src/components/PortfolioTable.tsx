import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

interface PortfolioTableProps {
  selectedClient: string;
}

interface ConsolidadoData {
  id: number;
  "Patrimonio Inicial": number;
  "Movimentação": number;
  "Impostos": number;
  "Ganho Financeiro": number;
  "Patrimonio Final": number;
  "Rendimento": number;
  "Competencia": string;
}

export function PortfolioTable({ selectedClient }: PortfolioTableProps) {
  const [consolidadoData, setConsolidadoData] = useState<ConsolidadoData[]>([]);
  const [loading, setLoading] = useState(false);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
      minimumFractionDigits: 2
    }).format(value || 0);
  };

  useEffect(() => {
    const fetchConsolidadoData = async () => {
      if (!selectedClient) return;
      
      setLoading(true);
      try {
        const { data, error } = await supabase
          .from('ConsolidadoPerformance')
          .select('*')
          .eq('Nome', selectedClient)
          .order('Competencia', { ascending: false });

        if (error) {
          console.error('Erro ao buscar dados consolidados:', error);
          return;
        }

        setConsolidadoData(data || []);
      } catch (error) {
        console.error('Erro ao buscar dados consolidados:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchConsolidadoData();
  }, [selectedClient]);

  return (
    <Card className="bg-gradient-card border-border/50 shadow-elegant-md">
      <CardHeader>
        <CardTitle className="text-foreground">Resumo do Patrimônio</CardTitle>
        <p className="text-sm text-muted-foreground">Evolução patrimonial consolidada</p>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="border-border/50">
                <TableHead className="text-muted-foreground">Competência</TableHead>
                <TableHead className="text-muted-foreground">Patrimônio Inicial</TableHead>
                <TableHead className="text-muted-foreground">Movimentações</TableHead>
                <TableHead className="text-muted-foreground">Impostos</TableHead>
                <TableHead className="text-muted-foreground">Ganho Financeiro</TableHead>
                <TableHead className="text-muted-foreground">Patrimônio Final</TableHead>
                <TableHead className="text-muted-foreground">Retorno %</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center text-muted-foreground">
                    Carregando dados...
                  </TableCell>
                </TableRow>
              ) : consolidadoData.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center text-muted-foreground">
                    Nenhum dado encontrado
                  </TableCell>
                </TableRow>
              ) : (
                consolidadoData.map((item) => (
                  <TableRow key={item.id} className="border-border/50">
                    <TableCell className="font-medium text-foreground">
                      {item.Competencia}
                    </TableCell>
                    <TableCell className="font-medium text-foreground">
                      {formatCurrency(item["Patrimonio Inicial"])}
                    </TableCell>
                    <TableCell className="text-red-600 font-medium">
                      {formatCurrency(item["Movimentação"])}
                    </TableCell>
                    <TableCell className="text-red-600 font-medium">
                      {formatCurrency(item.Impostos)}
                    </TableCell>
                    <TableCell className="text-green-600 font-medium">
                      {formatCurrency(item["Ganho Financeiro"])}
                    </TableCell>
                    <TableCell className="font-medium text-foreground">
                      {formatCurrency(item["Patrimonio Final"])}
                    </TableCell>
                    <TableCell>
                      <span className="bg-yellow-500 text-white px-2 py-1 rounded text-sm font-medium">
                        {((item.Rendimento || 0) * 100).toFixed(2)}%
                      </span>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}