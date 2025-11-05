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
import { Checkbox } from "@/components/ui/checkbox";

interface InstitutionData {
  institution: string;
  patrimonio: number;
  rendimento: number;
  percentage: number;
  color: string;
  nomeConta?: string;
  moedaOrigem?: string;
}

interface InstitutionAllocationCardProps {
  allInstitutionData: InstitutionData[];
  filteredInstitutionData: InstitutionData[];
  totalPatrimonio: number;
  filteredTotalPatrimonio: number;
  selectedRows?: string[];
  onToggleRow?: (institution: string, account?: string) => void;
}

export function InstitutionAllocationCard({ 
  allInstitutionData,
  filteredInstitutionData,
  totalPatrimonio, 
  filteredTotalPatrimonio,
  selectedRows = [],
  onToggleRow
}: InstitutionAllocationCardProps) {
  const { formatCurrency } = useCurrency();
  
  console.log('🎨 InstitutionAllocationCard - Props recebidas:', {
    allCount: allInstitutionData.length,
    filteredCount: filteredInstitutionData.length,
    totalGeral: totalPatrimonio,
    totalFiltrado: filteredTotalPatrimonio,
    selectedRows
  });

  // Helper to create unique row identifier
  const createRowId = (institution: string, account?: string) => {
    return account ? `${institution}|${account}` : institution;
  };

  const handleCheckboxChange = (institution: string, account?: string) => {
    if (onToggleRow) {
      onToggleRow(institution, account);
    }
  };

  const isRowSelected = (item: InstitutionData) => {
    const rowId = createRowId(item.institution, item.nomeConta);
    return selectedRows.includes(rowId);
  };

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

  if (allInstitutionData.length === 0) return null;

  return (
    <Card className="relative bg-gradient-card border-border/50 shadow-elegant-md mb-8 overflow-visible">
      <CardContent className="pb-4 pt-6">
        {selectedRows.length > 0 && (
          <div className="mb-4 text-sm text-primary font-medium flex flex-wrap gap-2">
            <span>{selectedRows.length} linha(s) selecionada(s)</span>
          </div>
        )}
        {/* Table - takes full width on mobile, left side on desktop */}
        <div className={selectedRows.length > 0 ? "w-full" : "w-full lg:pr-96"}>
          <div className="overflow-x-auto -mx-6 px-6 sm:mx-0 sm:px-0">
            <Table>
              <TableHeader>
                <TableRow className="border-border/50">
                  <TableHead className="text-muted-foreground w-12"></TableHead>
                  <TableHead className="text-muted-foreground">Instituição</TableHead>
                  <TableHead className="text-muted-foreground">Nome da Conta</TableHead>
                  <TableHead className="text-muted-foreground text-center">Moeda Origem</TableHead>
                  <TableHead className="text-muted-foreground text-right">Patrimônio</TableHead>
                  <TableHead className="text-muted-foreground text-right hidden sm:table-cell">% Alocação</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {allInstitutionData.map((item, index) => (
                  <TableRow 
                    key={index}
                    className={`border-border/50 transition-all ${
                      isRowSelected(item)
                        ? 'bg-primary/10' 
                        : ''
                    }`}
                  >
                    <TableCell className="w-12">
                      <Checkbox
                        checked={isRowSelected(item)}
                        onCheckedChange={() => handleCheckboxChange(item.institution, item.nomeConta)}
                        onClick={(e) => e.stopPropagation()}
                      />
                    </TableCell>
                    <TableCell 
                      className="flex items-center gap-2"
                    >
                      <div 
                        className="w-1 h-4 rounded-sm shadow-sm" 
                        style={{ backgroundColor: item.color }}
                      ></div>
                      <span className="font-medium text-foreground">{item.institution}</span>
                    </TableCell>
                    <TableCell 
                      className="text-muted-foreground"
                    >
                      {item.nomeConta || ''}
                    </TableCell>
                    <TableCell 
                      className="text-center"
                    >
                      {item.moedaOrigem === 'Dolar' ? (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300">
                          USD
                        </span>
                      ) : item.moedaOrigem === 'Real' ? (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300">
                          BRL
                        </span>
                      ) : ''}
                    </TableCell>
                    <TableCell 
                      className="text-right text-foreground"
                    >
                      {formatCurrency(item.patrimonio)}
                    </TableCell>
                    <TableCell 
                      className="text-right text-foreground font-medium hidden sm:table-cell"
                    >
                      {totalPatrimonio > 0 
                        ? `${((item.patrimonio / totalPatrimonio) * 100).toFixed(2)}%`
                        : '0.00%'
                      }
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>

        {/* Pie Chart - centered on mobile, absolutely positioned on desktop */}
        <div className={`mt-6 flex flex-col items-center justify-center ${
          selectedRows.length > 0 ? "lg:mt-6" : "lg:mt-0 lg:absolute lg:top-6 lg:right-8 lg:w-80"
        }`}>
          <div className="relative w-full max-w-[320px] sm:max-w-[360px] lg:max-w-[280px]">
            <ResponsiveContainer width="100%" height={280}>
              <PieChart>
                <Pie
                  data={filteredInstitutionData}
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
                  {filteredInstitutionData.map((entry, index) => (
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
                  {formatCurrency(filteredTotalPatrimonio)}
                </div>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
