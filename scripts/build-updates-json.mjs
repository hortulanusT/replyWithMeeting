#!/usr/bin/env node
// Generates dist/updates.json, the self-hosted update manifest Thunderbird
// polls via browser_specific_settings.gecko.update_url. The manifest's
// update_url (".../releases/latest/download/updates.json") determines the
// GitHub repository; the entry points at the XPI attached to this version's
// release and includes its SHA-256 hash.
import crypto from "node:crypto";
import fs from "node:fs";
import { fileURLToPath } from "node:url";

const UPDATE_URL_PATTERN = /^https:\/\/github\.com\/([^/]+\/[^/]+)\/releases\/latest\/download\/updates\.json$/;

export function repositoryFromUpdateUrl(updateUrl) {
    const match = String(updateUrl || "").match(UPDATE_URL_PATTERN);
    if (!match) {
        throw new Error(
            `update_url must look like https://github.com/<owner>/<repo>/releases/latest/download/updates.json, got: ${updateUrl}`
        );
    }
    return match[1];
}

export function buildUpdatesManifest(manifest, xpiFileName, xpiSha256) {
    const gecko = manifest.browser_specific_settings?.gecko ?? {};
    if (!gecko.id) {
        throw new Error("manifest.json has no browser_specific_settings.gecko.id");
    }
    const repository = repositoryFromUpdateUrl(gecko.update_url);
    const tag = `v${manifest.version}`;
    const applications = gecko.strict_min_version
        ? { gecko: { strict_min_version: gecko.strict_min_version } }
        : undefined;

    return {
        addons: {
            [gecko.id]: {
                updates: [
                    {
                        version: manifest.version,
                        update_link: `https://github.com/${repository}/releases/download/${tag}/${xpiFileName}`,
                        update_hash: `sha256:${xpiSha256}`,
                        update_info_url: `https://github.com/${repository}/releases/tag/${tag}`,
                        ...(applications ? { applications } : {})
                    }
                ]
            }
        }
    };
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
    const rootDir = new URL("..", import.meta.url);
    const manifest = JSON.parse(fs.readFileSync(new URL("manifest.json", rootDir), "utf8"));
    const xpiFileName = `reply-with-meeting-${manifest.version}.xpi`;
    const xpiPath = new URL(`dist/${xpiFileName}`, rootDir);
    if (!fs.existsSync(xpiPath)) {
        console.error(`Missing ${fileURLToPath(xpiPath)}; run the XPI build first.`);
        process.exit(1);
    }

    const sha256 = crypto.createHash("sha256").update(fs.readFileSync(xpiPath)).digest("hex");
    const updates = buildUpdatesManifest(manifest, xpiFileName, sha256);
    const outPath = new URL("dist/updates.json", rootDir);
    fs.writeFileSync(outPath, `${JSON.stringify(updates, null, 4)}\n`);
    console.log(`Created ${fileURLToPath(outPath)}`);
}
