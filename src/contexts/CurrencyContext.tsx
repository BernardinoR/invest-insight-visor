import React, { createContext, useContext, useState } from 'react';
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
  const { ptaxData, getCotacaoByCompetencia } = usePTAXData();

  const getCompetenciaAnterior = (competencia: string): string => {
    const [mes, ano] = competencia.split('/').map(Number);
    if (mes === 1) {
      return `12/${ano - 1}`;
    }
    const mesAnterior = mes - 1;
    return `${String(mesAnterior).padStart(2, '0')}/${ano}`;
  };

  const convertValue = (value: number, competencia: string, originalCurrency: 'BRL' | 'USD'): number => {
    const cotacao = getCotacaoByCompetencia(competencia);
    
    if (!cotacao) {
      console.warn(`PTAX não encontrada para ${competencia}, mantendo valor original`);
      return value;
    }

    // Se moeda original = moeda de exibição, não converter
    if (originalCurrency === currency) {
      return value;
    }

    // BRL → USD: dividir pelo PTAX
    if (originalCurrency === 'BRL' && currency === 'USD') {
      return value / cotacao;
    }

    // USD → BRL: multiplicar pelo PTAX
    if (originalCurrency === 'USD' && currency === 'BRL') {
      return value * cotacao;
    }

    return value;
  };

  const adjustReturnWithFX = (returnPercent: number, competencia: string, originalCurrency: 'BRL' | 'USD'): number => {
    // Se moeda original = moeda de exibição, não ajustar
    if (originalCurrency === currency) {
      return returnPercent;
    }

    const competenciaAnterior = getCompetenciaAnterior(competencia);
    const cotacaoAtual = getCotacaoByCompetencia(competencia);
    const cotacaoAnterior = getCotacaoByCompetencia(competenciaAnterior);

    if (!cotacaoAtual || !cotacaoAnterior) {
      console.warn(`Não foi possível ajustar rendimento para ${competencia}, mantendo valor original`);
      return returnPercent;
    }

    // Variação cambial no mês (decimal, não percentual)
    const fxVariation = (cotacaoAtual - cotacaoAnterior) / cotacaoAnterior;

    // USD → BRL: Adicionar efeito cambial
    if (originalCurrency === 'USD' && currency === 'BRL') {
      // Rendimento em BRL = (1 + rend_USD) * (1 + var_FX) - 1
      return (1 + returnPercent) * (1 + fxVariation) - 1;
    }

    // BRL → USD: Remover efeito cambial
    if (originalCurrency === 'BRL' && currency === 'USD') {
      // Rendimento em USD = (1 + rend_BRL) / (1 + var_FX) - 1
      return ((1 + returnPercent) / (1 + fxVariation)) - 1;
    }

    return returnPercent;
  };

  const formatCurrency = (value: number): string => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: currency === 'BRL' ? 'BRL' : 'USD',
      minimumFractionDigits: 2
    }).format(value);
  };

  const getCurrencySymbol = (): string => {
    return currency === 'BRL' ? 'R$' : '$';
  };

  return (
    <CurrencyContext.Provider value={{
      currency,
      setCurrency,
      convertValue,
      adjustReturnWithFX,
      formatCurrency,
      getCurrencySymbol
    }}>
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
