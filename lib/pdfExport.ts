import PDFDocument from "pdfkit";

function streamToBuffer(doc: PDFKit.PDFDocument): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    doc.on("data", (chunk) => chunks.push(chunk));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);
  });
}

function formatValue(value: unknown): string {
  if (value === null || value === undefined) return "—";
  if (value instanceof Date) return value.toISOString().slice(0, 19).replace("T", " ");
  return String(value);
}

function chunk<T>(arr: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

const PAGE_WIDTH = 841.89; // A4 landscape (pt)
const PAGE_HEIGHT = 595.28;
const MARGIN = 40;
const CONTENT_WIDTH = PAGE_WIDTH - MARGIN * 2;
const FIELDS_PER_LINE = 3;

function addSection(doc: PDFKit.PDFDocument, title: string, rows: Record<string, unknown>[]) {
  doc.addPage();
  doc.fontSize(16).font("Helvetica-Bold").fillColor("#0f172a").text(title);
  doc.moveDown(0.3);
  doc
    .fontSize(9)
    .font("Helvetica")
    .fillColor("#64748b")
    .text(`${rows.length} ligne(s)`);
  doc.moveDown(1);

  if (rows.length === 0) {
    doc.fontSize(10).fillColor("#94a3b8").text("Aucune donnée.");
    return;
  }

  const fields = Object.keys(rows[0]);
  const fieldChunks = chunk(fields, FIELDS_PER_LINE);
  const colWidth = CONTENT_WIDTH / FIELDS_PER_LINE;

  rows.forEach((row, i) => {
    if (doc.y > PAGE_HEIGHT - MARGIN - 70) {
      doc.addPage();
    }

    doc.fontSize(9).font("Helvetica-Bold").fillColor("#0f172a").text(`#${i + 1}`);

    for (const line of fieldChunks) {
      const y = doc.y;
      line.forEach((field, colIndex) => {
        doc
          .fontSize(8)
          .font("Helvetica")
          .fillColor("#334155")
          .text(`${field}: ${formatValue(row[field])}`, MARGIN + colIndex * colWidth, y, {
            width: colWidth - 8,
            lineBreak: false,
          });
      });
      doc.y = y + 12;
    }

    doc.moveDown(0.4);
    doc
      .moveTo(MARGIN, doc.y)
      .lineTo(PAGE_WIDTH - MARGIN, doc.y)
      .strokeColor("#e2e8f0")
      .stroke();
    doc.moveDown(0.4);
  });
}

export async function generateRawDataPdf(data: {
  participants: Record<string, unknown>[];
  seances: Record<string, unknown>[];
  carnets: Record<string, unknown>[];
  suivis: Record<string, unknown>[];
}): Promise<Buffer> {
  const doc = new PDFDocument({ layout: "landscape", size: "A4", margin: MARGIN, bufferPages: true });

  doc
    .fontSize(20)
    .font("Helvetica-Bold")
    .fillColor("#0f172a")
    .text("Étude craving & activité physique", { align: "center" });
  doc.moveDown(0.3);
  doc
    .fontSize(11)
    .font("Helvetica")
    .fillColor("#64748b")
    .text("Export complet des données brutes", { align: "center" });
  doc.moveDown(0.2);
  doc
    .fontSize(9)
    .text(`Généré le ${new Date().toLocaleString("fr-FR")}`, { align: "center" });

  addSection(doc, "Participants", data.participants);
  addSection(doc, "Mesures séance", data.seances);
  addSection(doc, "Carnet jour", data.carnets);
  addSection(doc, "Mesures suivi", data.suivis);

  doc.end();
  return streamToBuffer(doc);
}
