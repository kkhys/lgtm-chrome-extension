import { defineManifest } from "@crxjs/vite-plugin";
import { name, version } from "./package.json";

export default defineManifest({
  manifest_version: 3,
  name,
  version,
  description: "Copy LGTM image HTML to clipboard",
  homepage_url: "https://github.com/kkhys/lgtm-chrome-extension",
  icons: {
    16: "public/icon-16.png",
    32: "public/icon-32.png",
    48: "public/icon-48.png",
    128: "public/icon-128.png",
  },
  action: {
    default_icon: {
      16: "public/icon-16.png",
      32: "public/icon-32.png",
      48: "public/icon-48.png",
      128: "public/icon-128.png",
    },
    default_title: "Copy LGTM image",
  },
  background: {
    service_worker: "src/background.ts",
    type: "module",
  },
  permissions: ["activeTab", "scripting"],
});
