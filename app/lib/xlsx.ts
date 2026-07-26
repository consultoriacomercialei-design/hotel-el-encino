/**
 * Generador de .xlsx mínimo, sin dependencias.
 *
 * Un archivo de Excel es un ZIP con cinco XML adentro. Se generan a mano
 * (usando `createZip`) en vez de meter SheetJS o exceljs, que pesan bastante
 * para lo único que necesitamos: una hoja con encabezados, texto y números.
 *
 * Los textos van como `inlineStr` para no tener que mantener la tabla de
 * cadenas compartidas.
 */

import { createZip } from './zip';

export type CellValue = string | number | null | undefined;

export interface SheetSpec {
  name: string;
  /** Ancho de cada columna, en caracteres. */
  columnWidths?: number[];
  /**
   * Índices de las columnas con importes, que llevan formato #,##0.00.
   * Sin esto, un folio o un conteo de noches saldría como "1.00" / "10.00".
   */
  moneyColumns?: number[];
  /** Primera fila = encabezados. */
  rows: CellValue[][];
}

const esc = (s: string) =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
   .replace(/"/g, '&quot;').replace(/\x00-\x08\x0b\x0c\x0e-\x1f/g, '');

/** 0 → A, 25 → Z, 26 → AA */
function colName(i: number): string {
  let s = '';
  for (let n = i; n >= 0; n = Math.floor(n / 26) - 1) {
    s = String.fromCharCode(65 + (n % 26)) + s;
  }
  return s;
}

function cell(ref: string, v: CellValue, isHeader: boolean, isMoney: boolean): string {
  if (v === null || v === undefined || v === '') return `<c r="${ref}"${isHeader ? ' s="1"' : ''}/>`;
  if (typeof v === 'number' && Number.isFinite(v)) {
    const style = isHeader ? 1 : isMoney ? 2 : 0;
    return `<c r="${ref}"${style ? ` s="${style}"` : ''}><v>${v}</v></c>`;
  }
  return `<c r="${ref}" t="inlineStr"${isHeader ? ' s="1"' : ''}><is><t xml:space="preserve">${esc(String(v))}</t></is></c>`;
}

export function createXlsx(sheet: SheetSpec): Buffer {
  const money = new Set(sheet.moneyColumns ?? []);
  const rowsXml = sheet.rows.map((row, r) => {
    const cells = row.map((v, c) => cell(`${colName(c)}${r + 1}`, v, r === 0, money.has(c))).join('');
    return `<row r="${r + 1}">${cells}</row>`;
  }).join('');

  const cols = sheet.columnWidths?.length
    ? `<cols>${sheet.columnWidths.map((w, i) => `<col min="${i + 1}" max="${i + 1}" width="${w}" customWidth="1"/>`).join('')}</cols>`
    : '';

  // s="1" encabezado (negritas) · s="2" número con 2 decimales y separador de miles
  const styles =
    '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
    '<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">' +
    '<numFmts count="1"><numFmt numFmtId="164" formatCode="#,##0.00"/></numFmts>' +
    '<fonts count="2"><font><sz val="11"/><name val="Calibri"/></font>' +
    '<font><b/><sz val="11"/><name val="Calibri"/></font></fonts>' +
    '<fills count="2"><fill><patternFill patternType="none"/></fill>' +
    '<fill><patternFill patternType="gray125"/></fill></fills>' +
    '<borders count="1"><border/></borders>' +
    '<cellStyleXfs count="1"><xf/></cellStyleXfs>' +
    '<cellXfs count="3">' +
    '<xf xfId="0"/>' +
    '<xf xfId="0" fontId="1" applyFont="1"/>' +
    '<xf xfId="0" numFmtId="164" applyNumberFormat="1"/>' +
    '</cellXfs></styleSheet>';

  return createZip([
    {
      name: '[Content_Types].xml',
      data: '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
        '<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">' +
        '<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>' +
        '<Default Extension="xml" ContentType="application/xml"/>' +
        '<Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>' +
        '<Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>' +
        '<Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>' +
        '</Types>',
    },
    {
      name: '_rels/.rels',
      data: '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
        '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">' +
        '<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/>' +
        '</Relationships>',
    },
    {
      name: 'xl/workbook.xml',
      data: '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
        '<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" ' +
        'xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">' +
        `<sheets><sheet name="${esc(sheet.name).slice(0, 31)}" sheetId="1" r:id="rId1"/></sheets></workbook>`,
    },
    {
      name: 'xl/_rels/workbook.xml.rels',
      data: '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
        '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">' +
        '<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/>' +
        '<Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>' +
        '</Relationships>',
    },
    { name: 'xl/styles.xml', data: styles },
    {
      name: 'xl/worksheets/sheet1.xml',
      data: '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
        '<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">' +
        `${cols}<sheetData>${rowsXml}</sheetData></worksheet>`,
    },
  ]);
}
