import { inflateRawSync } from "node:zlib";

// The text of a Word (.docx) file, so the AI can read a DOCX resume as it reads a text one. A .docx is a zip of XML
// parts: the headers (where many resume templates put the name and contact details), the body and the footers are
// read in that order, keeping paragraphs, tabs and line breaks, then the addresses its links point to (a LinkedIn
// link often shows only "LinkedIn"). No layout, tables become lines.

const MAX_PART_BYTES = 20 * 1024 * 1024;

type ZipEntry = { name: string; method: number; compressedSize: number; localOffset: number };

function zipEntries(zip: Buffer): ZipEntry[] {
  // The end-of-central-directory record: the last 22 bytes, or further back when the zip has a comment.
  let eocd = -1;
  for (let i = zip.length - 22; i >= Math.max(0, zip.length - 22 - 0xffff); i--) {
    if (zip.readUInt32LE(i) === 0x06054b50) {
      eocd = i;
      break;
    }
  }
  if (eocd < 0) throw new Error("not a zip file");
  const count = zip.readUInt16LE(eocd + 10);
  let at = zip.readUInt32LE(eocd + 16);
  const entries: ZipEntry[] = [];
  for (let n = 0; n < count; n++) {
    if (at + 46 > zip.length || zip.readUInt32LE(at) !== 0x02014b50) throw new Error("broken zip directory");
    const nameLength = zip.readUInt16LE(at + 28);
    entries.push({
      method: zip.readUInt16LE(at + 10),
      compressedSize: zip.readUInt32LE(at + 20),
      localOffset: zip.readUInt32LE(at + 42),
      name: zip.toString("utf8", at + 46, at + 46 + nameLength),
    });
    at += 46 + nameLength + zip.readUInt16LE(at + 30) + zip.readUInt16LE(at + 32);
  }
  return entries;
}

function readEntry(zip: Buffer, entry: ZipEntry): string {
  const at = entry.localOffset;
  if (at + 30 > zip.length || zip.readUInt32LE(at) !== 0x04034b50) throw new Error("broken zip entry");
  const start = at + 30 + zip.readUInt16LE(at + 26) + zip.readUInt16LE(at + 28);
  const data = zip.subarray(start, start + entry.compressedSize);
  if (entry.method === 0) return data.toString("utf8");
  if (entry.method === 8) return inflateRawSync(data, { maxOutputLength: MAX_PART_BYTES }).toString("utf8");
  throw new Error(`unsupported compression (${entry.method})`);
}

function decodeXml(s: string): string {
  return s.replace(/&(#x[0-9a-f]+|#\d+|amp|lt|gt|quot|apos);/gi, (whole, code: string) => {
    const lower = code.toLowerCase();
    if (lower === "amp") return "&";
    if (lower === "lt") return "<";
    if (lower === "gt") return ">";
    if (lower === "quot") return '"';
    if (lower === "apos") return "'";
    const n = lower.startsWith("#x") ? parseInt(lower.slice(2), 16) : parseInt(lower.slice(1), 10);
    return Number.isFinite(n) && n > 0 && n <= 0x10ffff ? String.fromCodePoint(n) : whole;
  });
}

// Visible text of one WordprocessingML part. Text boxes come twice (a modern copy and an old VML fallback): the
// fallback is dropped. Deleted text (w:delText) and field codes (w:instrText) are not w:t, so they never show.
function partText(xml: string): string {
  const body = xml.replace(/<mc:Fallback\b[\s\S]*?<\/mc:Fallback>/g, "");
  let out = "";
  for (const m of body.matchAll(/<w:t(?:\s[^>]*)?>([^<]*)<\/w:t>|<w:(tab|br|cr)\b[^>]*\/>|<\/w:p>/g)) {
    if (m[1] !== undefined) out += decodeXml(m[1]);
    else if (m[2] === "tab") out += "\t";
    else out += "\n";
  }
  return out;
}

const partOrder = (name: string): number => (/^word\/header\d*\.xml$/.test(name) ? 0 : name === "word/document.xml" ? 1 : 2);

export function docxText(bytes: Buffer): string {
  let entries: ZipEntry[];
  try {
    entries = zipEntries(bytes);
  } catch {
    throw new Error("This is not a Word (.docx) file, or it is damaged: save it again, or upload a PDF.");
  }
  const parts = entries
    .filter((e) => e.name === "word/document.xml" || /^word\/(header|footer)\d*\.xml$/.test(e.name))
    .sort((a, b) => partOrder(a.name) - partOrder(b.name));
  if (!parts.some((e) => e.name === "word/document.xml")) {
    throw new Error("This is not a Word (.docx) file, or it is damaged: save it again, or upload a PDF.");
  }
  const texts: string[] = [];
  for (const part of parts) {
    try {
      const text = partText(readEntry(bytes, part)).trim();
      if (text) texts.push(text);
    } catch (e) {
      if (part.name === "word/document.xml") {
        throw new Error(`This Word file could not be opened (${(e as Error).message}): save it again, or upload a PDF.`);
      }
    }
  }
  const rels = entries.find((e) => e.name === "word/_rels/document.xml.rels");
  if (rels) {
    try {
      const links = [...readEntry(bytes, rels).matchAll(/<Relationship\b[^>]*>/g)]
        .map((m) => m[0])
        .filter((tag) => /TargetMode="External"/.test(tag) && /\/hyperlink"/.test(tag))
        .map((tag) => decodeXml(tag.match(/Target="([^"]*)"/)?.[1] ?? ""))
        .filter((url) => /^(https?:|mailto:)/i.test(url));
      if (links.length) texts.push(`Links: ${[...new Set(links)].join(" ")}`);
    } catch {
      // Links are a nicety: the text is there without them.
    }
  }
  return texts
    .join("\n\n")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}
