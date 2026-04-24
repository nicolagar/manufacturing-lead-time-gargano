import * as XLSX from 'xlsx';

export async function readWorkbookSummary(file: File): Promise<string> {
  const arrayBuffer = await file.arrayBuffer();
  const workbook = XLSX.read(arrayBuffer, { type: 'array' });
  return workbook.SheetNames.join(', ');
}
