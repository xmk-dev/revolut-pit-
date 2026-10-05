# 🇵🇱 revolut-pit

**Kalkulator PIT-38 dla inwestorów korzystających z Revolut.**
Wczytuje skonsolidowany wyciąg z Revolut (CSV), przelicza wszystko na złotówki po kursach NBP zgodnie z polskimi przepisami i generuje czytelny raport Excel, który pomoże Ci wypełnić PIT-38 — i obronić rozliczenie przed urzędem skarbowym.

![Node.js](https://img.shields.io/badge/node-%3E%3D20-339933?logo=node.js&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?logo=typescript&logoColor=white)
![License: MIT](https://img.shields.io/badge/license-MIT-blue)

> [!WARNING]
> To narzędzie **nie jest doradztwem podatkowym**. Wyniki są pomocą w rozliczeniu, a nie jego gwarancją.
> Zawsze sprawdź liczby i numery pozycji z aktualnym formularzem PIT-38 i w razie wątpliwości skonsultuj się z doradcą podatkowym.

---

## Spis treści

- [Co liczy?](#co-liczy)
- [Szybki start](#szybki-start)
- [Jak pobrać wyciąg z Revolut](#jak-pobrać-wyciąg-z-revolut)
- [Uruchomienie](#uruchomienie)
- [Co dostajesz na wyjściu](#co-dostajesz-na-wyjściu)
- [Jak to jest liczone](#jak-to-jest-liczone)
- [Prywatność](#prywatność)
- [Ograniczenia](#ograniczenia)
- [Struktura projektu](#struktura-projektu)
- [Rozwój i kontrybucje](#rozwój-i-kontrybucje)
- [Licencja](#licencja)

## Co liczy?

| Źródło dochodu | Sekcja w wyciągu Revolut | Co robi kalkulator |
| --- | --- | --- |
| 📈 **Sprzedaż akcji / ETF** | `Transactions for Brokerage Account sells - {waluta}` | Przychód, koszty (z prowizjami), dochód/strata i 19% podatku |
| 💵 **Dywidendy zagraniczne** | `Transactions for Brokerage Account dividends - {waluta}` | Dywidendy brutto, 19% podatku należnego, odliczenie podatku pobranego za granicą, dopłata w Polsce |
| 🏦 **Odsetki z kont oszczędnościowych** | `Transactions for Savings Accounts - {waluta}` (wiersze `Interest earned`) | Suma odsetek w PLN i 19% podatku |

Wszystkie trzy rodzaje dochodu rozlicza się w zeznaniu **PIT-38**, więc projekt obsługuje **wyłącznie PIT-38**. Nie liczy PIT-36/37 ani nie generuje załącznika PIT/ZG.

Obsługiwane są wszystkie waluty, dla których NBP publikuje kurs w tabeli A (EUR, USD, GBP, CHF, …) oraz PLN.

## Szybki start

```bash
git clone https://github.com/xmk-dev/revolut-pit.git
cd revolut-pit
npm install

# wrzuć swój wyciąg do katalogu data/ (jest w .gitignore)
mkdir -p data
cp ~/Downloads/<twój-wyciąg>.csv data/revolut.csv

npm run revolut-pit38 -- data/revolut.csv 2025
```

Wymagania: **Node.js 20+** (rekomendowana wersja LTS, patrz `.nvmrc`) i dostęp do internetu (kursy z API NBP).

Chcesz najpierw zobaczyć, jak to działa? Uruchom kalkulator na przykładowym, fikcyjnym pliku:

```bash
npm run revolut-pit38 -- examples/revolut-consolidated-statement.example.csv 2025
```

## Jak pobrać wyciąg z Revolut

Kalkulator potrzebuje **skonsolidowanego wyciągu (Consolidated statement) w formacie CSV** za dany rok podatkowy.

1. Otwórz aplikację **Revolut** i wejdź w swój **profil** (ikona w lewym górnym rogu).
2. Wybierz **Dokumenty i wyciągi** (*Documents & statements*).
3. Wybierz **Wyciąg skonsolidowany** (*Consolidated statement*).
4. Ustaw:
   - **Format:** Excel / CSV (nie PDF),
   - **Okres:** cały rok podatkowy, np. *Tax year 2025* lub zakres `1 sty – 31 gru`.
5. Kliknij **Generuj** (*Generate*) i pobierz plik — trafi do aplikacji lub na Twój e-mail.

> [!TIP]
> Nazwy opcji w aplikacji Revolut zmieniają się co jakiś czas i mogą różnić się w zależności od wersji językowej.
> Szukaj dokumentu, który w środku zawiera sekcje `Summary for ...` oraz `Transactions for ...` — tak jak w
> [pliku przykładowym](examples/revolut-consolidated-statement.example.csv).

### Format pliku

Wyciąg to jeden plik CSV złożony z kilku sekcji oddzielonych pustymi liniami. Kalkulator czyta tylko te sekcje:

```text
Transactions for Savings Accounts - PLN
Date,Description,Money out,Money in,Balance
"Jan 2, 2025",Interest earned,,0.45 PLN,"1,000.45 PLN"
...

Transactions for Brokerage Account sells - USD
"Portfolio  created on Jan 10, 2022"
Date acquired,Date sold,Security name,Symbol,ISIN,Country,Qty,Cost basis,...,Fees,Fees  base currency
"Jun 3, 2024","Feb 10, 2025",Example Tech Corp,EXTC,US0000EXAMPL,US,5,$500,...
...

Transactions for Brokerage Account dividends - USD
"Portfolio  created on Jan 10, 2022"
Date,Security name,Symbol,ISIN,Country,Gross amount,...,Withholding tax,...
...
```

Pełny przykład z fikcyjnymi danymi znajdziesz w [`examples/revolut-consolidated-statement.example.csv`](examples/revolut-consolidated-statement.example.csv) — możesz go użyć jako szablonu do testów.

## Uruchomienie

### Krok po kroku (pierwsze uruchomienie)

**1. Zainstaluj Node.js** (wersja 20 lub nowsza) — najprościej ze strony [nodejs.org](https://nodejs.org/) (wersja LTS) albo przez [nvm](https://github.com/nvm-sh/nvm):

```bash
nvm install --lts
node -v   # powinno pokazać v20 lub nowszą
```

**2. Pobierz projekt i zainstaluj zależności:**

```bash
git clone https://github.com/xmk-dev/revolut-pit.git
cd revolut-pit
npm install
```

Nie masz gita? Kliknij na GitHubie **Code → Download ZIP**, rozpakuj i w terminalu wejdź do rozpakowanego katalogu.

**3. Wrzuć swój wyciąg do katalogu `data/`:**

```bash
mkdir -p data
cp ~/Downloads/<nazwa-pobranego-wyciągu>.csv data/revolut.csv
```

**4. Uruchom kalkulator, podając rok podatkowy:**

```bash
npm run revolut-pit38 -- data/revolut.csv 2025
```

> [!NOTE]
> Dwa myślniki `--` są potrzebne — oddzielają argumenty dla skryptu od argumentów samego `npm`.

**5. Otwórz raport** `data/pit38-2025.xlsx` w Excelu, LibreOffice lub Arkuszach Google i przepisz wartości z arkusza **Podsumowanie** do formularza PIT-38.

### Składnia

```bash
npm run revolut-pit38 -- <ścieżka-do-pliku.csv> [rok]
```

Alternatywnie, bez `npm`:

```bash
npx tsx src/revolut-pit38/index.ts data/revolut.csv 2025
```

| Argument | Opis |
| --- | --- |
| `ścieżka-do-pliku.csv` | Wyciąg z Revolut. |
| `rok` | Rok podatkowy. Domyślnie poprzedni rok kalendarzowy. Transakcje z innych lat są pomijane. |

Przykładowy wynik w terminalu:

```text
Wczytywanie raportu: data/revolut.csv
Rok podatkowy: 2025
Wczytano: 3 transakcji sprzedaży, 2 dywidend, 7 wypłat odsetek.
Pobieranie kursów NBP...

✓ Raport zapisany: data/pit38-2025.xlsx

  Podatek od zysk. kapitałowych:   68.97 PLN
  Podatek od dywidend:              1.98 PLN
  Podatek od odsetek:               0.45 PLN
  ─────────────────────────────────────────────────
  ŁĄCZNY PODATEK DO ZAPŁATY:        71.40 PLN
```

### Najczęstsze problemy

| Komunikat | Przyczyna i rozwiązanie |
| --- | --- |
| `Użycie: tsx src/revolut-pit38/index.ts <plik.csv> [rok]` | Nie podano ścieżki do pliku. Pamiętaj o `--` po `npm run revolut-pit38`. |
| `ENOENT: no such file or directory` | Zła ścieżka do pliku CSV — sprawdź nazwę i katalog. |
| `Wczytano: 0 transakcji sprzedaży, 0 dywidend, 0 wypłat odsetek.` | To nie jest skonsolidowany wyciąg w formacie CSV (np. wyciąg z konta lub PDF). Pobierz plik ponownie zgodnie z instrukcją wyżej. |
| `Cannot parse date: "..."` | Daty w wyciągu mają inny format niż oczekiwany (`Mar 11, 2025`). Spróbuj wygenerować wyciąg przy angielskiej wersji językowej aplikacji Revolut. |
| `No NBP rate found for ...` | Brak połączenia z API NBP (`api.nbp.pl`) — sprawdź internet, VPN lub firewall. |
| Podatek wynosi 0, choć powinien | Sprawdź, czy podany rok zgadza się z rokiem transakcji w wyciągu. |

## Co dostajesz na wyjściu

Plik `pit38-<rok>.xlsx` zapisywany **obok pliku wejściowego**. Zawiera arkusze:

| Arkusz | Zawartość |
| --- | --- |
| **Podsumowanie** | Metadane rozliczenia, wartości przypisane do pozycji formularza PIT-38 i łączny podatek do zapłaty. |
| **Sekcja C — Zyski Kapitałowe** | Każda transakcja sprzedaży: daty, kwoty w walucie, kursy NBP (data + wartość) dla nabycia i zbycia, przeliczenie na PLN i wynik. |
| **Sekcja G — Dywidendy** | Każda dywidenda: kwota brutto, podatek u źródła, kurs NBP, podatek należny, odliczenie i dopłata. |
| **Sekcja F — Odsetki** | Każda wypłata odsetek z podziałem na waluty, kurs NBP i podatek. |

Każda liczba ma pokazane dane źródłowe i zastosowany kurs, więc raport nadaje się jako dokumentacja na wypadek kontroli.

## Jak to jest liczone

**Kursy walut** — średni kurs NBP (tabela A) z **ostatniego dnia roboczego poprzedzającego** dzień transakcji (art. 11a ust. 1 ustawy o PIT). Jeśli w danym dniu kurs nie był publikowany (weekend, święto), kalkulator cofa się maksymalnie o 7 dni.

**Zyski kapitałowe**

```text
przychód = przychód brutto ze sprzedaży × kurs NBP (D-1 przed sprzedażą)
koszty   = koszt nabycia × kurs NBP (D-1 przed zakupem)
         + prowizja × kurs NBP (D-1 przed sprzedażą)
dochód   = przychód − koszty
podatek  = max(dochód, 0) × 19%
```

Dopasowanie zakupów do sprzedaży (FIFO) jest brane bezpośrednio z wyciągu Revolut — każdy wiersz sprzedaży zawiera już datę i koszt nabycia.

**Dywidendy zagraniczne**

```text
podatek należny   = dywidenda brutto PLN × 19%
odliczenie        = min(podatek należny, podatek pobrany za granicą PLN)
do zapłaty w PL   = podatek należny − odliczenie
```

**Odsetki z kont oszczędnościowych** — suma wierszy `Interest earned` przeliczona na PLN × 19%. Dotyczy sytuacji, w której Revolut nie pobrał podatku sam (sprawdź `Total tax` w sekcji `Summary for Savings Accounts` swojego wyciągu).

## Prywatność

- Wyciąg jest przetwarzany **wyłącznie lokalnie** na Twoim komputerze.
- Jedyne zapytania sieciowe trafiają do publicznego [API NBP](https://api.nbp.pl/) i zawierają tylko kod waluty i datę.
- Katalog `data/` oraz wszystkie pliki `*.csv` / `*.xlsx` (poza `examples/`) są w `.gitignore`, żeby przypadkiem nie wrzucić swoich danych do repozytorium.

## Ograniczenia

- Brak obsługi kryptowalut, CFD, opcji i innych produktów — tylko akcje/ETF, dywidendy i odsetki z kont oszczędnościowych.
- Nie uwzględnia strat z lat poprzednich ani innych rachunków maklerskich — te dane musisz dodać samodzielnie w formularzu.
- Nie generuje załącznika **PIT/ZG** (dochody zagraniczne) — jeśli jest Ci potrzebny, wypełnij go na podstawie raportu.
- Numery pozycji formularza zmieniają się między wersjami PIT-38 — przed złożeniem zeznania porównaj je z formularzem na swój rok.
- Kalkulator polega na formacie wyciągu Revolut. Jeśli Revolut zmieni układ pliku, parser może wymagać aktualizacji — [zgłoś issue](https://github.com/xmk-dev/revolut-pit/issues) i dołącz **zanonimizowany** fragment pliku.

## Struktura projektu

```text
src/revolut-pit38/
├── index.ts                                   # CLI — punkt wejścia
├── types.ts                                   # typy i stawka podatku
├── api/nbp.ts                                 # pobieranie kursów z API NBP (z cache)
├── calc/
│   ├── capital-gains.calc.ts                  # zyski kapitałowe
│   ├── dividends.calc.ts                      # dywidendy zagraniczne
│   └── savings-interest.calc.ts               # odsetki z kont oszczędnościowych
└── report/
    ├── revolut-consolidated-report.parser.ts  # parser wyciągu CSV z Revolut
    └── report.builder.ts                      # budowa raportu i pliku .xlsx
examples/
└── revolut-consolidated-statement.example.csv # fikcyjny wyciąg do testów
```

## Rozwój i kontrybucje

Pull requesty i zgłoszenia są mile widziane! Szczególnie przydadzą się:

- obsługa kolejnych sekcji wyciągu (np. krypto),
- testy automatyczne,
- generowanie PIT/ZG.

```bash
npm install
npm run typecheck   # sprawdzenie typów
npm run lint        # ESLint + Prettier
```

> [!IMPORTANT]
> Nigdy nie dołączaj prawdziwych wyciągów do issues ani PR-ów. Do testów używaj danych fikcyjnych, wzorując się na pliku z `examples/`.

## Licencja

[MIT](LICENSE) © xmk-dev
