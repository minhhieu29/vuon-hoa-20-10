import react from '@vitejs/plugin-react'
import { defineConfig, type Plugin } from 'vite'

/** Địa chỉ trang sau khi đưa lên mạng (vd. https://vuon-hoa.netlify.app/), để ảnh xem trước link có đường dẫn đầy đủ. */
const SITE = (process.env.SITE_URL ?? '').trim().replace(/\/?$/, '/').replace(/^\/$/, '')

/** Thay __SITE__ trong index.html; không có SITE_URL thì bỏ og:url và để ảnh theo đường dẫn tương đối (Zalo/Facebook có thể không hiện ảnh). */
const siteUrl = (): Plugin => ({
  name: 'site-url',
  transformIndexHtml: html => (SITE ? html : html.replace(/\n\s*<meta property="og:url"[^>]*>/, '')).replaceAll('__SITE__', SITE || './'),
})

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), siteUrl()],
  // đường dẫn tương đối: thư mục dist chạy được ở mọi hosting tĩnh, kể cả thư mục con (GitHub Pages)
  base: './',
})
