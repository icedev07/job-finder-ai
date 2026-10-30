import { extractLinks, extractText, getDocumentProxy } from "unpdf";

// The text of a PDF, read by the app itself (PDF.js, through unpdf): what a resume exported from Word, Google Docs
// or a browser says, then where its links point (a LinkedIn link often shows only "LinkedIn"). A scan has no text
// layer and reads as "", as does a PDF that PDF.js cannot open (damaged, password-protected): Claude can still read
// those as a document.
export async function pdfText(bytes: Buffer): Promise<string> {
  try {
    const pdf = await getDocumentProxy(new Uint8Array(bytes));
    try {
      const text = (await extractText(pdf, { mergePages: true })).text.trim();
      // A scan with link annotations still has no text.
      if (!text) return "";
      const { links } = await extractLinks(pdf);
      const targets = [...new Set(links.filter((l) => /^(https?:|mailto:)/i.test(l)))];
      return targets.length ? `${text}\n\nLinks: ${targets.join(" ")}` : text;
    } finally {
      await pdf.loadingTask.destroy();
    }
  } catch {
    return "";
  }
}
