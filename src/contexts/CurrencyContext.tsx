import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import { usePTAXData } from '@/hooks/usePTAXData';

type Currency = 'BRL' | 'USD';

interface CurrencyContextType {
  currency: Currency;
  setCurrency: (currency: Currency) => void;
  convertValue: (value: number, competencia: string, originalCurrency: 'BRL' | 'USD') => number;
  adjustReturnWithFX: (returnPercent: number, competencia: string, originalCurrency: 'BRL' | 'USD') => number;
  formatCurrency: (value: number) => string;
  getCurrencySymbol: () => string;
}

const CurrencyContext = createContext<CurrencyContextType | undefined>(undefined);

export const CurrencyProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currency, setCurrency] = useState<Currency>('BRL');
  const [conversionCache, setConversionCache] = useState<Map<string, number>>(new Map());
  const { ptaxData, getCotacaoByCompetencia } = usePTAXData();

  // Clear cache when currency changes
  useEffect(() => {
    setConversionCache(new Map());
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
    // Se moeda original = moeda de exibição, não converter
    if (originalCurrency === currency) {
      return value;
    }

    // Check cache
    const cacheKey = `${value}_${competencia}_${originalCurrency}_${currency}`;
    if (conversionCache.has(cacheKey)) {
      return conversionCache.get(cacheKey)!;
    }

    const cotacao = getCotacaoByCompetencia(competencia);
    
    if (!cotacao) {
      return value;
    }

    let converted = value;

    // BRL → USD: dividir pelo PTAX
    if (originalCurrency === 'BRL' && currency === 'USD') {
      converted = value / cotacao;
    }

    // USD → BRL: multiplicar pelo PTAX
    if (originalCurrency === 'USD' && currency === 'BRL') {
      converted = value * cotacao;
    }

    // Store in cache
    conversionCache.set(cacheKey, converted);

    return converted;
  }, [currency, getCotacaoByCompetencia, conversionCache]);

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
    adjustReturnWithFX,
    formatCurrency,
    getCurrencySymbol
  }), [currency, convertValue, adjustReturnWithFX, formatCurrency, getCurrencySymbol]);

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
