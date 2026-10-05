/**
 * Podatek od odsetek z rachunków oszczędnościowych (art. 30a ust. 1 pkt 3 updof).
 *
 * Revolut Bank UAB jest bankiem litewskim i nie pełni roli polskiego płatnika —
 * nie potrąca podatku u źródła. Obowiązek wykazania i zapłaty 19% leży po stronie
 * podatnika (PIT-38, Sekcja F lub odpowiednik dla danego roku).
 *
 * Przeliczenie EUR → PLN: kurs NBP z dnia poprzedzającego datę wypłaty odsetek.
 * PLN → PLN: brak przeliczenia (kurs = 1).
 */

import { getNbpRate } from '../api/nbp.js';
import type { SavingsInterestTaxDetail, SavingsInterestTaxResult, SavingsInterestTransaction } from '../types.js';
import { TAX_RATE } from '../types.js';

export const calculateSavingsInterestTax = async (
    transactions: SavingsInterestTransaction[],
    year: number,
): Promise<SavingsInterestTaxResult[]> => {
    const yearTransactions = transactions.filter(({ date }) => date.getFullYear() === year);

    // Group by currency so each currency gets its own result block in the report
    const byCurrency = new Map<string, SavingsInterestTransaction[]>();
    for (const tx of yearTransactions) {
        const group = byCurrency.get(tx.currency) ?? [];
        group.push(tx);
        byCurrency.set(tx.currency, group);
    }

    const results: SavingsInterestTaxResult[] = [];

    for (const [currency, txs] of byCurrency) {
        const details: SavingsInterestTaxDetail[] = [];

        for (const tx of txs) {
            const nbp = await getNbpRate(currency, tx.date);
            const amountPln = tx.amount * nbp.rate;
            details.push({
                amountOriginal: tx.amount,
                amountPln,
                currency,
                date: tx.date,
                nbpEffectiveDate: nbp.effectiveDate,
                nbpRate: nbp.rate,
                taxPln: amountPln * TAX_RATE,
            });
        }

        const totalInterestPln = sum(details, (d) => d.amountPln);
        results.push({
            currency,
            details,
            totalInterestPln,
            totalTax: totalInterestPln * TAX_RATE,
        });
    }

    return results;
};

const sum = <T>(arr: T[], fn: (item: T) => number): number =>
    arr.reduce((acc, item) => acc + fn(item), 0);
