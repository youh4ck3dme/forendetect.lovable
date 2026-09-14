import exifr from "exifr";
import JSZip from "jszip";

export interface ForensicMetadata {
  [key: string]: unknown;
}

export interface ForensicStructureNode {
  name: string;
  type: "folder" | "file" | "stream" | "object" | "xml_tag" | "header";
  size?: number | string;
  details?: string;
  warning?: boolean;
  children?: ForensicStructureNode[];
}

export interface ExtractedFinancialEntities {
  ibans: string[];
  icos: string[];
  dics: string[];
  amounts: string[];
  suspiciousKeywords: string[];
}

export interface ForensicAnalysisResult {
  fileName: string;
  fileType: string;
  fileSize: number;
  fileSizeFormatted: string;
  sha256: string;
  md5: string;
  magicBytes: string;
  magicMatch: boolean;
  fileEntropy: number;
  createdAt?: string | undefined;
  modifiedAt?: string | undefined;
  software?: string | undefined;
  author?: string | undefined;
  gps?: { latitude: number; longitude: number } | undefined;
  metadata: ForensicMetadata;
  structureTree: ForensicStructureNode[];
  extractedContentText: string;
  financialEntities: ExtractedFinancialEntities;
  riskScore: number;
  riskLevel: "clean" | "low" | "medium" | "high" | "critical";
  anomalies: {
    id: string;
    title: string;
    severity: "critical" | "high" | "medium" | "low" | "info";
    description: string;
    recommendation: string;
    legalContext?: string | undefined;
  }[];
  hexSample: { offset: string; hex: string; ascii: string }[];
}

function calculateEntropy(uint8Array: Uint8Array): number {
  if (uint8Array.length === 0) return 0;
  const freq = new Array(256).fill(0);
  for (let i = 0; i < uint8Array.length; i++) {
    const val = uint8Array[i];
    if (val !== undefined) {
      freq[val]++;
    }
  }
  let entropy = 0;
  for (let i = 0; i < 256; i++) {
    if (freq[i] > 0) {
      const p = freq[i] / uint8Array.length;
      entropy -= p * Math.log2(p);
    }
  }
  return Number(entropy.toFixed(3));
}

async function calculateHash(
  buffer: ArrayBuffer,
  algorithm: "SHA-256" | "SHA-1",
): Promise<string> {
  if (typeof crypto !== "undefined" && crypto.subtle) {
    try {
      const hashBuffer = await crypto.subtle.digest(algorithm, buffer);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
    } catch {
      return "N/A";
    }
  }
  return "N/A";
}

function generateHexSample(
  bytes: Uint8Array,
  maxBytes = 256,
): { offset: string; hex: string; ascii: string }[] {
  const rows: { offset: string; hex: string; ascii: string }[] = [];
  const len = Math.min(bytes.length, maxBytes);

  for (let i = 0; i < len; i += 16) {
    const chunk = bytes.slice(i, i + 16);
    const offset = i.toString(16).padStart(8, "0").toUpperCase();
    let hex = "";
    let ascii = "";

    for (let j = 0; j < 16; j++) {
      const b = chunk[j];
      if (b !== undefined) {
        hex += b.toString(16).padStart(2, "0").toUpperCase() + " ";
        ascii += b >= 32 && b <= 126 ? String.fromCharCode(b) : ".";
      } else {
        hex += "   ";
      }
      if (j === 7) hex += " ";
    }

    rows.push({ offset, hex: hex.trim(), ascii });
  }
  return rows;
}

export function scanFinancialEntities(
  text: string,
): ExtractedFinancialEntities {
  const ibanRegex = /\b[A-Z]{2}[0-9]{2}(?:[ ]?[0-9A-Z]{4}){4,7}\b/gi;
  const icoRegex = /\b(?:IČO|ICO)?[:\s]*([0-9]{8})\b/gi;
  const dicRegex = /\b(?:DIČ|DIC|IČ DPH)?[:\s]*(SK[0-9]{10}|[0-9]{10})\b/gi;
  const amountRegex =
    /\b(?:[0-9]{1,3}(?:[ .][0-9]{3})*|\d+)(?:[.,][0-9]{2})?\s*(?:EUR|€|USD|\$|CZK|tis\.|mil\.)\b/gi;

  const ibans = Array.from(new Set(text.match(ibanRegex) || []));
  const rawIcos = Array.from(text.matchAll(icoRegex))
    .map((m) => m[1])
    .filter((v): v is string => typeof v === "string");
  const icos = Array.from(new Set(rawIcos));
  const rawDics = Array.from(text.matchAll(dicRegex))
    .map((m) => m[1])
    .filter((v): v is string => typeof v === "string");
  const dics = Array.from(new Set(rawDics));
  const amounts = Array.from(new Set(text.match(amountRegex) || []));

  const keywords = [
    "faktúra",
    "zmluva",
    "dohoda",
    "schránková",
    "offshore",
    "panama",
    "provízia",
    "poradenstvo",
    "subdodávka",
    "fiktívna",
    "hotovosť",
    "fúzia",
    "prevod",
    "likvidácia",
    "konkurz",
    "daňový raj",
    "zbraň",
    "munícia",
  ];

  const suspiciousKeywords: string[] = [];
  const lowerText = text.toLowerCase();
  for (const kw of keywords) {
    if (lowerText.includes(kw)) {
      suspiciousKeywords.push(kw);
    }
  }

  return {
    ibans,
    icos,
    dics,
    amounts,
    suspiciousKeywords,
  };
}

function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
}

const ZIP_MAX_DEPTH = 3;
const ZIP_MAX_ENTRIES = 500;

async function inspectZipEntries(
  zip: JSZip,
  depth = 0,
  prefix = "",
): Promise<{
  nodes: ForensicStructureNode[];
  dangerousFiles: string[];
  text: string[];
}> {
  const nodes: ForensicStructureNode[] = [];
  const dangerousFiles: string[] = [];
  const text: string[] = [];
  const suspiciousExts = [
    ".exe",
    ".bat",
    ".cmd",
    ".scr",
    ".ps1",
    ".vbs",
    ".js",
  ];
  const entries = Object.entries(zip.files).slice(0, ZIP_MAX_ENTRIES);

  for (const [name, entry] of entries) {
    const path = `${prefix}${name}`;
    if (entry.dir) {
      nodes.push({ name: path, type: "folder", details: "Adresár" });
      continue;
    }

    const lowerName = name.toLowerCase();
    const dangerous = suspiciousExts.some((extension) =>
      lowerName.endsWith(extension),
    );
    if (dangerous) dangerousFiles.push(path);

    const node: ForensicStructureNode = {
      name: path,
      type: lowerName.endsWith(".xml") ? "xml_tag" : "file",
      warning: dangerous,
      details: "Komprimovaný súbor",
    };

    if (depth < ZIP_MAX_DEPTH && lowerName.endsWith(".zip")) {
      try {
        const nestedZip = await JSZip.loadAsync(
          await entry.async("arraybuffer"),
        );
        const nested = await inspectZipEntries(
          nestedZip,
          depth + 1,
          `${path}!/`,
        );
        node.children = nested.nodes;
        dangerousFiles.push(...nested.dangerousFiles);
        text.push(...nested.text);
      } catch {
        node.warning = true;
        node.details = "Vnorený ZIP sa nepodarilo načítať";
      }
    } else if (/\.(xml|txt|csv|json)$/i.test(name)) {
      try {
        text.push(await entry.async("text"));
      } catch {
        // Binary or malformed entries are represented in the tree only.
      }
    }

    nodes.push(node);
  }

  return { nodes, dangerousFiles, text };
}

export async function dissectFile(file: File): Promise<ForensicAnalysisResult> {
  const buffer = await file.arrayBuffer();
  const bytes = new Uint8Array(buffer);
  const ext = file.name.split(".").pop()?.toLowerCase() || "";

  const sha256 = await calculateHash(buffer, "SHA-256");
  const md5 = await calculateHash(buffer, "SHA-1");
  const entropy = calculateEntropy(bytes);
  const hexSample = generateHexSample(bytes, 128);

  let magicBytes = "";
  for (let i = 0; i < Math.min(8, bytes.length); i++) {
    const b = bytes[i];
    if (b !== undefined) {
      magicBytes += b.toString(16).padStart(2, "0").toUpperCase() + " ";
    }
  }
  magicBytes = magicBytes.trim();

  const anomalies: ForensicAnalysisResult["anomalies"] = [];
  let structureTree: ForensicStructureNode[] = [];
  let metadata: ForensicMetadata = {};
  let extractedContentText = "";
  let magicMatch = true;
  let software: string | undefined;
  let author: string | undefined;
  let createdAt: string | undefined;
  let modifiedAt: string | undefined;
  let gps: { latitude: number; longitude: number } | undefined;

  // 1. KONTROLA MAGIC BYTES
  if (ext === "pdf") {
    const isPdf =
      bytes[0] === 0x25 &&
      bytes[1] === 0x50 &&
      bytes[2] === 0x44 &&
      bytes[3] === 0x46;
    if (!isPdf) {
      magicMatch = false;
      anomalies.push({
        id: "ANOM-MGC-01",
        title: "Nezrovnalosť Magic Bytes (MIME Mismatch)",
        severity: "critical",
        description: `Súbor má príponu .pdf, ale jeho magické bajty nezodpovedajú formátu PDF (${magicBytes}).`,
        recommendation:
          "Hrozba polyglot súboru, maskovaného spustiteľného kódu alebo poškodenej štruktúry.",
        legalContext:
          "§ 352 TZ - Falšovanie a pozmeňovanie dôkazných prostriedkov",
      });
    }
  } else if (["png", "webp", "jpg", "jpeg"].includes(ext)) {
    const isPng =
      bytes[0] === 0x89 &&
      bytes[1] === 0x50 &&
      bytes[2] === 0x4e &&
      bytes[3] === 0x47;
    const isJpg = bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
    const isWebp =
      bytes[0] === 0x52 &&
      bytes[1] === 0x49 &&
      bytes[2] === 0x46 &&
      bytes[3] === 0x46;
    if (ext === "png" && !isPng) magicMatch = false;
    if (["jpg", "jpeg"].includes(ext) && !isJpg) magicMatch = false;
    if (ext === "webp" && !isWebp) magicMatch = false;

    if (!magicMatch) {
      anomalies.push({
        id: "ANOM-MGC-02",
        title: "Podozrivá hlavička obrazového súboru",
        severity: "high",
        description: `Prípona .${ext} nezodpovedá binárnej hlavičke obrázka.`,
        recommendation:
          "Overte, či nejde o skrytý archív alebo spustiteľný súbor.",
      });
    }
  }

  // 2. PARSOVANIE ŠPECIFICKÝCH FORMÁTOV
  // PDF
  if (ext === "pdf") {
    const textDecoder = new TextDecoder("latin1");
    const rawPdfString = textDecoder.decode(bytes);

    const versionMatch = rawPdfString.match(/%PDF-([0-9.]+)/);
    const pdfVersion = versionMatch ? versionMatch[1] : "Neznáma";

    const eofMatches = rawPdfString.match(/%%EOF/g);
    const revisionsCount = eofMatches ? eofMatches.length : 1;

    if (revisionsCount > 1) {
      anomalies.push({
        id: "ANOM-PDF-01",
        title: `Detegované inkrementálne úpravy (${revisionsCount}x %%EOF)`,
        severity: "medium",
        description: `Dokument obsahuje ${revisionsCount} samostatné revízie. Pôvodný obsah bol prepísaný alebo doplnený po prvotnom vygenerovaní.`,
        recommendation:
          "Skontrolujte jednotlivé revízie a porovnajte zmeny medzi pôvodnou zmluvou a finálnou verziou.",
        legalContext:
          "Zákon o dôveryhodných službách eIDAS / § 40 Občianskeho zákonníka",
      });
    }

    const hasJs = /\/JavaScript|\/JS\b/i.test(rawPdfString);
    if (hasJs) {
      anomalies.push({
        id: "ANOM-PDF-02",
        title: "Vložený aktívny JavaScript v PDF",
        severity: "critical",
        description:
          "V štruktúre PDF boli nájdené objekty /JavaScript alebo /JS, čo predstavuje vysoké riziko zneužitia exploitov alebo dynamickej manipulácie s obsahom formulára.",
        recommendation:
          "Zablokujte spúšťanie skriptov v prehliadači PDF a izolujte vzorku v sandboxe.",
      });
    }

    const creatorMatch = rawPdfString.match(/\/Creator\s*\(([^)]+)\)/);
    const producerMatch = rawPdfString.match(/\/Producer\s*\(([^)]+)\)/);
    const modDateMatch = rawPdfString.match(/\/ModDate\s*\(([^)]+)\)/);
    const createDateMatch = rawPdfString.match(/\/CreationDate\s*\(([^)]+)\)/);

    if (creatorMatch && creatorMatch[1]) metadata["Creator"] = creatorMatch[1];
    if (producerMatch && producerMatch[1]) {
      metadata["Producer"] = producerMatch[1];
      software = producerMatch[1];
    }
    if (createDateMatch && createDateMatch[1]) {
      createdAt = createDateMatch[1];
      metadata["CreationDate"] = createDateMatch[1];
    }
    if (modDateMatch && modDateMatch[1]) {
      modifiedAt = modDateMatch[1];
      metadata["ModDate"] = modDateMatch[1];
    }

    if (software && /photoshop|gimp|illustrator|canva/i.test(software)) {
      anomalies.push({
        id: "ANOM-PDF-03",
        title: "Faktúra / dokument vytvorený v grafickom editore",
        severity: "high",
        description: `Súbor bol spracovaný cez ${software}. Účtovné doklady a zmluvy bežne generujú ERP systémy (SAP, Pohoda, KROS), nie grafické editory.`,
        recommendation:
          "Vysoké podozrenie z pozmenenia číselných hodnôt alebo fiktívnej faktúry.",
        legalContext:
          "§ 261 Trestného zákona - Skresľovanie údajov hospodárskej a obchodnej evidencie",
      });
    }

    const textStreamMatches = rawPdfString.matchAll(/BT[\s\S]*?ET/g);
    const extractedWords: string[] = [];
    for (const match of textStreamMatches) {
      const cleaned = match[0]
        .replace(/\\[0-9]{3}/g, " ")
        .replace(/[()]/g, " ");
      extractedWords.push(cleaned);
    }
    extractedContentText = extractedWords.join(" ");
    if (extractedContentText.length < 50) {
      extractedContentText = rawPdfString
        .replace(/[^\x20-\x7E\s]/g, " ")
        .replace(/\s+/g, " ")
        .slice(0, 5000);
    }

    const objCount = (rawPdfString.match(/[0-9]+\s+[0-9]+\s+obj/g) || [])
      .length;
    const streamCount = (rawPdfString.match(/stream/g) || []).length;

    structureTree = [
      {
        name: `PDF Header (%PDF-${pdfVersion})`,
        type: "header",
        details: `Verzia štandardu PDF: ${pdfVersion}`,
      },
      {
        name: "Katalóg a objekty (Object Catalog)",
        type: "folder",
        details: `Celkový počet objektov: ${objCount}`,
        children: [
          {
            name: "Koreňový objekt (/Root)",
            type: "object",
            details: "Vstupný bod hierarchie stránok",
          },
          {
            name: "Dátové toky (Streams)",
            type: "stream",
            details: `${streamCount} komprimovaných dátových blokov (FlateDecode)`,
          },
          {
            name: `Revízie a xref tabuľky (${revisionsCount}x)`,
            type: "object",
            warning: revisionsCount > 1,
            details:
              revisionsCount > 1
                ? "Inkrementálne zmeny zistené"
                : "Jediná revízia",
          },
          ...(hasJs
            ? [
                {
                  name: "Vložený skript (/JavaScript)",
                  type: "object" as const,
                  warning: true,
                  details: "Detegovaný spustiteľný JavaScript",
                },
              ]
            : []),
        ],
      },
    ];
  }
  // OBRÁZKY
  else if (["png", "webp", "jpg", "jpeg", "tif", "tiff"].includes(ext)) {
    try {
      const parsedExif = await exifr.parse(buffer, {
        tiff: true,
        xmp: true,
        icc: true,
        iptc: true,
        jfif: true,
        gps: true,
      });

      if (parsedExif) {
        metadata = { ...parsedExif };
        if (parsedExif.Software) software = String(parsedExif.Software);
        if (parsedExif.Artist || parsedExif.Make)
          author = `${parsedExif.Make || ""} ${parsedExif.Model || ""}`.trim();
        if (parsedExif.CreateDate || parsedExif.DateTimeOriginal) {
          createdAt = String(
            parsedExif.DateTimeOriginal || parsedExif.CreateDate,
          );
        }
        if (parsedExif.ModifyDate) modifiedAt = String(parsedExif.ModifyDate);
        if (parsedExif.latitude && parsedExif.longitude) {
          gps = {
            latitude: parsedExif.latitude,
            longitude: parsedExif.longitude,
          };
        }

        if (
          software &&
          /photoshop|gimp|lightroom|canva|snapseed/i.test(software)
        ) {
          anomalies.push({
            id: "ANOM-IMG-01",
            title: `Pozmenený obrázok v editore (${software})`,
            severity: "high",
            description: `Metadáta odhaľujú, že fotografia / sken prešiel grafickým editorom (${software}).`,
            recommendation:
              "Vykonajte ELA (Error Level Analysis) a skontrolujte zhodu písma a podpisov.",
            legalContext:
              "Podozrenie na manipuláciu s listinným dôkazom v digitálnej forme.",
          });
        }
      } else {
        anomalies.push({
          id: "ANOM-IMG-02",
          title: "Vymazané / očistené EXIF metadáta",
          severity: "low",
          description:
            "Obrázok neobsahuje žiadne pôvodné kamerové ani expozičné metadáta (EXIF Strip).",
          recommendation:
            "Súbor mohol prejsť cez sociálnu sieť (WhatsApp, Signal, FB) alebo bol úmyselne vyčistený.",
        });
      }
    } catch (e) {
      console.warn("Exifr error:", e);
    }

    structureTree = [
      {
        name: `Binárny kontajner obrázka (.${ext.toUpperCase()})`,
        type: "header",
        details: `MIME typ: image/${ext === "jpg" ? "jpeg" : ext}`,
      },
      {
        name: "Segmenty a metadátové bloky",
        type: "folder",
        children: [
          {
            name: "EXIF / TIFF značky",
            type: "object",
            details:
              Object.keys(metadata).length > 0
                ? `${Object.keys(metadata).length} polí nájdených`
                : "Žiadne polia",
          },
          ...(gps
            ? [
                {
                  name: `GPS Koordináty (${gps.latitude.toFixed(4)}, ${gps.longitude.toFixed(4)})`,
                  type: "object" as const,
                  details: "Obsahuje presnú geolokáciu zhotovenia",
                },
              ]
            : []),
          {
            name: "Obrazové dáta (Image Matrix)",
            type: "stream",
            details: `Veľkosť: ${formatBytes(bytes.length)}`,
          },
        ],
      },
    ];
  }
  // DOCX / XLSX
  else if (["docx", "xlsx", "pptx"].includes(ext)) {
    try {
      const zip = await JSZip.loadAsync(buffer);
      const internalFiles = Object.keys(zip.files);

      const coreXmlFile = zip.file("docProps/core.xml");
      if (coreXmlFile) {
        const coreXml = await coreXmlFile.async("text");
        const creator = coreXml.match(/<dc:creator>([^<]+)<\/dc:creator>/)?.[1];
        const lastModifiedBy = coreXml.match(
          /<cp:lastModifiedBy>([^<]+)<\/cp:lastModifiedBy>/,
        )?.[1];
        const created = coreXml.match(
          /<dcterms:created[^>]*>([^<]+)<\/dcterms:created>/,
        )?.[1];
        const modified = coreXml.match(
          /<dcterms:modified[^>]*>([^<]+)<\/dcterms:modified>/,
        )?.[1];
        const revision = coreXml.match(
          /<cp:revision>([^<]+)<\/cp:revision>/,
        )?.[1];

        if (creator) {
          author = creator;
          metadata["Author"] = creator;
        }
        if (lastModifiedBy) metadata["LastModifiedBy"] = lastModifiedBy;
        if (created) {
          createdAt = created;
          metadata["Created"] = created;
        }
        if (modified) {
          modifiedAt = modified;
          metadata["Modified"] = modified;
        }
        if (revision) metadata["Revision"] = revision;

        if (
          creator &&
          lastModifiedBy &&
          creator.toLowerCase() !== lastModifiedBy.toLowerCase()
        ) {
          anomalies.push({
            id: "ANOM-DOC-01",
            title: `Rozpor v autorstve dokumentu`,
            severity: "medium",
            description: `Dokument vytvoril používateľ "${creator}", ale naposledy ho modifikoval iný používateľ "${lastModifiedBy}" (revízia #${revision || "?"}).`,
            recommendation:
              "Preverte, či dokument nebol poskytnutý treťou stranou alebo dodatočne upravený.",
          });
        }
      }

      const hasMacros = internalFiles.some(
        (f) => f.includes("vbaProject.bin") || f.endsWith(".bin"),
      );
      if (hasMacros) {
        anomalies.push({
          id: "ANOM-DOC-02",
          title: "Detegované vložené VBA Makrá (vbaProject.bin)",
          severity: "critical",
          description:
            "Dokument obsahuje skryté spustiteľné VBA makro. Môže ísť o doručovací mechanizmus škodlivého kódu (Macro malware).",
          recommendation: "Neotvárajte dokument bez izolovaného prostredia.",
        });
      }

      const textFiles =
        ext === "xlsx"
          ? internalFiles.filter((name) =>
              /^xl\/(sharedStrings|worksheets\/.*)\.xml$/i.test(name),
            )
          : ["word/document.xml"];
      const xmlTexts: string[] = [];
      for (const fileName of textFiles) {
        const xmlFile = zip.file(fileName);
        if (xmlFile) xmlTexts.push(await xmlFile.async("text"));
      }
      extractedContentText = xmlTexts
        .join(" ")
        .replace(/<[^>]+>/g, " ")
        .replace(/\s+/g, " ");

      structureTree = [
        {
          name: `OpenXML ZIP Kontajner (${internalFiles.length} vnútorných súborov)`,
          type: "folder",
          children: internalFiles.slice(0, 15).map((name) => ({
            name,
            type: name.endsWith(".xml") ? "xml_tag" : "file",
            warning: name.includes("vbaProject.bin"),
            details: `Vnútorná cesta v ZIP`,
          })),
        },
      ];
    } catch (e) {
      console.warn("Docx error:", e);
    }
  }
  // ZIP
  else if (ext === "zip") {
    try {
      const zip = await JSZip.loadAsync(buffer);
      const fileNames = Object.keys(zip.files);

      const inspected = await inspectZipEntries(zip);
      const dangerousFound = inspected.dangerousFiles;

      if (dangerousFound.length > 0) {
        anomalies.push({
          id: "ANOM-ZIP-01",
          title: `Nebezpečné spustiteľné súbory v ZIP archíve`,
          severity: "critical",
          description: `V archíve boli nájdené spustiteľné skripty: ${dangerousFound.join(", ")}`,
          recommendation:
            "Potenciálny phishing alebo doručenie ransomvéru / keyloggeru.",
        });
      }

      structureTree = [
        {
          name: `ZIP Archív (${fileNames.length} položiek)`,
          type: "folder",
          children: inspected.nodes.slice(0, 20),
        },
      ];
      extractedContentText = inspected.text.join(" ");
    } catch (e) {
      console.warn("Zip error:", e);
    }
  }

  // 3. SKENOVANIE FINANČNÝCH ENTÍT
  const financialEntities = scanFinancialEntities(extractedContentText);

  if (financialEntities.suspiciousKeywords.length > 0) {
    anomalies.push({
      id: "ANOM-FIN-01",
      title: `Zachytené rizikové forenzné deskriptory (${financialEntities.suspiciousKeywords.length})`,
      severity: "medium",
      description: `V texte boli identifikované citlivé pojmy: ${financialEntities.suspiciousKeywords.join(", ")}`,
      recommendation:
        "Preverte väzby subjektov v registri partnerov verejného sektora a katastri.",
      legalContext:
        "Zákon č. 297/2008 Z. z. o ochrane pred legalizáciou príjmov z trestnej činnosti",
    });
  }

  // 4. VÝPOČET RIZIKA
  let riskScore = 15;
  for (const anom of anomalies) {
    if (anom.severity === "critical") riskScore += 35;
    else if (anom.severity === "high") riskScore += 20;
    else if (anom.severity === "medium") riskScore += 10;
    else if (anom.severity === "low") riskScore += 5;
  }
  if (entropy > 7.5 && ext !== "zip") {
    riskScore += 10;
    anomalies.push({
      id: "ANOM-ENT-01",
      title: `Vysoká entropia dát (${entropy} b/B)`,
      severity: "low",
      description:
        "Dátová hustota indikuje silné zašifrovanie alebo kompresiu neštandardného obsahu.",
      recommendation:
        "Skontrolujte prítomnosť skrytých steganografických príloh.",
    });
  }

  riskScore = Math.min(100, Math.max(0, riskScore));

  let riskLevel: ForensicAnalysisResult["riskLevel"] = "clean";
  if (riskScore >= 75) riskLevel = "critical";
  else if (riskScore >= 50) riskLevel = "high";
  else if (riskScore >= 30) riskLevel = "medium";
  else if (riskScore >= 15) riskLevel = "low";

  return {
    fileName: file.name,
    fileType: file.type || `application/${ext}`,
    fileSize: file.size,
    fileSizeFormatted: formatBytes(file.size),
    sha256,
    md5,
    magicBytes,
    magicMatch,
    fileEntropy: entropy,
    createdAt,
    modifiedAt,
    software,
    author,
    gps,
    metadata,
    structureTree,
    extractedContentText: extractedContentText.slice(0, 10000),
    financialEntities,
    riskScore,
    riskLevel,
    anomalies,
    hexSample,
  };
}
