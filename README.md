# ⚡ AutoFill AI 

> An incredibly smart, privacy-first Chrome Extension that uses AI to automatically fill out complex job and internship applications perfectly using your resume and profile.

![Extension Demo Placeholder](https://via.placeholder.com/800x400?text=AutoFill+AI+Demo)

## 🌟 Features

- **🧠 Deep AI Field Matching:** Instead of dumb regex, it uses Google's Gemma 3 AI model to *read* the application fields and understand the context before filling them out.
- **🛡️ Extreme Privacy:** Zero cloud databases. Your profile data, Custom Answers, and Resume PDF are stored 100% locally on your own hard drive inside Chrome Storage.
- **🚫 Anti-Hallucination Engine:** Unlike basic ChatGPT wrappers, it is strictly programmed to *refuse* guessing. If it doesn't know your GPA, it will leave the field blank instead of hallucinating.
- **📝 Shadow Memory:** If the AI encounters a question it doesn't know (like "What is your biggest weakness?"), it moves it to an "Unmatched" UI. You answer it once, and the AI *memorizes* your answer for the next time it sees a similar question on a different website!
- **⚡ Local PDF Extraction:** Processes your PDF resume entirely locally to save massive API token costs, keeping your daily usage safely within the free tier.

---

## 🚀 Quick Start

### 1. Setup the Backend Server

This backend server is what connects your local extension securely to the AI model.

```bash
cd server
npm install
```

Create a `.env` file in the `server/` directory:
```
PORT=3001
GEMINI_API_KEY=your_gemini_api_key_here
```
> *Get a free Gemini API key here: https://aistudio.google.com/apikey*

Start the server:
```bash
npm run dev
```

### 2. Build the Chrome Extension

```bash
cd extension
npm install
npm run build
```

### 3. Install in Chrome

1. Open Chrome and go to `chrome://extensions/`
2. Enable **Developer Mode** (toggle in the top-right corner)
3. Click **Load Unpacked** in the top-left
4. Select the `extension/dist` folder from your cloned repository.
5. Pin the ⚡ extension icon to your toolbar for easy access!

### 4. Set Up Your Profile (One-Time Setup)

1. Right-click the extension icon → **Options**
2. Upload your PDF Resume.
3. Fill out your core profile (Education, GPA, Location, Links).
4. Click **Save Profile**. 

### 5. Start Auto-Filling!

1. Go to any job board like LinkedIn Jobs or Workday.
2. Click the ⚡ AutoFill AI extension icon.
3. Click **AutoFill This Page**.
4. The AI will instantly map and fill the fields. If it skips any tricky fields, they will appear in the popup. Answer them there, and the AI will memorize it for next time! 🎉

---

## 🛠️ Tech Stack

- **Extension UI**: React 19, TypeScript, Vite
- **Background Engine**: Chrome Service Workers (Manifest V3)
- **DOM Parsing**: Vanilla TS Content Scripting
- **Server**: Node.js, Express, Multer, PDF-Parse
- **Core AI Model**: Google Gemma-3-4b-it (via Google Generative AI SDK)

## 📄 License
MIT
