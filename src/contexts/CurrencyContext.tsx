import React, { createContext, useContext, useState, useEffect } from 'react';
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

  // Debug: Log currency changes
  useEffect(() => {
    console.log('💱 Currency changed to:', currency);
    console.log('📊 PTAX data available:', ptaxData.length, 'months');
  }, [currency, ptaxData]);

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
    
    console.log('🔄 convertValue called:', {
      value,
      competencia,
      originalCurrency,
      currentCurrency: currency,
      cotacao,
      ptaxDataLength: ptaxData.length
    });
    
    if (!cotacao) {
      console.warn(`⚠️ PTAX não encontrada para ${competencia}, mantendo valor original`);
      return value;
    }

    // Se moeda original = moeda de exibição, não converter
    if (originalCurrency === currency) {
      console.log(`✅ No conversion needed (${originalCurrency} = ${currency})`);
      return value;
    }

    // BRL → USD: dividir pelo PTAX
    if (originalCurrency === 'BRL' && currency === 'USD') {
      const converted = value / cotacao;
      console.log(`💵 BRL → USD: ${value} / ${cotacao} = ${converted}`);
      return converted;
    }

    // USD → BRL: multiplicar pelo PTAX
    if (originalCurrency === 'USD' && currency === 'BRL') {
      const converted = value * cotacao;
      console.log(`💰 USD → BRL: ${value} * ${cotacao} = ${converted}`);
      return converted;
    }

    return value;
  };

  const adjustReturnWithFX = (returnPercent: number, competencia: string, originalCurrency: 'BRL' | 'USD'): number => {
    // Se moeda original = moeda de exibição, não ajustar
    if (originalCurrency === currency) {
      console.log(`✅ No return adjustment needed (${originalCurrency} = ${currency})`);
      return returnPercent;
    }

    const competenciaAnterior = getCompetenciaAnterior(competencia);
    const cotacaoAtual = getCotacaoByCompetencia(competencia);
    const cotacaoAnterior = getCotacaoByCompetencia(competenciaAnterior);

    console.log('📈 adjustReturnWithFX:', {
      returnPercent,
      competencia,
      competenciaAnterior,
      originalCurrency,
      currentCurrency: currency,
      cotacaoAtual,
      cotacaoAnterior
    });

    if (!cotacaoAtual || !cotacaoAnterior) {
      console.warn(`⚠️ Não foi possível ajustar rendimento para ${competencia}, mantendo valor original`);
      return returnPercent;
    }

    // Variação cambial no mês (decimal, não percentual)
    const fxVariation = (cotacaoAtual - cotacaoAnterior) / cotacaoAnterior;

    // USD → BRL: Adicionar efeito cambial
    if (originalCurrency === 'USD' && currency === 'BRL') {
      // Rendimento em BRL = (1 + rend_USD) * (1 + var_FX) - 1
      const adjusted = (1 + returnPercent) * (1 + fxVariation) - 1;
      console.log(`📊 USD → BRL return: ${returnPercent} + FX ${fxVariation} = ${adjusted}`);
      return adjusted;
    }

    // BRL → USD: Remover efeito cambial
    if (originalCurrency === 'BRL' && currency === 'USD') {
      // Rendimento em USD = (1 + rend_BRL) / (1 + var_FX) - 1
      const adjusted = ((1 + returnPercent) / (1 + fxVariation)) - 1;
      console.log(`📊 BRL → USD return: ${returnPercent} - FX ${fxVariation} = ${adjusted}`);
      return adjusted;
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
