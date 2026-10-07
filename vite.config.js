import { defineConfig } from 'vite';
import { viteSingleFile } from 'vite-plugin-singlefile';

// Builds the whole app (JS, CSS, bundled dependencies) into a single
// self-contained dist/index.html — same delivery model as the original
// hand-written single file.
export default defineConfig({
    plugins: [viteSingleFile()],
    server: {
        // Lets `bun run dev` use the Netlify function when `netlify dev`
        // is running alongside (it serves the functions on :8888).
        proxy: {
            '/api': 'http://localhost:8888'
        }
    },
    build: {
        target: 'es2018',
        cssCodeSplit: false,
        assetsInlineLimit: 100000000,
        chunkSizeWarningLimit: 100000000
    }
});
