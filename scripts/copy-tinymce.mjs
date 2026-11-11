import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const src = path.join(root, "node_modules", "tinymce");
const dest = path.join(root, "public", "tinymce");

function copyDir(from, to) {
  fs.mkdirSync(to, { recursive: true });
  for (const entry of fs.readdirSync(from, { withFileTypes: true })) {
    const srcPath = path.join(from, entry.name);
    const destPath = path.join(to, entry.name);
    if (entry.isDirectory()) copyDir(srcPath, destPath);
    else fs.copyFileSync(srcPath, destPath);
  }
}

if (!fs.existsSync(src)) {
  console.warn("[copy-tinymce] tinymce package not found -skip");
  process.exit(0);
}

if (fs.existsSync(dest)) fs.rmSync(dest, { recursive: true, force: true });
copyDir(src, dest);
console.log("[copy-tinymce] copied to public/tinymce");
