/**
 * Podatek od dywidend zagranicznych (PIT-38 Sekcja G).
 *
 * Polska zasada odliczenia podatku u źródła (art. 30a ust. 9 updof):
 *   podatek_należny   = dywidenda_brutto_PLN × 19%
 *   ulga              = min(podatek_należny, podatek_zapłacony_za_granicą_PLN)
 *   podatek_do_zapłaty = podatek_należny − ulga
 *
 * Przeliczenie na PLN: kurs NBP z dnia poprzedzającego datę wypłaty dywidendy.
 */

import { getNbpRate } from '../api/nbp.js';
import type { DividendResult, RawDividend } from '../types.js';
import { TAX_RATE } from '../types.js';

export interface DividendTaxResult {
    dividends: DividendResult[];
    dywidendy: number; // Poz. 45 — łączne dywidendy brutto (PLN)
    podatekDoZaplatyOdDywidend: number; // Poz. 47 − Poz. 49
    podatekNaleznyOdDywidend: number; // Poz. 47 = dywidendy × 19%
    podatekZaplaconyZaGranica: number; // Poz. 48
    ulgaNaPodatekZagraniczny: number; // Poz. 49 = min(Poz. 47, Poz. 48)
}

export const calculateDividendTax = async (
    rawDividends: RawDividend[],
    year: number,
): Promise<DividendTaxResult> => {
    const yearDividends = rawDividends.filter(({ date }) => date.getFullYear() === year);
    const dividends: DividendResult[] = [];

    for (const div of yearDividends) {
        const nbp = await getNbpRate(div.currency, div.date);

        const grossAmountPln = div.grossAmountOriginal * nbp.rate;
        const withholdingTaxPln = div.withholdingTaxOriginal * nbp.rate;
        const polishTaxDue = grossAmountPln * TAX_RATE;
        const taxCredit = Math.min(polishTaxDue, withholdingTaxPln);

        dividends.push({
            currency: div.currency,
            date: div.date,
            grossAmountOriginal: div.grossAmountOriginal,
            grossAmountPln,
            isin: div.isin,
            nbpEffectiveDate: nbp.effectiveDate,
            nbpRate: nbp.rate,
            netTaxOwed: polishTaxDue - taxCredit,
            polishTaxDue,
            taxCredit,
            ticker: div.ticker,
            withholdingTaxOriginal: div.withholdingTaxOriginal,
            withholdingTaxPln,
        });
    }

    const dywidendy = sum(dividends, (d) => d.grossAmountPln);
    const podatekNaleznyOdDywidend = sum(dividends, (d) => d.polishTaxDue);
    const podatekZaplaconyZaGranica = sum(dividends, (d) => d.withholdingTaxPln);
    const ulgaNaPodatekZagraniczny = sum(dividends, (d) => d.taxCredit);
    const podatekDoZaplatyOdDywidend = sum(dividends, (d) => d.netTaxOwed);

    return {
        dividends,
        dywidendy,
        podatekDoZaplatyOdDywidend,
        podatekNaleznyOdDywidend,
        podatekZaplaconyZaGranica,
        ulgaNaPodatekZagraniczny,
    };
};

const sum = <T>(arr: T[], fn: (item: T) => number): number =>
    arr.reduce((acc, item) => acc + fn(item), 0);
