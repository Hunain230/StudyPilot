import PDFDocument from 'pdfkit';
import { Response } from 'express';

/**
 * Pipes a PDFKit document directly into the Express HTTP response.
 */
export function streamPDF(
  res: Response,
  filename: string,
  builder: (doc: InstanceType<typeof PDFDocument>) => void
) {
  const doc = new PDFDocument({ margin: 50, size: 'A4' });

  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
  doc.pipe(res);

  // Core Header
  doc.fontSize(22).fillColor('#2563eb').text('StudyPilot AI', { align: 'center' });
  doc.moveDown(0.3);
  doc.fontSize(9).fillColor('#64748b').text(`Academic Performance Report • Generated: ${new Date().toLocaleString()}`, { align: 'center' });
  doc.moveDown(0.8);
  doc.moveTo(50, doc.y).lineTo(545, doc.y).strokeColor('#e2e8f0').lineWidth(1).stroke();
  doc.moveDown(1);

  builder(doc);

  doc.end();
}

/**
 * Draws a section heading with a line separator.
 */
export function addSection(doc: InstanceType<typeof PDFDocument>, title: string) {
  doc.moveDown(1.5);
  doc.fontSize(14).fillColor('#0f172a').font('Helvetica-Bold').text(title);
  doc.moveDown(0.3);
  doc.moveTo(50, doc.y).lineTo(545, doc.y).strokeColor('#2563eb').lineWidth(1.5).stroke();
  doc.moveDown(0.8);
  doc.fontSize(10).fillColor('#334155').font('Helvetica');
}

/**
 * Draws a grid-aligned table with pagination page-break checks.
 */
export function addTable(
  doc: InstanceType<typeof PDFDocument>,
  headers: string[],
  rows: string[][],
  colWidths: number[]
) {
  const startX = 50;
  let y = doc.y;
  const rowH = 22;

  // Header row
  doc.fillColor('#2563eb').font('Helvetica-Bold').fontSize(9);
  headers.forEach((h, i) => {
    const colX = startX + colWidths.slice(0, i).reduce((a, b) => a + b, 0);
    doc.text(h, colX, y, { width: colWidths[i], align: 'left' });
  });
  
  y += rowH;
  doc.moveTo(50, y - 5).lineTo(545, y - 5).strokeColor('#cbd5e1').lineWidth(1).stroke();

  // Data rows
  doc.fillColor('#334155').font('Helvetica').fontSize(9);
  rows.forEach(row => {
    // Check for page overflow (A4 height is 841, margins are 50)
    if (y > 750) {
      doc.addPage();
      y = 50;
      
      // Draw headers again on new page
      doc.fillColor('#2563eb').font('Helvetica-Bold').fontSize(9);
      headers.forEach((h, i) => {
        const colX = startX + colWidths.slice(0, i).reduce((a, b) => a + b, 0);
        doc.text(h, colX, y, { width: colWidths[i], align: 'left' });
      });
      y += rowH;
      doc.moveTo(50, y - 5).lineTo(545, y - 5).strokeColor('#cbd5e1').lineWidth(1).stroke();
      doc.fillColor('#334155').font('Helvetica').fontSize(9);
    }

    row.forEach((cell, i) => {
      const colX = startX + colWidths.slice(0, i).reduce((a, b) => a + b, 0);
      doc.text(cell || '', colX, y, { width: colWidths[i], align: 'left' });
    });
    
    y += rowH;
  });

  doc.y = y + 10;
}
