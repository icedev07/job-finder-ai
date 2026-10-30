import { inflateRawSync } from "node:zlib";

// The text of a Word (.docx) file, so the AI can read a DOCX resume as it reads a text one. A .docx is a zip of XML
// parts: the main document (named by the package's relationships: usually word/document.xml, sometimes
// document2.xml), its headers (where many resume templates put the name and contact details) and footers are read
// in that order, keeping paragraphs, tabs and line breaks, then the addresses its links point to (a LinkedIn link
// often shows only "LinkedIn"). No layout: tables become lines.

const MAX_PART_BYTES = 20 * 1024 * 1024;
const DAMAGED = "This is not a Word (.docx) file, or it is damaged: save it again as .docx or PDF.";

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

// Any namespace prefix (w: in nearly every file, others from some generators) or none.
const P = "(?:[\\w.-]+:)?";
// Paragraph properties hold tab stops (<w:tabs><w:tab …/>), not tabs: dropped first. Text boxes come twice (a
// modern copy and an old VML fallback): the fallback is dropped.
const PROPERTIES = new RegExp(`<${P}pPr(?:\\s[^>]*)?(?<!/)>[\\s\\S]*?</${P}pPr>`, "g");
const FALLBACK = new RegExp(`<${P}Fallback(?:\\s[^>]*)?(?<!/)>[\\s\\S]*?</${P}Fallback>`, "g");
const PIECES = new RegExp(`<${P}t(?:\\s[^>]*)?>([^<]*)</${P}t>|<${P}(tab|br|cr)(?:\\s[^>]*)?/>|</${P}p>`, "g");

// Visible text of one WordprocessingML part. Deleted text (delText) and field codes (instrText) are not t, so they
// never show.
function partText(xml: string): string {
  const body = xml.replace(FALLBACK, "").replace(PROPERTIES, "");
  let out = "";
  for (const m of body.matchAll(PIECES)) {
    if (m[1] !== undefined) out += decodeXml(m[1]);
    else if (m[2] === "tab") out += "\t";
    else out += "\n";
  }
  return out;
}

type Relationship = { type: string; target: string; external: boolean };

function relationships(xml: string): Relationship[] {
  return [...xml.matchAll(/<(?:[\w.-]+:)?Relationship\b[^>]*>/g)].map((m) => ({
    type: m[0].match(/\bType="([^"]*)"/)?.[1] ?? "",
    target: decodeXml(m[0].match(/\bTarget="([^"]*)"/)?.[1] ?? ""),
    external: /\bTargetMode="External"/.test(m[0]),
  }));
}

// A target relative to a part's folder ("header1.xml" from word/document.xml), or from the package root ("/word/…").
function resolve(from: string, target: string): string {
  if (target.startsWith("/")) return target.slice(1);
  const parts = from.split("/").slice(0, -1);
  for (const piece of target.split("/")) {
    if (piece === "..") parts.pop();
    else if (piece && piece !== ".") parts.push(piece);
  }
  return parts.join("/");
}

// What a file that is not a zip really is, when it says so in its first bytes.
function notAZip(bytes: Buffer): string {
  if (bytes.subarray(0, 8).equals(Buffer.from([0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1]))) {
    return "This is an old Word (.doc) file or a password-protected one: save it without a password as .docx or PDF.";
  }
  if (bytes.subarray(0, 5).toString("latin1") === "{\\rtf") return "This is an RTF file with a .docx name: save it as .docx or PDF.";
  return DAMAGED;
}

export function docxText(bytes: Buffer): string {
  let entries: ZipEntry[];
  try {
    entries = zipEntries(bytes);
  } catch {
    throw new Error(notAZip(bytes));
  }
  const byName = new Map(entries.map((e) => [e.name.replace(/^\//, ""), e]));
  const read = (name: string): string | null => {
    const entry = byName.get(name);
    return entry ? readEntry(bytes, entry) : null;
  };

  // The main document, as the package names it.
  let main = "word/document.xml";
  try {
    const root = relationships(read("_rels/.rels") ?? "").find((r) => r.type.endsWith("/officeDocument") && !r.external);
    if (root && byName.has(resolve("", root.target))) main = resolve("", root.target);
  } catch {
    // No readable package relationships: the usual name.
  }
  if (!byName.has(main)) main = [...byName.keys()].find((n) => /^word\/document\d*\.xml$/.test(n)) ?? main;
  let mainXml: string | null;
  try {
    mainXml = read(main);
  } catch (e) {
    throw new Error(`This Word file could not be opened (${(e as Error).message}): save it again as .docx or PDF.`);
  }
  if (mainXml == null) throw new Error(DAMAGED);

  // Its headers, the body, its footers; then where its links point.
  const slash = main.lastIndexOf("/");
  const relsName = `${main.slice(0, slash + 1)}_rels/${main.slice(slash + 1)}.rels`;
  let rels: Relationship[] = [];
  try {
    rels = relationships(read(relsName) ?? "");
  } catch {
    // Without them: the body alone.
  }
  const parts = (kind: string) =>
    rels.filter((r) => !r.external && r.type.endsWith(`/${kind}`)).map((r) => resolve(main, r.target));
  const texts: string[] = [];
  for (const name of [...parts("header"), main, ...parts("footer")]) {
    try {
      const text = partText(name === main ? mainXml : (read(name) ?? "")).trim();
      if (text && !texts.includes(text)) texts.push(text);
    } catch {
      // A header or footer that cannot be read: the rest still is.
    }
  }
  const links = [...new Set(rels.filter((r) => r.external && r.type.endsWith("/hyperlink") && /^(https?:|mailto:)/i.test(r.target)).map((r) => r.target))];
  if (links.length) texts.push(`Links: ${links.join(" ")}`);
  return texts
    .join("\n\n")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}
