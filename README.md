# Chat Frontend

Frontend application for the chat app built with Next.js.

## Features

- User authentication
- Real-time chat with WebSocket
- File sharing (images, audio)
- Group chats
- Contact management
- QR code scanning
- Location-based features
- Proposal system

## Tech Stack

- Next.js 16 (App Router)
- TypeScript
- Tailwind CSS
- React Context API

## Local Development Setup

1. Install dependencies:
```bash
npm install
```

2. Copy `.env.example` to `.env.local` and configure:
```bash
cp .env.example .env.local
```

3. Edit `.env.local` and set your backend URLs:
```env
NEXT_PUBLIC_API_URL=http://localhost:8080/api/v1
NEXT_PUBLIC_WS_URL=ws://localhost:8080/ws
```

4. Run the development server:
```bash
npm run dev
```

The app will be available at `http://localhost:3000`.

## Railway Deployment (Ayrı Proje Olarak)

Bu front-end projesi Railway'de ayrı bir servis olarak deploy edilmelidir.

### Önemli Kurulum Adımları:

1. **Git Repository Oluştur:**
   - Front-end klasörünü ayrı bir Git repository'sine yükleyin
   - Railway'de yeni bir proje oluşturun ve bu repository'yi bağlayın

2. **Root Directory Ayarları:**
   - Railway service ayarlarına gidin
   - "Source" bölümünde **Root Directory** boş bırakın (zaten root'ta olduğu için)
   - Veya `.` olarak ayarlayın

3. **Environment Variables (Railway Dashboard'da Ayarlayın):**
   ```env
   NEXT_PUBLIC_API_URL=https://your-backend-app.railway.app/api/v1
   NEXT_PUBLIC_WS_URL=wss://your-backend-app.railway.app/ws
   ```
   
   **ÖNEMLİ:** 
   - `NEXT_PUBLIC_API_URL`: Back-end Railway URL'inizi buraya ekleyin
   - `NEXT_PUBLIC_WS_URL`: WebSocket için `wss://` kullanın (güvenli WebSocket)
   - Back-end'in Railway URL'ini almak için back-end servisinin deploy edilmesini bekleyin

4. **GoDaddy Domain Bağlama:**
   - Railway'de servisinizin ayarlarına gidin
   - "Settings" > "Networking" bölümüne gidin
   - "Custom Domain" ekleyin
   - GoDaddy'de DNS ayarlarını yapın:
     - Railway'in verdiği CNAME kaydını GoDaddy'ye ekleyin
     - Veya A record ile Railway IP'sini ekleyin
   - Domain bağlandıktan sonra back-end'deki `CORS_ALLOWED_ORIGINS` değişkenine domain'inizi eklemeyi unutmayın!

5. **Build ve Deploy:**
   - Railway otomatik olarak `Dockerfile`'ı algılayacak
   - Build işlemi otomatik başlayacak
   - Deploy tamamlandıktan sonra domain'iniz üzerinden erişilebilir olacak

6. **Troubleshooting:**
   - Build hatası alırsanız, `package-lock.json` dosyasının güncel olduğundan emin olun
   - Environment variable'ların `NEXT_PUBLIC_` ile başladığından emin olun (browser'da erişilebilir olması için)
   - WebSocket bağlantı hatası alırsanız, `wss://` kullandığınızdan emin olun

## Project Structure

```
front-end/
├── app/              # Next.js app router pages
├── components/       # React components
├── contexts/         # React contexts
├── lib/              # Utilities and API clients
└── public/           # Static assets
```

## Pages

- `/` - Home/redirect page
- `/login` - Login page
- `/register` - Registration page
- `/chat` - Main chat interface
