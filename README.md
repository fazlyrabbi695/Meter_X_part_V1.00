# ChatBot with Google Sheets Integration

A simple chatbot that automatically saves conversations to Google Sheets.

## Setup Instructions

1. Create a Google Apps Script:
   - Go to [Google Apps Script](https://script.google.com/)
   - Create a new project
   - Copy and paste the following code:

```javascript
function doPost(e) {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
  const data = JSON.parse(e.postData.contents);
  
  sheet.appendRow([
    data.timestamp,
    data.sender,
    data.message
  ]);
  
  return ContentService.createTextOutput('Success');
}
```

2. Deploy the Google Apps Script:
   - Click on "Deploy" > "New deployment"
   - Choose "Web app"
   - Set "Execute as" to your Google account
   - Set "Who has access" to "Anyone"
   - Click "Deploy"
   - Copy the deployment URL

3. Configure the ChatBot:
   - Open `script.js`
   - Replace the empty `SCRIPT_URL` value with your Google Apps Script deployment URL

4. Open `index.html` in a web browser to start using the chatbot!

## Features

- Clean, modern UI
- Real-time chat interaction
- Automatic saving of conversations to Google Sheets
- Responsive design
- Basic chat bot responses

## Requirements

- Modern web browser
- Google account for Sheets integration
- Internet connection

## Note

Make sure to handle the Google Apps Script deployment URL securely in a production environment.
