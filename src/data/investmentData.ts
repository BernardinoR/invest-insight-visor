export interface Investment {
  client: string;
  portfolio: string;
  date: string;
  asset: string;
  value: number;
  strategy: string;
  rate?: string;
  maturity?: string;
  issuer?: string;
  period: string;
  performance: number;
}

export const investmentData: Investment[] = [
  {
    client: "Bianca Monique Soares Marcellini",
    portfolio: "XP Performance",
    date: "20/08/2025",
    asset: "Arx Vinson Advisory FIC de FIF RF CP RL",
    value: 19154.09,
    strategy: "CDI - Fundos",
    period: "08/2025",
    performance: 0.53
  },
  {
    client: "Bianca Monique Soares Marcellini",
    portfolio: "XP Performance",
    date: "20/08/2025",
    asset: "Capitânia Premium 45 FIC de FIF RF CP LP RL",
    value: 22025.01,
    strategy: "CDI - Fundos",
    period: "08/2025",
    performance: 0.40
  },
  {
    client: "Bianca Monique Soares Marcellini",
    portfolio: "XP Performance",
    date: "20/08/2025",
    asset: "CDB AGIBANK - JUN/2026 - 118,50% CDI",
    value: 20178.42,
    strategy: "CDI - Titulos",
    rate: "118,50% CDI",
    maturity: "01/06/2026",
    issuer: "AGIBANK",
    period: "08/2025",
    performance: 0.59
  },
  {
    client: "Bianca Monique Soares Marcellini",
    portfolio: "XP Performance",
    date: "20/08/2025",
    asset: "CDB AGIBANK - JUN/2026 - 121,25% CDI",
    value: 29525.43,
    strategy: "CDI - Titulos",
    rate: "121,25% CDI",
    maturity: "01/06/2026",
    issuer: "AGIBANK",
    period: "08/2025",
    performance: 0.60
  },
  {
    client: "Bianca Monique Soares Marcellini",
    portfolio: "XP Performance",
    date: "20/08/2025",
    asset: "CDB BANCO DIGIMAIS S.A. - NOV/2028 - 121,00% CDI",
    value: 5095.71,
    strategy: "CDI - Titulos",
    rate: "121,00% CDI",
    maturity: "01/11/2028",
    issuer: "BANCO DIGIMAIS S.A.",
    period: "08/2025",
    performance: 0.60
  },
  {
    client: "Bianca Monique Soares Marcellini",
    portfolio: "XP Performance",
    date: "20/08/2025",
    asset: "CDB BANCO MASTER S/A - AGO/2028 - CDI + 2,70%",
    value: 35639.72,
    strategy: "CDI - Titulos",
    rate: "CDI+ 2,70%",
    maturity: "01/08/2028",
    issuer: "BANCO MASTER",
    period: "08/2025",
    performance: 0.59
  },
  {
    client: "Bianca Monique Soares Marcellini",
    portfolio: "XP Performance",
    date: "20/08/2025",
    asset: "CDB PINE - NOV/2026 - CDI + 1,20%",
    value: 16226.25,
    strategy: "CDI - Titulos",
    rate: "CDI+ 1,20%",
    maturity: "01/11/2026",
    issuer: "PINE",
    period: "08/2025",
    performance: 0.54
  },
  {
    client: "Bianca Monique Soares Marcellini",
    portfolio: "XP Performance",
    date: "20/08/2025",
    asset: "LCA BANCO COOPERATIVO SICOOB - MAI/2030 - 95,00% CDI",
    value: 25410.28,
    strategy: "CDI - Titulos",
    rate: "95,00% CDI",
    maturity: "01/05/2030",
    issuer: "BANCO COOPERATIVO SICOOB",
    period: "08/2025",
    performance: 0.56
  },
  {
    client: "Bianca Monique Soares Marcellini",
    portfolio: "XP Performance",
    date: "20/08/2025",
    asset: "CDB AGIBANK - ABR/2028 - IPC-A + 7,00%",
    value: 23402.86,
    strategy: "Inflação - Titulos",
    rate: "IPCA+ 7,00%",
    maturity: "01/04/2028",
    issuer: "AGIBANK",
    period: "08/2025",
    performance: 0.35
  },
  {
    client: "Bianca Monique Soares Marcellini",
    portfolio: "XP Performance",
    date: "20/08/2025",
    asset: "CDB AGIBANK - DEZ/2027 - IPC-A + 6,80%",
    value: 12157.06,
    strategy: "Inflação - Titulos",
    rate: "IPCA+ 6,80%",
    maturity: "01/12/2027",
    issuer: "AGIBANK",
    period: "08/2025",
    performance: 0.34
  },
  {
    client: "Bianca Monique Soares Marcellini",
    portfolio: "XP Performance",
    date: "20/08/2025",
    asset: "SPX Falcon 2 FIC FIA",
    value: 20229.6,
    strategy: "Ações - Long Biased",
    period: "08/2025",
    performance: 4.58
  },
  {
    client: "Bianca Monique Soares Marcellini",
    portfolio: "XP Performance",
    date: "20/08/2025",
    asset: "Western Asset BDR FIF",
    value: 31895.01,
    strategy: "Exterior - Ações",
    period: "08/2025",
    performance: -2.49
  },
  {
    client: "Bianca Monique Soares Marcellini",
    portfolio: "XP Performance",
    date: "20/08/2025",
    asset: "BRCO11",
    value: 531.1,
    strategy: "Imobiliário - Ativos",
    period: "08/2025",
    performance: -2.08
  },
  {
    client: "Bianca Monique Soares Marcellini",
    portfolio: "XP Performance",
    date: "20/08/2025",
    asset: "LVBI11",
    value: 503.2,
    strategy: "Imobiliário - Ativos",
    period: "08/2025",
    performance: 1.04
  }
];

export interface PortfolioSummary {
  patrimonioInicial: number;
  movimentacoes: number;
  impostos: number;
  ganhoFinanceiro: number;
  patrimonioFinal: number;
}

export const portfolioSummary: PortfolioSummary = {
  patrimonioInicial: 802839.65,
  movimentacoes: 40800.00,
  impostos: 0.00,
  ganhoFinanceiro: 848512.74,
  patrimonioFinal: 4873.08
};

export const benchmarkData = [
  { name: 'Jan', portfolio: 4.2, ipca5: 3.8, cdi: 4.1 },
  { name: 'Fev', portfolio: 5.1, ipca5: 4.0, cdi: 4.3 },
  { name: 'Mar', portfolio: 3.8, ipca5: 3.9, cdi: 4.2 },
  { name: 'Abr', portfolio: 6.2, ipca5: 4.1, cdi: 4.4 },
  { name: 'Mai', portfolio: 4.9, ipca5: 4.2, cdi: 4.5 },
  { name: 'Jun', portfolio: 5.5, ipca5: 4.0, cdi: 4.3 },
  { name: 'Jul', portfolio: 4.7, ipca5: 3.9, cdi: 4.2 },
  { name: 'Ago', portfolio: 5.8, ipca5: 4.1, cdi: 4.4 }
];