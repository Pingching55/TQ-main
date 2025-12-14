# 📁 Export Project to VS Code

## 🚀 Quick Export Steps

### 1. Download All Files
You can copy all the files from this project to your local VS Code. Here are the main files you need:

### 📂 **Root Files**
- `package.json` - Dependencies and scripts
- `next.config.js` - Next.js configuration
- `tailwind.config.ts` - Tailwind CSS config
- `tsconfig.json` - TypeScript configuration
- `components.json` - shadcn/ui configuration
- `postcss.config.js` - PostCSS configuration

### 📂 **App Directory**
- `app/layout.tsx` - Root layout
- `app/page.tsx` - Home page
- `app/globals.css` - Global styles
- `app/auth/login/page.tsx` - Login/Register page
- `app/account/page.tsx` - Account management
- `app/account/account.css` - Account page styles
- `app/journal/page.tsx` - Trade journal
- `app/journal/journal.css` - Journal styles

### 📂 **Library Files**
- `lib/utils.ts` - Utility functions
- `lib/supabase.ts` - Supabase client and types

### 📂 **Supabase Migrations**
- All files in `supabase/migrations/` - Database schema

### 📂 **Components (shadcn/ui)**
- All files in `components/ui/` - UI components

## 🛠️ **Setup in VS Code**

### 1. Create New Project
```bash
mkdir tradequest-app
cd tradequest-app
```

### 2. Copy All Files
Copy all the files from this project to your local folder.

### 3. Install Dependencies
```bash
npm install
```

### 4. Create Environment File
Create `.env.local` with your Supabase credentials:
```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```

### 5. Run Development Server
```bash
npm run dev
```

### 6. Build for Production
```bash
npm run build
```

## 🚀 **Deploy Options**

### Option A: Netlify
1. Run `npm run build`
2. Upload the `out` folder to Netlify
3. Add environment variables in Netlify dashboard

### Option B: Vercel
1. Install Vercel CLI: `npm install -g vercel`
2. Run `vercel --prod`
3. Follow the prompts

### Option C: GitHub Pages
1. Push to GitHub repository
2. Enable GitHub Pages with Actions
3. Add environment variables as GitHub secrets

## 📋 **File Structure**
```
tradequest-app/
├── app/
│   ├── account/
│   │   ├── page.tsx
│   │   └── account.css
│   ├── auth/
│   │   └── login/
│   │       └── page.tsx
│   ├── journal/
│   │   ├── page.tsx
│   │   └── journal.css
│   ├── layout.tsx
│   ├── page.tsx
│   └── globals.css
├── components/
│   └── ui/
│       └── [all shadcn components]
├── lib/
│   ├── utils.ts
│   └── supabase.ts
├── supabase/
│   └── migrations/
│       └── [all migration files]
├── package.json
├── next.config.js
├── tailwind.config.ts
├── tsconfig.json
└── .env.local
```

## ✅ **What You Get**
- ✅ Complete trade journal application
- ✅ User authentication with Supabase
- ✅ Account management
- ✅ Trade tracking with P&L calculations
- ✅ Responsive design (mobile + desktop)
- ✅ Dark/light theme support
- ✅ Modern UI with shadcn/ui components
- ✅ Ready for deployment

## 🎯 **Next Steps**
1. Copy all files to VS Code
2. Install dependencies
3. Set up environment variables
4. Test locally with `npm run dev`
5. Deploy to your preferred platform

Happy coding! 🚀