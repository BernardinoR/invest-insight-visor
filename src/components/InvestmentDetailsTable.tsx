import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";

export function InvestmentDetailsTable() {
  const getPerformanceBadge = (performance: number) => {
    if (performance > 2) {
      return <Badge className="bg-success/20 text-success border-success/30">Excelente</Badge>;
    } else if (performance > 0.5) {
      return <Badge className="bg-info/20 text-info border-info/30">Bom</Badge>;
    } else if (performance > 0) {
      return <Badge className="bg-warning/20 text-warning border-warning/30">Regular</Badge>;
    } else {
      return <Badge className="bg-destructive/20 text-destructive border-destructive/30">Negativo</Badge>;
    }
  };

  return (
    <Card className="bg-gradient-card border-border/50 shadow-elegant-md">
      <CardHeader>
        <CardTitle className="text-foreground">Detalhamento dos Investimentos</CardTitle>
        <p className="text-sm text-muted-foreground">Posições consolidadas por estratégia</p>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="border-border/50">
                <TableHead className="text-muted-foreground">Estratégia</TableHead>
                <TableHead className="text-muted-foreground">Patrimônio</TableHead>
                <TableHead className="text-muted-foreground">Participação</TableHead>
                <TableHead className="text-muted-foreground">Performance</TableHead>
                <TableHead className="text-muted-foreground">Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              <TableRow className="border-border/50">
                <TableCell className="font-medium text-foreground">CDI - Fundos</TableCell>
                <TableCell className="text-foreground">R$ 123.456,78</TableCell>
                <TableCell className="text-muted-foreground">14.6%</TableCell>
                <TableCell className="text-success">+0.48%</TableCell>
                <TableCell>{getPerformanceBadge(0.48)}</TableCell>
              </TableRow>
              <TableRow className="border-border/50">
                <TableCell className="font-medium text-foreground">Inflação - Títulos</TableCell>
                <TableCell className="text-foreground">R$ 249.837,93</TableCell>
                <TableCell className="text-muted-foreground">29.4%</TableCell>
                <TableCell className="text-success">+6.95%</TableCell>
                <TableCell>{getPerformanceBadge(6.95)}</TableCell>
              </TableRow>
              <TableRow className="border-border/50">
                <TableCell className="font-medium text-foreground">Pré-Fixado - Títulos</TableCell>
                <TableCell className="text-foreground">R$ 165.913,91</TableCell>
                <TableCell className="text-muted-foreground">19.6%</TableCell>
                <TableCell className="text-success">+13.02%</TableCell>
                <TableCell>{getPerformanceBadge(13.02)}</TableCell>
              </TableRow>
              <TableRow className="border-border/50">
                <TableCell className="font-medium text-foreground">Ações - Long Biased</TableCell>
                <TableCell className="text-foreground">R$ 68.465,18</TableCell>
                <TableCell className="text-muted-foreground">8.1%</TableCell>
                <TableCell className="text-success">+4.58%</TableCell>
                <TableCell>{getPerformanceBadge(4.58)}</TableCell>
              </TableRow>
              <TableRow className="border-border/50">
                <TableCell className="font-medium text-foreground">Imobiliário - Ativos</TableCell>
                <TableCell className="text-foreground">R$ 7.340,17</TableCell>
                <TableCell className="text-muted-foreground">0.9%</TableCell>
                <TableCell className="text-destructive">-0.83%</TableCell>
                <TableCell>{getPerformanceBadge(-0.83)}</TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}