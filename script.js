// Default Excel Data - Auto-generated from last upload
const DEFAULT_EXCEL_DATA = [];

// Google Sheets API configuration
const SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbxyyUx90A_HdJZnapWSRSf6iegqTCEOci7ToogYBEk09MIRa96ONHftFAzc_Xezh-bGdg/exec'; // Add your Google Apps Script URL here

class ChatBot {
    constructor() {
        this.messages = document.getElementById('chat-messages');
        this.userInput = document.getElementById('user-input');
        this.sendButton = document.getElementById('send-button');
        this.typingIndicator = document.getElementById('typing-indicator');
        this.themeToggleBtn = document.getElementById('theme-toggle-btn');
        
        // Create file input and upload button
        this.fileInput = document.createElement('input');
        this.fileInput.type = 'file';
        this.fileInput.accept = '.xlsx, .xls';
        this.fileInput.style.display = 'none';
        
        this.uploadButton = document.createElement('button');
        this.uploadButton.textContent = 'Excel';
        this.uploadButton.className = 'upload-btn';
        this.uploadButton.title = 'Upload Excel File (Login required)';
        this.uploadButton.disabled = true; // Disabled by default until login
        this.uploadButton.onclick = () => this.fileInput.click();
        
        // Add upload button to header right section
        const headerRight = document.querySelector('.chat-header-right');
        const themeButton = document.querySelector('#theme-toggle-btn');
        if (headerRight && themeButton) {
            headerRight.insertBefore(this.uploadButton, themeButton);
        }
        document.body.appendChild(this.fileInput);
        
        // Initialize other components
        this.chatContainer = document.querySelector('.chat-container');
        this.userInput = document.querySelector('#user-input');
        this.sendButton = document.querySelector('#send-button');
        
        // Training mode variables
        this.isTrainingMode = false;
        this.isAuthenticated = false;
        this.trainingPassword = '865'; // Password for both training and Excel upload
        
        // Excel data storage - load from excel_data.js if available
        this.excelData = typeof EXCEL_DATA !== 'undefined' ? EXCEL_DATA : null;
        
        this.initializeEventListeners();
        this.showWelcomeMessage();
        
    }

    // Initialize all event listeners
    initializeEventListeners() {
        this.sendButton.addEventListener('click', () => this.handleUserInput());
        this.userInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') this.handleUserInput();
        });
        this.themeToggleBtn.addEventListener('click', () => this.toggleTheme());
        
        // Add Excel file input listener
        this.fileInput.addEventListener('change', (e) => {
            if (!this.isAuthenticated) {
                this.addBotMessage({
                    text: "Please login first with: #login 865",
                    speak: false
                });
                this.fileInput.value = ''; // Clear the file input
                return;
            }
            this.handleExcelFile(e);
        });
    }

    // Handle Excel file upload
    async handleExcelFile(event) {
        if (!this.isAuthenticated) {
            this.addBotMessage({
                text: "Please login first with: #login 865",
                speak: false
            });
            this.fileInput.value = ''; // Clear the file input
            return;
        }

        const file = event.target.files[0];
        if (!file) return;

        try {
            const data = await this.readExcelFile(file);
            console.log('Loaded Excel data:', data); // Debug log
            
            if (data && data.length > 0) {
                // Store data in memory
                this.excelData = data;
                
                // Save to excel_data.js and localStorage
                await this.saveExcelDataToScript(data);
                
                this.addBotMessage({
                    text: `Excel file uploaded successfully! Found ${data.length} entries.\n\nℹ️ Check your Downloads folder for the updated 'excel_data.js' file.`,
                    speak: false
                });
            } else {
                this.addBotMessage({
                    text: "The Excel file appears to be empty. Please make sure it contains data in the correct format.",
                    speak: false
                });
            }
        } catch (error) {
            console.error('Error reading Excel file:', error);
            this.addBotMessage({
                text: "Error reading Excel file. Please ensure it's in the correct format with columns: Question, Response, Category, Keywords",
                speak: false
            });
        }
        
        // Clear the file input for next upload
        this.fileInput.value = '';
    }

    // Read Excel file using SheetJS
    async readExcelFile(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = async (e) => {
                try {
                    const data = new Uint8Array(e.target.result);
                    const workbook = XLSX.read(data, { type: 'array' });
                    const sheetName = workbook.SheetNames[0];
                    const worksheet = workbook.Sheets[sheetName];
                    const jsonData = XLSX.utils.sheet_to_json(worksheet);
                    console.log('Parsed Excel data:', jsonData); // Debug log
                    resolve(jsonData);
                } catch (error) {
                    console.error('Excel parsing error:', error);
                    reject(error);
                }
            };
            reader.onerror = reject;
            reader.readAsArrayBuffer(file);
        });
    }

    // Load Excel data from localStorage
    loadExcelDataFromStorage() {
        const savedData = localStorage.getItem('excelData');
        return savedData ? JSON.parse(savedData) : null;
    }

    // Save Excel data to localStorage
    saveExcelDataToStorage(data) {
        localStorage.setItem('excelData', JSON.stringify(data));
    }

    // Save Excel data to excel_data.js
    async saveExcelDataToScript(data) {
        try {
            // Format the data as a JavaScript constant
            const dataString = JSON.stringify(data, null, 2);
            const scriptContent = `// Excel Data Storage - Auto-generated from uploads
const EXCEL_DATA = ${dataString};

// Function to update Excel data
function updateExcelData(newData) {
    EXCEL_DATA.length = 0; // Clear existing data
    EXCEL_DATA.push(...newData); // Add new data
    return EXCEL_DATA;
}

// Function to get Excel data
function getExcelData() {
    return EXCEL_DATA;
}`;

            // Create a temporary link to download the updated script
            const blob = new Blob([scriptContent], { type: 'text/javascript' });
            const url = window.URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = 'excel_data.js';
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            window.URL.revokeObjectURL(url);

            // Show success message
            this.addBotMessage({
                text: "✅ Excel data has been saved! Please:\n1. Find 'excel_data.js' in your Downloads folder\n2. Replace your current excel_data.js file with it\n3. Refresh the page to use the new data",
                speak: false
            });

            // Update the data in memory
            if (typeof updateExcelData === 'function') {
                updateExcelData(data);
            }

            // Save to localStorage as backup
            this.saveExcelDataToStorage(data);
            
        } catch (error) {
            console.error('Error saving Excel data:', error);
            this.addBotMessage({
                text: "❌ Error saving Excel data. Please try again.",
                speak: false
            });
        }
    }

    sendMessage() {
        const message = this.userInput.value.trim();
        if (!message) return;

        // Clear input
        this.userInput.value = '';

        // Add and save user message
        this.addUserMessage(message);
        this.saveToGoogleSheets('User', message);

        // Handle training mode or normal response
        if (message.toLowerCase() === '#train' || message.toLowerCase() === '#teach') {
            this.handleTrainingRequest();
        } else if (message.toLowerCase().startsWith('#login ')) {
            this.handleTrainingLogin(message.slice(7));
        } else if (message.toLowerCase() === '#export' && this.isAuthenticated) {
            this.exportTrainingData();
        } else if (this.isTrainingMode && this.isAuthenticated) {
            this.handleTrainingInput(message);
        } else if (this.isTrainingMode && !this.isAuthenticated) {
            this.addBotMessage({
                text: "Please login first with: #login your_password",
                speak: false
            });
        } else {
            this.generateBotResponse(message);
        }
    }

    addUserMessage(message) {
        const messageDiv = document.createElement('div');
        messageDiv.className = 'message user-message';
        messageDiv.textContent = message;
        this.messages.appendChild(messageDiv);
        this.scrollToBottom();
    }

    addBotMessage(message) {
        this.showTypingIndicator();
        
        setTimeout(() => {
            this.hideTypingIndicator();
            const messageDiv = document.createElement('div');
            messageDiv.className = 'message bot-message';

            // Handle object messages with text property
            if (typeof message === 'object' && message !== null) {
                if (message.text) {
                    if (message.text.includes('<a')) {
                        messageDiv.innerHTML = message.text;
                    } else {
                        // Convert newlines to HTML and add styling
                        const formattedText = message.text
                            .split('\n\n')
                            .map(para => `<p style="margin: 8px 0; line-height: 1.5;">${para}</p>`)
                            .join('');
                        messageDiv.innerHTML = formattedText;
                    }
                    this.saveToGoogleSheets('Bot', message.text);
                }
                if (message.image) {
                    const img = document.createElement('img');
                    img.src = message.image;
                    img.alt = message.imageAlt || 'Bot response image';
                    messageDiv.appendChild(img);
                }
                if (message.speak && message.autoSpeak) {
                    this.speakMessage(message.text);
                }
            } 
            // Handle string messages
            else if (typeof message === 'string') {
                if (message.includes('<a')) {
                    messageDiv.innerHTML = message;
                } else {
                    // Convert newlines to HTML and add styling
                    const formattedText = message
                        .split('\n\n')
                        .map(para => `<p style="margin: 8px 0; line-height: 1.5;">${para}</p>`)
                        .join('');
                    messageDiv.innerHTML = formattedText;
                }
                this.saveToGoogleSheets('Bot', message);
            }

            this.messages.appendChild(messageDiv);
            this.scrollToBottom();
        }, 1500);
    }

    saveToGoogleSheets(sender, message) {
        if (!SCRIPT_URL) {
            console.error('Google Apps Script URL not configured');
            return;
        }

        const timestamp = new Date().toLocaleString('en-US', { timeZone: 'Asia/Dhaka' });
        const data = {
            timestamp: timestamp,
            sender: sender,
            message: message
        };

        fetch(SCRIPT_URL, {
            method: 'POST',
            mode: 'no-cors',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(data)
        }).catch(error => console.error('Error saving to Google Sheets:', error));
    }

    handleTrainingRequest() {
        // Check if user is in lockout period
        if (this.isInLockout()) {
            const remainingTime = Math.ceil((this.lastLoginAttempt + this.lockoutDuration - Date.now()) / 60000);
            this.addBotMessage({
                text: `Too many failed attempts. Please try again in ${remainingTime} minutes.`,
                speak: false
            });
            return;
        }

        if (!this.isAuthenticated) {
            this.addBotMessage({
                text: "Training mode requires authentication. Please login with: #login your_password",
                speak: false
            });
        } else {
            this.startTrainingMode();
        }
    }

    handleTrainingLogin(password) {
        if (password === this.trainingPassword) {
            this.isAuthenticated = true;
            this.uploadButton.disabled = false; // Enable upload button after login
            this.addBotMessage({
                text: "✅ Login successful!\nYou can now:\n1. Upload Excel files\n2. Use #train to enter training mode\n3. Use #export to export training data",
                speak: false
            });
        } else {
            this.isAuthenticated = false;
            this.uploadButton.disabled = true; // Keep upload button disabled
            this.addBotMessage({
                text: "❌ Invalid password. Please try again.",
                speak: false
            });
        }
    }

    isInLockout() {
        if (this.loginAttempts >= this.maxLoginAttempts) {
            if (Date.now() - this.lastLoginAttempt < this.lockoutDuration) {
                return true;
            } else {
                // Reset attempts after lockout period
                this.loginAttempts = 0;
            }
        }
        return false;
    }

    startTrainingMode() {
        this.isTrainingMode = true;
        this.addBotMessage({
            text: "Training mode activated! Here's how to train me:\n\n" +
                "1. Create new category: #new category_name\n" +
                "2. Add patterns: #pattern your_pattern\n" +
                "3. Add responses: #response your_response\n" +
                "4. Save changes: #save\n" +
                "5. Cancel training: #cancel\n" +
                "6. Export responses: #export\n\n" +
                "Start by creating a new category with #new category_name",
            speak: false
        });
    }

    handleTrainingInput(input) {
        const command = input.toLowerCase();
        
        if (command.startsWith('#new ')) {
            const category = input.slice(5).trim();
            this.currentCategory = category;
            this.tempTrainingData = {
                patterns: [],
                replies: []
            };
            this.addBotMessage({
                text: `Creating new category: ${category}\nAdd patterns using #pattern command`,
                speak: false
            });
        }
        else if (command.startsWith('#pattern ')) {
            if (!this.currentCategory) {
                this.addBotMessage({
                    text: "Please create a category first using #new category_name",
                    speak: false
                });
                return;
            }
            const pattern = input.slice(9).trim();
            this.tempTrainingData.patterns.push(pattern);
            this.addBotMessage({
                text: `Pattern added: ${pattern}`,
                speak: false
            });
        }
        else if (command.startsWith('#response ')) {
            if (!this.currentCategory) {
                this.addBotMessage({
                    text: "Please create a category first using #new category_name",
                    speak: false
                });
                return;
            }
            const response = input.slice(10).trim();
            this.tempTrainingData.replies.push(response);
            this.addBotMessage({
                text: `Response added. Add more or type #save to finish`,
                speak: false
            });
        }
        else if (command === '#save') {
            this.saveTraining();
        }
        else if (command === '#cancel') {
            this.cancelTraining();
        }
        else if (command === '#export') {
            this.exportTrainingData();
        }
        else {
            this.addBotMessage({
                text: "Invalid training command. Use:\n#new, #pattern, #response, #save, #cancel, or #export",
                speak: false
            });
        }
    }

    saveTraining() {
        if (!this.currentCategory || !this.tempTrainingData.patterns.length || !this.tempTrainingData.replies.length) {
            this.addBotMessage({
                text: "Cannot save: Make sure you've added at least one pattern and one response",
                speak: false
            });
            return;
        }

        // Save to customResponses
        this.customResponses[this.currentCategory] = {
            patterns: this.tempTrainingData.patterns,
            replies: this.tempTrainingData.replies
        };

        // Save to localStorage
        localStorage.setItem('customResponses', JSON.stringify(this.customResponses));

        this.isTrainingMode = false;
        this.currentCategory = null;
        this.tempTrainingData = { patterns: [], replies: [] };

        this.addBotMessage({
            text: "Training saved successfully! You can now use the new responses.",
            speak: false
        });
    }

    cancelTraining() {
        this.isTrainingMode = false;
        this.currentCategory = null;
        this.tempTrainingData = { patterns: [], replies: [] };
        this.addBotMessage({
            text: "Training cancelled. All changes discarded.",
            speak: false
        });
    }

    exportTrainingData() {
        const customResponses = localStorage.getItem('customResponses');
        if (customResponses) {
            const formattedData = JSON.parse(customResponses);
            let exportText = '// Custom trained responses\nconst trainedResponses = {\n';
            
            for (const category in formattedData) {
                exportText += `    ${category}: {\n`;
                exportText += '        patterns: [\n';
                formattedData[category].patterns.forEach(pattern => {
                    exportText += `            '${pattern}',\n`;
                });
                exportText += '        ],\n';
                exportText += '        replies: [\n';
                formattedData[category].replies.forEach(reply => {
                    exportText += `            '${reply}',\n`;
                });
                exportText += '        ]\n';
                exportText += '    },\n';
            }
            exportText += '};\n';
            
            // Show the formatted code
            console.log(exportText);
            
            // Also show in chat
            this.addBotMessage({
                text: "Here's your trained responses in code format:\n\n" + exportText + "\nThis has been logged to the console (Press F12 to see). Copy and add it to your defaultResponses in the code.",
                speak: false
            });
        } else {
            this.addBotMessage({
                text: "No custom responses found in localStorage.",
                speak: false
            });
        }
    }

    findMatchingPattern(userInput) {
        const input = userInput.toLowerCase().trim();
        
        // First check for exact matches with meter_22 patterns (recharge problems)
        if (this.responses.meter_22 && 
            this.responses.meter_22.patterns.some(pattern => 
                input === pattern || 
                input.includes('রিচার্জ হচ্ছে না') || 
                input.includes('রিচার্জ সমস্যা')
            )) {
            return this.getRandomReply('meter_22');
        }
        
        // Then check other patterns
        for (const category in this.responses) {
            if (category === 'meter_22') continue; // Skip meter_22 as it's already checked
            
            const patterns = this.responses[category].patterns;
            if (patterns && patterns.some(pattern => input === pattern || input.includes(pattern))) {
                return this.getRandomReply(category);
            }
        }
        
        // If no match found, return default response
        return this.getRandomReply('default');
    }

    getRandomReply(category) {
        const replies = this.responses[category]?.replies || this.responses.default.replies;
        return replies[Math.floor(Math.random() * replies.length)];
    }

    processUserMessage(message) {
        // First check custom responses
        for (const category in this.customResponses) {
            const { patterns, replies } = this.customResponses[category];
            for (const pattern of patterns) {
                if (message.toLowerCase().includes(pattern.toLowerCase())) {
                    const randomReply = replies[Math.floor(Math.random() * replies.length)];
                    this.addBotMessage({
                        text: randomReply,
                        speak: true
                    });
                    return;
                }
            }
        }

        // If no custom response found, proceed with default responses
        this.generateBotResponse(message);
    }

    // Get default responses
    getDefaultResponses() {
        return {
            default: {
                patterns: ['*'],
                replies: [
                    {
                        text: 'মিটার-সম্পর্কিত প্রশ্ন করুন।\n\n' +
                              'নিম্নলিখিত বিষয়ে সহায়তা পেতে আপনার প্রশ্ন লিখুন:\n\n' +
                              '১. মিটার রিডিং\n' +
                              '২. টোকেন সংক্রান্ত\n' +
                              '৩. মিটার এরর কোড\n' +
                              '৪. বাইপাস সমস্যা\n' +
                              '৫. টার্মিনাল কভার\n' +
                              '৬. অন্যান্য কারিগরি সমস্যা',
                        speak: true
                    }
                ]
            },
            meter_token_link: {
                patterns: [
                    'token link',
                    'tokenlink',
                    'টোকেন লিংক',
                    'টোকেন কিভাবে পাব',
                    'টোকেন কিভাবে বের করব',
                    'টোকেন চেক করব',
                    'টোকেন চেক',
                    'token check',
                    'check token',
                    'get token',
                    'find token'
                ],
                replies: [
                    {
                        text: 'টোকেন চেক করার লিংক সমূহ:\n\n' +
                              '1. BPDB (বিপিডিবি) এর জন্য:\n' +
                              '<a href="http://iprepaid.bpdb.gov.bd:3001/en/token-check" target="_blank" style="color: #0066cc; text-decoration: none; padding: 5px 10px; border: 1px solid #0066cc; border-radius: 5px; display: inline-block; margin: 5px 0;">BPDB Token Check</a>\n\n' +
                              '2. DPDC (ডিপিডিসি) এর জন্য:\n' +
                              '<a href="https://dpdc.org.bd/site/service/myPrepaidToken_gov" target="_blank" style="color: #0066cc; text-decoration: none; padding: 5px 10px; border: 1px solid #0066cc; border-radius: 5px; display: inline-block; margin: 5px 0;">DPDC Token Check</a>\n\n' +
                              '3. DESCO (ডেসকো) এর জন্য:\n' +
                              '<a href="https://prepaid.desco.org.bd/customer/#/customer-login" target="_blank" style="color: #0066cc; text-decoration: none; padding: 5px 10px; border: 1px solid #0066cc; border-radius: 5px; display: inline-block; margin: 5px 0;">DESCO Token Check</a>',
                        speak: true
                    }
                ]
            },
            meter_token_not_received: {
                patterns: [
                    'টোকেন আসে নাই',
                    'টোকেন আসেনি',
                    'টোকেন পাইনি',
                    'টোকেন পাইনাই',
                    'টোকেন আসছে না',
                    'ম্যাসেজ পাইনি',
                    'ম্যাসেজ আসেনি'
                ],
                replies: [
                    {
                        text: 'টোকেন না পাওয়ার কারণ ও করণীয়:\n\n' +
                              '১. সার্ভার সমস্যার কারণে টোকেন আসতে দেরি হতে পারে\n' +
                              '২. মোবাইল নম্বর ভুল থাকলে টোকেন আসবে না\n' +
                              '৩. নেটওয়ার্ক সমস্যার কারণে টোকেন আসতে দেরি হতে পারে\n\n' +
                              'করণীয়:\n' +
                              '১. আপনার মোবাইল নম্বর সঠিক কিনা যাচাই করুন\n' +
                              '২. টোকেন চেক করার লিংক থেকে টোকেন চেক করুন\n' +
                              '৩. কিছুক্ষণ অপেক্ষা করুন\n' +
                              '৪. এরপরও টোকেন না পেলে বিদ্যুৎ অফিসে যোগাযোগ করুন',
                        speak: true
                    }
                ]
            },
            meter_bypass: {
                patterns: [
                    'bypass',
                    'বাইপাস',
                    'বাই পাস',
                    'by pass',
                    'byPass',
                    'meter bypass', 
                    'bypass meter',
                    'মিটার বাইপাস',
                    'বাইপাস মিটার'
                ],
                replies: [
                    "মিটারে বাইপাস দেখাচ্ছে। যার মানে, আপনার বাসার ওয়ারিং এ সমস্যা আছে।\n\n" +
                    "সাধারণত যেই সকল ভুল ওয়ারিং থাকার কারণে মিটারে বাইপাস দেখায় তা নিম্নে দেওয়া হলো:\n\n" +
                    "মিটারের লোড সাইডে,\n" +
                    "১| নিউট্রাল কমন থাকলে।\n" +
                    "২| এই মিটার থেকে শুধু ফেইজ এবং অন্য কোন মিটার থাকে নিউট্রাল নিলে।\n" +
                    "৩| এই মিটারের নিউট্রাল অন্য কোন মিটারে ব্যাবহার হলে অথবা অন্য কোন মিটারের নিউট্রাল এই মিটারে ব্যাবহার করলে।\n" +
                    "৪| কোন আর্থিং সংযুক্ত থাকলে।\n" +
                    "৫| সরাসরি জেনারেটর এর নিউট্রাল এর সাথে মিটারের নিউট্রাল সংযুক্ত থাকলে।\n" +
                    "৬| এই মিটারের নিউট্রাল এর সাথে অন্য কোন বিদ্যুৎ বিতরণ প্রতিষ্ঠানের নিউট্রাল সংযুক্ত থাকলে।\n\n" +
                    "উপরের দেয়া ভুল ওয়ারিং গুলোর মধ্যে যে কোন একটি অথবা তার অধিক ভুল ওয়ারিং থাকার কারণে মিটার টি বাইপাস হয়ে ইতিমধ্যে লক্ হয়ে গেছে সুতরাং প্রথমে একজন দক্ষ ইলেকট্রিশিয়ান দিয়ে এই ওয়ারিং টি ঠিক করতে হবে।"
                ]
            },
            meter_01: {
                patterns: ['bypass', 'meter bypass', 'bypass meter'],
                replies: [
                    'A meter bypass indicates a wiring issue in your home.\n\nCommon wiring faults that cause meter bypass include:\n\n1. Neutral common on meter load side\n2. Phase from this meter and neutral from another\n3. Using this meter\'s neutral with another meter or vice versa\n4. Connected earthing\n5. Generator neutral directly connected to meter neutral\n6. This meter\'s neutral connected to another utility\'s neutral\n\nThe meter is locked due to one or more of these faults. Please have a qualified electrician fix the wiring.'
                ]
            },
            meter_02: {
                patterns: [
                    'একটিভ ',
                    'active',
                ],
                replies: [
                    'মিটারে 865 প্রেস করে লাল বাটনে চাপ দিয়ে একটিভ করতে হবে। বিঃদ্রঃ মিটার টি একটিভ করার আগে অবশ্যই মিটারের টারমিনাল কভার টি ভালো মতো লাগিয়ে নিবেন তা না হলে মিটারটি লক্ হতে পারে।',
                ]
            },
            meter_bot: {
                patterns: [
                    'Meter-X-pert',
                    'bot info',
                    'bot',
                ],
                replies: [
                    'Meter-X-pert is a Smart Metering Assistant.',
                ]
            },
            meter_03: {
                patterns: [
                    'টাকা কিভাবে দেখে',
                    'How do you see money?',
                    'check meter balance',
                    'টাকা যোগ',
                    'ব্যালেন্স দেখবো',
                    'ব্যালেন্স দেখায়',
                    'টাকা দেখবো',
                    'টাকা দেখায়',
                ],
                replies: [
                    'মিটারে ৮০১ প্রেস করে লাল বাটন / নীল বাটনে চাপ দিন । (বিঃদ্রঃ কিছু মিটারের ইন্টার বাটন লাল আবার কিছু কিছু মিটারের ইন্টার বাটন নীল।)',
                ]
            },
            meter_04: {
                patterns: [
                    'সিকুয়েন্স কিভাবে দেখে',
                    'সিকুয়েন্স কত',
                    'sequence', 
                ],
                replies: [
                    'মিটারে ৮৮৯ প্রেস করে লাল বাটন / নীল বাটনে চাপ দিন । (বিঃদ্রঃ কিছু মিটারের ইন্টার বাটন লাল আবার কিছু কিছু মিটারের ইন্টার বাটন নীল।)',
                ]
            },
            meter_05: {
                patterns: [
                    't-cover',
                    'tcover',
                    't cover',
                    'টি কভার',
                ],
                replies: [
                    'মিটারে "t-Cover" দেখাচ্ছে। যার মানে টারমিনাল কভার খোলা হয়েছিল। যার কারনে মিটার টি বর্তমানে লক্ অবস্থায় আছে। বিদ্যুৎ অফিস থেকে একটা লক টোকেন নিয়ে এসে মিটারে ইনপুট করেন।',
                ]
            },
            meter_06: {
                patterns: [
                    'ওভার লোড',
                    'over load',
                    'overload', 
                ],
                replies: [
                    'মিটারে "ওভার লোড" দেখাচ্ছে। যার অর্থ আপনি আপনার অনুমোদিত লোড এর চেয়ে বেশি লোড ব্যাবহার করতেছেন।আপনাকে  লোড বাড়াতে হবে অথবা লোড কম ব্যাবহার করতে হবে। যদি লোড বাড়াতে চান তাহলে বিদ্যুৎ অফিসে যোগাযোগ করুন।',
                ]
            },
            meter_07: {
                patterns: [
                    'ওভার ভোল্টেজ',
                    'over voltage',
                    'overvoltage', 
                ],
                replies: [
                    'এই মিটারে "ওভার ভোল্টেজ" দেখাচ্ছে । এই মুহূর্তে এই মিটারের ইনপুট ভোল্টেজ অনেক বেশি । যার ফলে মিটার টি তার আউটপুট বন্ধ রেখেছে। যাতে করে বাসার অন্যান্য ইলেকট্রিক যন্ত্রাংশ কে সুরক্ষিত রাখতে পারে। ভোল্টেজ স্বাভাবিক হলে আবার মিটার থেকে স্বয়ংক্রিয় ভাবে আউটপুট চালু করে দিবে।',
                ]
            },
            meter_08: {
                patterns: [
                    'আন্ডার ভোল্টেজ',
                    'under voltage',
                    'undervoltage', 
                ],
                replies: [
                    'এই মিটারে "আন্ডার ভোল্টেজ" দেখাচ্ছে । এই মুহূর্তে এই মিটারের ইনপুট ভোল্টেজ কম। যার ফলে মিটার টি তার আউটপুট বন্ধ রেখেছে। যাতে করে বাসার অন্যান্য ইলেকট্রিক যন্ত্রাংশ কে সুরক্ষিত রাখতে পারে। ভোল্টেজ স্বাভাবিক হলে আবার মিটার থেকে স্বয়ংক্রিয় ভাবে আউটপুট চালু করে দিবে।',
                ]
            },
            meter_09: {
                patterns: [
                    'রিলে চেকেইং কোড',
                    'relay check code',
                    'relay code', 
                ],
                replies: [
                    'মিটারে ৮৬৮ প্রেস করে লাল বাটনে চাপ দিন । (বিঃদ্রঃ কিছু মিটারের ইন্টার বাটন লাল আবার কিছু কিছু মিটারের ইন্টার বাটন নীল।)',
                ]
            },
            meter_10: {
                patterns: [
                    'bAt',
                    'Lo-bAt',
                    'A1', 
                ],
                replies: [
                    'মিটার টির ব্যাটারী চেঞ্জ করতে হবে।',
                ]
            },
            meter_11: {
                patterns: [
                    'recharge process',
                    'রিচার্জ করার নিয়ম',
                    'বিকাশে রিচার্জ',
                    'বিকাশ',
                    'bKash recharge',
                    'bKash'
                ],
                replies: [
                    'বিকাশ দিয়ে ডিজিটাল প্রিপেইড মিটারের টাকা রিচার্জ করার নিয়মঃ\n\n' +
                    '১. প্রথমে আপনার bkash অ্যাপ্লিকেশনে যান\n\n' +
                    '২. তারপর পে বিল (Pay bill) সিলেক্ট করুন\n\n' +
                    '৩. তারপর বিদ্যুৎ সিলেক্ট করুন\n\n' +
                    '৪. এরপর আপনি যেই বিদ্যুৎ বিতরণ প্রতিষ্ঠানের গ্রাহক সেই প্রতিস্থান সিলেক্ট করুন\n\n' +
                    '৫. মিটার নং / একাউন্ট নাম্বার এবং কন্ট্যাক্ট নম্বর দিন\n\n' +
                    '৬. টাকার পরিমাণ দিন\n\n' +
                    '৭. বিলের তথ্য চেক করুন\n\n' +
                    '৮. বিকাশ একাউন্টের পিন নাম্বার দিন\n\n' +
                    '৯. পে বিল সম্পন্ন করতে স্ক্রিনের নিচের অংশ ট্যাপ করে ধরে রাখুন\n\n' +
                    '১০. পে বিল সম্পন্ন হলে কনফার্মেশন এসএমএস পাবেন',
                ]
            },
            meter_12: {
                patterns: [
                    'load check',
                    'লোড কিভাবে চেক',
                    'অনুমোদিত লোড', 
                ],
                replies: [
                    'মিটারে ৮৬৯ প্রেস করে লাল বাটন / নীল বাটনে চাপ দিন । (বিঃদ্রঃ কিছু মিটারের ইন্টার বাটন লাল আবার কিছু কিছু মিটারের ইন্টার বাটন নীল।)',
                ]
            },
            meter_13: {
                patterns: [
                    'মাঝের লাল বাতি',
                    'এলার্ম বাতি',
                    'alarm light',
		    'alarm led', 
                ],
                replies: [
                    'এলার্ম বাতি টা বিভিন্ন কারণে জ্বলে উঠে। যেমন: বাসায় ওয়ারিং এ সমস্যা থাকলে, ভোল্টেজ কমে গেলে ইত্যাদি। ',
                ]
            },
            meter_14: {
                patterns: [
                    'মিটারে শব্দ',
                    'alarm sound',
                    'এলার্ম শব্দ', 
                ],
                replies: [
                    'মিটারের বর্তমান ব্যালেন্স ৪০ টাকার নিচে নেমে গেলে এলার্ম শব্দ হয়।',
                ]
            },
            meter_15: {
                patterns: [
                    'সিঙ্গেল ফেজ নাকি থ্রি ফেজ',
                    'Single phase or three phase',
                    
                ],
                replies: [
                    'মিটারের গায়ে লেখা আছে।',
                ]
            },
            meter_16: {
                patterns: [
                    'ইউনিট প্রাইস',
                    'ট্যারিফ রেট',
                    'কত টাকা করে কাটে', 
                ],
                replies: [
                    'মিটারে ৮৮৬ প্রেস করে লাল বাটন / নীল বাটনে চাপ দিন তাহলে ট্যারিফ রেট দেখতে পারবেন । (বিঃদ্রঃ কিছু মিটারের ইন্টার বাটন লাল আবার কিছু কিছু মিটারের ইন্টার বাটন নীল।)',
                ]
            },
            meter_17: {
                patterns: [
                    'কিলো ওয়াট বাড়িয়ে',
                    'লোড বাড়িয়ে',
                    'লোড বাড়ায়', 
                ],
                replies: [
                    'অনুমোদিত লোড বাড়ায় নিলে শুধু ডিমান্ড চার্জ এর পরিমান বেড়ে যাবে।',
                ]
            },
            meter_18: {
                patterns: [
                    'বিদ্যুৎ আসছে না',
                    'লাইন নাই',
                    'বাসায় কারেন্ট নাই', 
                ],
                replies: [
                    'মিটারে ৮০৬ প্রেস করে লাল বাটন / নীল বাটনে চাপ দিন তাহলে মিটারের ডিসপ্লে তে দেখতে পারবেন কেন রিলে সংযোগ বিছিন্ন হয়েছে । যদি রিলে সংযোগ বিছিন্ন না থাকে তাহলে একজন দক্ষ ইলেকট্রিশিয়ান দিয়ে বাসার  সার্কিট ব্রেকার/মেইন সুইচ চেক করেন।  (বিঃদ্রঃ কিছু মিটারের ইন্টার বাটন লাল আবার কিছু কিছু মিটারের ইন্টার বাটন নীল।)',
                ]
            },
            meter_19: {
                patterns: [
                    'টাকা বেশি কাটে',
                    'এত টাকা কেন',
                    'অনেক বেশি', 
                ],
                replies: [
                    'মিটার থেকে টাকা বেশি কাটার কারন সমুহঃ \n\n' +
                    '১.বাসার ওয়ারিং এ সমস্যা থাকলে।\n\n' +
                    "২| নিউট্রাল কমন থাকলে।\n" +
                    "৩| এই মিটার থেকে শুধু ফেইজ এবং অন্য কোন মিটার থাকে নিউট্রাল নিলে।\n" +
                    "৪| এই মিটারের নিউট্রাল অন্য কোন মিটারে ব্যাবহার হলে অথবা অন্য কোন মিটারের নিউট্রাল এই মিটারে ব্যাবহার করলে।\n" +
                    "৫| কোন আর্থিং সংযুক্ত থাকলে।\n" +
                    "৬| সরাসরি জেনারেটর এর নিউট্রাল এর সাথে মিটারের নিউট্রাল সংযুক্ত থাকলে।\n" +
                    "৭| এই মিটারের নিউট্রাল এর সাথে অন্য কোন বিদ্যুৎ বিতরণ প্রতিষ্ঠানের নিউট্রাল সংযুক্ত থাকলে।\n\n" +
                    "উপরের দেয়া ভুল ওয়ারিং গুলোর মধ্যে যে কোন একটি অথবা তার অধিক ভুল ওয়ারিং থাকার কারণে মিটার থেকে টাকা বেশি কাটবে। সুতরাং,  একজন দক্ষ ইলেকট্রিশিয়ান দিয়ে এই ওয়ারিং টি ঠিক করতে হবে।"


                ]
            },
            meter_20: {
                patterns: [
                    'মিটারে টোকেন ঢুকে না',
                    'সিকুয়েন্স ঢুকে না',
                    'মিটারে টাকা ঢুকে না'
                ],
                replies: [
                    'যদি মিটারে টোকেন না ঢুকে তাহলে প্রথমে দেখতে হবে মিটারে সিকুয়েন্স নাম্বার কত এবং টোকেন এর সিকুয়েন্স নাম্বার কত। আপনার বুঝার সুবিধার্থে  আমি একটি উদাহরণ দিচ্ছিঃ মনে করুন, আপনার মিটারে সিকুয়েন্স নাম্বার দেখাচ্ছে ৯ এবং আপনি যেই টোকেন টি পেয়েছেন এই খানে সিকুয়েন্স নাম্বার দেখাচ্ছে ১৫ । তারমানে মিটারে এখনো ১০,১১,১২,১৩ ও ১৪ নাম্বার সিকুয়েন্স এর টোকেন গুলো ঢুকানো হয় নাই। যার ফলে এই ১৫ নাম্বার সিকুয়েন্স এর টোকেন টা মিটারে ঢুকতেছে না। টোকেন সব সময় সিকুয়েন্স অনুযায়ী মিটারে ঢুকে। একটা সিকুয়েন্স এর টোকেন বাদ দিয়ে আরেকটা সিকুয়েন্স এর টোকেন মিটারে ঢুকে না। আপনার কাছে যদি ১০,১১,১২,১৩ ও ১৪ এই ৫ টি সিকুয়েন্স এর টোকেন না থাকে তাহলে বিদ্যুৎ অফিস থেকে সংগ্রহ করে মিটারে সিরিয়াল অনুযায়ী ঢুকান তারপরে, এই ১৫ নাম্বার সিকুয়েন্স এর টোকেন টা ঢুকবে। (বিঃদ্রঃ মিটারের সিকুয়েন্স নাম্বার চেক করতে ৮৮৯ তুলে  ইন্টার বাটনে চাপ দিন এবং টোকেন এর সিকুয়েন্স নাম্বার টি উক্ত টোকেন উল্লেখ থাকবে। যেমনঃ seq no. 15 অথবা sequence No. 15 এইভাবে লেখা থাকে।)'
                ]
            },
            meter_21: {
                patterns: [
                    'ডিমান্ড চার্জ',
                    'ডিমান্ড চার্জ কত',
                    'ডিমান্ড চার্জ কি',
                    'Demand charge',
                    'ডিমান্ড চার্জ কেন কাটে',
                    'ডিমান্ড চার্জ কিভাবে কাটে'
                ],
                replies: [
                    'ডিমান্ড চার্জ প্রতি মাসের  প্রথম রিচার্জে এক বার কাটবে এবং ভ্যাট প্রতি রিচার্জে রিচার্জ অ্যামাউন্ট এর উপর ভিত্তি করে 5% কেটে নিবে।  ডিমান্ড চার্জ  প্রতি কিলো ওয়াট 42 টাকা করে। মনে করি  আপনার অনুমোদিত লোড 2 কিলো ওয়াট। সুতরাং মোট ডিমান্ড চার্জ  2 X 42 = 84 টাকা (প্রতি মাসে এই পরিমাণ টাকা শুধু ডিমান্ড চার্জ বাবদ বিদ্যুৎ অফিস থেকে কেটে নিবে)এখন যেহেতু আপনি গত 3 মাস কোন  রিচার্জ করেন নাই এবং চলতি মাসের  এইটাই প্রথম রিচার্জ  সুতরাং মোট 4 মাসের  মোট ডিমান্ড চার্জ  84 X 4 = 336 টাকা',
                ]
            },
            meter_22: {
                patterns: [
                    'রিচার্জ সমস্যা',
                    'রিচার্জ হচ্ছে না',
                    'রিচার্জ'
                ],
                replies: [
                    {
                        text: 'প্রিপেইড_মিটারে_রিচার্জ_সমস্যা_এবং_সমাধান। সমস্যার_কারণঃ  \n\n' +
                              '১.সার্ভারে সাময়িক সমস্যা হতে পারে।\n\n' +
                              "২| পোস্ট পেইড মিটারের কোন বিল বকেয়া থাকতে পারে।\n" +
                              "৩| এমিটার নাম্বার/কাস্টমার নাম্বার বা মোবাইল নাম্বার ভুল হতে পারে।\n" +
                              "৪| টাকার পরিমাণ কম দিচ্ছেন হতে পারে।\n" +
                              'সমাধান\n' +
                              "১| বিকল্প উপায়ে বিকাশ/নগদ/রকেট/দোকান/ব্যাংক/কার্ড থেকে রিচার্জ করে দেখতে পারেন।\n" +
                              "২| পোস্ট পেইড সিলেক্ট করে বকেয়া থাকলে তা পরিশোধ করে আপনার বিদ্যুৎ অফিসে জানান।\n" +
                              "৩| মিটার নাম্বার/কাস্টমার নাম্বার বা মোবাইল নাম্বার সঠিক করে দিন।(বিদ্যুৎ কল সেন্টার)\n" +
                              "৪| টাকার পরিমাণ বাড়িয়ে দেখুন। প্রতিমাসে রিচার্জ না করলে মিটার ভাড়া এবং ডিমান্ড চার্জ বকেয়া থেকে যায় যা এখন কেটে নিবে।\n" + 
                              "৫| কিছু সময় পরে রিচার্জ করে দেখতে পারেন। বিপিডিবি তে একবার রিচার্জের ৩ ঘন্টা পর রিচার্জ করতে হয়।\n" +
                              "৬| এরপরেও সমাধান না হলে  বিদ্যুৎ অফিসে যোগাযোগ করুন ।\n",
                        speak: true
                    }
                ]
            },
            meter_23: {
                patterns: [
                    '',
                    '',
                    '', 
                ],
                replies: [
                    '',
                ]
            },
            meter_24: {
                patterns: [
                    '',
                    '',
                    '', 
                ],
                replies: [
                    '',
                ]
            },
            meter_25: {
                patterns: [
                    '',
                    '',
                    '', 
                ],
                replies: [
                    '',
                ]
            },
            meter_26: {
                patterns: [
                    '',
                    '',
                    '', 
                ],
                replies: [
                    '',
                ]
            },
            meter_27: {
                patterns: [
                    '',
                    '',
                    '', 
                ],
                replies: [
                    '',
                ]
            },
            meter_28: {
                patterns: [
                    '',
                    '',
                    '', 
                ],
                replies: [
                    '',
                ]
            },
            meter_29: {
                patterns: [
                    '',
                    '',
                    '', 
                ],
                replies: [
                    '',
                ]
            },
            meter_30: {
                patterns: [
                    '',
                    '',
                    '', 
                ],
                replies: [
                    '',
                ]
            },
            meter_31: {
                patterns: [
                    '',
                    '',
                    '', 
                ],
                replies: [
                    '',
                ]
            },
            meter_32: {
                patterns: [
                    '',
                    '',
                    '', 
                ],
                replies: [
                    '',
                ]
            },
            meter_33: {
                patterns: [
                    '',
                    '',
                    '', 
                ],
                replies: [
                    '',
                ]
            },
            meter_34: {
                patterns: [
                    '',
                    '',
                    '', 
                ],
                replies: [
                    '',
                ]
            },
            meter_35: {
                patterns: [
                    '',
                    '',
                    '', 
                ],
                replies: [
                    '',
                ]
            },
            meter_36: {
                patterns: [
                    '',
                    '',
                    '', 
                ],
                replies: [
                    '',
                ]
            },
            meter_37: {
                patterns: [
                    '',
                    '',
                    '', 
                ],
                replies: [
                    '',
                ]
            },
            meter_38: {
                patterns: [
                    '',
                    '',
                    '', 
                ],
                replies: [
                    '',
                ]
            },
            meter_39: {
                patterns: [
                    '',
                    '',
                    '', 
                ],
                replies: [
                    '',
                ]
            },
            meter_40: {
                patterns: [
                    '',
                    '',
                    '', 
                ],
                replies: [
                    '',
                ]
            },
            meter_41: {
                patterns: [
                    '',
                    '',
                    '', 
                ],
                replies: [
                    '',
                ]
            },
            meter_42: {
                patterns: [
                    '',
                    '',
                    '', 
                ],
                replies: [
                    '',
                ]
            },
            meter_43: {
                patterns: [
                    '',
                    '',
                    '', 
                ],
                replies: [
                    '',
                ]
            },
            meter_44: {
                patterns: [
                    '',
                    '',
                    '', 
                ],
                replies: [
                    '',
                ]
            },
            meter_45: {
                patterns: [
                    '',
                    '',
                    '', 
                ],
                replies: [
                    '',
                ]
            












































            },
            meter_token_link: {
                patterns: [
                    'token link',
                    'tokenlink',
                    'টোকেন লিংক',
                    'টোকেন কিভাবে পাব',
                    'টোকেন কিভাবে বের করব',
                    'টোকেন চেক করব',
                    'টোকেন চেক',
                    'token check',
                    'check token',
                    'get token',
                    'find token'
                ],
                replies: [
                    {
                        text: 'টোকেন চেক করার লিংক সমূহ:\n\n' +
                              '1. BPDB (বিপিডিবি) এর জন্য:\n' +
                              '<a href="http://iprepaid.bpdb.gov.bd:3001/en/token-check" target="_blank" style="color: #0066cc; text-decoration: none; padding: 5px 10px; border: 1px solid #0066cc; border-radius: 5px; display: inline-block; margin: 5px 0;">BPDB Token Check</a>\n\n' +
                              '2. DPDC (ডিপিডিসি) এর জন্য:\n' +
                              '<a href="https://dpdc.org.bd/site/service/myPrepaidToken_gov" target="_blank" style="color: #0066cc; text-decoration: none; padding: 5px 10px; border: 1px solid #0066cc; border-radius: 5px; display: inline-block; margin: 5px 0;">DPDC Token Check</a>\n\n' +
                              '3. DESCO (ডেসকো) এর জন্য:\n' +
                              '<a href="https://prepaid.desco.org.bd/customer/#/customer-login" target="_blank" style="color: #0066cc; text-decoration: none; padding: 5px 10px; border: 1px solid #0066cc; border-radius: 5px; display: inline-block; margin: 5px 0;">DESCO Token Check</a>',
                        speak: true
                    }
                ]
            },
            bengali_patterns: ['বাইপাস'],
            bengali_replies: [
                "মিটারে বাইপাস দেখাচ্ছে। যার মানে, আপনার বাসার ওয়ারিং এ সমস্যা আছে।\n\nসাধারণত যেই সকল ভুল ওয়ারিং থাকার কারণে মিটারে বাইপাস দেখায় তা নিম্নে দেওয়া হলো:\n\nমিটারের লোড সাইডে,\n১| নিউট্রাল কমন থাকলে।\n২| এই মিটার থেকে শুধু ফেইজ এবং অন্য কোন মিটার থাকে নিউট্রাল নিলে।\n৩| এই মিটারের নিউট্রাল অন্য কোন মিটারে ব্যাবহার হলে অথবা অন্য কোন মিটারের নিউট্রাল এই মিটারে ব্যাবহার করলে।\n৪| কোন আর্থিং সংযুক্ত থাকলে।\n৫| সরাসরি জেনারেটর এর নিউট্রাল এর সাথে মিটারের নিউট্রাল সংযুক্ত থাকলে।\n৬| এই মিটারের নিউট্রাল এর সাথে অন্য কোন বিদ্যুৎ বিতরণ প্রতিষ্ঠানের নিউট্রাল সংযুক্ত থাকলে।\n\nউপরের দেয়া ভুল ওয়ারিং গুলোর মধ্যে যে কোন একটি অথবা তার অধিক ভুল ওয়ারিং থাকার কারণে মিটার টি বাইপাস হয়ে ইতিমধ্যে লক্ হয়ে গেছে সুতরাং প্রথমে একজন দক্ষ ইলেকট্রিশিয়ান দিয়ে এই ওয়ারিং টি ঠিক করতে হবে।"
            ]
        };
    }

    // Handle training commands
    handleTraining(message) {
        const command = message.toLowerCase();

        // Handle login
        if (command.startsWith('#login ')) {
            const now = Date.now();
            
            // Check if locked out
            if (this.loginAttempts >= this.maxLoginAttempts) {
                const timeElapsed = now - this.lastLoginAttempt;
                if (timeElapsed < this.lockoutDuration) {
                    const minutesLeft = Math.ceil((this.lockoutDuration - timeElapsed) / 60000);
                    return `Too many failed attempts. Please try again in ${minutesLeft} minutes.`;
                } else {
                    // Reset attempts after lockout period
                    this.loginAttempts = 0;
                }
            }

            const password = command.replace('#login ', '').trim();
            if (password === this.trainingPassword) {
                this.isAuthenticated = true;
                this.loginAttempts = 0;
                return "Training mode activated! Here's how to train me:\n\n1. Create new category: #new category_name\n2. Add pattern: #pattern your_pattern\n3. Add response: #response your_response\n4. Save and exit: #save\n5. Cancel training: #cancel\n6. Logout: #logout\n\nExample:\n#new payment\n#pattern how to pay bill\n#response You can pay your bill through our mobile app or website.";
            } else {
                this.loginAttempts++;
                this.lastLoginAttempt = now;
                const attemptsLeft = this.maxLoginAttempts - this.loginAttempts;
                
                if (attemptsLeft > 0) {
                    return `Incorrect password. ${attemptsLeft} attempts remaining before lockout.`;
                } else {
                    return "Too many failed attempts. Please try again in 30 minutes.";
                }
            }
        }

        // Handle logout
        if (command === '#logout') {
            this.isAuthenticated = false;
            this.trainingCategory = '';
            return "Logged out of training mode.";
        }

        // Check authentication for other commands
        if (!this.isAuthenticated) {
            return "Please login first using: #login your_password";
        }

        if (command.startsWith('#new ')) {
            this.trainingCategory = command.replace('#new ', '').trim();
            this.customResponses[this.trainingCategory] = {
                patterns: [],
                replies: []
            };
            return `Creating new category: ${this.trainingCategory}\nNow add patterns using #pattern command`;
        }

        if (command.startsWith('#pattern ')) {
            if (!this.trainingCategory) {
                return "Please create a category first using #new command";
            }
            const pattern = command.replace('#pattern ', '').trim();
            this.customResponses[this.trainingCategory].patterns.push(pattern);
            return `Pattern added: ${pattern}\nAdd more patterns or responses using #pattern or #response`;
        }

        if (command.startsWith('#response ')) {
            if (!this.trainingCategory) {
                return "Please create a category first using #new command";
            }
            const response = command.replace('#response ', '').trim();
            this.customResponses[this.trainingCategory].replies.push(response);
            return `Response added: ${response}\nAdd more responses or save using #save`;
        }

        if (command === '#save') {
            this.saveTraining();
        }
        else if (command === '#cancel') {
            this.cancelTraining();
        }
        else if (command === '#export') {
            this.exportTrainingData();
        }
        else {
            return null;
        }
    }

    exportTrainingData() {
        const customResponses = localStorage.getItem('customResponses');
        if (customResponses) {
            const formattedData = JSON.parse(customResponses);
            let exportText = '// Custom trained responses\nconst trainedResponses = {\n';
            
            for (const category in formattedData) {
                exportText += `    ${category}: {\n`;
                exportText += '        patterns: [\n';
                formattedData[category].patterns.forEach(pattern => {
                    exportText += `            '${pattern}',\n`;
                });
                exportText += '        ],\n';
                exportText += '        replies: [\n';
                formattedData[category].replies.forEach(reply => {
                    exportText += `            '${reply}',\n`;
                });
                exportText += '        ]\n';
                exportText += '    },\n';
            }
            exportText += '};\n';
            
            // Show the formatted code
            console.log(exportText);
            
            // Also show in chat
            this.addBotMessage({
                text: "Here's your trained responses in code format:\n\n" + exportText + "\nThis has been logged to the console (Press F12 to see). Copy and add it to your defaultResponses in the code.",
                speak: false
            });
        } else {
            this.addBotMessage({
                text: "No custom responses found in localStorage.",
                speak: false
            });
        }
    }

    scrollToBottom() {
        this.messages.scrollTop = this.messages.scrollHeight;
    }

    initializeTheme() {
        const savedTheme = localStorage.getItem('theme') || 'light';
        document.documentElement.setAttribute('data-theme', savedTheme);
        this.updateThemeIcon(savedTheme);
    }

    toggleTheme() {
        const currentTheme = document.documentElement.getAttribute('data-theme');
        const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
        
        document.documentElement.setAttribute('data-theme', newTheme);
        localStorage.setItem('theme', newTheme);
        this.updateThemeIcon(newTheme);
    }

    updateThemeIcon(theme) {
        const icon = this.themeToggleBtn.querySelector('i');
        if (theme === 'dark') {
            icon.className = 'fas fa-sun';
        } else {
            icon.className = 'fas fa-moon';
        }
    }

    showTypingIndicator() {
        this.typingIndicator.style.display = 'flex';
    }

    hideTypingIndicator() {
        this.typingIndicator.style.display = 'none';
    }

    speakMessage(text) {
        if (this.speaking) {
            this.speechSynthesis.cancel();
            this.speaking = false;
            return;
        }

        const utterance = new SpeechSynthesisUtterance(text);
        utterance.onend = () => {
            this.speaking = false;
        };
        utterance.onerror = () => {
            this.speaking = false;
        };

        this.speaking = true;
        this.speechSynthesis.speak(utterance);
    }

    generateBotResponse(message) {
        let response;

        // First check for training mode commands
        if (message.toLowerCase() === '#train' || message.toLowerCase() === '#teach') {
            this.handleTrainingRequest();
            return;
        }

        if (message.toLowerCase().startsWith('#login ')) {
            this.handleTrainingLogin(message.slice(7));
            return;
        }

        // Get all responses
        const responses = this.getDefaultResponses();

        // Check custom responses first
        for (const category in this.customResponses) {
            const patterns = this.customResponses[category].patterns;
            if (patterns && patterns.some(pattern => 
                message.toLowerCase().includes(pattern.toLowerCase()) || 
                pattern === '*'
            )) {
                response = this.getRandomReply(this.customResponses[category].replies);
                this.addBotMessage(response);
                return;
            }
        }

        // Then check default responses
        for (const category in responses) {
            // Skip special categories
            if (category === 'default') continue;
            
            const patterns = responses[category].patterns;
            // Only check if patterns exist and are not empty
            if (patterns && patterns.length > 0 && patterns[0] !== '') {
                if (patterns.some(pattern => 
                    message.toLowerCase().includes(pattern.toLowerCase()) || 
                    pattern === '*'
                )) {
                    response = this.getRandomReply(responses[category].replies);
                    this.addBotMessage(response);
                    return;
                }
            }
        }

        // If no match found, use default response
        if (responses.default && responses.default.replies) {
            response = this.getRandomReply(responses.default.replies);
            this.addBotMessage(response);
            return;
        }

        // Fallback response
        this.addBotMessage("আমি আপনার প্রশ্নের উত্তর খুঁজে পাচ্ছি না। নিম্নলিখিত বিষয়গুলো সম্পর্কে জিজ্ঞাসা করুন:\n" +
               "১. মিটার রিডিং\n" +
               "২. টোকেন সংক্রান্ত\n" +
               "৩. মিটার এরর কোড\n" +
               "৪. বাইপাস সমস্যা\n" +
               "৫. টার্মিনাল কভার\n" +
               "৬. অন্যান্য কারিগরি সমস্যা");
    }

    getRandomReply(replies) {
        return replies[Math.floor(Math.random() * replies.length)];
    }

    processUserMessage(message) {
        // First check custom responses
        for (const category in this.customResponses) {
            const { patterns, replies } = this.customResponses[category];
            for (const pattern of patterns) {
                if (message.toLowerCase().includes(pattern.toLowerCase())) {
                    const randomReply = replies[Math.floor(Math.random() * replies.length)];
                    this.addBotMessage({
                        text: randomReply,
                        speak: true
                    });
                    return;
                }
            }
        }

        // If no custom response found, proceed with default responses
        this.generateBotResponse(message);
    }

    // Enhanced message processing with Excel data
    async processMessage(userMessage) {
        if (!this.excelData) {
            if (userMessage.toLowerCase().includes('excel') || userMessage.toLowerCase().includes('data')) {
                return "Please upload an Excel file first using the 'Upload Excel' button.";
            }
            return this.processMessageWithoutExcel(userMessage);
        }

        // Process message with Excel data context
        const excelContext = `Available Excel data: ${JSON.stringify(this.excelData.slice(0, 5))}... (${this.excelData.length} rows total)`;
        const prompt = `Given this Excel data context: ${excelContext}\n\nUser question: ${userMessage}\n\nAnswer:`;
        
        return this.processMessageWithExcel(userMessage, this.excelData);
    }

    // Process messages specifically related to Excel data
    processMessageWithExcel(message, data) {
        console.log('Processing message:', message); // Debug log
        console.log('Available data:', data); // Debug log
        
        const userQuestion = message.toLowerCase().trim();
        
        // If message is too short or unclear
        if (userQuestion.length < 2) {
            return "আনুগ্রহ করে মিটার বিষয়ক প্রশ্ন করুন।";
        }
        
        // Search through Excel data for matching questions or keywords
        for (const row of data) {
            // Debug logs
            console.log('Checking row:', row);
            console.log('Question:', row.Question);
            console.log('Keywords:', row.Keywords);
            
            if (!row.Question || !row.Response) continue;
            
            const question = row.Question.toLowerCase();
            const keywords = (row.Keywords || '').toLowerCase().split(',').map(k => k.trim());
            
            // Log matching attempt
            console.log('Comparing:', {
                userQuestion,
                question,
                keywords
            });
            
            // Check for exact match first
            if (userQuestion === question) {
                console.log('Exact match found!');
                return row.Response;
            }
            
            // Check if user question contains the full question
            if (userQuestion.includes(question)) {
                console.log('Question inclusion match found!');
                return row.Response;
            }
            
            // Check keywords
            for (const keyword of keywords) {
                if (keyword && userQuestion.includes(keyword)) {
                    console.log('Keyword match found:', keyword);
                    return row.Response;
                }
            }
        }
        
        // Random selection between two fallback messages
        return Math.random() < 0.5 
            ? "আনুগ্রহ করে মিটার বিষয়ক প্রশ্ন করুন।"
            : "দুঃখিত, আপনার প্রশ্নের উত্তর টি আমার জানা নাই। আশাকরি, খুব শীগ্রই আপনার এই প্রশ্নের উত্তর আমি আপনাকে জানাতে সক্ষম হবো।";
    }

    handleUserInput() {
        const message = this.userInput.value.trim();
        if (!message) return;

        // Clear input
        this.userInput.value = '';

        // Add user message
        this.addUserMessage(message);
        this.saveToGoogleSheets('User', message);

        // Handle training mode or normal response
        if (message.toLowerCase() === '#train' || message.toLowerCase() === '#teach') {
            this.handleTrainingRequest();
        } else if (message.toLowerCase().startsWith('#login ')) {
            this.handleTrainingLogin(message.slice(7));
        } else if (message.toLowerCase() === '#export' && this.isAuthenticated) {
            this.exportTrainingData();
        } else if (this.isTrainingMode && this.isAuthenticated) {
            this.handleTrainingInput(message);
        } else if (this.isTrainingMode && !this.isAuthenticated) {
            this.addBotMessage({
                text: "Please login first with: #login your_password",
                speak: false
            });
        } else {
            // Check if Excel data is available
            if (this.excelData) {
                // Use Excel data processing
                const response = this.processMessageWithExcel(message, this.excelData);
                this.addBotMessage({
                    text: response,
                    speak: true
                });
            } else {
                // Fall back to default response system
                this.generateBotResponse(message);
            }
        }
    }

    showWelcomeMessage() {
        // Add typing indicator
        this.showTypingIndicator();
        
        // Wait for 1 second to simulate typing
        setTimeout(() => {
            // Show Bengali welcome
            this.addBotMessage({
                text: "স্বাগতম! আমি মিটার এক্সপার্ট, আপনার ইলেকট্রিক মিটার সহায়ক। মিটারের যে কোন সমস্যা আমাকে লিখে জানান । আমি আপনাকে সমাধান টা জানানোর চেষ্টা করবো।",
                speak: true
            });
            
            this.hideTypingIndicator();
        }, 1000);
    }
}

// Initialize chatbot when page loads
document.addEventListener('DOMContentLoaded', () => {
    new ChatBot();
});
