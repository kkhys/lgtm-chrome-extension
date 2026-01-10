import { defineManifest } from "@crxjs/vite-plugin";
import { name, version } from "./package.json";

export default defineManifest({
  manifest_version: 3,
  name,
  version,
  icons: {
    48: "public/logo.png",
  },
  action: {
    default_icon: {
      48: "public/logo.png",
    },
  },
  background: {
    service_worker: "src/background.ts",
    type: "module",
  },
  permissions: ["activeTab", "scripting"],
});
