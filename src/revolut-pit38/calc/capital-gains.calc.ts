/**
 * Zyski kapitałowe ze sprzedaży papierów wartościowych (PIT-38 Sekcja C).
 *
 * Każdy wiersz sprzedaży w raporcie Revolut zawiera już dopasowanie FIFO
 * (datę nabycia + datę zbycia), więc nie musimy sami budować kolejki FIFO.
 *
 * Przeliczenie na PLN według prawa podatkowego (art. 30e updof):
 *   przychód  = gross_proceeds  × kurs NBP z dnia poprzedzającego sprzedaż
 *   koszty    = cost_basis      × kurs NBP z dnia poprzedzającego nabycie
 *             + prowizja_sprzedaży × kurs NBP z dnia poprzedzającego sprzedaż
 */

import { getNbpRate } from '../api/nbp.js';
import type { SellRecord, TradeResult } from '../types.js';
import { TAX_RATE } from '../types.js';

export interface CapitalGainsResult {
    dochodLubStrata: number; // Poz. 24 (dochód ≥ 0) lub Poz. 25 (strata < 0)
    koszty: number; // Poz. 23
    podatekOdZyskow: number; // Poz. 31 = max(dochód, 0) × 19%
    przychod: number; // Poz. 22
    trades: TradeResult[];
}

export const calculateCapitalGains = async (
    sells: SellRecord[],
    year: number,
): Promise<CapitalGainsResult> => {
    const yearSells = sells.filter(({ sellDate }) => sellDate.getFullYear() === year);
    const trades: TradeResult[] = [];

    for (const sell of yearSells) {
        const [nbpSell, nbpBuy] = await Promise.all([
            getNbpRate(sell.currency, sell.sellDate),
            getNbpRate(sell.currency, sell.buyDate),
        ]);

        const revenuePln = sell.grossProceedsOriginal * nbpSell.rate;
        const feesPln = sell.feesOriginal * nbpSell.rate;
        const costPln = sell.costBasisOriginal * nbpBuy.rate + feesPln;

        trades.push({
            buyDate: sell.buyDate,
            costBasisOriginal: sell.costBasisOriginal,
            costPln,
            currency: sell.currency,
            feesOriginal: sell.feesOriginal,
            feesPln,
            gainPln: revenuePln - costPln,
            grossProceedsOriginal: sell.grossProceedsOriginal,
            isin: sell.isin,
            nbpBuyEffectiveDate: nbpBuy.effectiveDate,
            nbpBuyRate: nbpBuy.rate,
            nbpSellEffectiveDate: nbpSell.effectiveDate,
            nbpSellRate: nbpSell.rate,
            quantity: sell.quantity,
            revenuePln,
            sellDate: sell.sellDate,
            ticker: sell.ticker,
        });
    }

    const przychod = sum(trades, (t) => t.revenuePln);
    const koszty = sum(trades, (t) => t.costPln);
    const dochodLubStrata = przychod - koszty;
    const podatekOdZyskow = Math.max(dochodLubStrata, 0) * TAX_RATE;

    return { dochodLubStrata, koszty, podatekOdZyskow, przychod, trades };
};

const sum = <T>(arr: T[], fn: (item: T) => number): number =>
    arr.reduce((acc, item) => acc + fn(item), 0);
