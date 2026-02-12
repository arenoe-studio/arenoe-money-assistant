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
 * 4. Add 'TELEGRAM_ID' -> Your Telegram user ID (number)
 * 5. Save script properties
 * 6. Run the 'setupTrigger' function once manually to enable auto-sync
 * ------------------------------------------------------------------
 */

const WEBHOOK_PATH = "/webhook/sheets-sync";

function setupTrigger() {
  const triggers = ScriptApp.getProjectTriggers();
  // Clear existing triggers to avoid duplicates
  for (let i = 0; i < triggers.length; i++) {
    ScriptApp.deleteTrigger(triggers[i]);
  }
  
  // Create new ON EDIT trigger (faster for cell-level edits)
  ScriptApp.newTrigger('onSheetEdit')
      .forSpreadsheet(SpreadsheetApp.getActive())
      .onEdit()
      .create();
      
  Logger.log("✅ Trigger 'onSheetEdit' created successfully.");
}

function onSheetEdit(e) {
  // Must have event object (installable trigger)
  if (!e) return;

  const props = PropertiesService.getScriptProperties();
  const WEBHOOK_URL = props.getProperty("WEBHOOK_URL");
  const WEBHOOK_SECRET = props.getProperty("WEBHOOK_SECRET");
  const TELEGRAM_ID = props.getProperty("TELEGRAM_ID");

  if (!WEBHOOK_URL || !WEBHOOK_SECRET) {
    Logger.log("❌ ERROR: Missing Script Properties. Please set WEBHOOK_URL and WEBHOOK_SECRET in Project Settings.");
    return;
  }

  if (!TELEGRAM_ID) {
    Logger.log("❌ ERROR: Missing TELEGRAM_ID in Script Properties.");
    return;
  }

  const sheet = e.source.getActiveSheet();
  
  // 1. Validate Sheet Name
  if (sheet.getName() !== "Transactions") {
    return;
  }

  // 2. Get the edited row
  const row = e.range.getRow();
  
  // Skip Header Row (Row 1)
  if (row <= 1) return;

  // 3. Get Data from Row
  // Columns A-G: [Transaction ID, Items, Harga, Toko, Metode, Tanggal, Type]
  const lastCol = 7; // Column G
  const range = sheet.getRange(row, 1, 1, lastCol);
  const values = range.getValues()[0];

  let transactionId = values[0];
  
  // If no Transaction ID exists, generate one (for manually added rows)
  if (!transactionId || String(transactionId).trim() === "") {
    transactionId = Utilities.getUuid();
    sheet.getRange(row, 1).setValue(transactionId);
  }

  // 4. Format tanggal as ISO string
  let tanggal = values[5];
  if (tanggal instanceof Date) {
    tanggal = Utilities.formatDate(tanggal, Session.getScriptTimeZone(), "yyyy-MM-dd'T'HH:mm:ss");
  } else {
    tanggal = String(tanggal || "");
  }

  // 5. Construct Payload (includes telegramId for new row inserts)
  const payload = {
    "telegramId": parseInt(TELEGRAM_ID),
    "sheetRowId": String(row),
    "transactionId": String(transactionId),
    "items": String(values[1] || ""),
    "harga": Number(values[2] || 0),
    "namaToko": String(values[3] || ""),
    "metodePembayaran": String(values[4] || ""),
    "tanggal": tanggal,
    "type": String(values[6] || "expense")
  };

  // 6. Send Webhook
  const options = {
    'method' : 'post',
    'contentType': 'application/json',
    'headers': {
      'x-webhook-secret': String(WEBHOOK_SECRET)
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
