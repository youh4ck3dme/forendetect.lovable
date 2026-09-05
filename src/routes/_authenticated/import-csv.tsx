import { useCallback, useMemo, useRef, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { AlertTriangle, CheckCircle2, FileUp, Loader2, ShieldAlert, X } from "lucide-react";
import { toast } from "sonner";
import {
  AppHeader,
  BottomNav,
  Card,
  PhoneFrame,
  Screen,
  SectionTitle,
} from "@/components/malte/Shell";
import { EmptyState } from "@/components/malte/EmptyState";
import { Button } from "@/components/ui/button";
import { useActiveCase } from "@/hooks/useActiveCase";
import { upsertEntity } from "@/lib/case-data";
import {
  DATE_FORMATS,
  DELIMITERS,
  ENCODINGS,
  PARSER_VERSION,
  detectDateFormat,
  detectDecimalSeparator,
  detectDelimiter,
  type DateFormat,
  type DecimalSeparator,
  type Delimiter,
  type Encoding,
} from "@/lib/csv/parse";
import {
  EMPTY_MAPPING,
  MAPPING_LABELS,
  REQUIRED_FIELDS,
  findSimilar,
  type ColumnMapping,
  type ValidationResult,
} from "@/lib/csv/mapping";
import {
  IMPORT_MAX_BYTES,
  IMPORT_MAX_ROWS,
  commitImport,
  createImport,
  failImport,
  storeImportOriginal,
} from "@/lib/import.functions";
import { formatMoney } from "@/forensic/core/money";

export const Route = createFileRoute("/_authenticated/import-csv")({
  head: () => ({
    meta: [
      { title: "Import výpisu (CSV) — Malte" },
      {
        name: "description",
        content:
          "Načítanie bankového výpisu z CSV: mapovanie stĺpcov, kontrola riadkov a potvrdenie pred zápisom.",
      },
      { property: "og:title", content: "Import výpisu (CSV) — Malte" },
      {
        property: "og:description",
        content: "Krok za krokom: súbor, mapovanie, kontrola, potvrdenie.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: ImportCsv,
});

const inputClass =
  "h-10 w-full rounded-xl border border-border bg-card px-3 text-sm outline-none focus:ring-2 focus:ring-ring";

type Step = "file" | "mapping" | "review" | "done";

async function sha256Hex(buffer: ArrayBuffer): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", buffer);
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

function base64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = "";
  for (let i = 0; i < bytes.length; i += 0x8000) {
    binary += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  }
  return btoa(binary);
}

function ImportCsv() {
  const { activeCase, hasCase, refresh } = useActiveCase();
  const [step, setStep] = useState<Step>("file");
  const [file, setFile] = useState<File | null>(null);
  const [buffer, setBuffer] = useState<ArrayBuffer | null>(null);
  const [hash, setHash] = useState("");
  const [encoding, setEncoding] = useState<Encoding>("utf-8");
  const [delimiter, setDelimiter] = useState<Delimiter | null>(null);
  const [decimal, setDecimal] = useState<DecimalSeparator | null>(null);
  const [dateFormat, setDateFormat] = useState<DateFormat | null>(null);
  const [hasHeader, setHasHeader] = useState(true);
  const [rows, setRows] = useState<string[][]>([]);
  const [mapping, setMapping] = useState<ColumnMapping>(EMPTY_MAPPING);
  const [result, setResult] = useState<ValidationResult | null>(null);
  const [partyMap, setPartyMap] = useState<Record<string, string>>({});
  const [allowPartial, setAllowPartial] = useState(false);
  const [storeOriginal, setStoreOriginal] = useState(false);
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState<number | null>(null);
  const [replacementChars, setReplacementChars] = useState(false);
  const [summary, setSummary] = useState<{ inserted: number; stored: boolean } | null>(null);
  const workerRef = useRef<Worker | null>(null);

  const defaultCurrency = activeCase.baseCurrency || "EUR";

  const runWorker = useCallback(<T,>(message: unknown, expect: string): Promise<T> => {
    return new Promise((resolve, reject) => {
      const worker = new Worker(new URL("../../workers/csv.worker.ts", import.meta.url), {
        type: "module",
      });
      workerRef.current = worker;
      worker.onmessage = (event: MessageEvent<{ kind: string; value?: number } & Record<string, unknown>>) => {
        const data = event.data;
        if (data.kind === "progress") {
          setProgress(typeof data.value === "number" ? data.value : null);
          return;
        }
        if (data.kind === "error") {
          worker.terminate();
          workerRef.current = null;
          reject(new Error(String(data["message"] ?? "Spracovanie zlyhalo.")));
          return;
        }
        if (data.kind === expect) {
          worker.terminate();
          workerRef.current = null;
          resolve(data as T);
        }
      };
      worker.onerror = () => {
        worker.terminate();
        workerRef.current = null;
        reject(new Error("Spracovanie súboru zlyhalo."));
      };
      worker.postMessage(message);
    });
  }, []);

  function cancelWork() {
    workerRef.current?.terminate();
    workerRef.current = null;
    setBusy(false);
    setProgress(null);
    toast.message("Spracovanie zrušené.");
  }

  async function handleFile(picked: File) {
    if (picked.size > IMPORT_MAX_BYTES) {
      toast.error(`Súbor je väčší než ${Math.round(IMPORT_MAX_BYTES / 1024 / 1024)} MB.`);
      return;
    }
    setBusy(true);
    try {
      const buf = await picked.arrayBuffer();
      const digest = await sha256Hex(buf);
      const sample = new TextDecoder("utf-8").decode(buf.slice(0, 4096));
      const detected = detectDelimiter(sample);
      setFile(picked);
      setBuffer(buf);
      setHash(digest);
      setDelimiter(detected.value);
      setRows([]);
      setResult(null);
      setMapping(EMPTY_MAPPING);
      setStep("mapping");
      if (detected.value) await parseWith(buf, encoding, detected.value);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Súbor sa nepodarilo načítať.");
    } finally {
      setBusy(false);
    }
  }

  async function parseWith(buf: ArrayBuffer, enc: Encoding, delim: Delimiter) {
    setBusy(true);
    try {
      const parsed = await runWorker<{ rows: string[][]; replacement: boolean }>(
        { kind: "parse", buffer: buf.slice(0), encoding: enc, delimiter: delim },
        "parsed",
      );
      if (parsed.rows.length > IMPORT_MAX_ROWS) {
        toast.error(`Súbor má viac než ${IMPORT_MAX_ROWS} riadkov.`);
        return;
      }
      setRows(parsed.rows);
      setReplacementChars(parsed.replacement);
      const body = parsed.rows.slice(hasHeader ? 1 : 0);
      const guess = { ...EMPTY_MAPPING };
      const header = parsed.rows[0] ?? [];
      header.forEach((name, index) => {
        const n = name.toLowerCase();
        if (guess.date < 0 && /dat/.test(n)) guess.date = index;
        else if (guess.amount < 0 && /(suma|amount|čiast|ciast|betrag)/.test(n)) guess.amount = index;
        else if (guess.currency < 0 && /(mena|currency)/.test(n)) guess.currency = index;
        else if (guess.counterpartyFrom < 0 && /(odosiel|from|platiteľ|platitel)/.test(n))
          guess.counterpartyFrom = index;
        else if (guess.counterpartyTo < 0 && /(prijem|príjem|to|benefic)/.test(n))
          guess.counterpartyTo = index;
        else if (guess.description < 0 && /(popis|description|účel|ucel|sprava|správa)/.test(n))
          guess.description = index;
        else if (guess.method < 0 && /(sposob|spôsob|typ|method)/.test(n)) guess.method = index;
      });
      setMapping(guess);
      const amounts = body.slice(0, 50).map((r) => r[guess.amount] ?? "");
      const dates = body.slice(0, 50).map((r) => r[guess.date] ?? "");
      setDecimal(detectDecimalSeparator(amounts).value);
      setDateFormat(detectDateFormat(dates.filter(Boolean)).value);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Súbor sa nepodarilo prečítať.");
    } finally {
      setBusy(false);
      setProgress(null);
    }
  }

  const mappingReady =
    delimiter && decimal && dateFormat && REQUIRED_FIELDS.every((f) => mapping[f] >= 0);

  async function runValidation() {
    if (!mappingReady) return;
    setBusy(true);
    try {
      const validated = await runWorker<{ result: ValidationResult }>(
        {
          kind: "validate",
          rows,
          options: {
            mapping,
            dateFormat,
            decimal,
            defaultCurrency,
            defaultMethod: "transfer",
            hasHeader,
          },
        },
        "validated",
      );
      setResult(validated.result);
      setPartyMap(
        Object.fromEntries(
          validated.result.counterparties.map((name) => {
            const existing = activeCase.entities.find(
              (e) => e.name.toLowerCase() === name.toLowerCase(),
            );
            // Zhoda mena je len návrh — priradenie musí potvrdiť používateľ.
            return [name, existing ? `suggest:${existing.id}` : "new"];
          }),
        ),
      );
      setStep("review");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Kontrola zlyhala.");
    } finally {
      setBusy(false);
      setProgress(null);
    }
  }

  const similar = useMemo(() => (result ? findSimilar(result.valid) : []), [result]);
  const unresolved = useMemo(
    () => Object.entries(partyMap).filter(([, v]) => v.startsWith("suggest:")).map(([k]) => k),
    [partyMap],
  );

  async function confirmImport() {
    if (!result || !file || !buffer) return;
    if (result.errors.length > 0 && !allowPartial) {
      toast.error("Súbor obsahuje chybné riadky. Opravte súbor alebo povoľte čiastočný import.");
      return;
    }
    if (unresolved.length > 0) {
      toast.error("Potvrďte priradenie protistrán — subjekty sa nespájajú automaticky.");
      return;
    }
    setBusy(true);
    let importId: string | null = null;
    try {
      // 1) subjekty pre nové protistrany
      const ids: Record<string, string> = {};
      for (const [name, choice] of Object.entries(partyMap)) {
        if (choice === "new") {
          const created = await upsertEntity({
            data: {
              caseId: activeCase.id,
              name,
              kind: "company",
              role: "protistrana z importu",
              country: "SK",
            },
          });
          ids[name] = created.id;
        } else {
          ids[name] = choice.replace(/^entity:/, "");
        }
      }

      // 2) záznam importu (transakcie sa ešte nezapisujú)
      const created = await createImport({
        data: {
          caseId: activeCase.id,
          filename: file.name,
          byteSize: file.size,
          sha256: hash,
          parserVersion: PARSER_VERSION,
          delimiter: delimiter as Delimiter,
          decimalSeparator: decimal as DecimalSeparator,
          dateFormat: dateFormat as DateFormat,
          encoding,
          columnMapping: mapping as unknown as Record<string, number>,
          totalRows: result.valid.length + result.errors.length,
          validRows: result.valid.length,
          errorRows: result.errors.length,
          partial: allowPartial && result.errors.length > 0,
        },
      });
      importId = created.id;

      // 3) atomický zápis všetkých riadkov
      const committed = await commitImport({
        data: {
          importId: created.id,
          rows: result.valid.map((r) => ({
            date: r.date,
            amount: r.amount,
            currency: r.currency,
            method: r.method,
            from_id: ids[r.from] as string,
            to_id: ids[r.to] as string,
            origin_country: activeCase.entities.find((e) => e.id === ids[r.from])?.country ?? "SK",
            destination_country:
              activeCase.entities.find((e) => e.id === ids[r.to])?.country ?? "SK",
            description: r.description,
            source_row: r.sourceRow,
          })),
        },
      });

      // 4) originál len po výslovnom súhlase
      let stored = false;
      if (storeOriginal) {
        await storeImportOriginal({
          data: { importId: created.id, contentBase64: base64(buffer), sha256: hash },
        });
        stored = true;
      }

      setSummary({ inserted: committed.inserted, stored });
      setStep("done");
      refresh();
      toast.success(`Importovaných ${committed.inserted} transakcií.`);
    } catch (error) {
      if (importId) {
        await failImport({
          data: { importId, reason: error instanceof Error ? error.message.slice(0, 300) : "Zlyhanie" },
        }).catch(() => undefined);
      }
      toast.error(error instanceof Error ? error.message : "Import zlyhal. Nezapísal sa žiadny riadok.");
    } finally {
      setBusy(false);
    }
  }

  if (!hasCase) {
    return (
      <PhoneFrame>
        <AppHeader title="Import výpisu" />
        <Screen>
          <EmptyState
            icon={FileUp}
            title="Najprv vytvorte prípad"
            detail="Import zapisuje transakcie do konkrétneho prípadu."
          />
        </Screen>
        <BottomNav />
      </PhoneFrame>
    );
  }

  const header = rows[0] ?? [];

  return (
    <PhoneFrame>
      <AppHeader title="Import výpisu (CSV)" />
      <Screen>
        <Card className="space-y-2">
          <h1 className="text-base font-semibold tracking-tight">
            Import do prípadu {activeCase.name}
          </h1>
          <p className="text-caption">
            Postup: súbor → mapovanie stĺpcov → kontrola → potvrdenie. Pred potvrdením sa nezapíše
            žiadna transakcia. Súbor sa spracúva vo vašom prehliadači; uložené dáta (a originál, ak
            ho potvrdíte) sa ukladajú do zabezpečeného cloudu aplikácie, nie iba do zariadenia.
          </p>
        </Card>

        {step === "file" ? (
          <Card className="space-y-3">
            <label className="block space-y-1">
              <span className="text-[11px] font-medium text-muted-foreground">Súbor CSV</span>
              <input
                aria-label="Súbor CSV"
                type="file"
                accept=".csv,text/csv,text/plain"
                className={inputClass}
                onChange={(e) => {
                  const picked = e.target.files?.[0];
                  if (picked) void handleFile(picked);
                }}
              />
            </label>
            <p className="text-caption">
              Limit {Math.round(IMPORT_MAX_BYTES / 1024 / 1024)} MB a {IMPORT_MAX_ROWS} riadkov.
            </p>
          </Card>
        ) : null}

        {step === "mapping" && file ? (
          <>
            <SectionTitle>Formát súboru</SectionTitle>
            <Card className="space-y-3">
              <p className="text-caption">
                {file.name} • {(file.size / 1024).toFixed(1)} kB • SHA-256 {hash.slice(0, 16)}…
              </p>
              {replacementChars ? (
                <p className="flex items-center gap-2 text-xs text-risk-high">
                  <ShieldAlert className="h-4 w-4" aria-hidden /> Text obsahuje neznáme znaky —
                  zvoľte iné kódovanie.
                </p>
              ) : null}
              <label className="block space-y-1">
                <span className="text-[11px] font-medium text-muted-foreground">Kódovanie</span>
                <select
                  aria-label="Kódovanie"
                  className={inputClass}
                  value={encoding}
                  onChange={(e) => {
                    const next = e.target.value as Encoding;
                    setEncoding(next);
                    if (buffer && delimiter) void parseWith(buffer, next, delimiter);
                  }}
                >
                  {ENCODINGS.map((e) => (
                    <option key={e} value={e}>
                      {e}
                    </option>
                  ))}
                </select>
              </label>
              <label className="block space-y-1">
                <span className="text-[11px] font-medium text-muted-foreground">Oddeľovač</span>
                <select
                  aria-label="Oddeľovač"
                  className={inputClass}
                  value={delimiter ?? ""}
                  onChange={(e) => {
                    const next = e.target.value as Delimiter;
                    setDelimiter(next);
                    if (buffer) void parseWith(buffer, encoding, next);
                  }}
                >
                  <option value="">— zvoľte —</option>
                  {(Object.keys(DELIMITERS) as Delimiter[]).map((d) => (
                    <option key={d} value={d}>
                      {DELIMITERS[d]}
                    </option>
                  ))}
                </select>
              </label>
              <label className="flex items-center gap-2 text-xs">
                <input
                  type="checkbox"
                  checked={hasHeader}
                  onChange={(e) => setHasHeader(e.target.checked)}
                />
                Prvý riadok je hlavička
              </label>
              <label className="block space-y-1">
                <span className="text-[11px] font-medium text-muted-foreground">
                  Desatinný oddeľovač {decimal ? "" : "(nejednoznačný — zvoľte)"}
                </span>
                <select
                  aria-label="Desatinný oddeľovač"
                  className={inputClass}
                  value={decimal ?? ""}
                  onChange={(e) => setDecimal(e.target.value as DecimalSeparator)}
                >
                  <option value="">— zvoľte —</option>
                  <option value=",">čiarka (1 234,56)</option>
                  <option value=".">bodka (1,234.56)</option>
                </select>
              </label>
              <label className="block space-y-1">
                <span className="text-[11px] font-medium text-muted-foreground">
                  Formát dátumu {dateFormat ? "" : "(nejednoznačný — zvoľte)"}
                </span>
                <select
                  aria-label="Formát dátumu"
                  className={inputClass}
                  value={dateFormat ?? ""}
                  onChange={(e) => setDateFormat(e.target.value as DateFormat)}
                >
                  <option value="">— zvoľte —</option>
                  {DATE_FORMATS.map((f) => (
                    <option key={f} value={f}>
                      {f}
                    </option>
                  ))}
                </select>
              </label>
            </Card>

            <SectionTitle>Mapovanie stĺpcov</SectionTitle>
            <Card className="space-y-2">
              {(Object.keys(MAPPING_LABELS) as (keyof ColumnMapping)[]).map((field) => (
                <label key={field} className="block space-y-1">
                  <span className="text-[11px] font-medium text-muted-foreground">
                    {MAPPING_LABELS[field]}
                    {REQUIRED_FIELDS.includes(field) ? " *" : " (nepovinné)"}
                  </span>
                  <select
                    aria-label={MAPPING_LABELS[field]}
                    className={inputClass}
                    value={mapping[field]}
                    onChange={(e) =>
                      setMapping({ ...mapping, [field]: Number(e.target.value) })
                    }
                  >
                    <option value={-1}>— nepriradené —</option>
                    {header.map((name, index) => (
                      <option key={`${name}-${index}`} value={index}>
                        {name || `stĺpec ${index + 1}`}
                      </option>
                    ))}
                  </select>
                </label>
              ))}
              <Button className="w-full" disabled={!mappingReady || busy} onClick={runValidation}>
                {busy ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : null}
                Skontrolovať riadky
              </Button>
              {busy ? (
                <Button variant="outline" className="w-full" onClick={cancelWork}>
                  <X className="h-4 w-4" aria-hidden /> Zrušiť spracovanie
                </Button>
              ) : null}
              {progress !== null ? (
                <p className="text-caption">Priebeh: {Math.round(progress * 100)} %</p>
              ) : null}
            </Card>
          </>
        ) : null}

        {step === "review" && result ? (
          <>
            <SectionTitle>Výsledok kontroly</SectionTitle>
            <Card className="space-y-2">
              <p className="text-sm">
                <strong>{result.valid.length}</strong> platných riadkov,{" "}
                <strong className={result.errors.length ? "text-risk-high" : ""}>
                  {result.errors.length}
                </strong>{" "}
                chybných.
              </p>
              <div className="space-y-1">
                {Object.entries(result.totalsByCurrency).map(([currency, total]) => (
                  <p key={currency} className="text-caption">
                    Súčet {currency}: <strong>{formatMoney(total, currency)}</strong>
                  </p>
                ))}
              </div>
              {similar.length > 0 ? (
                <p className="flex items-start gap-2 text-xs text-risk-medium">
                  <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
                  {similar.length} skupín podobných platieb (rovnaký deň, suma a strany). Môže ísť o
                  legitímne opakované platby — nič sa automaticky nemaže.
                </p>
              ) : null}
            </Card>

            {result.errors.length > 0 ? (
              <>
                <SectionTitle>Chybné riadky</SectionTitle>
                <Card className="space-y-2">
                  {result.errors.slice(0, 50).map((e) => (
                    <p key={e.sourceRow} className="text-caption">
                      Riadok {e.sourceRow}: {e.reasons.join(" ")}
                    </p>
                  ))}
                  {result.errors.length > 50 ? (
                    <p className="text-caption">… a ďalších {result.errors.length - 50}.</p>
                  ) : null}
                  <label className="flex items-center gap-2 text-xs">
                    <input
                      type="checkbox"
                      checked={allowPartial}
                      onChange={(e) => setAllowPartial(e.target.checked)}
                    />
                    Importovať len platné riadky (chybné vynechať)
                  </label>
                </Card>
              </>
            ) : null}

            <SectionTitle>Priradenie protistrán</SectionTitle>
            <Card className="space-y-2">
              <p className="text-caption">
                Rovnaké meno neznamená rovnaký subjekt — priradenie potvrďte ručne.
              </p>
              {result.counterparties.map((name) => (
                <label key={name} className="block space-y-1">
                  <span className="text-[11px] font-medium text-muted-foreground">{name}</span>
                  <select
                    aria-label={`Protistrana ${name}`}
                    className={inputClass}
                    value={partyMap[name] ?? "new"}
                    onChange={(e) => setPartyMap({ ...partyMap, [name]: e.target.value })}
                  >
                    {partyMap[name]?.startsWith("suggest:") ? (
                      <option value={partyMap[name]}>— potvrďte voľbu —</option>
                    ) : null}
                    <option value="new">Vytvoriť nový subjekt</option>
                    {activeCase.entities.map((entity) => (
                      <option key={entity.id} value={`entity:${entity.id}`}>
                        {entity.name}
                      </option>
                    ))}
                  </select>
                </label>
              ))}
            </Card>

            <SectionTitle>Originál súboru</SectionTitle>
            <Card className="space-y-2">
              <label className="flex items-start gap-2 text-xs">
                <input
                  type="checkbox"
                  checked={storeOriginal}
                  onChange={(e) => setStoreOriginal(e.target.checked)}
                />
                <span>
                  Uložiť originálny súbor do súkromného úložiska aplikácie (Lovable Cloud). Originál
                  sa nikdy neprepíše pri neskoršej editácii transakcií a stiahnuť ho môžete len vy.
                </span>
              </label>
              <p className="text-caption">Kontrolný súčet SHA-256: {hash}</p>
            </Card>

            <Button className="w-full" disabled={busy} onClick={confirmImport}>
              {busy ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : null}
              Potvrdiť a importovať {result.valid.length} riadkov
            </Button>
            <Button variant="outline" className="w-full" onClick={() => setStep("mapping")}>
              Späť na mapovanie
            </Button>
          </>
        ) : null}

        {step === "done" && summary ? (
          <Card className="space-y-2">
            <p className="flex items-center gap-2 text-sm font-semibold">
              <CheckCircle2 className="h-4 w-4 text-risk-low" aria-hidden /> Import dokončený
            </p>
            <p className="text-caption">
              Zapísaných {summary.inserted} transakcií. Každá má odkaz na import a číslo zdrojového
              riadka. {summary.stored ? "Originál je uložený v súkromnom úložisku." : "Originál sa neukladal."}
            </p>
            <Button
              className="w-full"
              onClick={() => {
                setStep("file");
                setFile(null);
                setBuffer(null);
                setResult(null);
                setSummary(null);
              }}
            >
              Importovať ďalší súbor
            </Button>
          </Card>
        ) : null}
      </Screen>
      <BottomNav />
    </PhoneFrame>
  );
}
