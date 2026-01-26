# 🚀 Setup Guide - Getting Your App Running

This guide will help you set up everything needed to run the sync2gear application.

## ✅ What's Already Done

The following files have been created and configured:

- ✅ `tsconfig.json` - TypeScript configuration
- ✅ `tsconfig.node.json` - Node TypeScript config
- ✅ `.gitignore` - Git ignore rules
- ✅ `package.json` - Updated with React/React-DOM dependencies
- ✅ `vite.config.ts` - Vite configuration
- ✅ `vite.config.ts.production` - Production build config
- ✅ `README.md` - Updated with setup instructions
- ✅ Theme Provider setup in App.tsx

## 📝 Files You Need to Create

### 1. Environment Variables File

Create a `.env` file in the root directory with the following content:

```bash
# sync2gear Environment Configuration

# Django Backend API Configuration
# For development (when backend is running locally)
VITE_API_BASE_URL=http://localhost:8000/api
VITE_WS_BASE_URL=ws://localhost:8000/ws

# For production (update with your production URLs)
# VITE_API_BASE_URL=https://api.sync2gear.com/api
# VITE_WS_BASE_URL=wss://api.sync2gear.com/ws

# Feature Flags
# Set to true in production to enable security features
VITE_ENABLE_SECURITY=false
```

**Quick Command:**
```bash
# Windows PowerShell
@"
# sync2gear Environment Configuration
VITE_API_BASE_URL=http://localhost:8000/api
VITE_WS_BASE_URL=ws://localhost:8000/ws
VITE_ENABLE_SECURITY=false
"@ | Out-File -FilePath .env -Encoding utf8

# Linux/Mac
cat > .env << EOF
# sync2gear Environment Configuration
VITE_API_BASE_URL=http://localhost:8000/api
VITE_WS_BASE_URL=ws://localhost:8000/ws
VITE_ENABLE_SECURITY=false
EOF
```

### 2. Environment Example File (Optional but Recommended)

Create a `.env.example` file (same content as above) as a template for other developers.

## 🎯 Step-by-Step Setup

### Step 1: Install Dependencies

```bash
npm install
```

This will install all required packages including:
- React 18.3.1
- React-DOM 18.3.1
- TypeScript
- Vite
- Tailwind CSS
- All UI component libraries

### Step 2: Create Environment File

Create the `.env` file as shown above.

### Step 3: Start Development Server

```bash
npm run dev
```

The app will start at `http://localhost:5173`

### Step 4: Verify Everything Works

1. Open `http://localhost:5173` in your browser
2. You should see the landing page
3. Click "Sign In" to see the login page
4. The app runs in demo mode with mock data (no backend needed)

## 🎨 Running in Demo Mode

The app is configured to run **without a backend** using mock data:

- ✅ All UI components work
- ✅ Authentication uses mock users
- ✅ Music library shows sample files
- ✅ All features are functional for frontend testing

**Mock Login Credentials:**
- Email: `admin@sync2gear.com`
- Password: `password` (or any password - it's mock)

## 🔌 Connecting to Backend (Optional)

If you have a Django backend running:

1. **Update `.env`:**
   ```bash
   VITE_API_BASE_URL=http://localhost:8000/api
   VITE_WS_BASE_URL=ws://localhost:8000/ws
   ```

2. **Update `/src/lib/auth.tsx`** to use real API:
   - See `FRONTEND_DJANGO_INTEGRATION.md` for detailed instructions
   - Replace mock authentication with API calls

3. **Restart dev server:**
   ```bash
   npm run dev
   ```

## 📦 Build for Production

### Standard Build

```bash
npm run build
```

Output will be in the `dist/` folder.

### Protected Build (with obfuscation)

```bash
npm run build:protected
```

This uses the production config with code protection features.

## 🐛 Troubleshooting

### "Cannot find module 'react'"

**Solution:** Run `npm install` to install dependencies.

### "Port 5173 already in use"

**Solution:** 
- Close other Vite dev servers
- Or change port in `vite.config.ts`

### "Environment variables not working"

**Solution:**
- Ensure `.env` file is in the root directory
- Restart the dev server after creating `.env`
- Variables must start with `VITE_` to be accessible

### "TypeScript errors"

**Solution:**
- Run `npm install` to ensure TypeScript is installed
- Check `tsconfig.json` exists (already created)

### "Theme not working"

**Solution:**
- ThemeProvider is already set up in `App.tsx`
- Ensure `next-themes` is installed: `npm install`

## ✅ Checklist

Before running the app, ensure:

- [ ] Node.js 18+ is installed
- [ ] `npm install` has been run
- [ ] `.env` file has been created
- [ ] No TypeScript errors (check terminal)
- [ ] Dev server starts without errors

## 📚 Next Steps

Once the app is running:

1. **Explore the UI** - All components are functional
2. **Read Documentation** - Check `START_HERE.md` for full guide
3. **Build Backend** - See `CURSOR_MASTER_PROMPT.txt` for backend setup
4. **Customize** - Modify components in `src/app/components/`

## 🎉 You're Ready!

Your app should now be running. If you encounter any issues, check the troubleshooting section above or refer to the documentation files in the root directory.

---

**Need Help?**
- Check `README.md` for overview
- Check `START_HERE.md` for complete guide
- Check `QUICK_REFERENCE.md` for API reference
