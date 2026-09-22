import { tanstackRouter } from '@tanstack/router-plugin/vite';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

export default defineConfig({
  base: '/mantine-dashboard-builder/',
  plugins: [
    tanstackRouter({ target: 'react', autoCodeSplitting: true, routesDirectory: 'src/routes' }),
    react(),
  ],
  resolve: { tsconfigPaths: true },
  server: { port: 5173 },
});
