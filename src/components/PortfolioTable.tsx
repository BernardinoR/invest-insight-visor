import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { portfolioSummary } from "@/data/investmentData";

export function PortfolioTable() {
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
      minimumFractionDigits: 2
    }).format(value);
  };

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
                <TableHead className="text-muted-foreground">Patrimônio Inicial</TableHead>
                <TableHead className="text-muted-foreground">Movimentações</TableHead>
                <TableHead className="text-muted-foreground">Impostos</TableHead>
                <TableHead className="text-muted-foreground">Ganho Financeiro</TableHead>
                <TableHead className="text-muted-foreground">Patrimônio Final</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              <TableRow className="border-border/50">
                <TableCell className="font-medium text-foreground">
                  {formatCurrency(portfolioSummary.patrimonioInicial)}
                </TableCell>
                <TableCell className="text-info">
                  {formatCurrency(portfolioSummary.movimentacoes)}
                </TableCell>
                <TableCell className="text-muted-foreground">
                  {formatCurrency(portfolioSummary.impostos)}
                </TableCell>
                <TableCell className="text-success">
                  {formatCurrency(portfolioSummary.ganhoFinanceiro)}
                </TableCell>
                <TableCell className="font-bold text-primary">
                  {formatCurrency(portfolioSummary.patrimonioFinal)}
                </TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}