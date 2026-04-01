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
  const financeSheet = getOrCreateSheet(ss, 'Finance', ['Username', 'Date', 'Type', 'Amount', 'Category', 'Source', 'Description', 'Lat', 'Lng', 'ReceiptUrl', 'CreatedAt', 'LocationName', 'PhoneNumber']);
  const taskSheet = getOrCreateSheet(ss, 'Tasks', ['Username', 'Title', 'Description', 'Status', 'Priority', 'Deadline', 'ImageUrl', 'ReminderSent', 'CreatedAt', 'PhoneNumber']);

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
    
    const finance = [];
    for (let i = 1; i < finRows.length; i++) {
      if (finRows[i][0] === username) {
        finance.push({ 
          id: i + 1,
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
          phone_number: tskRows[i][9]
        });
      }
    }
    
    return response({
      success: true,
      finance,
      tasks
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
          phone_number: tskData[i][9]
        });
      }
    }
    return response({ success: true, tasks: userTsk });
  }

  if (action === 'add_finance') {
    const { date, type, amount, category, source, description, location, receiptUrl, phone_number } = data;
    financeSheet.appendRow([
      username, 
      date, 
      type, 
      amount, 
      category, 
      source, 
      description, 
      location?.lat || '', 
      location?.lng || '', 
      receiptUrl || '', 
      new Date().toISOString(),
      location?.name || '',
      phone_number || ''
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
    const { title, description, status, priority, deadline, phone_number } = data;
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
      phone_number || ''
    ]);
    return response({ success: true });
  }

  if (action === 'update_task') {
    const { id, title, status, imageUrl, description, reminder_sent, priority, deadline } = data;
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
