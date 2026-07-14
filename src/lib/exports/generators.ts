/**
 * Export generators — produce file content in PDF, DOCX, Markdown, ZIP formats.
 *
 * Each generator takes content + options and returns a Buffer.
 *
 * Heavy packages (pdfkit, docx, archiver) are dynamically imported
 * so they're only loaded when the specific format is requested. This
 * avoids bundler issues and keeps the module lightweight.
 */

// ===== Types =====

export interface ExportContent {
  title: string;
  body: string;
  items?: Array<{ text: string; score?: number; rationale?: string }>;
  metadata?: Record<string, unknown>;
}

export interface ExportOptions {
  pageSize?: 'A4' | 'Letter';
  orientation?: 'portrait' | 'landscape';
  includeMetadata?: boolean;
  filename?: string;
}

// ===== Markdown =====

export async function generateMarkdown(content: ExportContent, _opts?: ExportOptions): Promise<Buffer> {
  const lines: string[] = [];
  lines.push(`# ${content.title}`);
  lines.push('');

  if (content.body) {
    lines.push(content.body);
    lines.push('');
  }

  if (content.items && content.items.length > 0) {
    lines.push('## Results');
    lines.push('');
    for (let i = 0; i < content.items.length; i++) {
      const item = content.items[i];
      lines.push(`### ${i + 1}. ${item.text}`);
      if (item.score !== undefined) {
        lines.push(`- **Score:** ${item.score}/100`);
      }
      if (item.rationale) {
        lines.push(`- **Rationale:** ${item.rationale}`);
      }
      lines.push('');
    }
  }

  if (content.metadata && _opts?.includeMetadata !== false) {
    lines.push('---');
    lines.push('');
    lines.push('## Metadata');
    lines.push('');
    lines.push('```json');
    lines.push(JSON.stringify(content.metadata, null, 2));
    lines.push('```');
  }

  return Buffer.from(lines.join('\n'), 'utf-8');
}

// ===== PDF =====

export async function generatePdf(content: ExportContent, opts?: ExportOptions): Promise<Buffer> {
  // Dynamic require to bypass Turbopack static analysis
  let PDFDocument: any;
  try {
    PDFDocument = (globalThis as any).require('pdfkit');
  } catch {
    // Fallback: generate a simple text file
    const text = `${content.title}\n\n${content.body}\n`;
    return Buffer.from(text, 'utf-8');
  }

  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    const doc = new PDFDocument({
      size: opts?.pageSize ?? 'A4',
      layout: opts?.orientation ?? 'portrait',
      margin: 50,
      info: {
        Title: content.title,
        Producer: 'Content Smuggler',
      },
    });

    doc.on('data', (chunk: Buffer) => chunks.push(chunk));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    // Title
    doc.fontSize(20).font('Helvetica-Bold').text(content.title, { align: 'center' });
    doc.moveDown(0.5);

    // Body
    if (content.body) {
      doc.fontSize(11).font('Helvetica').text(content.body, { align: 'left' });
      doc.moveDown(1);
    }

    // Items
    if (content.items && content.items.length > 0) {
      doc.fontSize(14).font('Helvetica-Bold').text('Results', { underline: true });
      doc.moveDown(0.3);

      for (let i = 0; i < content.items.length; i++) {
        const item = content.items[i];
        doc.fontSize(12).font('Helvetica-Bold').text(`${i + 1}. ${item.text}`);
        doc.moveDown(0.1);

        doc.fontSize(10).font('Helvetica');
        if (item.score !== undefined) {
          doc.text(`Score: ${item.score}/100`);
        }
        if (item.rationale) {
          doc.text(`Rationale: ${item.rationale}`);
        }
        doc.moveDown(0.3);
      }
    }

    // Metadata
    if (content.metadata && opts?.includeMetadata !== false) {
      doc.moveDown(1);
      doc.fontSize(10).font('Helvetica-Oblique').fillColor('gray').text(
        `Generated: ${new Date().toISOString()}\nMetadata: ${JSON.stringify(content.metadata, null, 2)}`,
      );
    }

    doc.end();
  });
}

// ===== DOCX =====

export async function generateDocx(content: ExportContent, _opts?: ExportOptions): Promise<Buffer> {
  // Dynamic require to bypass Turbopack static analysis
  let docxModule: any;
  try {
    docxModule = (globalThis as any).require('docx');
  } catch {
    // Fallback: generate a simple text file
    const text = `${content.title}\n\n${content.body}\n`;
    return Buffer.from(text, 'utf-8');
  }
  const { Document, Packer, Paragraph, TextRun, HeadingLevel } = docxModule;

  const children: InstanceType<typeof Paragraph>[] = [];

  // Title
  children.push(
    new Paragraph({
      text: content.title,
      heading: HeadingLevel.HEADING_1,
      alignment: 'center' as never,
    }),
  );

  children.push(new Paragraph({ text: '' }));

  // Body
  if (content.body) {
    children.push(new Paragraph({ text: content.body }));
    children.push(new Paragraph({ text: '' }));
  }

  // Items
  if (content.items && content.items.length > 0) {
    children.push(
      new Paragraph({
        text: 'Results',
        heading: HeadingLevel.HEADING_2,
      }),
    );

    for (let i = 0; i < content.items.length; i++) {
      const item = content.items[i];
      children.push(
        new Paragraph({
          children: [
            new TextRun({ text: `${i + 1}. ${item.text}`, bold: true }),
          ],
        }),
      );

      const metaParts: InstanceType<typeof TextRun>[] = [];
      if (item.score !== undefined) {
        metaParts.push(new TextRun({ text: `Score: ${item.score}/100`, italics: true }));
      }
      if (item.rationale) {
        metaParts.push(new TextRun({ text: ` — ${item.rationale}`, italics: true }));
      }
      if (metaParts.length > 0) {
        children.push(new Paragraph({ children: metaParts }));
      }
      children.push(new Paragraph({ text: '' }));
    }
  }

  // Metadata
  if (content.metadata && _opts?.includeMetadata !== false) {
    children.push(new Paragraph({ text: '' }));
    children.push(
      new Paragraph({
        children: [
          new TextRun({
            text: `Generated: ${new Date().toISOString()}`,
            italics: true,
            color: '808080',
          }),
        ],
      }),
    );
  }

  const doc = new Document({
    sections: [{ properties: {}, children }],
  });

  return Packer.toBuffer(doc);
}

// ===== ZIP =====

export async function generateZip(
  files: Array<{ filename: string; content: Buffer }>,
  _opts?: ExportOptions,
): Promise<Buffer> {
  // Dynamic require to bypass Turbopack static analysis
  let archiver: any;
  try {
    archiver = (globalThis as any).require('archiver');
  } catch {
    // Fallback: concatenate files as a simple text bundle
    const lines = files.map((f) => `=== ${f.filename} ===\n${f.content.toString('utf-8')}`).join('\n\n');
    return Buffer.from(lines, 'utf-8');
  }

  return new Promise((resolve, reject) => {
    const archive = archiver('zip', { zlib: { level: 9 } });
    const chunks: Buffer[] = [];

    archive.on('data', (chunk: Buffer) => chunks.push(chunk));
    archive.on('warning', (err: Error) => console.warn('[zip] warning:', err.message));
    archive.on('error', (err: Error) => reject(err));
    archive.on('close', () => resolve(Buffer.concat(chunks)));
    archive.on('end', () => resolve(Buffer.concat(chunks)));

    for (const file of files) {
      archive.append(file.content, { name: file.filename });
    }

    archive.finalize();
  });
}

// ===== JSON =====

export async function generateJson(data: unknown, _opts?: ExportOptions): Promise<Buffer> {
  return Buffer.from(JSON.stringify(data, null, 2), 'utf-8');
}

// ===== CSV =====

export async function generateCsv(rows: Record<string, unknown>[], _opts?: ExportOptions): Promise<Buffer> {
  if (rows.length === 0) {
    return Buffer.from('', 'utf-8');
  }

  const headers = Object.keys(rows[0]);
  const lines = [headers.join(',')];

  for (const row of rows) {
    const values = headers.map((h) => {
      const val = row[h];
      if (val === null || val === undefined) return '';
      const str = String(val);
      // Escape quotes + wrap in quotes if contains comma/quote/newline
      if (/[",\n]/.test(str)) {
        return `"${str.replace(/"/g, '""')}"`;
      }
      return str;
    });
    lines.push(values.join(','));
  }

  return Buffer.from(lines.join('\n'), 'utf-8');
}

