export const formatCurrency = (value: number, currency: 'BRL' | 'USD') => {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: currency === 'BRL' ? 'BRL' : 'USD',
  }).format(value);
};
