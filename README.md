# AutoFill AI

> 🚀 AI-powered Chrome extension that auto-fills internship & placement application forms.

## Quick Start

### 1. Setup the Backend Server

```bash
cd server
npm install
```

Create a `.env` file in the `server/` directory:
```
PORT=3001
GEMINI_API_KEY=your_gemini_api_key_here
```

> Get your free Gemini API key at: https://aistudio.google.com/apikey

Start the server:
```bash
npm run dev
```

### 2. Build the Chrome Extension

```bash
cd extension
npm install
npm run dev
```

### 3. Load the Extension in Chrome

1. Open `chrome://extensions/`
2. Enable **Developer Mode** (top-right toggle)
3. Click **Load Unpacked**
4. Select the `extension/dist` folder
5. Click the ⚡ extension icon to open the popup

### 4. Set Up Your Profile

1. Click **⚙️ Settings & Profile** in the popup, or
2. Right-click the extension icon → Options
3. Fill in your personal details, education, experience, skills, etc.
4. Click **Save Profile**

### 5. Auto-Fill a Form

1. Navigate to any job/internship application page
2. Click the ⚡ AutoFill AI extension icon
3. Click **AutoFill This Page**
4. Watch your form get filled! 🎉

## Project Structure

```
autofill-ai/
├── extension/          # Chrome Extension (React + TypeScript + Vite)
│   ├── src/
│   │   ├── popup/      # Extension popup UI
│   │   ├── options/    # Full profile dashboard
│   │   ├── content/    # Content script (DOM scraper + filler)
│   │   ├── background/ # Service worker (message routing + API calls)
│   │   └── shared/     # Shared types & constants
│   └── public/
│       └── manifest.json
│
├── server/             # Backend API (Node.js + Express + Gemini AI)
│   └── src/
│       ├── routes/     # API endpoints
│       ├── services/   # AI matching service
│       ├── prompts/    # AI prompt templates
│       └── middleware/  # Error handling, etc.
│
└── README.md
```

## Tech Stack

- **Extension**: React 19, TypeScript, Vite, CRXJS Vite Plugin
- **Content Script**: Vanilla TypeScript (lightweight DOM manipulation)
- **Backend**: Node.js, Express, Google Gemini AI
- **Styling**: Vanilla CSS with dark theme

## License

MIT
