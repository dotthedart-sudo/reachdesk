/**
 * Capture a DOM node into a multi-page A4 PDF.
 * jspdf + html2canvas are loaded on demand (no PDF stack existed elsewhere in the app).
 */
export async function exportElementToPdf(element, {
  filename = 'reachdesk-report.pdf',
  marginMm = 10,
} = {}) {
  if (!element) throw new Error('Nothing to export');

  const [{ default: html2canvas }, { jsPDF }] = await Promise.all([
    import('html2canvas'),
    import('jspdf'),
  ]);

  const canvas = await html2canvas(element, {
    scale: 2,
    useCORS: true,
    allowTaint: true,
    backgroundColor: '#ffffff',
    logging: false,
  });

  const imgData = canvas.toDataURL('image/png');
  const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();
  const contentWidth = pageWidth - marginMm * 2;
  const contentHeight = (canvas.height * contentWidth) / canvas.width;

  let heightLeft = contentHeight;
  let y = marginMm;

  pdf.addImage(imgData, 'PNG', marginMm, y, contentWidth, contentHeight);
  heightLeft -= pageHeight - marginMm * 2;

  while (heightLeft > 0) {
    y = marginMm - (contentHeight - heightLeft);
    pdf.addPage();
    pdf.addImage(imgData, 'PNG', marginMm, y, contentWidth, contentHeight);
    heightLeft -= pageHeight - marginMm * 2;
  }

  pdf.save(filename);
}
