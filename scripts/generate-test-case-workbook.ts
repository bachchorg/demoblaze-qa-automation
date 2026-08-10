import path from 'node:path';
import ExcelJS from 'exceljs';
import { CART_TEST_CASES, LOGIN_TEST_CASES, type TestCaseRow } from './test-case-data';

const OUTPUT_PATH = path.join(__dirname, '..', 'test-cases', 'demoblaze-test-cases.xlsx');

const HEADER_FILL: ExcelJS.Fill = {
  type: 'pattern',
  pattern: 'solid',
  fgColor: { argb: 'FF1F3864' },
};

const TYPE_COLOR: Record<TestCaseRow['type'], string> = {
  Functional: 'FFD9EAD3',
  Negative: 'FFF4CCCC',
  Edge: 'FFFFF2CC',
  Security: 'FFD9D2E9',
};

const COLUMNS: { header: string; key: keyof TestCaseRow; width: number }[] = [
  { header: 'Test Case ID', key: 'id', width: 15 },
  { header: 'Title', key: 'title', width: 40 },
  { header: 'Type', key: 'type', width: 12 },
  { header: 'Priority', key: 'priority', width: 10 },
  { header: 'Preconditions', key: 'preconditions', width: 30 },
  { header: 'Test Steps', key: 'steps', width: 45 },
  { header: 'Test Data', key: 'testData', width: 30 },
  { header: 'Expected Result', key: 'expectedResult', width: 45 },
  { header: 'Automated (Y/N)', key: 'automated', width: 14 },
  { header: 'Automation Reference', key: 'automationRef', width: 45 },
];

function buildSheet(workbook: ExcelJS.Workbook, sheetName: string, rows: TestCaseRow[]): void {
  const sheet = workbook.addWorksheet(sheetName, {
    views: [{ state: 'frozen', ySplit: 1 }],
  });

  sheet.columns = COLUMNS.map(({ header, key, width }) => ({ header, key, width }));

  const headerRow = sheet.getRow(1);
  headerRow.eachCell((cell) => {
    cell.fill = HEADER_FILL;
    cell.font = { bold: true, color: { argb: 'FFFFFFFF' } };
    cell.alignment = { vertical: 'middle', horizontal: 'left', wrapText: true };
  });
  headerRow.height = 20;

  for (const row of rows) {
    const excelRow = sheet.addRow(row);
    excelRow.eachCell((cell) => {
      cell.alignment = { vertical: 'top', wrapText: true };
    });
    const typeCell = excelRow.getCell('type');
    typeCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: TYPE_COLOR[row.type] } };
    const automatedCell = excelRow.getCell('automated');
    automatedCell.font = { bold: true, color: { argb: row.automated === 'Y' ? 'FF38761D' : 'FF990000' } };
    excelRow.height = 60;
  }

  sheet.autoFilter = { from: { row: 1, column: 1 }, to: { row: 1, column: COLUMNS.length } };
}

function buildSummarySheet(workbook: ExcelJS.Workbook): void {
  const sheet = workbook.addWorksheet('Summary', { views: [{ state: 'frozen', ySplit: 1 }] });
  sheet.columns = [
    { header: 'Module', key: 'module', width: 20 },
    { header: 'Total Cases', key: 'total', width: 14 },
    { header: 'Functional', key: 'Functional', width: 12 },
    { header: 'Negative', key: 'Negative', width: 12 },
    { header: 'Edge', key: 'Edge', width: 12 },
    { header: 'Security', key: 'Security', width: 12 },
    { header: 'Automated', key: 'automated', width: 12 },
    { header: 'Manual / Documented', key: 'manual', width: 20 },
  ];
  const headerRow = sheet.getRow(1);
  headerRow.eachCell((cell) => {
    cell.fill = HEADER_FILL;
    cell.font = { bold: true, color: { argb: 'FFFFFFFF' } };
  });

  const summarize = (module: string, rows: TestCaseRow[]) => ({
    module,
    total: rows.length,
    Functional: rows.filter((r) => r.type === 'Functional').length,
    Negative: rows.filter((r) => r.type === 'Negative').length,
    Edge: rows.filter((r) => r.type === 'Edge').length,
    Security: rows.filter((r) => r.type === 'Security').length,
    automated: rows.filter((r) => r.automated === 'Y').length,
    manual: rows.filter((r) => r.automated === 'N').length,
  });

  sheet.addRow(summarize('Login', LOGIN_TEST_CASES));
  sheet.addRow(summarize('Cart', CART_TEST_CASES));
  sheet.addRow(
    summarize('Total', [...LOGIN_TEST_CASES, ...CART_TEST_CASES]),
  ).font = { bold: true };

  sheet.addRow([]);
  const noteRow = sheet.addRow([
    'Automated cases map 1:1 to tests in tests/ui/login.spec.ts and tests/ui/cart.spec.ts — see the "Automation Reference" column on each sheet.',
  ]);
  noteRow.getCell(1).font = { italic: true, color: { argb: 'FF666666' } };
  sheet.mergeCells(`A${noteRow.number}:H${noteRow.number}`);
}

async function main(): Promise<void> {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'demoblaze-qa-automation';
  workbook.created = new Date();

  buildSummarySheet(workbook);
  buildSheet(workbook, 'Login Test Cases', LOGIN_TEST_CASES);
  buildSheet(workbook, 'Cart Test Cases', CART_TEST_CASES);

  await workbook.xlsx.writeFile(OUTPUT_PATH);
  const total = LOGIN_TEST_CASES.length + CART_TEST_CASES.length;
  console.log(`Wrote ${total} test cases (${LOGIN_TEST_CASES.length} login, ${CART_TEST_CASES.length} cart) to ${OUTPUT_PATH}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
