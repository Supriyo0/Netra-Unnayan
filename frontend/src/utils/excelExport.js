/**
 * Netra Unnayan - Excel & CSV Export Helper
 * Provides 100% compliant UTF-8 BOM CSV and Formatted Excel XML (.xls) downloads
 */

/**
 * Download formatted HTML-XML Excel spreadsheet (.xls)
 * Opens cleanly in Microsoft Excel, LibreOffice, and Google Sheets with formatting and colors.
 */
export const downloadExcelFile = (filename, sheetName, headers, rows, title = '') => {
  const cleanTitle = title || filename.replace(/_/g, ' ');
  const dateStr = new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' });

  let html = `
    <html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">
      <head>
        <meta http-equiv="content-type" content="application/vnd.ms-excel; charset=UTF-8">
        <!--[if gte mso 9]>
        <xml>
          <x:ExcelWorkbook>
            <x:ExcelWorksheets>
              <x:ExcelWorksheet>
                <x:Name>${(sheetName || 'Report').substring(0, 31)}</x:Name>
                <x:WorksheetOptions><x:DisplayGridlines/></x:WorksheetOptions>
              </x:ExcelWorksheet>
            </x:ExcelWorksheets>
          </x:ExcelWorkbook>
        </xml>
        <![endif]-->
        <style>
          body { font-family: Calibri, 'Segoe UI', Arial, sans-serif; }
          .title { font-size: 16pt; font-weight: bold; color: #060D17; background-color: #E2E8F0; text-align: center; }
          .subtitle { font-size: 10pt; color: #475569; text-align: center; }
          .header { background-color: #06B6D4; color: #060D17; font-weight: bold; font-size: 11pt; border: 1px solid #0891B2; text-align: center; }
          .data-row td { border: 1px solid #E2E8F0; font-size: 10pt; padding: 6px; }
          .number { text-align: right; }
          .currency { text-align: right; font-weight: bold; }
          .center { text-align: center; }
          .bold { font-weight: bold; }
          .even { background-color: #F8FAFC; }
        </style>
      </head>
      <body>
        <table border="1" cellpadding="5" cellspacing="0">
          <tr>
            <td colspan="${headers.length}" class="title">${cleanTitle}</td>
          </tr>
          <tr>
            <td colspan="${headers.length}" class="subtitle">Generated on: ${dateStr} &bull; Netra Unnayan Eye Clinic &amp; Store</td>
          </tr>
          <tr><td colspan="${headers.length}"></td></tr>
          <tr>
            ${headers.map(h => `<th class="header">${h.label || h}</th>`).join('')}
          </tr>
          ${rows.map((row, rIdx) => `
            <tr class="data-row ${rIdx % 2 === 0 ? 'even' : ''}">
              ${headers.map(h => {
                const key = h.key || h;
                let val = typeof row === 'object' && key in row ? row[key] : (Array.isArray(row) ? row[headers.indexOf(h)] : '');
                if (val === null || val === undefined) val = '';
                const isNum = typeof val === 'number';
                return `<td class="${isNum ? 'number' : ''}">${val}</td>`;
              }).join('')}
            </tr>
          `).join('')}
        </table>
      </body>
    </html>
  `;

  const blob = new Blob(['\uFEFF' + html], { type: 'application/vnd.ms-excel;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename.endsWith('.xls') ? filename : `${filename}.xls`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
};

/**
 * Download clean CSV with UTF-8 BOM
 * Guaranteed compatibility with Microsoft Excel on Windows & macOS
 */
export const downloadCSVFile = (filename, headers, rows) => {
  const headerKeys = headers.map(h => h.key || h);
  const headerLabels = headers.map(h => h.label || h);

  let csvContent = headerLabels.map(l => `"${String(l).replace(/"/g, '""')}"`).join(',') + '\r\n';

  rows.forEach(row => {
    const rowValues = headerKeys.map((key, idx) => {
      let val = typeof row === 'object' && key in row ? row[key] : (Array.isArray(row) ? row[idx] : '');
      if (val === null || val === undefined) val = '';
      return `"${String(val).replace(/"/g, '""')}"`;
    });
    csvContent += rowValues.join(',') + '\r\n';
  });

  const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename.endsWith('.csv') ? filename : `${filename}.csv`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
};

/**
 * Flexible wrapper for Excel export supporting both (columns, rows, filename, title) and (filename, sheetName, headers, rows, title)
 */
export const exportToExcel = (arg1, arg2, arg3, arg4, arg5) => {
  if (Array.isArray(arg1) && Array.isArray(arg2)) {
    // Called as: exportToExcel(columns, rows, filename, title)
    const columns = arg1.map(c => ({ key: c.key || c.id || c, label: c.header || c.label || c.name || c.key || c }));
    const rows = arg2;
    const filename = arg3 || 'Report';
    const title = arg4 || filename;
    downloadExcelFile(filename, 'Sheet1', columns, rows, title);
  } else {
    // Called as: exportToExcel(filename, sheetName, headers, rows, title)
    downloadExcelFile(arg1, arg2, arg3, arg4, arg5);
  }
};

/**
 * Flexible wrapper for CSV export
 */
export const exportToCsv = (arg1, arg2, arg3) => {
  if (Array.isArray(arg1) && Array.isArray(arg2)) {
    // Called as: exportToCsv(columns, rows, filename)
    const columns = arg1.map(c => ({ key: c.key || c.id || c, label: c.header || c.label || c.name || c.key || c }));
    downloadCSVFile(arg3 || 'Report', columns, arg2);
  } else {
    // Called as: exportToCsv(filename, headers, rows)
    downloadCSVFile(arg1, arg2, arg3);
  }
};

