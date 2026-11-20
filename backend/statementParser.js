import zlib from 'node:zlib';
import db from './db.js';
import { diffInDays, getCurrentLocalDate, toISODate } from './dateService.js';
import { safeDate } from './analyzerService.js';

// Pre-defined category keyword mapping for bank narrations
const CATEGORY_RULES = [
  { category: 'Food & Dining', type: 'expense', regex: /swiggy|zomato|mcdonald|kfc|starbucks|domino|pizza|burger|cafe|restaurant|eats|barbeque|bistro|food/i },
  { category: 'Groceries', type: 'expense', regex: /blinkit|zepto|instamart|bigbasket|dmart|supermarket|grocery|groceries|kirana|spencer|nature\s*basket/i },
  { category: 'Shopping', type: 'expense', regex: /amazon|flipkart|myntra|ajio|meesho|tata\s*cliq|nykaa|retail|croma|reliance\s*digital|shopping|store/i },
  { category: 'Transportation', type: 'expense', regex: /uber|ola|rapido|metro|fuel|petrol|diesel|hpcl|bpcl|iocl|fastag|toll|parking|flight|indigo|air\s*india|irctc/i },
  { category: 'Entertainment & Subscriptions', type: 'expense', regex: /netflix|spotify|prime|hotstar|youtube|apple|google\s*play|disney|playstation|steam|multiplex|pvr|inox|bookmyshow/i },
  { category: 'Housing & Utilities', type: 'expense', regex: /rent|maintenance|society|electricity|bescom|tneb|mseb|water|broadband|wifi|airtel|jio|vi\s*postpaid|gas|cylinder|lpg/i },
  { category: 'Health & Medical', type: 'expense', regex: /pharmacy|medplus|apollo|1mg|pharmeasy|hospital|clinic|doctor|diagnostic|lab|dental|health/i },
  { category: 'EMI or loan', type: 'expense', regex: /emi|loan|bajaj\s*finance|home\s*loan|car\s*loan|personal\s*loan|hdfc\s*bank\s*loan|icici\s*loan/i },
  { category: 'Insurance', type: 'expense', regex: /insurance|lic|hdfc\s*ergo|icici\s*lombard|star\s*health|max\s*life|tata\s*aig/i },
  { category: 'Salary', type: 'income', regex: /salary|payroll|wages|stipend|corp\s*salary|monthly\s*pay/i },
  { category: 'Consulting & Freelance', type: 'income', regex: /client|invoice|retainer|freelance|consulting|milestone|project\s*payment|upwork|fiverr/i },
  { category: 'Investment & Interest', type: 'income', regex: /interest|dividend|fd\s*interest|sweep\s*in|mutual\s*fund|redemption|zerodha|groww/i },
  { category: 'Refund & Reversals', type: 'income', regex: /refund|reversal|cashback|cb\s*reward/i }
];

/**
 * Infer category and default transaction type based on narration text
 */
export function inferCategory(narration = '', detectedType = 'expense') {
  const text = (narration || '').trim();
  for (const rule of CATEGORY_RULES) {
    if (rule.regex.test(text)) {
      return {
        category: rule.category,
        type: rule.type || detectedType
      };
    }
  }

  return {
    category: detectedType === 'income' ? 'Other Inflow' : 'General & Miscellaneous',
    type: detectedType
  };
}

/**
 * Clean messy bank narrations into readable titles
 */
export function sanitizeNarration(raw = '') {
  let text = String(raw || '').trim();
  // Strip common bank routing prefixes (UPI, NEFT, RTGS, IMPS, POS, ACH)
  text = text.replace(/^(upi|neft|rtgs|imps|pos|ach|nach|cms|atm)[/-]/i, '');
  text = text.replace(/^(upi|neft|rtgs|imps|pos|ach|nach|cms|atm)\s+/i, '');
  // Strip trailing reference IDs or phone/VPA tails
  text = text.replace(/\/[\dA-Z]{8,}$/i, '');
  text = text.replace(/@\w+(\.\w+)?/i, '');
  // Collapse whitespace
  text = text.replace(/\s+/g, ' ').trim();
  if (!text) text = 'Bank Transaction';
  // Capitalize first letter of each word up to 60 characters
  return text.slice(0, 60);
}

/**
 * Normalize diverse date formats to ISO YYYY-MM-DD
 */
export function normalizeDate(dateStr) {
  if (!dateStr) return getCurrentLocalDate();
  const cleaned = String(dateStr).trim().replace(/[.]/g, '/').replace(/[-]/g, '/');

  // Match YYYY/MM/DD
  const ymdMatch = cleaned.match(/^(\d{4})\/(\d{1,2})\/(\d{1,2})$/);
  if (ymdMatch) {
    const [, y, m, d] = ymdMatch;
    return `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
  }

  // Match DD/MM/YYYY or DD/MM/YY
  const dmyMatch = cleaned.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})$/);
  if (dmyMatch) {
    let [, d, m, y] = dmyMatch;
    if (y.length === 2) y = `20${y}`;
    return `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
  }

  // Match Month Names: e.g. 15-Jan-2026 or Jan 15, 2026
  const parsed = new Date(dateStr);
  if (!isNaN(parsed.getTime())) {
    const y = parsed.getFullYear();
    const m = String(parsed.getMonth() + 1).padStart(2, '0');
    const d = String(parsed.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }

  return getCurrentLocalDate();
}

/**
 * Parse standard or custom CSV bank statements
 */
export function parseCsvStatement(csvContent = '') {
  const lines = String(csvContent || '')
    .split(/\r?\n/)
    .map(l => l.trim())
    .filter(l => l.length > 0);

  if (lines.length < 2) {
    throw new Error('CSV statement must contain at least a header row and one transaction row');
  }

  // 1. Detect delimiter
  const firstFew = lines.slice(0, 5).join('\n');
  const commaCount = (firstFew.match(/,/g) || []).length;
  const semiCount = (firstFew.match(/;/g) || []).length;
  const tabCount = (firstFew.match(/\t/g) || []).length;
  const pipeCount = (firstFew.match(/\|/g) || []).length;

  let delimiter = ',';
  if (semiCount > commaCount && semiCount > tabCount) delimiter = ';';
  else if (tabCount > commaCount && tabCount > semiCount) delimiter = '\t';
  else if (pipeCount > commaCount && pipeCount > semiCount) delimiter = '|';

  // Helper to split CSV row respecting quotes
  const splitRow = (row) => {
    const cells = [];
    let current = '';
    let inQuotes = false;

    for (let i = 0; i < row.length; i++) {
      const char = row[i];
      if (char === '"') {
        if (inQuotes && row[i + 1] === '"') {
          current += '"';
          i++;
        } else {
          inQuotes = !inQuotes;
        }
      } else if (char === delimiter && !inQuotes) {
        cells.push(current.trim());
        current = '';
      } else {
        current += char;
      }
    }
    cells.push(current.trim());
    return cells;
  };

  // 2. Identify header row by scanning for banking keywords
  let headerIdx = -1;
  let headers = [];

  for (let i = 0; i < Math.min(lines.length, 10); i++) {
    const tokens = splitRow(lines[i]).map(t => t.toLowerCase().replace(/[^a-z0-9]/g, ''));
    const isHeaderCandidate = tokens.some(t =>
      /^(date|txn\s*date|value\s*date|transaction\s*date)$/i.test(t) ||
      /^(description|narration|particulars|details|memo|remarks|merchant|title)$/i.test(t) ||
      /^(amount|debit|credit|withdrawal|deposit|balance)$/i.test(t)
    );

    if (isHeaderCandidate) {
      headerIdx = i;
      headers = splitRow(lines[i]).map(h => h.trim());
      break;
    }
  }

  if (headerIdx === -1) {
    // Default to first row as header if no explicit keyword found
    headerIdx = 0;
    headers = splitRow(lines[0]).map(h => h.trim());
  }

  // 3. Map column indices
  let dateCol = -1;
  let descCol = -1;
  let debitCol = -1;
  let creditCol = -1;
  let amountCol = -1;
  let typeCol = -1;
  let categoryCol = -1;

  headers.forEach((h, idx) => {
    const clean = h.toLowerCase().trim();
    if (/date/i.test(clean) && dateCol === -1) dateCol = idx;
    else if (/^(description|narration|particulars|details|title|memo|remarks|merchant|payee)/i.test(clean) && descCol === -1) descCol = idx;
    else if (/^(debit|withdrawal|dr|paid|debit\s*amount|spent)/i.test(clean) && debitCol === -1) debitCol = idx;
    else if (/^(credit|deposit|cr|received|credit\s*amount)/i.test(clean) && creditCol === -1) creditCol = idx;
    else if (/^(amount|net\s*amount|txn\s*amount)/i.test(clean) && amountCol === -1) amountCol = idx;
    else if (/^(type|transaction\s*type|dr_cr|cr_dr|indicator)/i.test(clean) && typeCol === -1) typeCol = idx;
    else if (/^(category|tag)/i.test(clean) && categoryCol === -1) categoryCol = idx;
  });

  // Fallbacks if columns are not labeled
  if (dateCol === -1) dateCol = 0;
  if (descCol === -1) descCol = 1 < headers.length ? 1 : 0;
  if (debitCol === -1 && creditCol === -1 && amountCol === -1) {
    amountCol = 2 < headers.length ? 2 : 1;
  }

  // 4. Extract transaction rows
  const parsedRows = [];
  const parseNum = (str) => {
    if (!str) return 0;
    const clean = String(str).replace(/[₹$,\s]/g, '').trim();
    const val = parseFloat(clean);
    return isNaN(val) ? 0 : Math.abs(val);
  };

  for (let i = headerIdx + 1; i < lines.length; i++) {
    const row = splitRow(lines[i]);
    if (row.length < 2 || row.every(cell => !cell)) continue;

    const rawDate = row[dateCol] || '';
    const rawDesc = row[descCol] || 'Bank Transaction';
    const rawCategory = categoryCol !== -1 ? row[categoryCol] : '';

    let amount = 0;
    let type = 'expense';

    if (debitCol !== -1 && creditCol !== -1) {
      const debitVal = parseNum(row[debitCol]);
      const creditVal = parseNum(row[creditCol]);
      if (creditVal > 0) {
        amount = creditVal;
        type = 'income';
      } else if (debitVal > 0) {
        amount = debitVal;
        type = 'expense';
      } else {
        continue; // Zero or balance row
      }
    } else if (amountCol !== -1) {
      const rawAmtStr = row[amountCol] || '';
      amount = parseNum(rawAmtStr);
      if (amount === 0) continue;

      if (typeCol !== -1) {
        const typeStr = (row[typeCol] || '').toLowerCase();
        type = /credit|cr|deposit|income|\+/i.test(typeStr) ? 'income' : 'expense';
      } else {
        // Signed amount: negative = expense, positive = income
        const rawTrimmed = rawAmtStr.replace(/[₹$,\s]/g, '').trim();
        type = rawTrimmed.startsWith('-') ? 'expense' : 'income';
      }
    }

    if (amount <= 0) continue;

    const date = normalizeDate(rawDate);
    const description = sanitizeNarration(rawDesc);
    const inferred = inferCategory(rawDesc, type);
    const category = rawCategory || inferred.category;

    parsedRows.push({
      id: `stmt_row_${parsedRows.length + 1}_${Date.now()}`,
      date,
      description,
      category,
      type: inferred.type || type,
      amount,
      rawNarration: rawDesc,
      isEssential: /rent|housing|utilities|groceries|health|emi|loan/i.test(category)
    });
  }

  return parsedRows;
}

/**
 * Robust zero-dependency PDF text stream and table extractor
 */
export function parsePdfStatement(pdfBuffer) {
  if (!pdfBuffer || !Buffer.isBuffer(pdfBuffer)) {
    throw new Error('Valid PDF buffer is required');
  }

  let textContent = '';

  // 1. Scan for uncompressed text blocks: BT ... ET
  const bufferStr = pdfBuffer.toString('latin1');
  const btRegex = /\bBT\b([\s\S]*?)\bET\b/g;
  let match;
  while ((match = btRegex.exec(bufferStr)) !== null) {
    const block = match[1];
    // Extract strings inside parentheses: (Text) Tj or [(T)(e)(x)(t)] TJ
    const strRegex = /\(([^)]*)\)\s*(?:Tj|'|")/g;
    let strMatch;
    while ((strMatch = strRegex.exec(block)) !== null) {
      textContent += strMatch[1] + ' ';
    }
    textContent += '\n';
  }

  // 2. Scan and inflate compressed FlateDecode streams
  const streamRegex = /stream[\r\n]+([\s\S]*?)[\r\n]+endstream/g;
  let sMatch;
  while ((sMatch = streamRegex.exec(bufferStr)) !== null) {
    const rawStream = sMatch[1];
    try {
      const streamBuf = Buffer.from(rawStream, 'latin1');
      const decompressed = zlib.inflateSync(streamBuf);
      const decStr = decompressed.toString('latin1');

      // Extract text operators from decompressed stream
      let decMatch;
      const decBtRegex = /\bBT\b([\s\S]*?)\bET\b/g;
      while ((decMatch = decBtRegex.exec(decStr)) !== null) {
        const block = decMatch[1];
        const strRegex = /\(([^)]*)\)\s*(?:Tj|'|")/g;
        let sm;
        while ((sm = strRegex.exec(block)) !== null) {
          textContent += sm[1] + ' ';
        }
        textContent += '\n';
      }
    } catch {
      // Non-flate stream or image data, safely skip
    }
  }

  // If textContent was empty, attempt regex matching on readable ASCII sequences
  if (!textContent.trim()) {
    const asciiRuns = bufferStr.match(/[\x20-\x7E]{5,}/g) || [];
    textContent = asciiRuns.join('\n');
  }

  if (!textContent.trim()) {
    throw new Error('The uploaded PDF does not contain selectable digital text. Scanned or image-only PDFs are not supported. Please upload a digital PDF statement or CSV.');
  }

  // 3. Process extracted text lines for banking rows
  const lines = textContent.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
  const parsedRows = [];

  // Banking row regex: Date + Narration + Amount
  const rowPattern = /(\d{1,2}[/-]\d{1,2}[/-]\d{2,4})\s+(.+?)\s+([₹$]?\s*[\d,]+\.\d{2}|[\d,]+)\s*(CR|DR|Cr|Dr)?(?:\s+([₹$]?\s*[\d,]+\.\d{2}))?$/;

  for (const line of lines) {
    const match = line.match(rowPattern);
    if (!match) continue;

    const [, rawDate, rawDesc, rawAmt, indicator] = match;
    const amount = parseFloat(rawAmt.replace(/[₹$,\s]/g, ''));
    if (isNaN(amount) || amount <= 0) continue;

    const isCredit = /cr/i.test(indicator || '') || /credit|deposit|salary|refund/i.test(rawDesc);
    const type = isCredit ? 'income' : 'expense';
    const date = normalizeDate(rawDate);
    const description = sanitizeNarration(rawDesc);
    const inferred = inferCategory(rawDesc, type);

    parsedRows.push({
      id: `pdf_row_${parsedRows.length + 1}_${Date.now()}`,
      date,
      description,
      category: inferred.category,
      type: inferred.type || type,
      amount,
      rawNarration: rawDesc,
      isEssential: /rent|housing|utilities|groceries|health|emi|loan/i.test(inferred.category)
    });
  }

  if (parsedRows.length === 0) {
    // If table regex did not match standard format, attempt line-by-line fallback
    const dateLineRegex = /^(\d{1,2}[/-]\d{1,2}[/-]\d{2,4})/;
    for (const line of lines) {
      if (dateLineRegex.test(line)) {
        const tokens = line.split(/\s{2,}|\t/);
        if (tokens.length >= 2) {
          const date = normalizeDate(tokens[0]);
          const desc = tokens[1] || 'Bank Transaction';
          const amtStr = tokens.find(t => /^[\d,]+(\.\d{2})?$/.test(t.replace(/[₹$,\s]/g, '')));
          if (amtStr) {
            const amount = parseFloat(amtStr.replace(/[₹$,\s]/g, ''));
            if (!isNaN(amount) && amount > 0) {
              const type = /credit|cr|deposit|salary/i.test(line) ? 'income' : 'expense';
              const inferred = inferCategory(desc, type);
              parsedRows.push({
                id: `pdf_row_${parsedRows.length + 1}_${Date.now()}`,
                date,
                description: sanitizeNarration(desc),
                category: inferred.category,
                type: inferred.type || type,
                amount,
                rawNarration: desc,
                isEssential: /rent|housing|utilities|groceries|health|emi|loan/i.test(inferred.category)
              });
            }
          }
        }
      }
    }
  }

  if (parsedRows.length === 0) {
    throw new Error('Unable to extract recognized transaction tables from this PDF statement. Please ensure it is an official bank account statement or upload the CSV version.');
  }

  return parsedRows;
}

/**
 * Reconcile extracted statement rows against user's active ledger to flag duplicates
 */
export function reconcileDuplicates(parsedRows = [], existingFinancials = {}) {
  const existingIncomes = Array.isArray(existingFinancials.incomes) ? existingFinancials.incomes : [];
  const existingExpenses = Array.isArray(existingFinancials.expenses) ? existingFinancials.expenses : [];

  return parsedRows.map(row => {
    let isDuplicate = false;
    let duplicateReason = null;

    if (row.type === 'expense') {
      const match = existingExpenses.find(exp => {
        const amtMatch = Math.abs(Number(exp.amount) - row.amount) < 0.01;
        const expDate = safeDate(exp.paidDate || exp.dueDate);
        const dayDiff = Math.abs(diffInDays(expDate, row.date));
        return amtMatch && dayDiff <= 2;
      });

      if (match) {
        isDuplicate = true;
        duplicateReason = `Matches existing expense "${match.title}" (₹${match.amount}) on ${match.paidDate || match.dueDate}`;
      }
    } else {
      const match = existingIncomes.find(inc => {
        const amtMatch = Math.abs(Number(inc.amount) - row.amount) < 0.01;
        const incDate = safeDate(inc.actualDate || inc.expectedDate);
        const dayDiff = Math.abs(diffInDays(incDate, row.date));
        return amtMatch && dayDiff <= 2;
      });

      if (match) {
        isDuplicate = true;
        duplicateReason = `Matches existing income "${match.source || match.title}" (₹${match.amount}) on ${match.actualDate || match.expectedDate}`;
      }
    }

    return {
      ...row,
      isDuplicate,
      duplicateReason,
      // Default approval: Approve all valid rows EXCEPT detected duplicates
      approved: !isDuplicate
    };
  });
}

/**
 * Parse Statement File Entry Point (CSV or PDF)
 */
export function parseStatementFile({ filename = '', content, fileType, existingFinancials = {} }) {
  if (!content) {
    throw new Error('File content is empty or unreadable');
  }

  const name = (filename || '').toLowerCase();
  const isPdf = fileType === 'pdf' || name.endsWith('.pdf');
  const isCsv = fileType === 'csv' || name.endsWith('.csv') || name.endsWith('.txt');

  let rawRows = [];

  if (isPdf) {
    const buffer = Buffer.isBuffer(content)
      ? content
      : Buffer.from(content, typeof content === 'string' && content.startsWith('data:') ? 'base64' : 'base64');
    rawRows = parsePdfStatement(buffer);
  } else if (isCsv) {
    const str = Buffer.isBuffer(content) ? content.toString('utf8') : String(content);
    rawRows = parseCsvStatement(str);
  } else {
    throw new Error('Unsupported statement format. Please upload a .csv or .pdf file.');
  }

  if (rawRows.length === 0) {
    throw new Error('No valid financial transactions could be parsed from this file.');
  }

  // Deduplicate and reconcile against user's ledger
  const reconciledRows = reconcileDuplicates(rawRows, existingFinancials);

  // Compute summary stats
  const totalInflows = reconciledRows
    .filter(r => r.type === 'income')
    .reduce((sum, r) => sum + r.amount, 0);

  const totalOutflows = reconciledRows
    .filter(r => r.type === 'expense')
    .reduce((sum, r) => sum + r.amount, 0);

  const duplicateCount = reconciledRows.filter(r => r.isDuplicate).length;

  return {
    filename,
    summary: {
      totalTransactions: reconciledRows.length,
      totalInflows: Math.round(totalInflows),
      totalOutflows: Math.round(totalOutflows),
      netMovement: Math.round(totalInflows - totalOutflows),
      duplicateCount,
      readyToImportCount: reconciledRows.length - duplicateCount
    },
    rows: reconciledRows
  };
}

/**
 * Execute verified ledger import into FinSight
 */
export function importConfirmedTransactions(userId, transactions = []) {
  if (!userId || typeof userId !== 'string') {
    throw new Error('Unauthorized: User ID must be derived from verified session');
  }

  if (!Array.isArray(transactions) || transactions.length === 0) {
    throw new Error('No transactions provided for import');
  }

  let importedIncomes = 0;
  let importedExpenses = 0;

  for (const item of transactions) {
    const amount = Number(item.amount);
    if (!amount || isNaN(amount) || amount <= 0) continue;

    const title = (item.description || item.title || 'Statement Item').trim().slice(0, 100);
    const date = normalizeDate(item.date);
    const category = item.category || 'General & Miscellaneous';

    if (item.type === 'income') {
      db.addIncome(userId, {
        title,
        amount,
        expectedDate: date,
        actualDate: date,
        status: 'Received',
        isRecurring: false,
        source: title
      });
      importedIncomes++;
    } else {
      const isEssential = item.isEssential !== undefined
        ? Boolean(item.isEssential)
        : /rent|housing|utilities|groceries|health|emi|loan/i.test(category);

      db.addExpense(userId, {
        title,
        amount,
        dueDate: date,
        paidDate: date,
        category,
        status: 'Paid',
        isEssential
      });
      importedExpenses++;
    }
  }

  return {
    success: true,
    importedIncomes,
    importedExpenses,
    totalImported: importedIncomes + importedExpenses
  };
}

export const statementParser = {
  inferCategory,
  sanitizeNarration,
  normalizeDate,
  parseCsvStatement,
  parsePdfStatement,
  reconcileDuplicates,
  parseStatementFile,
  importConfirmedTransactions
};

export default statementParser;
