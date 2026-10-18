/**
 * Scripbox PMS - Performance Dataset & Compliance Documentation
 * 
 * Provenance & Mathematical Trace:
 * - Source: APMI India (Association of Portfolio Managers in India), As-of November 2025.
 * - Benchmark: Nifty 50 TRI (12.79% reported 4Y figure).
 * - Flagship Strategy: Scripbox Portfolio Optimiser (25.39% reported 4Y figure).
 * 
 * Mathematical Derivation of 4Y Corpus Outcomes:
 * - The values ₹2.47 Cr and ₹1.62 Cr were mathematically derived by treating the APMI figures
 *   as constant 4-year annualised compounding rates (CAGR):
 *     • Scripbox: ₹1.00 Cr × (1 + 0.2539)^4 = ₹2.472 Cr (rounded to ₹2.47 Cr, +147% net growth)
 *     • Benchmark: ₹1.00 Cr × (1 + 0.1279)^4 = ₹1.619 Cr (rounded to ₹1.62 Cr, +62% net growth)
 * 
 * COMPLIANCE WARNING & PROVISIONAL STATUS:
 * - CRITICAL: It has NOT been confirmed whether APMI India reports these figures as annualised
 *   (CAGR) or cumulative absolute returns. If the reported figure is absolute, ₹1 Cr grew to
 *   ₹1.25 Cr, not ₹2.47 Cr.
 * - These figures are PROVISIONAL INTERNAL DATA for layout development only.
 * - They must NOT be published as verified public-facing marketing claims until Scripbox
 *   Compliance formally confirms the calculation methodology.
 */

const PERFORMANCE_DATA = {
  periods: {
    '2Y': {
      id: '2Y',
      label: '2 Years',
      benchmark: 15.44,
      scripbox: 26.78,
      displayBenchmark: '15.4%',
      displayScripbox: '26.8%'
    },
    '3Y': {
      id: '3Y',
      label: '3 Years',
      benchmark: 13.07,
      scripbox: 30.63,
      displayBenchmark: '13.1%',
      displayScripbox: '30.6%'
    },
    '4Y': {
      id: '4Y',
      label: '4 Years',
      benchmark: 12.79,
      scripbox: 25.39,
      displayBenchmark: '12.8%',
      displayScripbox: '25.4%'
    },
    'SI': {
      id: 'SI',
      label: 'Since Inception',
      benchmark: 14.59,
      scripbox: 29.42,
      displayBenchmark: '14.6%',
      displayScripbox: '29.4%'
    }
  },
  defaultPeriod: '4Y',
  sourceText: 'Source: APMI India | As of November, 2025',
  tooltipDisclaimer: 'Past performance is based on historical data and does not guarantee future returns. Investments are subject to market risks.',
  hypothetical4Y: {
    initialCapital: 1.00,
    initialLabel: '₹1.00 Cr',
    benchmarkEndValue: 1.62,
    benchmarkEndLabel: '₹1.62 Cr',
    benchmarkGrowthPct: '+62%',
    benchmarkNetGain: '+₹0.62 Cr',
    scripboxEndValue: 2.47,
    scripboxEndLabel: '₹2.47 Cr',
    scripboxGrowthPct: '+147%',
    scripboxNetGain: '+₹1.47 Cr',
    periodHorizon: '4-Year Horizon',
    asOfDate: 'November 2025',
    disclaimer: 'Hypothetical capital illustration based on the 4-year reported return of Scripbox Portfolio Optimiser (25.4%) vs. Nifty 50 TRI benchmark (12.8%) from an initial hypothetical corpus of ₹1 Crore. Individual portfolio performance may vary based on market conditions, timing of entry, and cash flows.'
  }
};

if (typeof window !== 'undefined') {
  window.PERFORMANCE_DATA = PERFORMANCE_DATA;
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { PERFORMANCE_DATA };
}
