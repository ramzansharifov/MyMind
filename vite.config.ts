import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  base: './',
  plugins: [react()],
  server: {
    port: 5173,
    strictPort: true,
  },
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes('node_modules')) {
            return undefined;
          }
          if (id.includes('@blocknote')) {
            return 'blocknote-vendor';
          }
          if (id.includes('@tiptap') || id.includes('prosemirror')) {
            return 'tiptap-vendor';
          }
          if (id.includes('@mantine') || id.includes('@floating-ui')) {
            return 'editor-ui-vendor';
          }
          if (id.includes('recharts') || id.includes('d3-')) {
            return 'charts-vendor';
          }
          return undefined;
        },
      },
    },
  },
});
