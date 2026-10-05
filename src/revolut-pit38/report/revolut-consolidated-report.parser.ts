import { readFileSync } from 'node:fs';

import type { RawDividend, SavingsInterestTransaction, SellRecord } from '../types.js';

export interface ParsedReport {
    dividends: RawDividend[];
    savingsInterestTransactions: SavingsInterestTransaction[];
    sells: SellRecord[];
}

/**
 * Parses a Revolut Consolidated Annual Report CSV.
 *
 * The file has multiple sections separated by empty lines. We extract:
 *  - "Transactions for Brokerage Account sells - {CCY}"      → SellRecord[]
 *  - "Transactions for Brokerage Account dividends - {CCY}"  → RawDividend[]
 *  - "Transactions for Savings Accounts - {CCY}"             → SavingsInterestTransaction[]
 *    (only "Interest earned" rows)
 */
export const parseRevolutCsv = (filePath: string): ParsedReport => {
    const lines = readFileSync(filePath, 'utf8')
        .split(/\r?\n/)
        .map((l) => l.trimEnd());

    const sells: SellRecord[] = [];
    const dividends: RawDividend[] = [];
    const savingsInterestTransactions: SavingsInterestTransaction[] = [];

    let i = 0;

    while (i < lines.length) {
        const line = lines[i];

        const sellsMatch = line.match(/^Transactions for Brokerage Account sells - (.+)/);
        const divMatch = line.match(/^Transactions for Brokerage Account dividends - (.+)/);
        const savingsTxMatch = line.match(/^Transactions for Savings Accounts - (.+)/);

        if (sellsMatch) {
            const currency = sellsMatch[1].trim();
            i += 3; // skip: section header, portfolio-info line, column-headers line
            while (i < lines.length && lines[i].trim() !== '') {
                sells.push(parseSellRow(parseCsvRow(lines[i]), currency));
                i++;
            }
        } else if (divMatch) {
            const currency = divMatch[1].trim();
            i += 3;
            while (i < lines.length && lines[i].trim() !== '') {
                dividends.push(parseDividendRow(parseCsvRow(lines[i]), currency));
                i++;
            }
        } else if (savingsTxMatch) {
            const currency = savingsTxMatch[1].trim();
            i += 2; // skip: section header, column-headers line (no portfolio-info for savings)
            while (i < lines.length && lines[i].trim() !== '') {
                const fields = parseCsvRow(lines[i]);
                // Columns: Date, Description, Money out, Money in, Balance
                if (fields[1] === 'Interest earned') {
                    const amount = parseAmount(fields[3]); // "Money in" column
                    if (amount > 0) {
                        savingsInterestTransactions.push({
                            amount,
                            currency,
                            date: parseDate(fields[0]),
                        });
                    }
                }
                i++;
            }
        } else {
            i++;
        }
    }

    return { dividends, savingsInterestTransactions, sells };
};

// ---------------------------------------------------------------------------
// Row parsers
// ---------------------------------------------------------------------------

// Columns: Date acquired, Date sold, Security name, Symbol, ISIN, Country,
//          Qty, Cost basis, Cost basis base currency, Cost basis rate,
//          Gross proceeds, Gross proceeds base currency, Gross proceeds rate,
//          Gross PnL, Gross PnL base currency, Fees, Fees base currency
const parseSellRow = (fields: string[], currency: string): SellRecord => ({
    buyDate: parseDate(fields[0]),
    costBasisOriginal: parseAmount(fields[7]),
    currency,
    feesOriginal: parseAmount(fields[15]),
    grossProceedsOriginal: parseAmount(fields[10]),
    isin: fields[4].trim(),
    quantity: parseAmount(fields[6]),
    sellDate: parseDate(fields[1]),
    ticker: fields[3].trim(),
});

// Columns: Date, Security name, Symbol, ISIN, Country,
//          Gross amount, Gross amount base currency, Gross amount rate,
//          Withholding tax, Withholding tax base currency,
//          Net amount, Net amount base currency
const parseDividendRow = (fields: string[], currency: string): RawDividend => ({
    currency,
    date: parseDate(fields[0]),
    grossAmountOriginal: parseAmount(fields[5]),
    isin: fields[3].trim(),
    ticker: fields[2].trim(),
    withholdingTaxOriginal: parseAmount(fields[8]),
});

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

// Standard CSV row parser — handles quoted fields containing commas
const parseCsvRow = (line: string): string[] => {
    const fields: string[] = [];
    let current = '';
    let inQuotes = false;

    for (const char of line) {
        if (char === '"') {
            inQuotes = !inQuotes;
        } else if (char === ',' && !inQuotes) {
            fields.push(current.trim());
            current = '';
        } else {
            current += char;
        }
    }

    fields.push(current.trim());
    return fields;
};

// Parses "Mar 11, 2025" → local-midnight Date (avoids UTC-offset issues)
const MONTHS: Record<string, number> = {
    Apr: 3,
    Aug: 7,
    Dec: 11,
    Feb: 1,
    Jan: 0,
    Jul: 6,
    Jun: 5,
    Mar: 2,
    May: 4,
    Nov: 10,
    Oct: 9,
    Sep: 8,
};

const parseDate = (raw: string): Date => {
    const match = raw.trim().match(/^(\w{3})\s+(\d{1,2}),\s*(\d{4})$/);
    if (!match) {
        throw new Error(`Cannot parse date: "${raw}"`);
    }
    const month = MONTHS[match[1]];
    if (month === undefined) {
        throw new Error(`Unknown month abbreviation: "${match[1]}"`);
    }
    return new Date(Number(match[3]), month, Number(match[2]));
};

// Strips currency symbols (€ $ £), thousands separators, and "PLN" suffix
const parseAmount = (raw: string): number => {
    const cleaned = raw.replaceAll(/[€$£]/g, '').replaceAll(',', '').replace(/\s*PLN\s*/gi, '').trim();
    return Number(cleaned) || 0;
};
