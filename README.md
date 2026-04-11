This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

---

## 🛠️ Troubleshooting & Development

### 1. Sửa lỗi "Cannot find module" hoặc Build lỗi
Nếu bạn gặp lỗi `MODULE_NOT_FOUND` hoặc giao diện local không cập nhật sau khi xóa code lớn, hãy chạy lệnh sau trong Terminal:
```powershell
# Xóa bộ nhớ đệm Next.js
Remove-Item -Path .next -Recurse -Force
# Sau đó chạy lại
npm run dev
```

### 2. Cấu hình Production (Vercel)
Để hệ thống đăng chương và ảnh hoạt động trên web chính thức, bạn **bắt buộc** phải cấu hình các biến môi trường sau trong Vercel Project Settings:
- `R2_ACCESS_KEY_ID` / `NEXT_PUBLIC_R2_ACCESS_KEY_ID`
- `R2_SECRET_ACCESS_KEY` / `NEXT_PUBLIC_R2_SECRET_ACCESS_KEY`
- `R2_ACCOUNT_ID` / `NEXT_PUBLIC_R2_ACCOUNT_ID`
- `R2_BUCKET_NAME`
- `R2_PUBLIC_URL`

### 3. Quy trình Triển khai (Deployment)
Mọi thay đổi code sau khi được xác nhận ổn định ở môi trường Local sẽ được **tự động Push lên GitHub** branch `main`. Vercel sẽ tự động bắt lấy thay đổi này để cập nhật trang web chính thức.

---
