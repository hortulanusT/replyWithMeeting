#!/usr/bin/env node
import fs from "node:fs";

const manifestPath = new URL("../manifest.json", import.meta.url);
const packagePath = new URL("../package.json", import.meta.url);

const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
const pkg = JSON.parse(fs.readFileSync(packagePath, "utf8"));

if (!manifest.version) {
    console.error("manifest.json has no version field");
    process.exit(1);
}

if (pkg.version !== manifest.version) {
    pkg.version = manifest.version;
    fs.writeFileSync(packagePath, `${JSON.stringify(pkg, null, 4)}\n`);
    console.log(`Synced package.json version to ${manifest.version}`);
} else {
    console.log(`Version already synced (${manifest.version})`);
}
