# **WebTerm**
Powerful production-grade browser terminal with real PTY backend, streaming I/O, secure authentication, file transfer, and full TTY capabilities.

<p align="left">

![Language](https://img.shields.io/badge/Language-TypeScript-3178C6?style=for-the-badge&logo=typescript)
![Runtime](https://img.shields.io/badge/Node.js-18%2B-339933?style=for-the-badge&logo=node.js)
![Build Tool](https://img.shields.io/badge/Bun-Required-000000?style=for-the-badge&logo=bun)
![License](https://img.shields.io/badge/License-MIT-blue?style=for-the-badge)
![Last Commit](https://img.shields.io/github/last-commit/abdou-da0wew/WebTerm?style=for-the-badge)
![Maintained](https://img.shields.io/badge/Maintained-Yes-success?style=for-the-badge)

</p>

---

## ⭐ Introduction
WebTerm delivers a fully interactive shell experience directly in your browser. Powered by a real PTY backend, it enables true terminal behavior, low-latency streaming, secure access, modern terminal applications, and reliable production-ready usage.

---

## 🔗 Quick Navigation
- [Features](#️-features)
- [Requirements](#-requirements)
- [Installation](#-installation)
- [Build](#-build)
- [Run](#-run)
- [Configuration](#-configuration)
- [Usage](#-usage)
- [Security Notes](#-security-notes)
- [Architecture](#-architecture)
- [Troubleshooting](#-troubleshooting)
- [Development](#-development)
- [License](#-license)
- [Technical Details](#-technical-details)

---

## ⚙️ Features
- 🚀 **Real PTY Backend** — Powered by `node-pty` for authentic shell execution  
- 🖥️ **Full Shell Support** — Works with `vim`, `nano`, `top`, `htop`, and more  
- 🔍 **Auto Shell Detection** — Automatically selects your system’s default shell  
- 📂 **File Transfer** — Drag and drop uploads directly into the current directory  
- 📦 **Single File Deployment** — Fully bundled into one JavaScript executable  
- 🔐 **Security** — Token authentication using HMAC-SHA256  
- ⚡ **Performance** — WebSocket streaming with near-zero latency  
- 🎨 **Terminal Features** — Colors, cursor movement, history, tab completion, signals (CTRL+C, CTRL+Z, EOF)

---

## 📋 Requirements
| Dependency | Purpose |
|-----------|--------|
| **Node.js v18+** | Runtime execution |
| **Bun** | Package manager & build tool |

---

## 🛠 Installation
```bash
cd WebTerm
bun install
````

---

## 🏗 Build

```bash
bun run build
```

Generates: `dist/server.js`

---

## ▶️ Run

```bash
bun run start
# or
node dist/server.js
```

Expected output:

```
🚀 Server running on http://localhost:3000
http://localhost:3000/?token=1234567890abcdef...
⏰ Token expires at: ...
💡 Tip: Set AUTH_SECRET to persist tokens
```

> Open the generated URL in your browser to launch WebTerm.

---

## ⚙️ Configuration

Create `.env` (based on `.env.example`):

```bash
AUTH_SECRET=your-random-secret-key-here
PORT=3000
TOKEN_EXPIRY=3600
```

> If `.env` does not load in your setup, define environment variables inline before running Bun or Node.

---

## 🧑‍💻 Usage

### 🖥 Basic Terminal

```bash
ls -la
echo "Hello from WebTerm"
vim myfile.txt
nano config.ini
top
htop
```

### 📂 File Upload

Drag and drop files into the browser.
Files upload to the current working directory.

### ⌨ Keyboard Shortcuts

| Shortcut | Action            |
| -------- | ----------------- |
| CTRL + C | Interrupt process |
| CTRL + Z | Suspend           |
| CTRL + D | Logout / EOF      |
| TAB      | Auto-complete     |
| ↑ / ↓    | Command history   |

---

## 🔐 Security Notes

> WebTerm prioritizes safety without restricting usability.

* Runs using current user permissions only
* No sudo / no privilege escalation
* HMAC-secured token authentication
* 1000 messages/minute rate limit
* PTY auto-cleanup on disconnect

---

## 🧱 Architecture

```
WebTerm
├── Client (Browser)
│   ├── xterm.js
│   ├── WebSocket client
│   └── Upload handler
├── WebSocket Server
│   ├── Authentication
│   ├── Rate limiting
│   └── Routing
└── PTY Manager
    ├── Shell detection
    ├── Spawn handling
    └── TTY management
```

---

## 🩺 Troubleshooting

### ❌ Missing authentication token

Append:

```
?token=YOUR_TOKEN
```

### 🪟 Terminal not resizing

Refresh browser.

### 🎨 Missing colors

Ensure shell config sources correctly.
Uses `xterm-256color`.

### 📁 Upload failing

Check browser console and ensure file ≤ 10MB.

---

## 🧪 Development

```bash
bun run dev
```

Builds and runs development server.

---

## 📜 License

MIT

---

## 📚 Technical Details

| Component       | Technology          |
| --------------- | ------------------- |
| Frontend        | xterm.js + WebGL    |
| Backend         | Node.js + node-pty  |
| Transport       | WebSocket           |
| Bundler         | esbuild             |
| Package Manager | Bun                 |
| Language        | TypeScript (strict) |

---

Happy hacking 🔧

كده README بقى corporate level… شكل واحد Enterprise بيقبض بالدولار كتبه.
```
