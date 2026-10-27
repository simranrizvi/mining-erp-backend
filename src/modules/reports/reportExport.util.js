const ExcelJS = require('exceljs');
const PDFDocument = require('pdfkit');

/** Streams a rows-of-objects array as a formatted .xlsx workbook directly to the response. */
async function exportToExcel(res, { title, rows, filename }) {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'Mining Management ERP';
  const sheet = workbook.addWorksheet(title.slice(0, 30));

  if (rows.length === 0) {
    sheet.addRow(['No data available for the selected filters.']);
  } else {
    const columns = Object.keys(rows[0]);
    sheet.columns = columns.map((key) => ({
      header: key.replace(/([A-Z])/g, ' $1').replace(/^./, (s) => s.toUpperCase()),
      key,
      width: 20,
    }));
    sheet.getRow(1).font = { bold: true };
    sheet.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE8801A' } };
    rows.forEach((row) => sheet.addRow(row));
  }

  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.setHeader('Content-Disposition', `attachment; filename="${filename}.xlsx"`);
  await workbook.xlsx.write(res);
  res.end();
}

/** Streams a rows-of-objects array as a simple tabular PDF report directly to the response. */
function exportToPDF(res, { title, rows, filename }) {
  const doc = new PDFDocument({ margin: 40, size: 'A4', layout: 'landscape' });
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `attachment; filename="${filename}.pdf"`);
  doc.pipe(res);

  doc.fontSize(18).fillColor('#E8801A').text(title, { align: 'left' });
  doc.moveDown(0.3);
  doc.fontSize(9).fillColor('#666666').text(`Generated: ${new Date().toLocaleString()}`);
  doc.moveDown(0.8);

  if (rows.length === 0) {
    doc.fontSize(11).fillColor('#000000').text('No data available for the selected filters.');
    doc.end();
    return;
  }

  const columns = Object.keys(rows[0]);
  const colWidth = (doc.page.width - 80) / columns.length;
  let y = doc.y;

  doc.fontSize(9).fillColor('#000000');
  columns.forEach((col, i) => {
    doc.text(col.replace(/([A-Z])/g, ' $1').replace(/^./, (s) => s.toUpperCase()), 40 + i * colWidth, y, { width: colWidth, ellipsis: true });
  });
  y += 18;
  doc.moveTo(40, y - 4).lineTo(doc.page.width - 40, y - 4).strokeColor('#E8801A').stroke();

  rows.forEach((row) => {
    if (y > doc.page.height - 60) {
      doc.addPage();
      y = 40;
    }
    columns.forEach((col, i) => {
      doc.fontSize(8).fillColor('#222222').text(String(row[col] ?? '-'), 40 + i * colWidth, y, { width: colWidth, ellipsis: true });
    });
    y += 16;
  });

  doc.end();
}

module.exports = { exportToExcel, exportToPDF };
