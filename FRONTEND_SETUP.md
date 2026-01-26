# Frontend Setup Guide

## ⚠️ Node.js Required

To install frontend dependencies, you need Node.js and npm installed.

### Install Node.js:

1. **Download Node.js:**
   - Visit: https://nodejs.org/
   - Download the LTS version (recommended)
   - Choose Windows Installer (.msi)

2. **Install Node.js:**
   - Run the installer
   - Follow the installation wizard
   - Make sure "Add to PATH" is checked
   - Restart your terminal after installation

3. **Verify Installation:**
   ```powershell
   node --version
   npm --version
   ```

---

## 📦 Install Frontend Dependencies

Once Node.js is installed, run:

```powershell
cd "C:\Users\dolab\Downloads\V2 Sync2gear"
npm install
```

This will install all frontend dependencies from `package.json`.

---

## 🚀 Start Frontend Development Server

After dependencies are installed:

```powershell
npm run dev
```

Frontend will be available at: **http://localhost:5173**

---

## ✅ What's Already Ready

- ✅ All frontend code is ready
- ✅ Package.json configured
- ✅ Environment variables set (with defaults)
- ✅ API service layer ready to connect to backend
- ✅ WebSocket client ready

---

## 📝 Quick Start (Once Node.js is Installed)

```powershell
# 1. Install dependencies
cd "C:\Users\dolab\Downloads\V2 Sync2gear"
npm install

# 2. Start development server
npm run dev

# Frontend will run at http://localhost:5173
```

---

**After installing Node.js, you can run the frontend!** ✅
