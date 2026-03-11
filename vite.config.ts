import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
  base: '/japanese_style_timetable/',
  plugins: [react()],
  server: {
    host: true, // 외부 접속 허용
    proxy: {
      '/api-railblue': {
        target: 'https://rail.blue',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api-railblue/, ''),
      },
      '/api-tago': {
        target: 'https://apis.data.go.kr',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api-tago/, ''),
      },
    },
  },
});
