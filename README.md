# BigQuery Release Notes Tracker

A premium, interactive web application built with **Python Flask** and **Vanilla Web Technologies (HTML5, CSS3, ES6)** that fetches, parses, and formats BigQuery release notes. It features a modern dark-theme dashboard with filtering, search capabilities, and a custom Tweet composer with automatic character limits and sharing intents.

## 🚀 Features

*   **Granular XML Parsing:** Splits bundled feed updates (grouped by date in Google's official feed) into separate cards matching their individual categories (e.g. *Feature, Change, Deprecation, Issue, GA*).
*   **Aesthetic Obsidian Dark Theme:** Frosted glass panels, glowing borders on hover, customized category badging, and micro-interactions.
*   **Search & Filtering:** Dynamic, instantaneous client-side searching and category filtering.
*   **Twitter/X Integration Drawer:**
    *   **Smart Truncation:** Formats draft tweets with category badges, date, tags, and source links, automatically truncating the body to remain within the 280-character limit.
    *   **Twitter-compliant character counter:** Correctly identifies links/URLs as exactly 23 characters (aligning with Twitter's `t.co` shortening standard) and drives an animated circular SVG progress ring.
    *   **Dual Sharing Actions:** Click to copy the composed tweet to your clipboard with animated toast notification feedback, or post directly via X/Twitter's Web Intent interface.

---

## 🛠️ Technology Stack

*   **Backend:** Python 3.14, Flask, Feedparser, Requests
*   **Frontend:** Plain Vanilla HTML5, CSS3 (Variables, Flexbox, Grid, Glassmorphism), ES6 Javascript
*   **Fonts & Icons:** Outfit & Inter (Google Fonts), Font Awesome Icons

---

## 📂 Project Structure

```text
bq-releases-notes/
├── .git/                 # Git repository configuration
├── .venv/                # Local Python virtual environment
├── static/
│   ├── app.js            # Client-side controller, filter, and composer logic
│   └── style.css         # Custom stylesheet and dark-mode styles
├── templates/
│   └── index.html        # Main HTML5 layout structure
├── .gitignore            # Git exclusion rules
├── app.py                # Flask backend and feed parser
├── README.md             # Project documentation (this file)
└── requirements.txt      # Python dependencies manifest
```

---

## 💻 Installation & Local Setup

This project is set up to run using Python 3.14. Follow these steps to run the server locally:

### 1. Clone or Navigate to the Directory
```powershell
cd C:\Users\tonny\agy-cli-projects\bq-releases-notes
```

### 2. Configure Virtual Environment
If you need to re-create or restore the environment:
```powershell
# Create virtual environment
python -m venv .venv

# Activate and install dependencies
.venv\Scripts\pip.exe install -r requirements.txt
```

### 3. Run the Server
Start the Flask development server:
```powershell
.venv\Scripts\python.exe app.py
```
*The server will start in debug mode on **`http://127.0.0.1:5000`**.*

### 4. Open in Browser
Navigate to:
👉 **[http://localhost:5000/](http://localhost:5000/)**

---

## 🔗 Data Sources

*   **Release Feed:** Official [BigQuery Release Notes RSS Feed](https://docs.cloud.google.com/feeds/bigquery-release-notes.xml)
*   **Documentation:** [Google Cloud BigQuery Documentation](https://cloud.google.com/bigquery/docs/)
