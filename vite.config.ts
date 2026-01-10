import { resolve } from "node:path";
import { crx } from "@crxjs/vite-plugin";
import type { UserConfig } from "vite";
import zip from "vite-plugin-zip-pack";
import manifest from "./manifest.config";
import { name, version } from "./package.json";

export default {
  resolve: {
    alias: {
      "#": `${resolve(__dirname, "src")}`,
    },
  },
  plugins: [
    crx({ manifest }),
    zip({ outDir: "release", outFileName: `${name}-${version}.zip` }),
  ],
  server: {
    cors: {
      origin: [/chrome-extension:\/\//],
    },
  },
} satisfies UserConfig;
