# Deploy NestJS to Vercel - Checklist

## ✅ Đã hoàn thành

- [x] Tạo `src/main.server.ts` - serverless wrapper
- [x] Tạo `vercel.json` - config routing
- [x] Cài `serverless-http` dependency
- [x] Build thành công (`dist/main.server.js` exists)
- [x] Thêm `.vercelignore`
- [x] Thêm script `vercel-build` trong package.json

## 📋 Trước khi deploy lên Vercel

### 1. Cấu hình Environment Variables trên Vercel

Vào Project Settings → Environment Variables và thêm:

- `PORT=3334`
- `DATABASE_URL=mongodb+srv://...`
- `JWT_SECRET=...`
- `GOOGLE_CLIENT_ID=...`
- `GOOGLE_CLIENT_SECRET=...`
- `GOOGLE_REDIRECT_URI=https://your-domain.vercel.app/api/v1/auth/google/callback`
- `FRONTEND_CALLBACK_URL=https://your-frontend.vercel.app/callback`

⚠️ **Quan trọng**: Nhớ update `GOOGLE_REDIRECT_URI` và `FRONTEND_CALLBACK_URL` với domain Vercel của bạn!

### 2. Deploy

```bash
# Deploy lên Vercel
vercel --prod

# Hoặc push code lên GitHub và Vercel sẽ tự động deploy
git add .
git commit -m "fix: serverless setup for vercel"
git push origin main
```

### 3. Test API sau khi deploy

```bash
# Test endpoint
curl https://your-domain.vercel.app/api/v1/auth/google

# Hoặc mở browser: https://your-domain.vercel.app/api/v1/
```

## 🔍 Troubleshooting

### Nếu vẫn bị 404:

1. Check Vercel Function Logs trong dashboard
2. Đảm bảo `dist/main.server.js` có trong deployment (check Files tab)
3. Kiểm tra routing trong `vercel.json`
4. Test local với `vercel dev`

### Nếu bị FUNCTION_INVOCATION_FAILED:

1. Check Environment Variables đã set đầy đủ chưa
2. Check logs để xem lỗi cụ thể
3. Đảm bảo MongoDB connection string đúng

### Test local trước khi deploy:

```bash
# Install Vercel CLI nếu chưa có
npm i -g vercel

# Run local
vercel dev

# Access: http://localhost:3000/api/v1/
```

## 📁 Files đã thay đổi

- ✅ `src/main.server.ts` - serverless entry point
- ✅ `vercel.json` - Vercel config
- ✅ `.vercelignore` - ignore files
- ✅ `package.json` - thêm vercel-build script
- ℹ️ `src/main.ts` - giữ nguyên cho local dev

## 🎯 URL Structure sau khi deploy

- Root: `https://your-domain.vercel.app/`
- API Base: `https://your-domain.vercel.app/api/v1/`
- Auth: `https://your-domain.vercel.app/api/v1/auth/google`
- Tasks: `https://your-domain.vercel.app/api/v1/tasks`
- Sprints: `https://your-domain.vercel.app/api/v1/sprints`

## 💡 Notes

- Vercel sẽ tự động chạy `npm run vercel-build` (hoặc `build`) khi deploy
- Function timeout default: 10s (có thể tăng với Pro plan)
- Cold start: ~1-2s cho lần đầu tiên
- Caching: Vercel tự động cache static files
