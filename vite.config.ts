import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import packageJson from './package.json';
import versionManifest from './public/version.json';

export default defineConfig({
  base: '/DrinkCompany/',
  plugins: [react()],
  define: {
    __APP_VERSION__: JSON.stringify(packageJson.version),
    __BUILD_ID__: JSON.stringify(versionManifest.buildId),
  },
  build: {
    target: 'es2022',
    sourcemap: true,
  },
});
