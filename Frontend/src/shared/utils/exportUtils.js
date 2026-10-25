// Download a list of rows as CSV, Excel, PDF or JSON.
// `columns` is [{ key, label, export?: (row) => value }]; export() lets a column write a plain value
// (a number instead of "₹ 1,200.00", a date instead of an ISO string).

const stamp = () => new Date().toISOString().slice(0, 10)

const cellValue = (row, col) => {
  const v = col.export ? col.export(row) : row[col.key]
  if (v === null || v === undefined) return ''
  return typeof v === 'object' ? JSON.stringify(v) : v
}

function download(blob, filename) {
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  link.style.visibility = 'hidden'
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

// Spreadsheet apps run text that starts with = + - @ as a formula. A guest named "=HYPERLINK(...)"
// must not turn into a live formula in the admin's Excel, so such text gets a leading apostrophe.
const safeText = (v) => (typeof v === 'string' && /^[=+\-@\t\r]/.test(v) ? `'${v}` : v)

export function exportCSV(rows, columns, name) {
  const header = columns.map((c) => `"${c.label.replace(/"/g, '""')}"`).join(',')
  const body = rows.map((row) => columns.map((c) => `"${String(safeText(cellValue(row, c))).replace(/"/g, '""')}"`).join(','))
  // The BOM makes Excel read the file as UTF-8 (so "₹" and accented names survive)
  download(new Blob(['﻿' + [header, ...body].join('\n')], { type: 'text/csv;charset=utf-8;' }), `${name}_${stamp()}.csv`)
}

const escapeHtml = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')

// Excel opens an HTML table saved as .xls, which avoids shipping a spreadsheet library.
export function exportExcel(rows, columns, name) {
  const head = columns.map((c) => `<th>${escapeHtml(c.label)}</th>`).join('')
  const body = rows.map((row) => `<tr>${columns.map((c) => `<td>${escapeHtml(safeText(cellValue(row, c)))}</td>`).join('')}</tr>`).join('')
  const html = `<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel"><head><meta charset="utf-8"></head><body><table><thead><tr>${head}</tr></thead><tbody>${body}</tbody></table></body></html>`
  download(new Blob([html], { type: 'application/vnd.ms-excel' }), `${name}_${stamp()}.xls`)
}

export async function exportPDF(rows, columns, name, title) {
  const [{ jsPDF }, { default: autoTable }] = await Promise.all([import('jspdf'), import('jspdf-autotable')])
  const doc = new jsPDF({ orientation: columns.length > 6 ? 'landscape' : 'portrait', unit: 'pt', format: 'a4' })
  doc.setFontSize(14)
  doc.text(title, 40, 40)
  doc.setFontSize(9)
  doc.text(`Generated ${new Date().toLocaleString('en-IN')}`, 40, 56)
  autoTable(doc, {
    startY: 68,
    head: [columns.map((c) => c.label)],
    // The built-in PDF font has no rupee sign, so "₹" is written as "Rs."
    body: rows.map((row) => columns.map((c) => String(cellValue(row, c)).replace(/₹/g, 'Rs. '))),
    styles: { fontSize: 7, cellPadding: 3 },
    headStyles: { fillColor: [37, 99, 235] },
  })
  doc.save(`${name}_${stamp()}.pdf`)
}

export function exportJSON(rows, columns, name) {
  const data = rows.map((row) => Object.fromEntries(columns.map((c) => [c.label, cellValue(row, c)])))
  download(new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' }), `${name}_${stamp()}.json`)
}

export async function exportRows(format, rows, columns, name, title) {
  if (format === 'csv') return exportCSV(rows, columns, name)
  if (format === 'excel') return exportExcel(rows, columns, name)
  if (format === 'json') return exportJSON(rows, columns, name)
  if (format === 'pdf') return exportPDF(rows, columns, name, title)
}
