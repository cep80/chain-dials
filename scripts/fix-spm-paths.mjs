// `npx cap sync` on Windows writes CapApp-SPM/Package.swift with backslash
// paths ("..\..\..\node_modules\@capacitor\app"), which Swift rejects as
// invalid escape sequences, so the iOS app no longer builds on a Mac.
// Run after every sync; it is a no-op when the paths are already POSIX.
import { readFileSync, writeFileSync, existsSync } from "node:fs";

const file = "ios/App/CapApp-SPM/Package.swift";
if (existsSync(file)) {
  const src = readFileSync(file, "utf8");
  const out = src.replace(/path: "([^"]*)"/g, (_, p) => `path: "${p.replaceAll("\\", "/")}"`);
  if (out !== src) {
    writeFileSync(file, out);
    console.log(`fix-spm-paths: normalised paths in ${file}`);
  }
}
