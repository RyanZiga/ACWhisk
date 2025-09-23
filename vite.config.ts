import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react-swc';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  resolve: {
    extensions: ['.js', '.jsx', '.ts', '.tsx', '.json'],
    alias: {
      '@': path.resolve(__dirname, './src'),
      'figma:asset/868eb8cd441d8d76debd4a1fae08c51899b81cd8.png': path.resolve(
        __dirname,
        './src/assets/868eb8cd441d8d76debd4a1fae08c51899b81cd8.png'
      ),
    },
  },
  build: {
    target: 'esnext',
    outDir: 'build',
  },
  server: {
    port: 3000,
    open: true,
  },
});
