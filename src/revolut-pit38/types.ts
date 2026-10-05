export const TAX_RATE = 0.19;

// --- Raw parsed data from CSV ---

export interface SellRecord {
    buyDate: Date;
    sellDate: Date;
    ticker: string;
    isin: string;
    quantity: number;
    costBasisOriginal: number; // in original currency (e.g. EUR)
    grossProceedsOriginal: number; // in original currency
    feesOriginal: number; // sell-side fees in original currency
    currency: string; // e.g. 'EUR', 'USD'
}

export interface RawDividend {
    date: Date;
    ticker: string;
    isin: string;
    grossAmountOriginal: number; // gross dividend in original currency
    withholdingTaxOriginal: number; // tax withheld at source in original currency
    currency: string;
}

export interface SavingsInterestTransaction {
    date: Date;
    currency: string;
    amount: number; // in original currency
}

// --- Calculated results (enriched with all raw values for full auditability) ---

export interface TradeResult {
    // Identyfikacja
    ticker: string;
    isin: string;
    buyDate: Date;
    sellDate: Date;
    quantity: number;
    currency: string;
    // Wartości oryginalne (w walucie obcej)
    costBasisOriginal: number;
    grossProceedsOriginal: number;
    feesOriginal: number;
    // Kursy NBP (art. 30e updof — dzień poprzedzający transakcję)
    nbpBuyRate: number;
    nbpBuyEffectiveDate: string; // YYYY-MM-DD — data kursu faktycznie zastosowanego
    nbpSellRate: number;
    nbpSellEffectiveDate: string; // YYYY-MM-DD
    // Przeliczone wartości (PLN)
    costPln: number; // koszty = costBasis × nbpBuyRate + fees × nbpSellRate
    feesPln: number; // prowizja × nbpSellRate
    revenuePln: number; // przychód = grossProceeds × nbpSellRate
    gainPln: number; // dochód/strata = revenue − cost
}

export interface DividendResult {
    // Identyfikacja
    ticker: string;
    isin: string;
    date: Date;
    currency: string;
    // Wartości oryginalne (w walucie obcej)
    grossAmountOriginal: number;
    withholdingTaxOriginal: number;
    // Kurs NBP
    nbpRate: number;
    nbpEffectiveDate: string; // YYYY-MM-DD
    // Przeliczone wartości (PLN)
    grossAmountPln: number; // brutto = grossAmount × nbpRate
    withholdingTaxPln: number; // podatek u źródła × nbpRate
    polishTaxDue: number; // 19% × grossAmountPln
    taxCredit: number; // min(polishTaxDue, withholdingTaxPln)
    netTaxOwed: number; // polishTaxDue − taxCredit
}

export interface SavingsInterestTaxDetail {
    date: Date;
    currency: string;
    amountOriginal: number; // kwota odsetek w walucie oryginalnej
    nbpEffectiveDate: string; // YYYY-MM-DD (dla PLN = data transakcji)
    nbpRate: number; // 1.0 dla PLN
    amountPln: number; // amountOriginal × nbpRate
    taxPln: number; // amountPln × 19%
}

export interface SavingsInterestTaxResult {
    currency: string;
    details: SavingsInterestTaxDetail[];
    totalInterestPln: number;
    totalTax: number; // 19% × totalInterestPln
}

// --- Final tax report (maps to PIT-38 form fields) ---

export interface TaxReport {
    year: number;

    // Sekcja C — Zyski ze sprzedaży papierów wartościowych
    przychod: number; // Poz. 22 — łączny przychód ze sprzedaży (PLN)
    koszty: number; // Poz. 23 — łączne koszty uzyskania (PLN)
    dochodLubStrata: number; // Poz. 24 (≥ 0, dochód) lub Poz. 25 (< 0, strata)
    podatekOdZyskow: number; // Poz. 31 = max(dochód, 0) × 19%

    // Sekcja G — Dywidendy zagraniczne
    dywidendy: number; // Poz. 45 — łączne dywidendy brutto (PLN)
    podatekNaleznyOdDywidend: number; // Poz. 47 = dywidendy × 19%
    podatekZaplaconyZaGranica: number; // Poz. 48 — podatek potrącony za granicą
    ulgaNaPodatekZagraniczny: number; // Poz. 49 = min(Poz. 47, Poz. 48)
    podatekDoZaplatyOdDywidend: number; // Poz. 47 − Poz. 49

    // Sekcja F — Odsetki z rachunków bankowych (art. 30a ust. 1 pkt 3 updof)
    podatekOdOdsetek: number; // 19% × łączne odsetki brutto PLN

    // Łącznie
    lacznyPodatekDoZaplaty: number; // podatekOdZyskow + podatekDoZaplatyOdDywidend + podatekOdOdsetek

    trades: TradeResult[];
    dividends: DividendResult[];
    savingsInterestTax: SavingsInterestTaxResult[];
}
