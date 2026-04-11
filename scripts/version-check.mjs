#!/usr/bin/env node
import fs from "node:fs";

const manifestPath = new URL("../manifest.json", import.meta.url);
const packagePath = new URL("../package.json", import.meta.url);

const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
const pkg = JSON.parse(fs.readFileSync(packagePath, "utf8"));

if (!manifest.version || !pkg.version) {
    console.error("Both manifest.json and package.json must contain a version field");
    process.exit(1);
}

if (manifest.version !== pkg.version) {
    console.error(
        `Version mismatch: manifest.json=${manifest.version}, package.json=${pkg.version}. Run: npm run version:sync`
    );
    process.exit(1);
}

console.log(`Version check passed (${manifest.version})`);
