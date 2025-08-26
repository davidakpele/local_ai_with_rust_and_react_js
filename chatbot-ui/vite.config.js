import path from 'path';
import { fileURLToPath } from 'url';
import react from '@vitejs/plugin-react-swc';
import { defineConfig, transformWithEsbuild } from 'vite';
import tailwindcss from '@tailwindcss/vite'

// Derive the directory path from import.meta.url
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    {
      name: 'custom-jsx-loader',
      async transform(code, id) {
        if (!id.endsWith('.js')) {
          return null;
        }
        return transformWithEsbuild(code, id, {
          loader: 'jsx',
          jsx: 'automatic',
        });
      },
    },
  ],
  optimizeDeps: {
    esbuildOptions: {
      loader: {
        '.js': 'jsx',
      },
    },
  },
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    minify: true,
    manifest: true,
    rollupOptions: {
      input: {
        main: path.resolve(__dirname, 'index.html'),
      },
      output: {
        entryFileNames: '[name].js',
        chunkFileNames: '[name].js',
        assetFileNames: '[name].[ext]',
      },
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@components': path.resolve(__dirname, './src/components'),
      '@styles': path.resolve(__dirname, './src/styles'),
      '@utils': path.resolve(__dirname, './src/utils'),
      '@pages': path.resolve(__dirname, './src/pages'),
      '@assets': path.resolve(__dirname, './src/assets'),
      '@hooks': path.resolve(__dirname, './src/hooks'),
      '@services': path.resolve(__dirname, './src/services'),
      '@types': path.resolve(__dirname, './src/types'),
      '@context': path.resolve(__dirname, './src/context'),
      '@api': path.resolve(__dirname, './src/api'),
      '@constants': path.resolve(__dirname, './src/constants'),
      '@theme': path.resolve(__dirname, './src/theme'),
    },
    extensions: ['.ts', '.tsx', '.jsx', '.js', '.json'],
  },
});