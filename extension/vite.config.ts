import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { resolve } from 'path'

// Check if we're building the content script (IIFE, no imports)
const isContentBuild = process.env.BUILD_TARGET === 'content'

export default defineConfig(
  isContentBuild
    ? {
      // ---- Content Script Build (IIFE, self-contained) ----
      plugins: [],
      build: {
        outDir: 'dist',
        emptyOutDir: false,  // Don't wipe the main build
        lib: {
          entry: resolve(__dirname, 'src/content/index.ts'),
          name: 'AutoFillContent',
          formats: ['iife'],
          fileName: () => 'content.js',
        },
        rollupOptions: {
          output: {
            inlineDynamicImports: true,
          },
        },
      },
    }
    : {
      // ---- Main Build (popup, options, background) ----
      plugins: [react()],
      base: '',
      build: {
        outDir: 'dist',
        emptyOutDir: true,
        rollupOptions: {
          input: {
            popup: resolve(__dirname, 'src/popup/index.html'),
            options: resolve(__dirname, 'src/options/index.html'),
            background: resolve(__dirname, 'src/background/index.ts'),
          },
          output: {
            entryFileNames: (chunkInfo) => {
              if (chunkInfo.name === 'background') return 'background.js'
              return 'assets/[name]-[hash].js'
            },
            chunkFileNames: 'assets/[name]-[hash].js',
            assetFileNames: 'assets/[name]-[hash][extname]',
          },
        },
      },
      server: {
        port: 5173,
        strictPort: true,
      },
    }
)
