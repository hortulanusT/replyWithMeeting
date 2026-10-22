#!/usr/bin/env node
import fs from "node:fs";

const manifestPath = new URL("../manifest.json", import.meta.url);
const packagePath = new URL("../package.json", import.meta.url);
const lockPath = new URL("../package-lock.json", import.meta.url);

const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
const pkg = JSON.parse(fs.readFileSync(packagePath, "utf8"));

if (!manifest.version || !pkg.version) {
    console.error("Both manifest.json and package.json must contain a version field");
    process.exit(1);
}

const mismatches = [];
if (pkg.version !== manifest.version) {
    mismatches.push(`package.json=${pkg.version}`);
}

if (fs.existsSync(lockPath)) {
    const lock = JSON.parse(fs.readFileSync(lockPath, "utf8"));
    if (lock.version !== manifest.version) {
        mismatches.push(`package-lock.json=${lock.version}`);
    }
    const rootVersion = lock.packages?.[""]?.version;
    if (rootVersion !== undefined && rootVersion !== manifest.version) {
        mismatches.push(`package-lock.json packages[""]=${rootVersion}`);
    }
}

if (mismatches.length > 0) {
    console.error(
        `Version mismatch: manifest.json=${manifest.version}, ${mismatches.join(", ")}. Run: npm run version:sync`
    );
    process.exit(1);
}

console.log(`Version check passed (${manifest.version})`);
