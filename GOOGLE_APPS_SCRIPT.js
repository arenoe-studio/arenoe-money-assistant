/**
 * Arenoe Money Assistant - Google Sheets Sync Script
 * 
 * COPY THIS CODE INTO YOUR GOOGLE APPS SCRIPT EDITOR (Extensions > Apps Script)
 * 
 * ------------------------------------------------------------------
 * SETUP INSTRUCTIONS:
 * 1. Go to Project Settings (Gear Icon) -> Script Properties
 * 2. Add 'WEBHOOK_URL' -> https://your-app-name.koyeb.app (NO trailing slash)
 * 3. Add 'WEBHOOK_SECRET' -> Your webhook secret from Koyeb env
 * 4. Save script properties
 * 5. Run the 'setupTrigger' function once manually to enable auto-sync
 * ------------------------------------------------------------------
 */

const WEBHOOK_PATH = "/webhook/sheets-sync";

function setupTrigger() {
  const triggers = ScriptApp.getProjectTriggers();
  // Clear existing triggers to avoid duplicates
  for (let i = 0; i < triggers.length; i++) {
    ScriptApp.deleteTrigger(triggers[i]);
  }
  
  // Create new ON CHANGE trigger (Covers edits, row insertions, etc.)
  ScriptApp.newTrigger('onSheetChange')
      .forSpreadsheet(SpreadsheetApp.getActive())
      .onChange()
      .create();
      
  // Also needed? onEdit is faster for single cell edits, but onChange handles rows better.
  // Let's stick to onChange to be safe.
      
  Logger.log("✅ Trigger 'onSheetChange' created successfully.");
}

function onSheetChange(e) {
  const props = PropertiesService.getScriptProperties();
  const WEBHOOK_URL = props.getProperty("WEBHOOK_URL");
  const WEBHOOK_SECRET = props.getProperty("WEBHOOK_SECRET");

  if (!WEBHOOK_URL || !WEBHOOK_SECRET) {
    Logger.log("❌ ERROR: Missing Script Properties. Please set WEBHOOK_URL and WEBHOOK_SECRET in Project Settings.");
    return;
  }

  const sheet = SpreadsheetApp.getActiveSheet();
  
  // 1. Validate Sheet Name
  if (sheet.getName() !== "Transactions") {
    // Ignore changes in other sheets
    return;
  }

  // 2. Identify the Active Row
  // 'e' object doesn't give row on INSERT_ROW events reliably, so we use ActiveRange
  const activeRange = sheet.getActiveRange();
  if (!activeRange) return;
  
  const row = activeRange.getRow();
  
  // Skip Header Row (Row 1)
  if (row <= 1) return;

  // 3. Get Data from Row
  // Assuming Columns A-G: [ID, Items, Harga, Toko, Metode, Tanggal, Type]
  const lastCol = 7; // Column G
  const range = sheet.getRange(row, 1, 1, lastCol);
  const values = range.getValues()[0]; // Array of values

  const transactionId = values[0];
  
  // If no ID, we can't sync
  if (!transactionId || String(transactionId).trim() === "") {
     Logger.log(`⚠️ Skpping sync: No Transaction ID in Row ${row}`);
     return;
  }

  // 4. Construct Payload
  const payload = {
    "transactionId": String(transactionId),
    "items": String(values[1] || ""),
    "harga": Number(values[2] || 0),
    "namaToko": String(values[3] || ""),
    "metodePembayaran": String(values[4] || ""),
    "tanggal": String(values[5] || ""), // Apps Script usually returns Date object or string
    "type": String(values[6] || "expense")
  };

  // 5. Send Webhook
  const options = {
    'method' : 'post',
    'contentType': 'application/json',
    'headers': {
      'x-webhook-secret': String(WEBHOOK_SECRET) // Force string to avoid "Header:null" error
    },
    'payload' : JSON.stringify(payload),
    'muteHttpExceptions': true
  };

  try {
    const fullUrl = WEBHOOK_URL + WEBHOOK_PATH;
    Logger.log(`🔄 Sending Sync for ID: ${payload.transactionId} to ${fullUrl}`);
    
    const response = UrlFetchApp.fetch(fullUrl, options);
    const responseCode = response.getResponseCode();
    const responseBody = response.getContentText();
    
    if (responseCode === 200) {
      Logger.log(`✅ Success: ${responseBody}`);
    } else {
      Logger.log(`⚠️ Failed (${responseCode}): ${responseBody}`);
    }
  } catch (error) {
    Logger.log(`❌ Network Error: ${error.toString()}`);
  }
}
