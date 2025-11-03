import { Card, CardContent } from "@/components/ui/card";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import { useCurrency } from "@/contexts/CurrencyContext";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Filter } from "lucide-react";

interface InstitutionData {
  institution: string;
  patrimonio: number;
  rendimento: number;
  percentage: number;
  color: string;
}

interface InstitutionAllocationCardProps {
  institutionData: InstitutionData[];
  totalPatrimonio: number;
  selectedInstitution?: string | null;
  onInstitutionClick?: (institution: string) => void;
}

export function InstitutionAllocationCard({ 
  institutionData, 
  totalPatrimonio, 
  selectedInstitution,
  onInstitutionClick 
}: InstitutionAllocationCardProps) {
  const { formatCurrency } = useCurrency();

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-card border border-border rounded-lg p-3 shadow-elegant-md backdrop-blur-sm">
          <p className="text-foreground font-semibold">{data.institution}</p>
          <p className="text-primary text-sm">
            {formatCurrency(data.patrimonio)}
          </p>
          <p className="text-muted-foreground text-xs">
            {data.percentage.toFixed(2)}% do patrimônio
          </p>
        </div>
      );
    }
    return null;
  };

  if (institutionData.length === 0) return null;

  return (
    <Card className="relative bg-gradient-card border-border/50 shadow-elegant-md mb-8 overflow-visible">
      <CardContent className="pb-4 pt-6">
        {selectedInstitution && (
          <div className="mb-4 text-sm text-primary font-medium">
            Filtrando: {selectedInstitution}
          </div>
        )}
        {/* Table - takes full width on mobile, left side on desktop */}
        <div className={selectedInstitution ? "w-full" : "w-full lg:pr-96"}>
          <div className="overflow-x-auto -mx-6 px-6 sm:mx-0 sm:px-0">
            <Table>
              <TableHeader>
                <TableRow className="border-border/50">
                  <TableHead className="text-muted-foreground">Instituição</TableHead>
                  <TableHead className="text-muted-foreground text-right">Patrimônio</TableHead>
                  <TableHead className="text-muted-foreground text-right hidden sm:table-cell">% Alocação</TableHead>
                  <TableHead className="text-muted-foreground text-center w-16"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {institutionData.map((item, index) => (
                  <TableRow 
                    key={index} 
                    className={`border-border/50 transition-colors ${
                      selectedInstitution === item.institution 
                        ? 'bg-primary/10' 
                        : 'hover:bg-muted/20'
                    }`}
                  >
                    <TableCell 
                      className="flex items-center gap-2 cursor-pointer"
                      onClick={() => onInstitutionClick?.(item.institution)}
                    >
                      <div 
                        className="w-1 h-4 rounded-sm shadow-sm" 
                        style={{ backgroundColor: item.color }}
                      ></div>
                      <span className="font-medium text-foreground">{item.institution}</span>
                    </TableCell>
                    <TableCell 
                      className="text-right text-foreground cursor-pointer"
                      onClick={() => onInstitutionClick?.(item.institution)}
                    >
                      {formatCurrency(item.patrimonio)}
                    </TableCell>
                    <TableCell 
                      className="text-right text-foreground font-medium cursor-pointer hidden sm:table-cell"
                      onClick={() => onInstitutionClick?.(item.institution)}
                    >
                      {totalPatrimonio > 0 
                        ? `${((item.patrimonio / totalPatrimonio) * 100).toFixed(2)}%`
                        : '0.00%'
                      }
                    </TableCell>
                    <TableCell className="text-center">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onInstitutionClick?.(item.institution);
                        }}
                        className={`p-2 rounded-lg transition-all hover:bg-accent/80 ${
                          selectedInstitution === item.institution 
                            ? 'bg-primary/20 text-primary' 
                            : 'text-muted-foreground hover:text-foreground'
                        }`}
                        title={selectedInstitution === item.institution ? "Remover filtro" : `Filtrar por ${item.institution}`}
                      >
                        <Filter className="h-4 w-4" />
                      </button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>

        {/* Pie Chart - centered on mobile, absolutely positioned on desktop */}
        <div className={`mt-6 flex flex-col items-center justify-center ${
          selectedInstitution ? "lg:mt-6" : "lg:mt-0 lg:absolute lg:top-6 lg:right-8 lg:w-80"
        }`}>
          <div className="relative w-full max-w-[320px] sm:max-w-[360px] lg:max-w-[280px]">
            <ResponsiveContainer width="100%" height={280}>
              <PieChart>
                <Pie
                  data={institutionData}
                  cx="50%"
                  cy="50%"
                  innerRadius={75}
                  outerRadius={92}
                  paddingAngle={3}
                  dataKey="patrimonio"
                  stroke="none"
                  strokeWidth={0}
                  animationBegin={0}
                  animationDuration={800}
                >
                  {institutionData.map((entry, index) => (
                    <Cell 
                      key={`cell-${index}`} 
                      fill={entry.color}
                      className="transition-all duration-300 hover:opacity-95"
                    />
                  ))}
                </Pie>
                <Tooltip content={<CustomTooltip />} />
              </PieChart>
            </ResponsiveContainer>
            
            {/* Center Content */}
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <div className="text-center">
                <div className="text-xs text-muted-foreground/50 mb-1 font-light">
                  Patrimônio Bruto
                </div>
                <div className="text-xl font-semibold text-foreground">
                  {formatCurrency(totalPatrimonio)}
                </div>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
