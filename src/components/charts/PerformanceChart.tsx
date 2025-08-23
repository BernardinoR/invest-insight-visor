import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { TrendingUp, Calendar as CalendarIcon } from "lucide-react";
import { useState } from "react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
interface PerformanceChartProps {
  consolidadoData: Array<{
    Data: string;
    "Patrimonio Final": number;
    "Patrimonio Inicial": number;
    "Movimentação": number;
    "Ganho Financeiro": number;
    Rendimento: number;
    Impostos: number;
    Competencia: string;
  }>;
}
export function PerformanceChart({
  consolidadoData
}: PerformanceChartProps) {
  const [selectedPeriod, setSelectedPeriod] = useState<'month' | 'year' | '12months' | 'custom'>('12months');
  const [customStartDate, setCustomStartDate] = useState<Date>();
  const [customEndDate, setCustomEndDate] = useState<Date>();
  const [showCustomCalendar, setShowCustomCalendar] = useState(false);

  // Sort data by competencia date
  const sortedData = [...consolidadoData].sort((a, b) => {
    const [monthA, yearA] = a.Competencia.split('/');
    const [monthB, yearB] = b.Competencia.split('/');
    const dateA = new Date(parseInt(yearA), parseInt(monthA) - 1);
    const dateB = new Date(parseInt(yearB), parseInt(monthB) - 1);
    return dateA.getTime() - dateB.getTime();
  });

  // Filter data based on selected period
  const getFilteredData = () => {
    if (sortedData.length === 0) return [];
    const now = new Date();
    let filteredData = sortedData;
    switch (selectedPeriod) {
      case 'month':
        filteredData = sortedData.slice(-1);
        break;
      case 'year':
        filteredData = sortedData.slice(-12);
        break;
      case '12months':
        filteredData = sortedData.slice(-12);
        break;
      case 'custom':
        if (customStartDate && customEndDate) {
          filteredData = sortedData.filter(item => {
            const [month, year] = item.Competencia.split('/');
            const itemDate = new Date(parseInt(year), parseInt(month) - 1);
            return itemDate >= customStartDate && itemDate <= customEndDate;
          });
        }
        break;
    }
    return filteredData;
  };
  const filteredData = getFilteredData();

  // Calculate accumulated returns with compound interest
  const calculateAccumulatedReturns = (data: typeof filteredData) => {
    if (data.length === 0) return [];
    const result = [];
    let accumulated = 0; // Start at 0%

    // Add zero point one month before the first competencia
    const [firstMonth, firstYear] = data[0].Competencia.split('/');
    const firstDate = new Date(parseInt(firstYear), parseInt(firstMonth) - 1, 1);
    const previousMonth = new Date(firstDate);
    previousMonth.setMonth(previousMonth.getMonth() - 1);

    // Add the zero starting point
    result.push({
      name: previousMonth.toLocaleDateString('pt-BR', {
        month: 'short',
        year: '2-digit'
      }),
      retornoAcumulado: 0,
      retornoMensal: 0,
      competencia: previousMonth.toLocaleDateString('pt-BR', {
        month: '2-digit',
        year: 'numeric'
      })
    });

    // Calculate compound accumulated returns
    data.forEach((item, index) => {
      const [month, year] = item.Competencia.split('/');
      const competenciaDate = new Date(parseInt(year), parseInt(month) - 1, 1);
      const monthlyReturn = Number(item.Rendimento) || 0;

      // Compound interest formula: (1 + accumulated) * (1 + monthly_return) - 1
      accumulated = (1 + accumulated) * (1 + monthlyReturn) - 1;
      result.push({
        name: competenciaDate.toLocaleDateString('pt-BR', {
          month: 'short',
          year: '2-digit'
        }),
        retornoAcumulado: accumulated * 100,
        retornoMensal: monthlyReturn * 100,
        competencia: item.Competencia
      });
    });
    return result;
  };
  const chartData = calculateAccumulatedReturns(filteredData);

  // Calculate optimal Y axis scale for accumulated returns
  const allValues = chartData.map(item => item.retornoAcumulado);
  const minValue = Math.min(...allValues, 0);
  const maxValue = Math.max(...allValues);
  const range = maxValue - minValue;
  const buffer = Math.max(range * 0.2, 1);
  const yAxisMin = minValue - buffer;
  const yAxisMax = maxValue + buffer;
  const generateTicks = (min: number, max: number) => {
    const range = max - min;
    let step;
    if (range <= 5) step = 1;else if (range <= 10) step = 2;else if (range <= 20) step = 5;else step = Math.ceil(range / 8);
    const ticks = [];
    for (let i = Math.floor(min / step) * step; i <= max; i += step) {
      ticks.push(Number(i.toFixed(1)));
    }
    return ticks;
  };
  const yAxisTicks = generateTicks(yAxisMin, yAxisMax);
  const periodButtons = [{
    id: 'month',
    label: 'Mês'
  }, {
    id: 'year',
    label: 'Ano'
  }, {
    id: '12months',
    label: '12M'
  }, {
    id: 'custom',
    label: 'Personalizado'
  }];
  return;
}