// Google Sheets API configuration
const SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbxyyUx90A_HdJZnapWSRSf6iegqTCEOci7ToogYBEk09MIRa96ONHftFAzc_Xezh-bGdg/exec'; // Add your Google Apps Script URL here

class ChatBot {
    constructor() {
        this.messages = document.getElementById('chat-messages');
        this.userInput = document.getElementById('user-input');
        this.sendButton = document.getElementById('send-button');
        this.typingIndicator = document.getElementById('typing-indicator');
        this.themeToggleBtn = document.getElementById('theme-toggle-btn');
        
        // OpenAI API Key - Replace with your key
        this.OPENAI_API_KEY = 'sk-';
        
        // Hugging Face API Key (free to get)
        this.HF_API_KEY = 'hf_'; // Add your Hugging Face API key here
        
        // Rate limiting
        this.lastRequestTime = 0;
        this.minRequestInterval = 2000; // Minimum 2 seconds between requests
        
        // Initialize speech synthesis
        this.speechSynthesis = window.speechSynthesis;
        this.speaking = false;

        // Enhanced fallback responses
        this.fallbackResponses = {
            general: [
                "I understand you're asking about energy meters. Could you be more specific about what you'd like to know?",
                "That's an interesting question about metering. Would you like to know about reading meters, billing, or energy saving?",
                "I can help you with meter readings, billing queries, and energy consumption. Which aspect interests you?",
                "Let me assist you with your meter-related question. Are you asking about readings, billing, or technical issues?"
            ],
            technical: [
                "For technical questions, I recommend checking your meter's display first. Would you like guidance on reading specific meter codes?",
                "Technical meter issues can be complex. Let's start with the basics - what exactly are you seeing on your meter?",
                "I can help with common technical problems. Is your meter showing any error codes or unusual readings?"
            ],
            consumption: [
                "Understanding energy consumption is important. Would you like to know how to track your usage?",
                "I can help you understand your energy usage patterns. Shall we look at basic meter reading techniques first?",
                "Energy consumption varies by household. Would you like tips on monitoring and reducing your usage?"
            ],
            billing: [
                "Billing questions are common. Would you like to know about reading your bill or understanding charges?",
                "I can explain different aspects of your energy bill. What specific part would you like to understand?",
                "Let's break down your billing query. Are you interested in payment methods, charges, or reading your bill?"
            ]
        };
        
        // Training mode flags and security
        this.isTrainingMode = false;
        this.currentCategory = null;
        this.tempTrainingData = {
            patterns: [],
            replies: []
        };
        
        // Training mode security
        this.isAuthenticated = false;
        this.trainingPassword = 'nm786'; // Change this to your desired password
        this.loginAttempts = 0;
        this.maxLoginAttempts = 3;
        this.lastLoginAttempt = 0;
        this.lockoutDuration = 30 * 60 * 1000; // 30 minutes in milliseconds
        
        // Load training data from localStorage
        this.customResponses = JSON.parse(localStorage.getItem('customResponses')) || {};
        
        // Load saved responses from localStorage
        const savedResponses = localStorage.getItem('customResponses');
        this.customResponses = savedResponses ? JSON.parse(savedResponses) : {};
        
        // Merge custom responses with default responses
        this.responses = {
            ...this.getDefaultResponses(),
            ...this.customResponses,
            training: {
                patterns: ['#train', '#learning', '#teach'],
                replies: [
                    "Please enter the training mode password using: #login your_password"
                ]
            }
        };
        
        this.initializeEventListeners();
        
        // Add welcome messages with typing effect
        this.showWelcomeMessage();
    }

    // Initialize all event listeners
    initializeEventListeners() {
        this.sendButton.addEventListener('click', () => this.sendMessage());
        this.userInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                this.sendMessage();
            }
        });
        this.themeToggleBtn.addEventListener('click', () => this.toggleTheme());
        this.initializeTheme();
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
        // Check if user is in lockout period
        if (this.isInLockout()) {
            const remainingTime = Math.ceil((this.lastLoginAttempt + this.lockoutDuration - Date.now()) / 60000);
            this.addBotMessage({
                text: `Too many failed attempts. Please try again in ${remainingTime} minutes.`,
                speak: false
            });
            return;
        }

        if (password === this.trainingPassword) {
            this.isAuthenticated = true;
            this.loginAttempts = 0;
            this.addBotMessage({
                text: "Login successful! You can now use training commands.",
                speak: false
            });
            if (this.isTrainingMode) {
                this.startTrainingMode();
            }
        } else {
            this.loginAttempts++;
            this.lastLoginAttempt = Date.now();
            const remainingAttempts = this.maxLoginAttempts - this.loginAttempts;
            
            if (remainingAttempts > 0) {
                this.addBotMessage({
                    text: `Invalid password. ${remainingAttempts} attempts remaining.`,
                    speak: false
                });
            } else {
                this.addBotMessage({
                    text: "Too many failed attempts. Please try again in 30 minutes.",
                    speak: false
                });
            }
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
        
        // First check exact matches
        for (const category in this.responses) {
            const patterns = this.responses[category].patterns;
            if (patterns && patterns.some(pattern => input === pattern.toLowerCase())) {
                return this.getRandomReply(category);
            }
        }
        
        // Then check partial matches
        for (const category in this.responses) {
            const patterns = this.responses[category].patterns;
            if (patterns && patterns.some(pattern => input.includes(pattern.toLowerCase()))) {
                return this.getRandomReply(category);
            }
        }
        
        // Check Bengali patterns
        if (this.responses.bengali_patterns && 
            this.responses.bengali_patterns.some(pattern => input.includes(pattern.toLowerCase()))) {
            return this.getRandomReply('bengali_replies');
        }
        
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
                    'token',
                    'টোকেন লিংক',
                    'টোকেন কিভাবে পাব',
                    'টোকেন কিভাবে বের করব',
                    'টোকেন চেক',
                    'টোকেন',
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
                    'ব্যালেন্স যোগ',
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
                    'মিটারে ৮৬৮ প্রেস করে লাল বাটন / নীল বাটনে চাপ দিন । (বিঃদ্রঃ কিছু মিটারের ইন্টার বাটন লাল আবার কিছু কিছু মিটারের ইন্টার বাটন নীল।)',
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
                    'recharge',
                    'রিচার্জ',
                    'বিকাশ',
                    'bKash', 
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
                    '',
                    '',
                    '', 
                ],
                replies: [
                    '',
                ]
            },
            meter_14: {
                patterns: [
                    '',
                    '',
                    '', 
                ],
                replies: [
                    '',
                ]
            },
            meter_15: {
                patterns: [
                    '',
                    '',
                    '', 
                ],
                replies: [
                    '',
                ]
            },
            meter_16: {
                patterns: [
                    '',
                    '',
                    '', 
                ],
                replies: [
                    '',
                ]
            },
            meter_17: {
                patterns: [
                    '',
                    '',
                    '', 
                ],
                replies: [
                    '',
                ]
            },
            meter_18: {
                patterns: [
                    '',
                    '',
                    '', 
                ],
                replies: [
                    '',
                ]
            },
            meter_19: {
                patterns: [
                    '',
                    '',
                    '', 
                ],
                replies: [
                    '',
                ]
            },
            meter_20: {
                patterns: [
                    '',
                    '',
                    '', 
                ],
                replies: [
                    '',
                ]
            },
            meter_21: {
                patterns: [
                    '',
                    '',
                    '', 
                ],
                replies: [
                    '',
                ]
            },
            meter_22: {
                patterns: [
                    '',
                    '',
                    '', 
                ],
                replies: [
                    '',
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
                    'token',
                    'টোকেন লিংক',
                    'টোকেন কিভাবে পাব',
                    'টোকেন কিভাবে বের করব',
                    'টোকেন চেক',
                    'টোকেন',
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
            localStorage.setItem('customResponses', JSON.stringify(this.customResponses));
            this.responses = {
                ...this.getDefaultResponses(),
                ...this.customResponses
            };
            this.trainingCategory = '';
            return "Training saved! The bot now knows these new patterns and responses.";
        }

        if (command === '#cancel') {
            this.trainingCategory = '';
            return "Training cancelled. No changes were saved.";
        }

        return null;
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

    generateBotResponse(userInput) {
        let response;

        // First check for training mode commands
        if (userInput.toLowerCase() === '#train' || userInput.toLowerCase() === '#teach') {
            this.handleTrainingRequest();
            return;
        }

        if (userInput.toLowerCase().startsWith('#login ')) {
            this.handleTrainingLogin(userInput.slice(7));
            return;
        }

        // Get all responses
        const responses = this.getDefaultResponses();

        // Check custom responses first
        for (const category in this.customResponses) {
            const patterns = this.customResponses[category].patterns;
            if (patterns && patterns.some(pattern => 
                userInput.toLowerCase().includes(pattern.toLowerCase()) || 
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
                    userInput.toLowerCase().includes(pattern.toLowerCase()) || 
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

        // Fallback if no default response is configured
        this.addBotMessage("দুঃখিত, আমি আপনার প্রশ্নটি বুঝতে পারছি না। অনুগ্রহ করে আরও স্পষ্টভাবে জিজ্ঞাসা করুন।");
    }

    getRandomReply(replies) {
        return replies[Math.floor(Math.random() * replies.length)];
    }

    showWelcomeMessage() {
        // Show company logo/name
        this.addBotMessage({
            text: "মিটার-এক্স-পার্ট | METER-X-PERT",
            speak: false
        });

        // Add typing indicator
        this.showTypingIndicator();
        
        // Wait for 1 second to simulate typing
        setTimeout(() => {
            // Show Bengali welcome
            this.addBotMessage({
                text: "স্বাগতম! আমি মিটার এক্সপার্ট, আপনার ইলেকট্রিক মিটার সহায়ক। মিটারের যে কোন সমস্যা আমাকে লিখে জানান । আমি আপনাকে সমাধান টা জানানোর চেষ্টা করবো।",
                speak: true
            });

            // Wait for 1 second
            setTimeout(() => {
                // Show English welcome
                this.addBotMessage({
                    text: "Welcome! I'm Meter Expert, your electric meter assistant. Please let me know about any meter issues you have, and I'll try my best to help you find a solution.",
                    speak: true
                });
                
                this.hideTypingIndicator();
            }, 1000);
        }, 1000);
    }
}

// Initialize chatbot when page loads
document.addEventListener('DOMContentLoaded', () => {
    new ChatBot();
});
