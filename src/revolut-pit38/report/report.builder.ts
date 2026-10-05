import ExcelJS from 'exceljs';

import type { CapitalGainsResult } from '../calc/capital-gains.calc.js';
import type { DividendTaxResult } from '../calc/dividends.calc.js';
import type { SavingsInterestTaxResult, TaxReport } from '../types.js';

// ---------------------------------------------------------------------------
// Generate TaxReport object
// ---------------------------------------------------------------------------

export const generateReport = (
    year: number,
    capitalGains: CapitalGainsResult,
    dividendTax: DividendTaxResult,
    savingsInterestTax: SavingsInterestTaxResult[],
): TaxReport => {
    const podatekOdOdsetek = sum(savingsInterestTax, (s) => s.totalTax);

    return {
        dividends: dividendTax.dividends,
        dochodLubStrata: capitalGains.dochodLubStrata,
        dywidendy: dividendTax.dywidendy,
        koszty: capitalGains.koszty,
        lacznyPodatekDoZaplaty:
            capitalGains.podatekOdZyskow +
            dividendTax.podatekDoZaplatyOdDywidend +
            podatekOdOdsetek,
        podatekDoZaplatyOdDywidend: dividendTax.podatekDoZaplatyOdDywidend,
        podatekNaleznyOdDywidend: dividendTax.podatekNaleznyOdDywidend,
        podatekOdOdsetek,
        podatekOdZyskow: capitalGains.podatekOdZyskow,
        podatekZaplaconyZaGranica: dividendTax.podatekZaplaconyZaGranica,
        przychod: capitalGains.przychod,
        savingsInterestTax,
        trades: capitalGains.trades,
        ulgaNaPodatekZagraniczny: dividendTax.ulgaNaPodatekZagraniczny,
        year,
    };
};

// ---------------------------------------------------------------------------
// Generate multi-sheet Excel report for tax authorities
// ---------------------------------------------------------------------------

/**
 * Generates a multi-sheet .xlsx file documenting the full PIT-38 calculation.
 * Intended for submission to the tax office (urząd skarbowy) during an audit.
 *
 * Sheets:
 *   1. Podsumowanie       — metadata + tax summary (all components + total)
 *   2. Zyski Kapitałowe   — trade-by-trade detail (Sekcja C)
 *   3. Dywidendy          — dividend detail (Sekcja G)
 *   4. Odsetki            — savings interest detail (Sekcja F)
 */
export const writeXlsxReport = async (
    report: TaxReport,
    outputPath: string,
    inputFileName: string,
): Promise<void> => {
    const wb = new ExcelJS.Workbook();
    wb.creator = 'revolut-pit38';
    wb.created = new Date();

    addSummarySheet(wb, report, inputFileName);
    addCapitalGainsSheet(wb, report);
    if (report.dividends.length > 0) addDividendsSheet(wb, report);
    if (report.savingsInterestTax.length > 0) addInterestSheet(wb, report);

    await wb.xlsx.writeFile(outputPath);
};

// ---------------------------------------------------------------------------
// Sheet 1 — Podsumowanie
// ---------------------------------------------------------------------------

const addSummarySheet = (wb: ExcelJS.Workbook, report: TaxReport, inputFileName: string): void => {
    const ws = wb.addWorksheet('Podsumowanie');

    ws.columns = [
        { width: 44 },
        { width: 28 },
        { width: 52 },
        { width: 18 },
    ];

    // ── Metadata ─────────────────────────────────────────────────────────
    addTitle(ws, 'DOKUMENTACJA ROZLICZENIA PIT-38', 4);
    ws.addRow([]);
    addKV(ws, 'Rok podatkowy', report.year);
    addKV(ws, 'Data wygenerowania', fmtDate(new Date()));
    addKV(ws, 'Plik źródłowy Revolut', inputFileName);
    addKV(ws, 'Waluta bazowa', 'PLN');
    addKV(ws, 'Metoda wyceny kosztów', 'FIFO (dopasowanie Revolut)');
    addKV(ws, 'Kursy walut', 'NBP Tabela A — kurs średni (art. 30e ust. 2 pkt 2 updof)');
    addKV(
        ws,
        'Zasada kursowa',
        'Kurs z ostatniego dnia roboczego poprzedzającego dzień transakcji (art. 24c ust. 2 updop)',
    );

    ws.addRow([]);

    // ── Summary table header ──────────────────────────────────────────────
    addTitle(ws, '═══ PODSUMOWANIE — MAPOWANIE NA FORMULARZ PIT-38 ═══', 4);
    ws.addRow([]);

    const hdr = ws.addRow(['Składowa', 'Pozycja PIT-38', 'Opis', 'Wartość (PLN)']);
    styleHeader(hdr);

    // ── Zyski kapitałowe ──────────────────────────────────────────────────
    addSummaryRow(ws, 'Zyski kapitałowe', 'Poz. 22', 'Przychód ze zbycia papierów wartościowych', report.przychod);
    addSummaryRow(ws, '', 'Poz. 23', 'Koszty uzyskania przychodów', report.koszty);
    if (report.dochodLubStrata >= 0) {
        addSummaryRow(ws, '', 'Poz. 29', 'Dochód uzyskany za granicą', report.dochodLubStrata);
    } else {
        addSummaryRow(ws, '', 'Poz. 25', 'Strata', Math.abs(report.dochodLubStrata));
    }
    addSummaryRow(ws, '', 'Poz. 31', 'Podatek od zysków kapitałowych (19%)', report.podatekOdZyskow, true);

    // ── Dywidendy zagraniczne ─────────────────────────────────────────────
    if (report.dividends.length > 0) {
        ws.addRow([]);
        addSummaryRow(ws, 'Dywidendy zagraniczne', 'Poz. 45', 'Dywidendy brutto', report.dywidendy);
        addSummaryRow(ws, '', 'Poz. 47', 'Podatek należny (19%)', report.podatekNaleznyOdDywidend);
        addSummaryRow(ws, '', 'Poz. 48', 'Podatek zapłacony za granicą', report.podatekZaplaconyZaGranica);
        addSummaryRow(ws, '', 'Poz. 49', 'Ulga na podatek zagraniczny', report.ulgaNaPodatekZagraniczny);
        addSummaryRow(ws, '', '—', 'Podatek od dywidend do zapłaty', report.podatekDoZaplatyOdDywidend, true);
    }

    // ── Odsetki ───────────────────────────────────────────────────────────
    if (report.podatekOdOdsetek > 0) {
        ws.addRow([]);
        for (const [i, group] of report.savingsInterestTax.entries()) {
            const label = i === 0 ? 'Odsetki (Sekcja F)' : '';
            addSummaryRow(
                ws,
                label,
                'art. 30a ust. 1 pkt 3',
                `Odsetki ${group.currency} łącznie (PLN): ${group.totalInterestPln.toFixed(2)} × 19%`,
                group.totalTax,
            );
        }
        addSummaryRow(ws, '', '—', 'Podatek od odsetek łącznie (PLN)', report.podatekOdOdsetek, true);
    }

    // ── Łączny podatek ────────────────────────────────────────────────────
    ws.addRow([]);
    const totalRow = ws.addRow(['', '', 'ŁĄCZNY PODATEK DO ZAPŁATY', report.lacznyPodatekDoZaplaty]);
    totalRow.font = { bold: true, size: 13 };
    totalRow.getCell(3).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFC000' } };
    totalRow.getCell(4).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFC000' } };
    totalRow.getCell(4).numFmt = '#,##0.00';
    totalRow.getCell(4).alignment = { horizontal: 'right' };
};

// ---------------------------------------------------------------------------
// Sheet 2 — Zyski Kapitałowe (Sekcja C)
// ---------------------------------------------------------------------------

const addCapitalGainsSheet = (wb: ExcelJS.Workbook, report: TaxReport): void => {
    const ws = wb.addWorksheet('Sekcja C — Zyski Kapitałowe');

    ws.columns = [
        { header: 'Data nabycia',                                            width: 14 },
        { header: 'Data zbycia',                                             width: 14 },
        { header: 'Ticker',                                                  width: 10 },
        { header: 'ISIN',                                                    width: 16 },
        { header: 'Liczba akcji',                                            width: 14 },
        { header: 'Waluta',                                                  width: 8  },
        { header: `Koszt nabycia (${report.trades[0]?.currency ?? 'waluta'})`,      width: 18 },
        { header: `Przychód brutto (${report.trades[0]?.currency ?? 'waluta'})`,    width: 20 },
        { header: `Prowizja (${report.trades[0]?.currency ?? 'waluta'})`,           width: 16 },
        { header: 'Kurs NBP — data (nabycie)',                               width: 22 },
        { header: 'Kurs NBP — wartość (nabycie)',                            width: 24 },
        { header: 'Kurs NBP — data (zbycie)',                                width: 22 },
        { header: 'Kurs NBP — wartość (zbycie)',                             width: 24 },
        { header: 'Koszt nabycia (PLN) [Poz.23]',                           width: 24 },
        { header: 'Prowizja (PLN)',                                          width: 14 },
        { header: 'Przychód (PLN) [Poz.22]',                                width: 22 },
        { header: 'Dochód / Strata (PLN) [Poz.24/25]',                      width: 28 },
    ];

    styleHeaderRow(ws.getRow(1));

    for (const t of report.trades) {
        const row = ws.addRow([
            fmtDate(t.buyDate),
            fmtDate(t.sellDate),
            t.ticker,
            t.isin,
            t.quantity % 1 === 0 ? t.quantity : +t.quantity.toFixed(8),
            t.currency,
            +t.costBasisOriginal.toFixed(2),
            +t.grossProceedsOriginal.toFixed(2),
            +t.feesOriginal.toFixed(2),
            t.nbpBuyEffectiveDate,
            +t.nbpBuyRate.toFixed(4),
            t.nbpSellEffectiveDate,
            +t.nbpSellRate.toFixed(4),
            +t.costPln.toFixed(2),
            +t.feesPln.toFixed(2),
            +t.revenuePln.toFixed(2),
            +t.gainPln.toFixed(2),
        ]);
        // Colour negative gains red
        if (t.gainPln < 0) {
            row.getCell(17).font = { color: { argb: 'FFCC0000' } };
        }
    }

    // Totals row
    ws.addRow([]);
    const totals = ws.addRow([
        'RAZEM', '', '', '', '', '', '', '', '', '', '', '', '',
        +report.koszty.toFixed(2),
        '',
        +report.przychod.toFixed(2),
        +report.dochodLubStrata.toFixed(2),
    ]);
    totals.font = { bold: true };
    totals.getCell(14).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFD9E1F2' } };
    totals.getCell(16).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFD9E1F2' } };
    totals.getCell(17).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFD9E1F2' } };

    applyNumberFormat(ws, [7, 8, 9, 14, 15, 16, 17], '#,##0.00');
    applyNumberFormat(ws, [11, 13], '0.0000');

    ws.autoFilter = { from: { row: 1, column: 1 }, to: { row: 1, column: 17 } };
};

// ---------------------------------------------------------------------------
// Sheet 3 — Dywidendy (Sekcja G)
// ---------------------------------------------------------------------------

const addDividendsSheet = (wb: ExcelJS.Workbook, report: TaxReport): void => {
    const ws = wb.addWorksheet('Sekcja G — Dywidendy');

    ws.columns = [
        { header: 'Data dywidendy',                                    width: 16 },
        { header: 'Ticker',                                             width: 10 },
        { header: 'ISIN',                                               width: 16 },
        { header: 'Waluta',                                             width: 8  },
        { header: 'Dywidenda brutto (waluta)',                          width: 24 },
        { header: 'Podatek u źródła (waluta)',                          width: 24 },
        { header: 'Kurs NBP — data',                                    width: 18 },
        { header: 'Kurs NBP — wartość',                                 width: 20 },
        { header: 'Dywidenda brutto (PLN) [Poz.45]',                   width: 28 },
        { header: 'Podatek u źródła (PLN) [Poz.48]',                   width: 28 },
        { header: 'Podatek należny PL 19% (PLN) [Poz.47]',             width: 32 },
        { header: 'Ulga (PLN) [Poz.49]',                               width: 20 },
        { header: 'Podatek do zapłaty (PLN)',                           width: 24 },
    ];

    styleHeaderRow(ws.getRow(1));

    for (const d of report.dividends) {
        ws.addRow([
            fmtDate(d.date),
            d.ticker,
            d.isin,
            d.currency,
            +d.grossAmountOriginal.toFixed(2),
            +d.withholdingTaxOriginal.toFixed(2),
            d.nbpEffectiveDate,
            +d.nbpRate.toFixed(4),
            +d.grossAmountPln.toFixed(2),
            +d.withholdingTaxPln.toFixed(2),
            +d.polishTaxDue.toFixed(2),
            +d.taxCredit.toFixed(2),
            +d.netTaxOwed.toFixed(2),
        ]);
    }

    ws.addRow([]);
    const totals = ws.addRow([
        'RAZEM', '', '', '',
        '', '',  '', '',
        +report.dywidendy.toFixed(2),
        +report.podatekZaplaconyZaGranica.toFixed(2),
        +report.podatekNaleznyOdDywidend.toFixed(2),
        +report.ulgaNaPodatekZagraniczny.toFixed(2),
        +report.podatekDoZaplatyOdDywidend.toFixed(2),
    ]);
    totals.font = { bold: true };
    for (const col of [9, 10, 11, 12, 13]) {
        totals.getCell(col).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFD9E1F2' } };
    }

    applyNumberFormat(ws, [5, 6, 9, 10, 11, 12, 13], '#,##0.00');
    applyNumberFormat(ws, [8], '0.0000');

    ws.autoFilter = { from: { row: 1, column: 1 }, to: { row: 1, column: 13 } };
};

// ---------------------------------------------------------------------------
// Sheet 4 — Odsetki (Sekcja F)
// ---------------------------------------------------------------------------

const addInterestSheet = (wb: ExcelJS.Workbook, report: TaxReport): void => {
    const ws = wb.addWorksheet('Sekcja F — Odsetki');

    // Note about Lithuanian bank obligation
    const noteRow = ws.addRow([
        'UWAGA: Revolut Bank UAB (bank litewski) nie potrącił podatku u źródła — obowiązek zapłaty 19% leży po stronie podatnika.',
    ]);
    noteRow.font = { bold: true, color: { argb: 'FFCC0000' } };
    ws.mergeCells(noteRow.number, 1, noteRow.number, 7);

    ws.columns = [
        { width: 14 },
        { width: 10 },
        { width: 20 },
        { width: 20 },
        { width: 22 },
        { width: 18 },
        { width: 18 },
    ];

    for (const group of report.savingsInterestTax) {
        ws.addRow([]);

        const groupHdr = ws.addRow([`Konto oszczędnościowe — ${group.currency}`]);
        groupHdr.font = { bold: true, size: 12 };
        ws.mergeCells(groupHdr.number, 1, groupHdr.number, 7);

        const colHdr = ws.addRow([
            'Data',
            'Waluta',
            `Odsetki (${group.currency})`,
            'Kurs NBP — data',
            'Kurs NBP — wartość',
            'Odsetki (PLN)',
            'Podatek 19% (PLN)',
        ]);
        styleHeaderRow(colHdr);

        for (const d of group.details) {
            ws.addRow([
                fmtDate(d.date),
                d.currency,
                +d.amountOriginal.toFixed(2),
                d.nbpEffectiveDate,
                +d.nbpRate.toFixed(4),
                +d.amountPln.toFixed(2),
                +d.taxPln.toFixed(2),
            ]);
        }

        ws.addRow([]);
        const subtotal = ws.addRow([
            `Odsetki łącznie ${group.currency} (PLN)`, '', '', '', '',
            +group.totalInterestPln.toFixed(2),
            +group.totalTax.toFixed(2),
        ]);
        subtotal.font = { bold: true };
        subtotal.getCell(6).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFD9E1F2' } };
        subtotal.getCell(7).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFD9E1F2' } };
    }

    ws.addRow([]);
    const grandTotal = ws.addRow([
        'Podatek od odsetek łącznie (PLN)', '', '', '', '', '',
        +report.podatekOdOdsetek.toFixed(2),
    ]);
    grandTotal.font = { bold: true, size: 12 };
    grandTotal.getCell(7).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFC000' } };
};

// ---------------------------------------------------------------------------
// Styling helpers
// ---------------------------------------------------------------------------

const HEADER_FILL: ExcelJS.Fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FF203864' },
};

const styleHeader = (row: ExcelJS.Row): void => {
    row.font = { bold: true, color: { argb: 'FFFFFFFF' }, size: 11 };
    row.fill = HEADER_FILL;
    row.alignment = { horizontal: 'center', wrapText: true };
    row.height = 30;
};

const styleHeaderRow = (row: ExcelJS.Row): void => {
    styleHeader(row);
    row.eachCell((cell) => {
        cell.border = {
            bottom: { style: 'medium', color: { argb: 'FFFFFFFF' } },
        };
    });
};

const addTitle = (ws: ExcelJS.Worksheet, text: string, cols: number): void => {
    const row = ws.addRow([text]);
    ws.mergeCells(row.number, 1, row.number, cols);
    row.font = { bold: true, size: 13 };
    row.getCell(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF203864' } };
    row.getCell(1).font = { bold: true, size: 13, color: { argb: 'FFFFFFFF' } };
    row.height = 24;
};

const addKV = (ws: ExcelJS.Worksheet, key: string, value: string | number): void => {
    const row = ws.addRow([key, value]);
    row.getCell(1).font = { bold: true };
};

const addSummaryRow = (
    ws: ExcelJS.Worksheet,
    component: string,
    position: string,
    description: string,
    value: number,
    highlight = false,
): void => {
    const row = ws.addRow([component, position, description, value]);
    row.getCell(4).numFmt = '#,##0.00';
    row.getCell(4).alignment = { horizontal: 'right' };
    if (highlight) {
        row.getCell(4).font = { bold: true };
        row.getCell(4).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE2EFDA' } };
    }
};

const applyNumberFormat = (ws: ExcelJS.Worksheet, cols: number[], fmt: string): void => {
    ws.eachRow((row, rowNumber) => {
        if (rowNumber === 1) return;
        for (const col of cols) {
            const cell = row.getCell(col);
            if (typeof cell.value === 'number') cell.numFmt = fmt;
        }
    });
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const fmtDate = (date: Date): string => {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
};

const sum = <T>(arr: T[], fn: (item: T) => number): number =>
    arr.reduce((acc, item) => acc + fn(item), 0);
