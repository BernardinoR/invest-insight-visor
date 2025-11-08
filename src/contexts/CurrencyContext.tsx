import React, { createContext, useContext, useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { usePTAXData } from '@/hooks/usePTAXData';

type Currency = 'BRL' | 'USD';

interface CurrencyContextType {
  currency: Currency;
  setCurrency: (currency: Currency) => void;
  convertValue: (value: number, competencia: string, originalCurrency: 'BRL' | 'USD') => number;
  convertValuesBatch: (values: Array<{ value: number; competencia: string; originalCurrency: 'BRL' | 'USD' }>) => number[];
  adjustReturnWithFX: (returnPercent: number, competencia: string, originalCurrency: 'BRL' | 'USD') => number;
  convertGanhoFinanceiro: (ganhoFinanceiroOriginal: number, patrimonioInicial: number, competencia: string, originalCurrency: 'BRL' | 'USD') => number;
  getGanhoFinanceiroBreakdown: (ganhoFinanceiroOriginal: number, patrimonioInicial: number, competencia: string, originalCurrency: 'BRL' | 'USD') => { rentabilidade: number; efeitoCambial: number; total: number };
  formatCurrency: (value: number) => string;
  getCurrencySymbol: () => string;
  getCompetenciaAnterior: (competencia: string) => string;
}

const CurrencyContext = createContext<CurrencyContextType | undefined>(undefined);

export const CurrencyProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currency, setCurrency] = useState<Currency>('BRL');
  const conversionCacheRef = useRef<Map<string, number>>(new Map());
  const { ptaxData, getCotacaoByCompetencia } = usePTAXData();

  // Clear cache when currency changes
  useEffect(() => {
    conversionCacheRef.current.clear();
  }, [currency]);

  const getCompetenciaAnterior = useCallback((competencia: string): string => {
    const [mes, ano] = competencia.split('/').map(Number);
    if (mes === 1) {
      return `12/${ano - 1}`;
    }
    const mesAnterior = mes - 1;
    return `${String(mesAnterior).padStart(2, '0')}/${ano}`;
  }, []);

  const convertValue = useCallback((value: number, competencia: string, originalCurrency: 'BRL' | 'USD'): number => {
    if (originalCurrency === currency) {
      return value;
    }

    const cacheKey = `${value}_${competencia}_${originalCurrency}_${currency}`;
    const cache = conversionCacheRef.current;
    
    if (cache.has(cacheKey)) {
      return cache.get(cacheKey)!;
    }

    const cotacao = getCotacaoByCompetencia(competencia);
    
    if (!cotacao) {
      return value;
    }

    let converted = value;

    if (originalCurrency === 'BRL' && currency === 'USD') {
      converted = value / cotacao;
    }

    if (originalCurrency === 'USD' && currency === 'BRL') {
      converted = value * cotacao;
    }

    cache.set(cacheKey, converted);

    return converted;
  }, [currency, getCotacaoByCompetencia]);

  const convertValuesBatch = useCallback((
    values: Array<{ value: number; competencia: string; originalCurrency: 'BRL' | 'USD' }>
  ): number[] => {
    return values.map(({ value, competencia, originalCurrency }) => 
      convertValue(value, competencia, originalCurrency)
    );
  }, [convertValue]);

  const adjustReturnWithFX = useCallback((returnPercent: number, competencia: string, originalCurrency: 'BRL' | 'USD'): number => {
    // Se moeda original = moeda de exibição, não ajustar
    if (originalCurrency === currency) {
      return returnPercent;
    }

    const competenciaAnterior = getCompetenciaAnterior(competencia);
    const cotacaoAtual = getCotacaoByCompetencia(competencia);
    const cotacaoAnterior = getCotacaoByCompetencia(competenciaAnterior);

    if (!cotacaoAtual || !cotacaoAnterior) {
      return returnPercent;
    }

    // Variação cambial no mês (decimal, não percentual)
    const fxVariation = (cotacaoAtual - cotacaoAnterior) / cotacaoAnterior;

    // USD → BRL: Adicionar efeito cambial
    if (originalCurrency === 'USD' && currency === 'BRL') {
      return (1 + returnPercent) * (1 + fxVariation) - 1;
    }

    // BRL → USD: Remover efeito cambial
    if (originalCurrency === 'BRL' && currency === 'USD') {
      return ((1 + returnPercent) / (1 + fxVariation)) - 1;
    }

    return returnPercent;
  }, [currency, getCotacaoByCompetencia, getCompetenciaAnterior]);

  const convertGanhoFinanceiro = useCallback((
    ganhoFinanceiroOriginal: number,
    patrimonioInicial: number,
    competencia: string,
    originalCurrency: 'BRL' | 'USD'
  ): number => {
    // Se moeda original = moeda de exibição, retornar sem conversão
    if (originalCurrency === currency) {
      return ganhoFinanceiroOriginal;
    }

    const competenciaAnterior = getCompetenciaAnterior(competencia);
    const cotacaoAtual = getCotacaoByCompetencia(competencia);
    const cotacaoAnterior = getCotacaoByCompetencia(competenciaAnterior);

    if (!cotacaoAtual || !cotacaoAnterior) {
      // Fallback para conversão simples se não houver cotações
      return convertValue(ganhoFinanceiroOriginal, competencia, originalCurrency);
    }

    // BRL → USD
    if (originalCurrency === 'BRL' && currency === 'USD') {
      return (ganhoFinanceiroOriginal / cotacaoAtual) + 
             (patrimonioInicial * (1/cotacaoAtual - 1/cotacaoAnterior));
    }

    // USD → BRL
    if (originalCurrency === 'USD' && currency === 'BRL') {
      return (ganhoFinanceiroOriginal * cotacaoAtual) + 
             (patrimonioInicial * (cotacaoAtual - cotacaoAnterior));
    }

    return ganhoFinanceiroOriginal;
  }, [currency, getCotacaoByCompetencia, getCompetenciaAnterior, convertValue]);

  const getGanhoFinanceiroBreakdown = useCallback((
    ganhoFinanceiroOriginal: number,
    patrimonioInicial: number,
    competencia: string,
    originalCurrency: 'BRL' | 'USD'
  ): { rentabilidade: number; efeitoCambial: number; total: number } => {
    // Se moeda original = moeda de exibição, não há efeito cambial
    if (originalCurrency === currency) {
      return {
        rentabilidade: ganhoFinanceiroOriginal,
        efeitoCambial: 0,
        total: ganhoFinanceiroOriginal
      };
    }

    const competenciaAnterior = getCompetenciaAnterior(competencia);
    const cotacaoAtual = getCotacaoByCompetencia(competencia);
    const cotacaoAnterior = getCotacaoByCompetencia(competenciaAnterior);

    if (!cotacaoAtual || !cotacaoAnterior) {
      // Fallback: todo como rentabilidade se não houver cotações
      const convertido = convertValue(ganhoFinanceiroOriginal, competencia, originalCurrency);
      return {
        rentabilidade: convertido,
        efeitoCambial: 0,
        total: convertido
      };
    }

    let rentabilidade: number;
    let efeitoCambial: number;

    // BRL → USD
    if (originalCurrency === 'BRL' && currency === 'USD') {
      rentabilidade = ganhoFinanceiroOriginal / cotacaoAtual;
      efeitoCambial = patrimonioInicial * (1/cotacaoAtual - 1/cotacaoAnterior);
    }
    // USD → BRL
    else if (originalCurrency === 'USD' && currency === 'BRL') {
      rentabilidade = ganhoFinanceiroOriginal * cotacaoAtual;
      efeitoCambial = patrimonioInicial * (cotacaoAtual - cotacaoAnterior);
    }
    else {
      rentabilidade = ganhoFinanceiroOriginal;
      efeitoCambial = 0;
    }

    return {
      rentabilidade,
      efeitoCambial,
      total: rentabilidade + efeitoCambial
    };
  }, [currency, getCotacaoByCompetencia, getCompetenciaAnterior, convertValue]);

  const formatCurrency = useCallback((value: number): string => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: currency === 'BRL' ? 'BRL' : 'USD',
      minimumFractionDigits: 2
    }).format(value);
  }, [currency]);

  const getCurrencySymbol = useCallback((): string => {
    return currency === 'BRL' ? 'R$' : '$';
  }, [currency]);

  const contextValue = useMemo(() => ({
    currency,
    setCurrency,
    convertValue,
    convertValuesBatch,
    adjustReturnWithFX,
    convertGanhoFinanceiro,
    getGanhoFinanceiroBreakdown,
    formatCurrency,
    getCurrencySymbol,
    getCompetenciaAnterior
  }), [currency, convertValue, convertValuesBatch, adjustReturnWithFX, convertGanhoFinanceiro, getGanhoFinanceiroBreakdown, formatCurrency, getCurrencySymbol, getCompetenciaAnterior]);

  return (
    <CurrencyContext.Provider value={contextValue}>
      {children}
    </CurrencyContext.Provider>
  );
};

export const useCurrency = () => {
  const context = useContext(CurrencyContext);
  if (context === undefined) {
    throw new Error('useCurrency must be used within a CurrencyProvider');
  }
  return context;
};
