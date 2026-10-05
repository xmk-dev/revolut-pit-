/**
 * NBP (Narodowy Bank Polski) exchange rate service.
 *
 * Polish tax law (art. 24c updop / art. 30e updof) requires using the NBP
 * mid rate published on the LAST WORKING DAY BEFORE the transaction date.
 *
 * API docs: https://api.nbp.pl/
 */

const NBP_API_BASE = 'https://api.nbp.pl/api/exchangerates/rates/a';

export interface NbpRateResult {
    effectiveDate: string; // YYYY-MM-DD — actual date the rate was published
    rate: number; // PLN per 1 unit of foreign currency
}

// In-memory cache keyed by "CURRENCY-YYYY-MM-DD"
const rateCache = new Map<string, NbpRateResult>();

/**
 * Returns the NBP mid rate (PLN per 1 unit of currency) plus the exact date
 * of the published rate used. Starts 1 day before `transactionDate` and looks
 * back up to 7 calendar days to account for weekends and public holidays.
 */
export const getNbpRate = async (currency: string, transactionDate: Date): Promise<NbpRateResult> => {
    if (currency === 'PLN') {
        return { effectiveDate: formatDate(transactionDate), rate: 1 };
    }

    for (let daysBack = 1; daysBack <= 7; daysBack++) {
        const candidate = addDays(transactionDate, -daysBack);
        const dateStr = formatDate(candidate);
        const cacheKey = `${currency}-${dateStr}`;

        if (rateCache.has(cacheKey)) {
            return rateCache.get(cacheKey)!;
        }

        const rate = await fetchRate(currency, dateStr);

        if (rate !== null) {
            const result: NbpRateResult = { effectiveDate: dateStr, rate };
            rateCache.set(cacheKey, result);
            return result;
        }
    }

    throw new Error(
        `No NBP rate found for ${currency} in the 7 days before ${formatDate(transactionDate)}`,
    );
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const fetchRate = async (currency: string, dateStr: string): Promise<number | null> => {
    const url = `${NBP_API_BASE}/${currency.toLowerCase()}/${dateStr}/?format=json`;
    try {
        const response = await fetch(url);
        if (!response.ok) return null; // 404 = no rate published on this date
        const data = (await response.json()) as { rates: Array<{ mid: number }> };
        return data.rates[0]?.mid ?? null;
    } catch {
        return null;
    }
};

const addDays = (date: Date, days: number): Date =>
    new Date(date.getFullYear(), date.getMonth(), date.getDate() + days);

// Format as "YYYY-MM-DD" using local date parts (avoids UTC-offset shift)
const formatDate = (date: Date): string => {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
};
