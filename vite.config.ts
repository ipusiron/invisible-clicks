import { defineConfig } from "vite";

export default defineConfig({
  base: "/invisible-clicks/",
  server: { host: "127.0.0.1", hmr: false },
  plugins: [{
    name: "local-demo-without-hmr-client",
    apply: "serve",
    transformIndexHtml: {
      order: "post",
      // 通信を許可しないCSPを開発時も維持する。変更後は手動で再読み込みする。
      handler: html => html.replace(/<script\b[^>]*\bsrc="[^"]*\/@vite\/client"[^>]*><\/script>/g, ""),
    },
  }],
  build: {
    outDir: "docs"
  }
});
