import { defineConfig } from "vite";
import preact from "@preact/preset-vite";

export default defineConfig({
  plugins: [preact()],
  base: process.env.GITHUB_ACTIONS ? "/sg-last-train-home/" : "/",
  build: {
    target: "es2022",
    sourcemap: true
  }
});
