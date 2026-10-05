#!/usr/bin/env tsx
/**
 * Kalkulator PIT-38 dla raportu Revolut
 *
 * Użycie:
 *   npm run revolut-pit38 -- <ścieżka-do-pliku.csv> [rok]
 *
 * Przykład:
 *   npm run revolut-pit38 -- data/revolut.csv 2025
 */

import { dirname, join } from 'node:path';

import { calculateCapitalGains } from './calc/capital-gains.calc.js';
import { calculateDividendTax } from './calc/dividends.calc.js';
import { calculateSavingsInterestTax } from './calc/savings-interest.calc.js';
import { parseRevolutCsv } from './report/revolut-consolidated-report.parser.js';
import { generateReport, writeXlsxReport } from './report/report.builder.js';

const [, , filePath, yearArg] = process.argv;

if (!filePath) {
    process.stderr.write('Użycie: tsx src/revolut-pit38/index.ts <plik.csv> [rok]\n');
    process.stderr.write('Przykład: tsx src/revolut-pit38/index.ts data/revolut.csv 2025\n');
    process.exit(1);
}

const year = yearArg ? Number.parseInt(yearArg, 10) : new Date().getFullYear() - 1;
const outputPath = join(dirname(filePath), `pit38-${year}.xlsx`);

process.stdout.write(`\nWczytywanie raportu: ${filePath}\n`);
process.stdout.write(`Rok podatkowy: ${year}\n`);

const { dividends, savingsInterestTransactions, sells } = parseRevolutCsv(filePath);

process.stdout.write(
    `Wczytano: ${sells.length} transakcji sprzedaży, ${dividends.length} dywidend, ` +
    `${savingsInterestTransactions.length} wypłat odsetek.\n`,
);
process.stdout.write('Pobieranie kursów NBP...\n');

const [capitalGains, dividendTax, savingsInterestTax] = await Promise.all([
    calculateCapitalGains(sells, year),
    calculateDividendTax(dividends, year),
    calculateSavingsInterestTax(savingsInterestTransactions, year),
]);

const report = generateReport(year, capitalGains, dividendTax, savingsInterestTax);
await writeXlsxReport(report, outputPath, filePath);

process.stdout.write(`\n✓ Raport zapisany: ${outputPath}\n\n`);
process.stdout.write(`  Podatek od zysk. kapitałowych:   ${report.podatekOdZyskow.toFixed(2)} PLN\n`);
process.stdout.write(`  Podatek od dywidend:              ${report.podatekDoZaplatyOdDywidend.toFixed(2)} PLN\n`);
process.stdout.write(`  Podatek od odsetek:               ${report.podatekOdOdsetek.toFixed(2)} PLN\n`);
process.stdout.write(`  ─────────────────────────────────────────────────\n`);
process.stdout.write(`  ŁĄCZNY PODATEK DO ZAPŁATY:        ${report.lacznyPodatekDoZaplaty.toFixed(2)} PLN\n\n`);
