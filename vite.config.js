import { defineConfig } from 'vite';

export default defineConfig({
  build: {
    outDir: 'dist',
    // 扩展页面通过 chrome-extension:// 加载，必须用相对路径
    base: './',
  },
});
