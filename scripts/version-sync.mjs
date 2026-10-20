#!/usr/bin/env node
import fs from "node:fs";

const manifestPath = new URL("../manifest.json", import.meta.url);
const packagePath = new URL("../package.json", import.meta.url);
const lockPath = new URL("../package-lock.json", import.meta.url);

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

// package-lock.json repeats the root package version in two places.
if (fs.existsSync(lockPath)) {
    const lock = JSON.parse(fs.readFileSync(lockPath, "utf8"));
    const rootPackage = lock.packages?.[""];
    if (lock.version !== manifest.version || (rootPackage && rootPackage.version !== manifest.version)) {
        lock.version = manifest.version;
        if (rootPackage) {
            rootPackage.version = manifest.version;
        }
        fs.writeFileSync(lockPath, `${JSON.stringify(lock, null, 4)}\n`);
        console.log(`Synced package-lock.json version to ${manifest.version}`);
    }
}
