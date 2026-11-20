import { test, describe, before, after } from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import app from './backend/server.js';
import db from './backend/db.js';
import {
  parseCsvStatement,
  parsePdfStatement,
  inferCategory,
  sanitizeNarration,
  normalizeDate,
  reconcileDuplicates,
  parseStatementFile,
  importConfirmedTransactions
} from './backend/statementParser.js';

let server;
let baseUrl;

before(async () => {
  await new Promise((resolve) => {
    server = http.createServer(app);
    server.listen(0, '127.0.0.1', () => {
      const port = server.address().port;
      baseUrl = `http://127.0.0.1:${port}`;
      resolve();
    });
  });
});

after(async () => {
  if (server) {
    await new Promise((resolve) => server.close(resolve));
  }
});

describe('Phase 6: Secure Bank Statement Processing (CSV & PDF) Suite', () => {

  // Test 1: Unauthenticated request rejection
  test('Check 1: Unauthenticated requests to /api/analyzer/statements/* are rejected with HTTP 401', async () => {
    const parseRes = await fetch(`${baseUrl}/api/analyzer/statements/parse`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ filename: 'test.csv', content: 'date,description,amount\n2026-06-01,Test,100' })
    });
    assert.equal(parseRes.status, 401);
    const parseBody = await parseRes.json();
    assert.equal(parseBody.error, 'Authentication required');

    const importRes = await fetch(`${baseUrl}/api/analyzer/statements/import`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ transactions: [{ date: '2026-06-01', description: 'Test', amount: 100, type: 'expense' }] })
    });
    assert.equal(importRes.status, 401);
  });

  // Test 2: Validation of missing or invalid file input
  test('Check 2: Missing filename or content returns HTTP 400 Bad Request', async () => {
    const ts = Date.now();
    const regRes = await fetch(`${baseUrl}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: `stmt_val_${ts}@example.com`, password: 'StmtPassword1!', name: 'Stmt User' })
    });
    const { token } = await regRes.json();

    // Missing filename
    const resNoName = await fetch(`${baseUrl}/api/analyzer/statements/parse`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
      body: JSON.stringify({ content: 'test content' })
    });
    assert.equal(resNoName.status, 400);

    // Missing content
    const resNoContent = await fetch(`${baseUrl}/api/analyzer/statements/parse`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
      body: JSON.stringify({ filename: 'test.csv' })
    });
    assert.equal(resNoContent.status, 400);

    // Empty transactions array on import
    const resEmptyImport = await fetch(`${baseUrl}/api/analyzer/statements/import`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
      body: JSON.stringify({ transactions: [] })
    });
    assert.equal(resEmptyImport.status, 400);
  });

  // Test 3: Standard CSV Parsing with separate Debit and Credit columns
  test('Check 3: CSV parser handles separate Debit/Credit columns, normalizes dates, and infers categories', () => {
    const sampleCsv = `Date,Narration,Withdrawal (Debit),Deposit (Credit),Closing Balance
15/06/2026,UPI-SWIGGY-123456@icici-food,450.00,,45200.00
16/06/2026,SALARY CREDIT ACME CORP,,85000.00,130200.00
17/06/2026,AMAZON RETAIL INDIA PVT,3299.00,,126901.00
18/06/2026,BESCOM ELECTRICITY BILL,1850.00,,125051.00
19/06/2026,NETFLIX ENTERTAINMENT,649.00,,124402.00`;

    const rows = parseCsvStatement(sampleCsv);
    assert.equal(rows.length, 5);

    // Row 1: Swiggy
    assert.equal(rows[0].date, '2026-06-15');
    assert.equal(rows[0].amount, 450);
    assert.equal(rows[0].type, 'expense');
    assert.equal(rows[0].category, 'Food & Dining');

    // Row 2: Salary Credit
    assert.equal(rows[1].date, '2026-06-16');
    assert.equal(rows[1].amount, 85000);
    assert.equal(rows[1].type, 'income');
    assert.equal(rows[1].category, 'Salary');

    // Row 3: Amazon Shopping
    assert.equal(rows[2].date, '2026-06-17');
    assert.equal(rows[2].amount, 3299);
    assert.equal(rows[2].type, 'expense');
    assert.equal(rows[2].category, 'Shopping');

    // Row 4: Electricity Utility
    assert.equal(rows[3].date, '2026-06-18');
    assert.equal(rows[3].amount, 1850);
    assert.equal(rows[3].type, 'expense');
    assert.equal(rows[3].category, 'Housing & Utilities');

    // Row 5: Netflix Subscription
    assert.equal(rows[4].date, '2026-06-19');
    assert.equal(rows[4].amount, 649);
    assert.equal(rows[4].type, 'expense');
    assert.equal(rows[4].category, 'Entertainment & Subscriptions');
  });

  // Test 4: Single Amount column with signed values or Type column
  test('Check 4: CSV parser handles single signed amount column and semicolon/tab delimiters', () => {
    const semicolonCsv = `Date;Description;Amount;Category
2026-07-01;Client Milestone Retainer;+45000;Client Retainer
2026-07-02;Uber Cab Trip;-420;Transportation
2026-07-03;Apollo Pharmacy Meds;-1250;Health & Medical`;

    const rows = parseCsvStatement(semicolonCsv);
    assert.equal(rows.length, 3);
    assert.equal(rows[0].type, 'income');
    assert.equal(rows[0].amount, 45000);
    assert.equal(rows[1].type, 'expense');
    assert.equal(rows[1].amount, 420);
    assert.equal(rows[2].type, 'expense');
    assert.equal(rows[2].amount, 1250);
  });

  // Test 5: Duplicate Detection against active ledger
  test('Check 5: reconcileDuplicates flags transactions matching active expenses or incomes within ±2 days', () => {
    const existingFinancials = {
      expenses: [
        { id: 'exp_1', title: 'Office Internet Broadband', amount: 1499, dueDate: '2026-06-10', paidDate: '2026-06-10' }
      ],
      incomes: [
        { id: 'inc_1', title: 'Monthly Salary', amount: 75000, expectedDate: '2026-06-01', actualDate: '2026-06-01' }
      ]
    };

    const parsedRows = [
      { id: 'r1', date: '2026-06-11', description: 'Office Internet', amount: 1499, type: 'expense' },
      { id: 'r2', date: '2026-06-02', description: 'Salary Deposit', amount: 75000, type: 'income' },
      { id: 'r3', date: '2026-06-15', description: 'Brand New Expense', amount: 500, type: 'expense' }
    ];

    const reconciled = reconcileDuplicates(parsedRows, existingFinancials);
    assert.equal(reconciled[0].isDuplicate, true, 'Expense duplicate must be detected');
    assert.equal(reconciled[0].approved, false, 'Duplicates must be unchecked by default');
    assert.ok(reconciled[0].duplicateReason.includes('Office Internet Broadband'));

    assert.equal(reconciled[1].isDuplicate, true, 'Income duplicate must be detected');
    assert.equal(reconciled[1].approved, false, 'Duplicate income must be unchecked by default');
    assert.ok(reconciled[1].duplicateReason.includes('Monthly Salary'));

    assert.equal(reconciled[2].isDuplicate, false, 'New transaction must not be duplicate');
    assert.equal(reconciled[2].approved, true, 'New transaction must be approved by default');
  });

  // Test 6: Digital PDF Table Parsing
  test('Check 6: parsePdfStatement extracts text streams and reconstructs banking table rows', () => {
    // Construct a synthetic minimal digital PDF buffer with BT ... ET text blocks
    const pdfContent = `%PDF-1.4
1 0 obj << /Type /Catalog /Pages 2 0 R >> endobj
2 0 obj << /Type /Pages /Kids [3 0 R] /Count 1 >> endobj
3 0 obj << /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R >> endobj
4 0 obj << /Length 200 >>
stream
BT
/F1 12 Tf
72 712 Td (10/06/2026 HDFC HOME LOAN EMI 28500.00 DR 145000.00) Tj
ET
BT
/F1 12 Tf
72 692 Td (12/06/2026 CLIENT INVOICE SETTLEMENT 65000.00 CR 210000.00) Tj
ET
endstream
endobj
xref
0 5
0000000000 65535 f 
0000000010 00000 n 
0000000060 00000 n 
0000000115 00000 n 
0000000210 00000 n 
trailer << /Size 5 /Root 1 0 R >>
startxref
450
%%EOF`;

    const pdfBuffer = Buffer.from(pdfContent, 'latin1');
    const rows = parsePdfStatement(pdfBuffer);

    assert.ok(rows.length >= 2, 'Should extract at least 2 banking rows from PDF');
    const emiRow = rows.find(r => r.amount === 28500);
    assert.ok(emiRow, 'Must extract EMI row');
    assert.equal(emiRow.type, 'expense');
    assert.equal(emiRow.category, 'EMI or loan');

    const clientRow = rows.find(r => r.amount === 65000);
    assert.ok(clientRow, 'Must extract Client row');
    assert.equal(clientRow.type, 'income');
  });

  // Test 7: HTTP Parse Endpoint (`POST /api/analyzer/statements/parse`)
  test('Check 7: POST /api/analyzer/statements/parse processes uploaded CSV file and returns summary', async () => {
    const ts = Date.now();
    const regRes = await fetch(`${baseUrl}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: `parse_api_${ts}@example.com`, password: 'ParsePassword1!', name: 'Parse API User' })
    });
    const { token } = await regRes.json();

    const csvData = `Date,Description,Amount,Type
2026-08-01,Zomato Food Order,650,Expense
2026-08-02,Consulting Retainer,50000,Income`;

    const parseRes = await fetch(`${baseUrl}/api/analyzer/statements/parse`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
      body: JSON.stringify({
        filename: 'statement_august.csv',
        content: csvData,
        fileType: 'csv'
      })
    });

    assert.equal(parseRes.status, 200);
    const data = await parseRes.json();
    assert.equal(data.success, true);
    assert.equal(data.filename, 'statement_august.csv');
    assert.equal(data.summary.totalTransactions, 2);
    assert.equal(data.summary.totalInflows, 50000);
    assert.equal(data.summary.totalOutflows, 650);
    assert.equal(data.rows.length, 2);
  });

  // Test 8: HTTP Import Endpoint (`POST /api/analyzer/statements/import`) persists records
  test('Check 8: POST /api/analyzer/statements/import commits confirmed transactions to user ledger', async () => {
    const ts = Date.now();
    const regRes = await fetch(`${baseUrl}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: `import_api_${ts}@example.com`, password: 'ImportPassword1!', name: 'Import API User' })
    });
    const regData = await regRes.json();
    const token = regData.token;
    db.clearUserData(regData.user.id);

    const importItems = [
      {
        date: '2026-08-10',
        description: 'Design Retainer Milestone',
        category: 'Consulting & Freelance',
        type: 'income',
        amount: 30000
      },
      {
        date: '2026-08-12',
        description: 'New Office Desk Monitor',
        category: 'Shopping',
        type: 'expense',
        amount: 14500,
        isEssential: false
      }
    ];

    const importRes = await fetch(`${baseUrl}/api/analyzer/statements/import`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
      body: JSON.stringify({ transactions: importItems })
    });

    assert.equal(importRes.status, 200);
    const importData = await importRes.json();
    assert.equal(importData.success, true);
    assert.equal(importData.totalImported, 2);
    assert.equal(importData.importedIncomes, 1);
    assert.equal(importData.importedExpenses, 1);

    // Verify records exist in user's partition
    const userFinancials = db.getUserFinancials(regData.user.id);
    const hasIncome = userFinancials.incomes.some(i => i.amount === 30000 && i.title === 'Design Retainer Milestone');
    const hasExpense = userFinancials.expenses.some(e => e.amount === 14500 && e.title === 'New Office Desk Monitor');

    assert.equal(hasIncome, true, 'Imported income must be present in user ledger');
    assert.equal(hasExpense, true, 'Imported expense must be present in user ledger');
  });

  // Test 9: Strict Multi-Tenant Isolation on Statement Ingestion
  test('Check 9: Multi-tenant statement ingestion strictly isolates User A and User B partitions', async () => {
    const ts = Date.now();
    const emailA = `stmt_iso_a_${ts}@example.com`;
    const emailB = `stmt_iso_b_${ts}@example.com`;

    const regA = await (await fetch(`${baseUrl}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: emailA, password: 'IsoPasswordA1!', name: 'Iso User A' })
    })).json();

    const regB = await (await fetch(`${baseUrl}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: emailB, password: 'IsoPasswordB1!', name: 'Iso User B' })
    })).json();

    db.clearUserData(regA.user.id);
    db.clearUserData(regB.user.id);

    // User A imports private transactions
    await fetch(`${baseUrl}/api/analyzer/statements/import`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${regA.token}` },
      body: JSON.stringify({
        transactions: [
          { date: '2026-09-01', description: 'Confidential Client A Royalty', amount: 500000, type: 'income', category: 'Salary' }
        ]
      })
    });

    // Verify User A has it
    const financialsA = db.getUserFinancials(regA.user.id);
    assert.equal(financialsA.incomes.length, 1);
    assert.equal(financialsA.incomes[0].amount, 500000);

    // Verify User B is completely untouched (0 incomes)
    const financialsB = db.getUserFinancials(regB.user.id);
    assert.equal(financialsB.incomes.length, 0, 'User B must have 0 incomes');
  });
});
