import React, { createContext, useContext, useState } from 'react';
import { usePTAXData } from '@/hooks/usePTAXData';

type Currency = 'BRL' | 'USD';

interface CurrencyContextType {
  currency: Currency;
  setCurrency: (currency: Currency) => void;
  convertValue: (value: number, competencia: string) => number;
  formatCurrency: (value: number) => string;
  getCurrencySymbol: () => string;
}

const CurrencyContext = createContext<CurrencyContextType | undefined>(undefined);

export const CurrencyProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currency, setCurrency] = useState<Currency>('BRL');
  const { ptaxData, getCotacaoByCompetencia } = usePTAXData();

  const convertValue = (value: number, competencia: string): number => {
    if (currency === 'BRL') {
      return value;
    }

    // Para converter para USD: dividir o valor em BRL pela cotação
    const cotacao = getCotacaoByCompetencia(competencia);
    
    if (!cotacao) {
      console.warn(`PTAX cotação não encontrada para competência ${competencia}, mantendo valor em BRL`);
      return value;
    }

    return value / cotacao;
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
