import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig} from 'vite';
import {VitePWA} from 'vite-plugin-pwa';

export default defineConfig(() => {
  return {
    base: '/WebAPP/',  // ← ここを追加
    plugins: [
      react(),
      tailwindcss(),
      VitePWA({
        registerType: 'autoUpdate',
        includeAssets: ['favicon.ico', 'apple-touch-icon.png', 'icon.svg'],
        manifest: {
          id: '/WebAPP/',         // ← 修正
          name: 'ボートレースAI予想',
          short_name: 'ボート予想',
          description: '統計モデルによる全国24場のボートレースAI予想・スリット隊形・買い目フォーメーション算出Webアプリ',
          theme_color: '#0284c7',
          background_color: '#0f172a',
          display: 'standalone',
          start_url: '/WebAPP/',  // ← 修正
          scope: '/WebAPP/',      // ← 修正
          icons: [
            // ... 変更なし
          ],
        },
        // ... 変更なし
      }),
    ],
    // ... 変更なし
  };
});
