const FONNTE_TOKEN = "MASUKKAN_TOKEN_FONNTE_ANDA_DISINI";

/**
 * INSTRUCTIONS:
 * 1. Open Google Apps Script (script.google.com)
 * 2. Create a new project.
 * 3. Paste this code.
 * 4. Deploy as a Web App (Execute as: Me, Access: Anyone).
 * 5. Copy the Web App URL for the app's initial setup.
 */

function doPost(e) {
  if (!e || !e.postData || !e.postData.contents) {
    return response({ success: false, message: 'Invalid request: No post data found. If you are testing from the GAS editor, please use a tool like Postman or the web app instead.' });
  }
  const data = JSON.parse(e.postData.contents);
  const action = data.action;
  const ss = SpreadsheetApp.getActiveSpreadsheet() || createMasterSheet();
  
  // Sheets Setup
  const userSheet = getOrCreateSheet(ss, 'Users', ['Name', 'Username', 'Password', 'WaNumber', 'UserGasUrl', 'CreatedAt', 'PhoneNumber']);
  const financeSheet = getOrCreateSheet(ss, 'Finance', ['Username', 'Date', 'Type', 'Amount', 'Category', 'Source', 'Description', 'Lat', 'Lng', 'ReceiptUrl', 'CreatedAt', 'LocationName', 'PhoneNumber', 'ID']);
  const taskSheet = getOrCreateSheet(ss, 'Tasks', ['Username', 'Title', 'Description', 'Status', 'Priority', 'Deadline', 'ImageUrl', 'ReminderSent', 'CreatedAt', 'PhoneNumber', 'RecurrenceType', 'RecurrenceInterval', 'RecurrenceFreq', 'CurrentCount']);
  const billSheet = getOrCreateSheet(ss, 'Bills', ['Username', 'Title', 'Amount', 'DueDate', 'LastPaidDate', 'RecurrenceType', 'CreatedAt', 'ID']);

  if (action === 'register') {
    const { name, username, password, phone_number } = data;
    const users = userSheet.getDataRange().getValues();
    for (let i = 1; i < users.length; i++) {
      if (users[i][1] === username) return response({ success: false, message: 'Username exists' });
    }
    userSheet.appendRow([name, username, password, phone_number || '', '', new Date().toISOString(), phone_number || '']);
    return response({ success: true });
  }

  if (action === 'login') {
    const { username, password } = data;
    const users = userSheet.getDataRange().getValues();
    for (let i = 1; i < users.length; i++) {
      if (users[i][1] === username && users[i][2] === password) {
        return response({ 
          success: true, 
          user: { 
            name: users[i][0], 
            username: users[i][1], 
            phone_number: users[i][6] || '',
            config: { 
              waNumber: users[i][3], 
              gasUrl: users[i][4] || '' 
            } 
          } 
        });
      }
    }
    return response({ success: false, message: 'Invalid credentials' });
  }

  if (action === 'change_password') {
    const { username, oldPassword, newPassword } = data;
    const rows = userSheet.getDataRange().getValues();
    for (let i = 1; i < rows.length; i++) {
      if (rows[i][1] === username && rows[i][2] === oldPassword) {
        userSheet.getRange(i + 1, 3).setValue(newPassword);
        return response({ success: true });
      }
    }
    return response({ success: false, message: 'Invalid old password' });
  }

  if (action === 'save_config') {
    const { username, config } = data;
    const rows = userSheet.getDataRange().getValues();
    for (let i = 1; i < rows.length; i++) {
      if (rows[i][1] === username) {
        if (config.waNumber !== undefined) {
          userSheet.getRange(i + 1, 4).setValue(config.waNumber);
          userSheet.getRange(i + 1, 7).setValue(config.waNumber); // Update phone number too
        }
        if (config.gasUrl !== undefined) userSheet.getRange(i + 1, 5).setValue(config.gasUrl);
        return response({ success: true });
      }
    }
    return response({ success: false, message: 'User not found' });
  }

  const username = data.username;

  if (action === 'get_data') {
    const finRows = financeSheet.getDataRange().getValues();
    const tskRows = taskSheet.getDataRange().getValues();
    const bRows = billSheet.getDataRange().getValues();
    
    const finance = [];
    for (let i = 1; i < finRows.length; i++) {
      if (finRows[i][0] === username) {
        finance.push({ 
          id: finRows[i][13] || (i + 1).toString(),
          date: finRows[i][1], 
          type: finRows[i][2], 
          amount: finRows[i][3], 
          category: finRows[i][4], 
          source_destination: finRows[i][5], 
          description: finRows[i][6], 
          location: { lat: finRows[i][7], lng: finRows[i][8], name: finRows[i][11] }, 
          receipt_url: finRows[i][9],
          phone_number: finRows[i][12]
        });
      }
    }

    const tasks = [];
    for (let i = 1; i < tskRows.length; i++) {
      if (tskRows[i][0] === username) {
        tasks.push({ 
          id: i + 1, 
          title: tskRows[i][1], 
          description: tskRows[i][2], 
          status: tskRows[i][3], 
          priority: tskRows[i][4], 
          deadline: tskRows[i][5], 
          progress_image_url: tskRows[i][6], 
          reminder_sent: tskRows[i][7],
          phone_number: tskRows[i][9],
          recurrence_type: tskRows[i][10] || 'none',
          recurrence_interval: tskRows[i][11] || 1,
          recurrence_freq: tskRows[i][12] || 1,
          current_count: tskRows[i][13] || 0
        });
      }
    }
    
    const bills = [];
    for (let i = 1; i < bRows.length; i++) {
      if (bRows[i][0] === username) {
        bills.push({
          id: bRows[i][7] || (i + 1).toString(),
          title: bRows[i][1],
          amount: bRows[i][2],
          due_date: bRows[i][3],
          last_paid_date: bRows[i][4],
          recurrence_type: bRows[i][5],
          created_at: bRows[i][6]
        });
      }
    }

    return response({
      success: true,
      finance,
      tasks,
      bills
    });
  }

  if (action === 'get_finance') {
    const finData = financeSheet.getDataRange().getValues();
    const userFin = [];
    for (let i = 1; i < finData.length; i++) {
      if (finData[i][0] === username) {
        userFin.push({ 
          id: i + 1, // Row index
          date: finData[i][1], 
          type: finData[i][2], 
          amount: finData[i][3], 
          category: finData[i][4], 
          source_destination: finData[i][5], 
          description: finData[i][6], 
          location: { lat: finData[i][7], lng: finData[i][8], name: finData[i][11] }, 
          receipt_url: finData[i][9], 
          phone_number: finData[i][12]
        });
      }
    }
    return response({ success: true, finance: userFin });
  }

  if (action === 'get_tasks') {
    const tskData = taskSheet.getDataRange().getValues();
    const userTsk = [];
    for (let i = 1; i < tskData.length; i++) {
      if (tskData[i][0] === username) {
        userTsk.push({ 
          id: i + 1, // Row index
          title: tskData[i][1], 
          description: tskData[i][2], 
          status: tskData[i][3], 
          priority: tskData[i][4], 
          deadline: tskData[i][5], 
          progress_image_url: tskData[i][6], 
          reminder_sent: tskData[i][7], 
          phone_number: tskData[i][9],
          recurrence_type: tskData[i][10] || 'none',
          recurrence_interval: tskData[i][11] || 1,
          recurrence_freq: tskData[i][12] || 1,
          current_count: tskData[i][13] || 0
        });
      }
    }
    return response({ success: true, tasks: userTsk });
  }

  if (action === 'add_finance') {
    const { id, date, type, amount, category, source, description, location, receiptUrl } = data;
    
    // Find user's phone number
    const users = userSheet.getDataRange().getValues();
    let phoneNumber = '';
    for (let i = 1; i < users.length; i++) {
      if (users[i][1] === username) {
        phoneNumber = users[i][6] || users[i][3] || '';
        break;
      }
    }

    financeSheet.appendRow([
      username, 
      date, 
      type, 
      amount, 
      category, 
      source, 
      description, 
      'Local', // Lat set to Local
      'Local', // Lng set to Local
      receiptUrl || '', 
      new Date().toISOString(),
      location?.name || 'Local', // Location name set to Local if empty
      phoneNumber,
      id || new Date().getTime().toString()
    ]);
    return response({ success: true });
  }

  if (action === 'update_finance') {
    const { id, date, type, amount, category, source, description } = data;
    const rowIndex = parseInt(id);
    if (financeSheet.getRange(rowIndex, 1).getValue() === username) {
      if (date) financeSheet.getRange(rowIndex, 2).setValue(date);
      if (type) financeSheet.getRange(rowIndex, 3).setValue(type);
      if (amount !== undefined) financeSheet.getRange(rowIndex, 4).setValue(amount);
      if (category) financeSheet.getRange(rowIndex, 5).setValue(category);
      if (source) financeSheet.getRange(rowIndex, 6).setValue(source);
      if (description !== undefined) financeSheet.getRange(rowIndex, 7).setValue(description);
      return response({ success: true });
    }
    return response({ success: false, message: 'Unauthorized or not found' });
  }

  if (action === 'delete_finance') {
    const { id } = data;
    const rowIndex = parseInt(id);
    if (financeSheet.getRange(rowIndex, 1).getValue() === username) {
      financeSheet.deleteRow(rowIndex);
      return response({ success: true });
    }
    return response({ success: false, message: 'Unauthorized or not found' });
  }

  if (action === 'add_task') {
    const { title, description, status, priority, deadline, phone_number, recurrence_type, recurrence_interval, recurrence_freq, current_count } = data;
    taskSheet.appendRow([
      username, 
      title, 
      description, 
      status, 
      priority, 
      deadline, 
      '', 
      false, 
      new Date().toISOString(),
      phone_number || '',
      recurrence_type || 'none',
      recurrence_interval || 1,
      recurrence_freq || 1,
      current_count || 0
    ]);
    return response({ success: true });
  }

  if (action === 'update_task') {
    const { id, title, status, imageUrl, description, reminder_sent, priority, deadline, recurrence_type, recurrence_interval, recurrence_freq, current_count } = data;
    const rowIndex = parseInt(id);
    
    // If ID is provided, use it for faster lookup
    if (rowIndex && taskSheet.getRange(rowIndex, 1).getValue() === username) {
      if (title) taskSheet.getRange(rowIndex, 2).setValue(title);
      if (description !== undefined) taskSheet.getRange(rowIndex, 3).setValue(description);
      if (status) taskSheet.getRange(rowIndex, 4).setValue(status);
      if (priority) taskSheet.getRange(rowIndex, 5).setValue(priority);
      if (deadline) taskSheet.getRange(rowIndex, 6).setValue(deadline);
      if (imageUrl) taskSheet.getRange(rowIndex, 7).setValue(imageUrl);
      if (reminder_sent !== undefined) taskSheet.getRange(rowIndex, 8).setValue(reminder_sent);
      if (recurrence_type !== undefined) taskSheet.getRange(rowIndex, 11).setValue(recurrence_type);
      if (recurrence_interval !== undefined) taskSheet.getRange(rowIndex, 12).setValue(recurrence_interval);
      if (recurrence_freq !== undefined) taskSheet.getRange(rowIndex, 13).setValue(recurrence_freq);
      if (current_count !== undefined) taskSheet.getRange(rowIndex, 14).setValue(current_count);
      return response({ success: true });
    }

    // Fallback to title lookup if ID is not provided or doesn't match
    const rows = taskSheet.getDataRange().getValues();
    for (let i = 1; i < rows.length; i++) {
      if (rows[i][0] === username && rows[i][1] === title) {
        if (status) taskSheet.getRange(i + 1, 4).setValue(status);
        if (imageUrl) taskSheet.getRange(i + 1, 7).setValue(imageUrl);
        if (description !== undefined) taskSheet.getRange(i + 1, 3).setValue(description);
        if (reminder_sent !== undefined) taskSheet.getRange(i + 1, 8).setValue(reminder_sent);
        if (priority) taskSheet.getRange(i + 1, 5).setValue(priority);
        if (deadline) taskSheet.getRange(i + 1, 6).setValue(deadline);
        if (recurrence_type !== undefined) taskSheet.getRange(i + 1, 11).setValue(recurrence_type);
        if (recurrence_interval !== undefined) taskSheet.getRange(i + 1, 12).setValue(recurrence_interval);
        if (recurrence_freq !== undefined) taskSheet.getRange(i + 1, 13).setValue(recurrence_freq);
        if (current_count !== undefined) taskSheet.getRange(i + 1, 14).setValue(current_count);
        return response({ success: true });
      }
    }
    return response({ success: false, message: 'Task not found' });
  }

  if (action === 'delete_task') {
    const { id, title } = data;
    const rowIndex = parseInt(id);
    if (rowIndex && taskSheet.getRange(rowIndex, 1).getValue() === username) {
      taskSheet.deleteRow(rowIndex);
      return response({ success: true });
    }
    
    const rows = taskSheet.getDataRange().getValues();
    for (let i = 1; i < rows.length; i++) {
      if (rows[i][0] === username && rows[i][1] === title) {
        taskSheet.deleteRow(i + 1);
        return response({ success: true });
      }
    }
    return response({ success: false, message: 'Task not found' });
  }

  // --- BILLS ACTIONS ---
  if (action === 'add_bill') {
    const { id, title, amount, due_date, last_paid_date, recurrence_type, created_at } = data;
    const newId = id || new Date().getTime().toString();
    billSheet.appendRow([username, title, amount, due_date, last_paid_date || '', recurrence_type || 'monthly', created_at || new Date().toISOString(), newId]);
    return response({ success: true, id: newId });
  }

  if (action === 'update_bill') {
    const { id, title, amount, due_date, last_paid_date, recurrence_type } = data;
    const rows = billSheet.getDataRange().getValues();
    for (let i = 1; i < rows.length; i++) {
      if (rows[i][0] === username && (rows[i][7] == id || (i + 1).toString() == id)) {
        if (title !== undefined) billSheet.getRange(i + 1, 2).setValue(title);
        if (amount !== undefined) billSheet.getRange(i + 1, 3).setValue(amount);
        if (due_date !== undefined) billSheet.getRange(i + 1, 4).setValue(due_date);
        if (last_paid_date !== undefined) billSheet.getRange(i + 1, 5).setValue(last_paid_date);
        if (recurrence_type !== undefined) billSheet.getRange(i + 1, 6).setValue(recurrence_type);
        return response({ success: true });
      }
    }
    return response({ success: false, message: 'Bill not found' });
  }

  if (action === 'delete_bill') {
    const { id } = data;
    const rows = billSheet.getDataRange().getValues();
    for (let i = 1; i < rows.length; i++) {
      if (rows[i][0] === username && (rows[i][7] == id || (i + 1).toString() == id)) {
        billSheet.deleteRow(i + 1);
        return response({ success: true });
      }
    }
    return response({ success: false, message: 'Bill not found' });
  }

  if (action === 'pay_bill') {
    const { id, last_paid_date, next_due_date, amount, title, date } = data;
    const rows = billSheet.getDataRange().getValues();
    for (let i = 1; i < rows.length; i++) {
      if (rows[i][0] === username && (rows[i][7] == id || (i + 1).toString() == id)) {
        billSheet.getRange(i + 1, 5).setValue(last_paid_date);
        billSheet.getRange(i + 1, 4).setValue(next_due_date);
        
        // Find user's phone number
        const users = userSheet.getDataRange().getValues();
        let phoneNumber = '';
        for (let j = 1; j < users.length; j++) {
          if (users[j][1] === username) {
            phoneNumber = users[j][6] || users[j][3] || '';
            break;
          }
        }

        // Add to Finance automatically
        const financeId = new Date().getTime().toString();
        financeSheet.appendRow([
          username, date, 'expense', amount, 'Bills', 'Cash', `Pembayaran ${title}`, 'Local', 'Local', '', new Date().toISOString(), 'Local', phoneNumber, financeId
        ]);
        
        return response({ success: true });
      }
    }
    return response({ success: false, message: 'Bill not found' });
  }

  if (action === 'upload_image') {
    const folder = getOrCreateFolder('FinTask_Uploads');
    const blob = Utilities.newBlob(Utilities.base64Decode(data.image), 'image/png', `task_${new Date().getTime()}.png`);
    const file = folder.createFile(blob);
    file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
    return response({ success: true, url: file.getUrl().replace('/view?usp=drivesdk', '/uc?export=view&id=' + file.getId()) });
  }

  return response({ success: false, message: 'Unknown action' });
}

function getOrCreateSheet(ss, name, headers) {
  let sheet = ss.getSheetByName(name);
  if (!sheet) {
    sheet = ss.insertSheet(name);
    sheet.appendRow(headers);
  }
  return sheet;
}

function response(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}

function createMasterSheet() {
  return SpreadsheetApp.create('FinTask_Master_DB');
}

function getOrCreateFolder(name) {
  const folders = DriveApp.getFoldersByName(name);
  if (folders.hasNext()) return folders.next();
  return DriveApp.createFolder(name);
}

// =====================================================================
// FUNGSI PENGINGAT OTOMATIS WA (JALANKAN DENGAN TIME-DRIVEN TRIGGER SETIAP 10 MENIT)
// =====================================================================
function checkAndSendReminders() {
  const now = new Date();
  const timeZone = "Asia/Jakarta"; // Sesuaikan dengan zona waktu Anda (WIB)
  const hourStr = Utilities.formatDate(now, timeZone, "HH");
  const minuteStr = Utilities.formatDate(now, timeZone, "mm");
  const dateStr = Utilities.formatDate(now, timeZone, "yyyy-MM-dd");
  
  const hour = parseInt(hourStr, 10);
  const minute = parseInt(minuteStr, 10);

  // Target waktu: 07:00, 13:25, 18:00
  // Toleransi 15 menit karena trigger GAS mungkin tidak tepat waktu
  let timeSlot = null;
  if (hour === 7 && minute >= 0 && minute <= 15) timeSlot = "07:00";
  else if (hour === 13 && minute >= 25 && minute <= 40) timeSlot = "13:25";
  else if (hour === 18 && minute >= 0 && minute <= 15) timeSlot = "18:00";

  if (!timeSlot) return; // Bukan waktu target

  // Cek apakah sudah dikirim pada slot waktu ini hari ini
  const props = PropertiesService.getScriptProperties();
  const lastSentKey = `last_sent_${dateStr}_${timeSlot}`;
  if (props.getProperty(lastSentKey)) return; 

  props.setProperty(lastSentKey, "true");

  const ss = SpreadsheetApp.getActiveSpreadsheet();
  if (!ss) return;
  
  const userSheet = ss.getSheetByName('Users');
  const billSheet = ss.getSheetByName('Bills');
  const taskSheet = ss.getSheetByName('Tasks');
  
  if (!userSheet) return;

  const users = userSheet.getDataRange().getValues();
  const userMap = {};
  for (let i = 1; i < users.length; i++) {
    userMap[users[i][1]] = users[i][3] || users[i][6]; 
  }

  // Proses Pengeluaran (Bills)
  if (billSheet) {
    const bills = billSheet.getDataRange().getValues();
    for (let i = 1; i < bills.length; i++) {
      const username = bills[i][0];
      const title = bills[i][1];
      const amount = bills[i][2];
      const dueDate = bills[i][3]; 
      const lastPaidDate = bills[i][4];
      const recurrenceType = bills[i][5];
      
      const waNumber = userMap[username];
      
      if (waNumber) {
        const isPaid = (lastPaidDate === dateStr && recurrenceType === 'daily') || 
                       (lastPaidDate && recurrenceType !== 'daily' && lastPaidDate >= dueDate);
        
        if (!isPaid && dueDate <= dateStr) {
          let message = `*PENGINGAT PENGELUARAN*\n\nHalo, tagihan untuk *${title}* jatuh tempo pada ${dueDate}.\n\nNominal: Rp ${amount.toLocaleString('id-ID')}\n\nMohon segera dicatat pembayarannya di aplikasi GTask Flow.`;
          sendWhatsAppMessage(waNumber, message);
        }
      }
    }
  }

  // Proses Kegiatan (Tasks)
  if (taskSheet) {
    const tasks = taskSheet.getDataRange().getValues();
    for (let i = 1; i < tasks.length; i++) {
      const username = tasks[i][0];
      const title = tasks[i][1];
      const status = tasks[i][3];
      const deadline = tasks[i][5]; 
      
      const waNumber = userMap[username];
      
      if (waNumber && status !== 'done') {
        const deadlineDateStr = deadline.substring(0, 10);
        if (deadlineDateStr <= dateStr) {
          let message = `*PENGINGAT KEGIATAN*\n\nHalo, kegiatan *${title}* memiliki deadline pada ${deadline.replace('T', ' ')} dan belum selesai.\n\nMohon segera diselesaikan di aplikasi GTask Flow.`;
          sendWhatsAppMessage(waNumber, message);
        }
      }
    }
  }
}

function sendWhatsAppMessage(phone, message) {
  if (!FONNTE_TOKEN || FONNTE_TOKEN === "MASUKKAN_TOKEN_FONNTE_ANDA_DISINI") return;
  
  let formattedPhone = phone.toString().replace(/\D/g, '');
  if (formattedPhone.startsWith('0')) {
    formattedPhone = '62' + formattedPhone.substring(1);
  }
  
  const url = "https://api.fonnte.com/send";
  const options = {
    "method": "post",
    "headers": {
      "Authorization": FONNTE_TOKEN
    },
    "payload": {
      "target": formattedPhone,
      "message": message
    }
  };
  
  try {
    UrlFetchApp.fetch(url, options);
  } catch (e) {
    console.error("Gagal mengirim WA: " + e.toString());
  }
}
