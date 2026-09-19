import * as XLSX from 'xlsx';

/**
 * Netra Unnayan - Excel & CSV Export Helper
 * Exports 100% compliant Microsoft Excel (.xlsx) workbooks and UTF-8 BOM CSV files
 */

/**
 * Download genuine Microsoft Excel (.xlsx) file
 * Opens instantly with 0 errors on Windows Excel, macOS Excel, Android/iOS Office, Google Sheets & LibreOffice.
 */
export const downloadExcelFile = (filename, sheetName, headers, rows, title = '') => {
  try {
    const cleanSheetName = (sheetName || 'Report').replace(/[*?:/\\\[\]]/g, '').substring(0, 31);
    
    // Normalize headers
    const normalizedHeaders = (headers || []).map(h => {
      if (typeof h === 'object' && h !== null) {
        return { key: h.key || h.id || h.label, label: h.label || h.header || h.name || h.key };
      }
      return { key: h, label: String(h) };
    });

    // Build worksheet data rows
    const dataRows = (rows || []).map(row => {
      const rowObj = {};
      normalizedHeaders.forEach(h => {
        let val = '';
        if (typeof row === 'object' && row !== null && !Array.isArray(row)) {
          val = row[h.key] !== undefined ? row[h.key] : (row[h.label] !== undefined ? row[h.label] : '');
        } else if (Array.isArray(row)) {
          const idx = normalizedHeaders.indexOf(h);
          val = row[idx] !== undefined ? row[idx] : '';
        }
        if (val === null || val === undefined) val = '';
        rowObj[h.label] = val;
      });
      return rowObj;
    });

    const worksheet = XLSX.utils.json_to_sheet(dataRows);

    // Auto-fit column widths
    const colWidths = normalizedHeaders.map(h => {
      const headerLen = String(h.label || '').length;
      const maxDataLen = (rows || []).reduce((max, r) => {
        const val = typeof r === 'object' && r !== null ? (r[h.key] || '') : '';
        return Math.max(max, String(val).length);
      }, 0);
      return { wch: Math.max(headerLen + 4, Math.min(maxDataLen + 4, 45)) };
    });
    worksheet['!cols'] = colWidths;

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, cleanSheetName);

    const cleanFilename = filename.toLowerCase().endsWith('.xlsx')
      ? filename
      : `${filename.replace(/\.xlsx?$|\.csv$/i, '')}.xlsx`;

    XLSX.writeFile(workbook, cleanFilename);
  } catch (err) {
    console.error('XLSX export failed, falling back to CSV:', err);
    downloadCSVFile(filename, headers, rows);
  }
};

/**
 * Download clean CSV with UTF-8 BOM
 * Guaranteed compatibility with Microsoft Excel on Windows & macOS
 */
export const downloadCSVFile = (filename, headers, rows) => {
  const normalizedHeaders = (headers || []).map(h => {
    if (typeof h === 'object' && h !== null) {
      return { key: h.key || h.id || h.label, label: h.label || h.header || h.name || h.key };
    }
    return { key: h, label: String(h) };
  });

  let csvContent = normalizedHeaders.map(h => `"${String(h.label).replace(/"/g, '""')}"`).join(',') + '\r\n';

  (rows || []).forEach(row => {
    const rowValues = normalizedHeaders.map(h => {
      let val = '';
      if (typeof row === 'object' && row !== null && !Array.isArray(row)) {
        val = row[h.key] !== undefined ? row[h.key] : (row[h.label] !== undefined ? row[h.label] : '');
      } else if (Array.isArray(row)) {
        const idx = normalizedHeaders.indexOf(h);
        val = row[idx] !== undefined ? row[idx] : '';
      }
      if (val === null || val === undefined) val = '';
      return `"${String(val).replace(/"/g, '""')}"`;
    });
    csvContent += rowValues.join(',') + '\r\n';
  });

  const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  const cleanFilename = filename.toLowerCase().endsWith('.csv')
    ? filename
    : `${filename.replace(/\.xlsx?$|\.csv$/i, '')}.csv`;
  link.download = cleanFilename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
};

/**
 * Flexible wrapper for Excel export supporting both signatures
 */
export const exportToExcel = (arg1, arg2, arg3, arg4, arg5) => {
  if (Array.isArray(arg1) && Array.isArray(arg2)) {
    const columns = arg1.map(c => ({ key: c.key || c.id || c, label: c.header || c.label || c.name || c.key || c }));
    const rows = arg2;
    const filename = arg3 || 'Report';
    const title = arg4 || filename;
    downloadExcelFile(filename, 'Sheet1', columns, rows, title);
  } else {
    downloadExcelFile(arg1, arg2, arg3, arg4, arg5);
  }
};

/**
 * Flexible wrapper for CSV export
 */
export const exportToCsv = (arg1, arg2, arg3) => {
  if (Array.isArray(arg1) && Array.isArray(arg2)) {
    const columns = arg1.map(c => ({ key: c.key || c.id || c, label: c.header || c.label || c.name || c.key || c }));
    downloadCSVFile(arg3 || 'Report', columns, arg2);
  } else {
    downloadCSVFile(arg1, arg2, arg3);
  }
};
