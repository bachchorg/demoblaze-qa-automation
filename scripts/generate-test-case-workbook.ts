import path from 'node:path';
import ExcelJS from 'exceljs';
import {
  CART_TEST_CASES,
  LOGIN_TEST_CASES,
  REQUIREMENTS,
  type Requirement,
  type TestCaseRow,
} from './test-case-data';

const OUTPUT_PATH = path.join(__dirname, '..', 'test-cases', 'demoblaze-test-cases.xlsx');
const GENERATED_AT = new Date();

const LOGIN_SHEET_NAME = 'Login Cases';
const CART_SHEET_NAME = 'Cart & Checkout Cases';

const HEADER_FILL: ExcelJS.Fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1F3864' } };
const HEADER_FONT: Partial<ExcelJS.Font> = { bold: true, color: { argb: 'FFFFFFFF' } };
const TITLE_FONT: Partial<ExcelJS.Font> = { bold: true, size: 16, color: { argb: 'FF1F3864' } };
const SUBTITLE_FONT: Partial<ExcelJS.Font> = { bold: true, size: 12, color: { argb: 'FF1F3864' } };
const THIN_BORDER: Partial<ExcelJS.Borders> = {
  top: { style: 'thin', color: { argb: 'FFD9D9D9' } },
  left: { style: 'thin', color: { argb: 'FFD9D9D9' } },
  bottom: { style: 'thin', color: { argb: 'FFD9D9D9' } },
  right: { style: 'thin', color: { argb: 'FFD9D9D9' } },
};

const TYPE_COLOR: Record<TestCaseRow['type'], string> = {
  Functional: 'FFD9EAD3',
  Negative: 'FFF4CCCC',
  Edge: 'FFFFF2CC',
  Security: 'FFD9D2E9',
};

const PRIORITY_COLOR: Record<TestCaseRow['priority'], string> = {
  Critical: 'FFCC0000',
  High: 'FFE06666',
  Medium: 'FFF6B26B',
  Low: 'FF93C47D',
};

const EXECUTION_STATUS_COLOR: Record<TestCaseRow['executionStatus'], string> = {
  Pass: 'FFD9EAD3',
  'Documented Finding': 'FFF4CCCC',
  'Not Executed': 'FFEFEFEF',
};

const AUTOMATION_STATUS_COLOR: Record<TestCaseRow['automationStatus'], string> = {
  Automated: 'FFD9EAD3',
  Manual: 'FFFFF2CC',
  Planned: 'FFCFE2F3',
};

const TYPE_VALUES: TestCaseRow['type'][] = ['Functional', 'Negative', 'Edge', 'Security'];
const PRIORITY_VALUES: TestCaseRow['priority'][] = ['Critical', 'High', 'Medium', 'Low'];
const AUTOMATION_STATUS_VALUES: TestCaseRow['automationStatus'][] = ['Automated', 'Manual', 'Planned'];
const LAYER_VALUES: TestCaseRow['layer'][] = ['UI', 'API', 'Manual'];
const EXECUTION_STATUS_VALUES: TestCaseRow['executionStatus'][] = ['Pass', 'Documented Finding', 'Not Executed'];
const MODULE_VALUES: TestCaseRow['module'][] = ['Login', 'Cart & Checkout'];

interface ColumnDef {
  header: string;
  key: keyof TestCaseRow;
  width: number;
}

const COLUMNS: ColumnDef[] = [
  { header: 'Test Case ID', key: 'id', width: 14 },
  { header: 'Requirement ID', key: 'requirementId', width: 18 },
  { header: 'Module', key: 'module', width: 15 },
  { header: 'Scenario', key: 'scenario', width: 38 },
  { header: 'Type', key: 'type', width: 11 },
  { header: 'Priority', key: 'priority', width: 10 },
  { header: 'Preconditions', key: 'preconditions', width: 26 },
  { header: 'Test Data', key: 'testData', width: 28 },
  { header: 'Steps', key: 'steps', width: 42 },
  { header: 'Expected Result', key: 'expectedResult', width: 42 },
  { header: 'Postconditions / Cleanup', key: 'postconditions', width: 26 },
  { header: 'Automation Status', key: 'automationStatus', width: 16 },
  { header: 'Layer', key: 'layer', width: 10 },
  { header: 'Suite Tags', key: 'suiteTags', width: 22 },
  { header: 'Browser / Project Scope', key: 'browserScope', width: 26 },
  { header: 'Automation Link', key: 'automationRef', width: 42 },
  { header: 'Observed Result', key: 'observedResult', width: 36 },
  { header: 'Execution Status', key: 'executionStatus', width: 16 },
  { header: 'Defect ID', key: 'defectId', width: 12 },
  { header: 'Owner', key: 'owner', width: 22 },
  { header: 'Last Reviewed', key: 'lastReviewed', width: 14 },
];

const WRAP_COLUMN_KEYS: (keyof TestCaseRow)[] = [
  'scenario',
  'preconditions',
  'testData',
  'steps',
  'expectedResult',
  'postconditions',
  'observedResult',
];

function estimateRowHeight(row: TestCaseRow): number {
  const CHARS_PER_WIDTH_UNIT = 1.75;
  const LINE_HEIGHT_PT = 14;
  const VERTICAL_PADDING_PT = 10;

  let maxLines = 1;
  for (const key of WRAP_COLUMN_KEYS) {
    const column = COLUMNS.find((c) => c.key === key);
    if (!column) continue;
    const text = String(row[key] ?? '');
    if (!text) continue;
    const charsPerLine = Math.max(10, Math.floor(column.width * CHARS_PER_WIDTH_UNIT));
    const lines = text
      .split('\n')
      .reduce((sum, segment) => sum + Math.max(1, Math.ceil(segment.length / charsPerLine)), 0);
    maxLines = Math.max(maxLines, lines);
  }
  return Math.max(24, maxLines * LINE_HEIGHT_PT + VERTICAL_PADDING_PT);
}

function styleHeaderRow(row: ExcelJS.Row): void {
  row.eachCell((cell) => {
    cell.fill = HEADER_FILL;
    cell.font = HEADER_FONT;
    cell.alignment = { vertical: 'middle', horizontal: 'left', wrapText: true };
  });
  row.height = 22;
}

function applyListValidation(sheet: ExcelJS.Worksheet, columnLetter: string, firstRow: number, lastRow: number, formula: string): void {
  for (let r = firstRow; r <= lastRow; r++) {
    sheet.getCell(`${columnLetter}${r}`).dataValidation = {
      type: 'list',
      allowBlank: false,
      formulae: [formula],
      showErrorMessage: true,
      errorTitle: 'Invalid value',
      error: 'Please choose a value from the dropdown list (see the hidden Lists sheet).',
    };
  }
}

function columnLetterFor(key: keyof TestCaseRow): string {
  const index = COLUMNS.findIndex((c) => c.key === key);
  return String.fromCharCode('A'.charCodeAt(0) + index);
}

function buildCaseSheet(workbook: ExcelJS.Workbook, sheetName: string, rows: TestCaseRow[]): void {
  const sheet = workbook.addWorksheet(sheetName, {
    views: [{ state: 'frozen', ySplit: 1, xSplit: 4 }],
  });

  sheet.columns = COLUMNS.map(({ header, key, width }) => ({ header, key, width }));
  styleHeaderRow(sheet.getRow(1));

  rows.forEach((row) => {
    const excelRow = sheet.addRow(row);
    excelRow.eachCell((cell) => {
      cell.alignment = { vertical: 'top', wrapText: true };
      cell.border = THIN_BORDER;
    });

    const typeCell = excelRow.getCell('type');
    typeCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: TYPE_COLOR[row.type] } };

    const priorityCell = excelRow.getCell('priority');
    priorityCell.font = { bold: true, color: { argb: PRIORITY_COLOR[row.priority] } };

    const automationCell = excelRow.getCell('automationStatus');
    automationCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: AUTOMATION_STATUS_COLOR[row.automationStatus] } };

    const executionCell = excelRow.getCell('executionStatus');
    executionCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: EXECUTION_STATUS_COLOR[row.executionStatus] } };
    if (row.executionStatus === 'Documented Finding') {
      executionCell.font = { bold: true, color: { argb: 'FF990000' } };
    }

    if (row.automationStatus === 'Automated' && row.automationRef.startsWith('tests/')) {
      const filePath = row.automationRef.split(' — ')[0].trim();
      const linkCell = excelRow.getCell('automationRef');
      linkCell.value = { text: row.automationRef, hyperlink: `../${filePath}` };
      linkCell.font = { color: { argb: 'FF1155CC' }, underline: true };
    }

    if (row.defectId) {
      const defectCell = excelRow.getCell('defectId');
      defectCell.font = { bold: true, color: { argb: 'FF990000' } };
    }

    excelRow.height = estimateRowHeight(row);
  });

  sheet.autoFilter = { from: { row: 1, column: 1 }, to: { row: 1, column: COLUMNS.length } };

  const firstDataRow = 2;
  const lastDataRow = rows.length + 1;
  applyListValidation(sheet, columnLetterFor('type'), firstDataRow, lastDataRow, 'Lists!$B$2:$B$5');
  applyListValidation(sheet, columnLetterFor('priority'), firstDataRow, lastDataRow, 'Lists!$C$2:$C$5');
  applyListValidation(sheet, columnLetterFor('automationStatus'), firstDataRow, lastDataRow, 'Lists!$D$2:$D$4');
  applyListValidation(sheet, columnLetterFor('layer'), firstDataRow, lastDataRow, 'Lists!$E$2:$E$4');
  applyListValidation(sheet, columnLetterFor('executionStatus'), firstDataRow, lastDataRow, 'Lists!$F$2:$F$4');
  applyListValidation(sheet, columnLetterFor('module'), firstDataRow, lastDataRow, 'Lists!$A$2:$A$3');
}

function buildHiddenListsSheet(workbook: ExcelJS.Workbook): void {
  const sheet = workbook.addWorksheet('Lists', { state: 'veryHidden' });
  sheet.columns = [
    { header: 'Module', key: 'module', width: 18 },
    { header: 'Type', key: 'type', width: 14 },
    { header: 'Priority', key: 'priority', width: 12 },
    { header: 'Automation Status', key: 'automationStatus', width: 16 },
    { header: 'Layer', key: 'layer', width: 10 },
    { header: 'Execution Status', key: 'executionStatus', width: 16 },
  ];
  const maxLen = Math.max(
    MODULE_VALUES.length,
    TYPE_VALUES.length,
    PRIORITY_VALUES.length,
    AUTOMATION_STATUS_VALUES.length,
    LAYER_VALUES.length,
    EXECUTION_STATUS_VALUES.length,
  );
  for (let i = 0; i < maxLen; i++) {
    sheet.addRow({
      module: MODULE_VALUES[i] ?? '',
      type: TYPE_VALUES[i] ?? '',
      priority: PRIORITY_VALUES[i] ?? '',
      automationStatus: AUTOMATION_STATUS_VALUES[i] ?? '',
      layer: LAYER_VALUES[i] ?? '',
      executionStatus: EXECUTION_STATUS_VALUES[i] ?? '',
    });
  }
}

function sectionHeading(sheet: ExcelJS.Worksheet, text: string, span = 7): ExcelJS.Row {
  const row = sheet.addRow([text]);
  row.getCell(1).font = SUBTITLE_FONT;
  sheet.mergeCells(`A${row.number}:${String.fromCharCode('A'.charCodeAt(0) + span - 1)}${row.number}`);
  row.height = 20;
  return row;
}

function buildDashboardSheet(workbook: ExcelJS.Workbook): void {
  const sheet = workbook.addWorksheet('Coverage Dashboard', { views: [{ state: 'frozen', ySplit: 0 }] });
  sheet.columns = [
    { key: 'a', width: 22 },
    { key: 'b', width: 14 },
    { key: 'c', width: 14 },
    { key: 'd', width: 14 },
    { key: 'e', width: 16 },
    { key: 'f', width: 14 },
    { key: 'g', width: 14 },
  ];

  const title = sheet.addRow(['Test Coverage Dashboard']);
  title.getCell(1).font = TITLE_FONT;
  sheet.mergeCells(`A${title.number}:G${title.number}`);
  sheet.addRow([`Generated ${GENERATED_AT.toISOString().slice(0, 10)} — every count below is a live formula against the case sheets, not a hand-typed snapshot.`])
    .getCell(1).font = { italic: true, color: { argb: 'FF666666' } };
  sheet.addRow([]);

  const loginLast = LOGIN_TEST_CASES.length + 1;
  const cartLast = CART_TEST_CASES.length + 1;
  const loginRange = (col: string) => `'${LOGIN_SHEET_NAME}'!${col}2:${col}${loginLast}`;
  const cartRange = (col: string) => `'${CART_SHEET_NAME}'!${col}2:${col}${cartLast}`;
  const automationCol = columnLetterFor('automationStatus');
  const executionCol = columnLetterFor('executionStatus');
  const typeCol = columnLetterFor('type');
  const priorityCol = columnLetterFor('priority');
  const idCol = columnLetterFor('id');

  sectionHeading(sheet, 'By module');
  const summaryHeader = sheet.addRow(['Module', 'Total Cases', 'Automated', 'Manual/Planned', 'Documented Findings', 'Pass', '% Automated']);
  styleHeaderRow(summaryHeader);

  const moduleRow = (label: string, range: (col: string) => string, rangeIdCol: string) => {
    const row = sheet.addRow({
      a: label,
      b: { formula: `COUNTA(${range(rangeIdCol)})` },
      c: { formula: `COUNTIF(${range(automationCol)},"Automated")` },
      d: { formula: `COUNTA(${range(rangeIdCol)})-COUNTIF(${range(automationCol)},"Automated")` },
      e: { formula: `COUNTIF(${range(executionCol)},"Documented Finding")` },
      f: { formula: `COUNTIF(${range(executionCol)},"Pass")` },
      g: { formula: `IF(COUNTA(${range(rangeIdCol)})=0,0,COUNTIF(${range(automationCol)},"Automated")/COUNTA(${range(rangeIdCol)}))` },
    });
    row.getCell('g').numFmt = '0%';
    return row;
  };

  const loginRow = moduleRow('Login', loginRange, idCol);
  const cartRow = moduleRow('Cart & Checkout', cartRange, idCol);
  const totalRow = sheet.addRow({
    a: 'Total',
    b: { formula: `${loginRow.getCell('b').address}+${cartRow.getCell('b').address}` },
    c: { formula: `${loginRow.getCell('c').address}+${cartRow.getCell('c').address}` },
    d: { formula: `${loginRow.getCell('d').address}+${cartRow.getCell('d').address}` },
    e: { formula: `${loginRow.getCell('e').address}+${cartRow.getCell('e').address}` },
    f: { formula: `${loginRow.getCell('f').address}+${cartRow.getCell('f').address}` },
    g: { formula: `IF(${loginRow.getCell('b').address}+${cartRow.getCell('b').address}=0,0,(${loginRow.getCell('c').address}+${cartRow.getCell('c').address})/(${loginRow.getCell('b').address}+${cartRow.getCell('b').address}))` },
  });
  totalRow.font = { bold: true };
  totalRow.getCell('g').numFmt = '0%';
  [loginRow, cartRow, totalRow].forEach((r) => r.eachCell((c) => (c.border = THIN_BORDER)));

  sheet.addRow([]);
  sectionHeading(sheet, 'By type (Login + Cart & Checkout combined)');
  const typeHeader = sheet.addRow(['Type', 'Count']);
  styleHeaderRow(typeHeader);
  for (const t of TYPE_VALUES) {
    const row = sheet.addRow({
      a: t,
      b: {
        formula: `COUNTIF(${loginRange(typeCol)},"${t}")+COUNTIF(${cartRange(typeCol)},"${t}")`,
      },
    });
    row.getCell('a').fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: TYPE_COLOR[t] } };
    row.eachCell((c) => (c.border = THIN_BORDER));
  }

  sheet.addRow([]);
  sectionHeading(sheet, 'By priority (Login + Cart & Checkout combined)');
  const priorityHeader = sheet.addRow(['Priority', 'Count']);
  styleHeaderRow(priorityHeader);
  for (const p of PRIORITY_VALUES) {
    const row = sheet.addRow({
      a: p,
      b: {
        formula: `COUNTIF(${loginRange(priorityCol)},"${p}")+COUNTIF(${cartRange(priorityCol)},"${p}")`,
      },
    });
    row.getCell('a').font = { bold: true, color: { argb: PRIORITY_COLOR[p] } };
    row.eachCell((c) => (c.border = THIN_BORDER));
  }

  sheet.addRow([]);
  sectionHeading(sheet, 'Known defects (rows with a non-blank Defect ID)');
  const defectHeader = sheet.addRow(['Defect ID', 'Case', 'Summary']);
  styleHeaderRow(defectHeader);
  const allCases = [...LOGIN_TEST_CASES, ...CART_TEST_CASES];
  for (const row of allCases.filter((r) => r.defectId)) {
    const sheetName = row.module === 'Login' ? LOGIN_SHEET_NAME : CART_SHEET_NAME;
    const excelRow = sheet.addRow({ a: row.defectId, b: row.id, c: row.observedResult || row.scenario });
    excelRow.getCell('b').value = { text: row.id, hyperlink: `#'${sheetName}'!A1` };
    excelRow.getCell('b').font = { color: { argb: 'FF1155CC' }, underline: true };
    excelRow.getCell('a').font = { bold: true, color: { argb: 'FF990000' } };
    excelRow.eachCell((c) => (c.border = THIN_BORDER));
    excelRow.alignment = { wrapText: true, vertical: 'top' };
  }
}

function buildTraceabilitySheet(workbook: ExcelJS.Workbook): void {
  const sheet = workbook.addWorksheet('Requirements Traceability', { views: [{ state: 'frozen', ySplit: 1 }] });
  sheet.columns = [
    { header: 'Requirement ID', key: 'id', width: 24 },
    { header: 'Module', key: 'module', width: 16 },
    { header: 'Description', key: 'description', width: 55 },
    { header: 'Covered By', key: 'cases', width: 40 },
    { header: 'Automated', key: 'automated', width: 12 },
    { header: 'Manual/Planned', key: 'manual', width: 14 },
    { header: 'Coverage', key: 'coverage', width: 12 },
  ];
  styleHeaderRow(sheet.getRow(1));

  const allCases = [...LOGIN_TEST_CASES, ...CART_TEST_CASES];
  const automationCol = columnLetterFor('automationStatus');
  const reqCol = columnLetterFor('requirementId');
  const loginLast = LOGIN_TEST_CASES.length + 1;
  const cartLast = CART_TEST_CASES.length + 1;

  REQUIREMENTS.forEach((req: Requirement) => {
    const covering = allCases.filter((c) => c.requirementId === req.id);
    const sheetName = req.module === 'Login' ? LOGIN_SHEET_NAME : CART_SHEET_NAME;
    const lastRow = req.module === 'Login' ? loginLast : cartLast;
    const reqRange = `'${sheetName}'!${reqCol}2:${reqCol}${lastRow}`;
    const autoRange = `'${sheetName}'!${automationCol}2:${automationCol}${lastRow}`;

    const row = sheet.addRow({
      id: req.id,
      module: req.module,
      description: req.description,
      cases: covering.map((c) => c.id).join(', ') || '— none yet —',
      automated: { formula: `COUNTIFS(${reqRange},"${req.id}",${autoRange},"Automated")` },
      manual: { formula: `COUNTIFS(${reqRange},"${req.id}")-COUNTIFS(${reqRange},"${req.id}",${autoRange},"Automated")` },
    });
    const totalFormula = `COUNTIFS(${reqRange},"${req.id}")`;
    const automatedAddress = row.getCell('automated').address;
    row.getCell('coverage').value = {
      formula: `IF(${totalFormula}=0,"No coverage",IF(${totalFormula}=${automatedAddress},"Full","Partial"))`,
    };
    row.eachCell((c) => {
      c.alignment = { vertical: 'top', wrapText: true };
      c.border = THIN_BORDER;
    });
    row.height = Math.max(24, Math.ceil(req.description.length / 50) * 14 + 6);
    if (covering.length === 0) {
      row.getCell('cases').font = { italic: true, color: { argb: 'FF990000' } };
    }
  });

  applyListValidation(sheet, 'B', 2, REQUIREMENTS.length + 1, 'Lists!$A$2:$A$3');
}

function buildReadMeSheet(workbook: ExcelJS.Workbook): void {
  const sheet = workbook.addWorksheet('Read Me & Assumptions', { views: [{ showGridLines: false }] });
  sheet.columns = [{ key: 'a', width: 110 }];

  const title = sheet.addRow(['demoblaze.com — Login & Cart/Checkout Test Case Suite']);
  title.getCell(1).font = { bold: true, size: 18, color: { argb: 'FF1F3864' } };
  sheet.addRow([`Generated ${GENERATED_AT.toISOString().slice(0, 10)} by scripts/generate-test-case-workbook.ts — do not hand-edit this file's structure; edit scripts/test-case-data.ts and run "npm run gen:test-cases" instead.`])
    .getCell(1).font = { italic: true, color: { argb: 'FF666666' } };
  sheet.addRow([]);

  const heading = (text: string) => {
    const row = sheet.addRow([text]);
    row.getCell(1).font = SUBTITLE_FONT;
    row.height = 20;
  };
  const bullet = (text: string) => {
    const row = sheet.addRow([`•  ${text}`]);
    row.alignment = { wrapText: true, vertical: 'top' };
    row.height = Math.max(16, Math.ceil(text.length / 130) * 15 + 6);
  };
  const paragraph = (text: string) => {
    const row = sheet.addRow([text]);
    row.alignment = { wrapText: true, vertical: 'top' };
    row.height = Math.max(16, Math.ceil(text.length / 130) * 15 + 6);
  };

  heading('Sheets in this workbook');
  bullet('Read Me & Assumptions (this sheet) — scope, verified environment facts, and the rationale behind every deliberate scope decision below.');
  bullet('Coverage Dashboard — live COUNTIF/COUNTIFS formulas against the two case sheets: totals by module/type/priority, automation ratio, and a rollup of every known documented defect.');
  bullet(`${LOGIN_SHEET_NAME} / ${CART_SHEET_NAME} — one row per test case. Type/Priority/Automation Status/Layer/Execution Status/Module are dropdown-constrained (see the hidden "Lists" sheet) so edits stay within the same vocabulary this dashboard's formulas expect.`);
  bullet('Requirements Traceability — every requirement this suite is meant to cover, which case IDs cover it, and a live count of how much of that coverage is automated vs. manual.');
  bullet('Lists (very hidden) — the canonical dropdown values backing data validation on the case sheets. Unhide it (right-click any sheet tab → Unhide) if you need to see or edit the allowed values themselves.');
  sheet.addRow([]);

  heading('Column reference (case sheets)');
  paragraph('Automation Status: Automated (has a real Playwright test), Manual (deliberately not automated — see reason in Automation Link), Planned (identified, not yet built).');
  paragraph('Execution Status: Pass (automated and currently passing against the live site), Documented Finding (automated, and the assertion encodes an actual observed defect — see Observed Result / Defect ID), Not Executed (manual/documented-only row, no automated run to report a status from).');
  paragraph('Expected Result states what a reasonable implementation should do. Observed Result is populated only when automation proved the live app actually diverges from that — this keeps "what should happen" and "what a known bug does instead" in separate columns rather than blended into one ambiguous sentence.');
  paragraph('Automation Link is a clickable relative link into tests/ui/*.spec.ts for every Automated row, using the same TC-* id in the spec\'s test title — so a failing CI test traces straight back to this row, and vice versa.');
  sheet.addRow([]);

  heading('Verified environment facts (captured from the live site, not assumed)');
  paragraph('These were confirmed by inspecting real network traffic against https://www.demoblaze.com and https://api.demoblaze.com while building this suite (see scripts/test-case-data.ts row comments and the corresponding spec files for the specific case each fact backs).');
  bullet('Cart identity: a guest cart is scoped by a random `user` cookie minted on first page load; POST /addtocart and /viewcart both carry that cookie value in the request body. Logging in swaps in a separate `tokenp_` session-token cookie, and the account cart is a distinct store from the guest cart — the two do NOT merge on login (TC-CART-23). The account cart persists across logout/login (TC-CART-22). Two independent guest browser contexts never see each other\'s items (TC-CART-12).');
  bullet('Session tokens: `tokenp_` is a plain (non-httpOnly) cookie holding what looks like an unsigned base64 string, but session validity is actually re-checked server-side via POST /check on load — a forged/never-issued token is rejected, not trusted at face value (TC-LOGIN-18). Logging out removes the cookie so a reload cannot silently restore the old session (TC-LOGIN-19). A genuine session correctly survives a hard reload (TC-LOGIN-17).');
  bullet('Displayed-price integrity: when a test modifies POST /view to return $1, that value reaches the cart, order modal, and confirmation (TC-CART-21, DEF-CART-04). DemoBlaze has no backend order call in this flow, so this case makes no claim about server-side order acceptance.');
  bullet('The purchase confirmation echoes the entered card number back in full, unmasked (TC-CART-20, DEF-CART-03) — a sensitive-data-exposure weakness, distinct from the already-known lack of card format/expiry validation (TC-CART-09/10).');
  bullet('The checkout "Name"/"Card" required-field check tests raw string truthiness, not trimmed content: a whitespace-only card ("   ") is treated as "filled", so the order proceeds and the confirmation then renders a blank Card Number (TC-CART-26, DEF-CART-05).');
  bullet('demoblaze calls native alert()/confirm() dialogs synchronously inside click handlers for client-side validation, which blocks the page\'s JS thread until dismissed — see BasePage.captureDialogMessage() in the framework for how tests avoid deadlocking on this.');
  bullet('A failing auth API (POST /login returning 500) produces no error message to the user at all — not a crash, but a silent no-op with the modal left open (TC-LOGIN-23, DEF-LOGIN-01).');
  sheet.addRow([]);

  heading('Deliberate scope decisions');
  paragraph('TC-LOGIN-21 (repeated failed logins / rate limiting) is documented, not automated. demoblaze.com is a real, shared public demo used by other testers and candidates; deliberately hammering its login endpoint to find the actual lockout threshold would be indistinguishable from a small denial-of-service test against a system we don\'t own. The case is fully specified (steps, expected behavior for a hardened system) so it is ready to run manually or against a non-shared/staging environment.');
  paragraph('TC-LOGIN-22 compares the unknown-user and wrong-password responses in one dedicated security check. TC-LOGIN-04 and TC-LOGIN-05 remain as atomic negative-path tests.');
  paragraph('Authenticated cart cases provision a fresh account per test, so browser projects can run in parallel without sharing cart state.');
  sheet.addRow([]);

  heading('Regenerating this workbook');
  paragraph('Source of truth: scripts/test-case-data.ts (case rows + REQUIREMENTS) and scripts/generate-test-case-workbook.ts (layout/formatting/formulas). Run `npm run gen:test-cases` after editing either file — never hand-edit the generated .xlsx, since the next regeneration will overwrite it.');
}

async function main(): Promise<void> {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'demoblaze-qa-automation';
  workbook.created = GENERATED_AT;
  workbook.lastPrinted = GENERATED_AT;

  buildReadMeSheet(workbook);
  buildDashboardSheet(workbook);
  buildCaseSheet(workbook, LOGIN_SHEET_NAME, LOGIN_TEST_CASES);
  buildCaseSheet(workbook, CART_SHEET_NAME, CART_TEST_CASES);
  buildTraceabilitySheet(workbook);
  buildHiddenListsSheet(workbook);

  await workbook.xlsx.writeFile(OUTPUT_PATH);
  const total = LOGIN_TEST_CASES.length + CART_TEST_CASES.length;
  const automated = [...LOGIN_TEST_CASES, ...CART_TEST_CASES].filter((r) => r.automationStatus === 'Automated').length;
  console.log(
    `Wrote ${total} test cases (${LOGIN_TEST_CASES.length} login, ${CART_TEST_CASES.length} cart; ${automated} automated) to ${OUTPUT_PATH}`,
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
