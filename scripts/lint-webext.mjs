#!/usr/bin/env node
// Runs web-ext lint and fails on any error or warning, except findings that
// are expected for this add-on: web-ext lints against Firefox/AMO rules, so it
// rejects experiment_apis, does not know Thunderbird permissions, forbids
// update_url (only allowed for self-hosted distribution via GitHub releases),
// and reads strict_min_version as a Firefox for Android version.
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const rootDir = fileURLToPath(new URL("..", import.meta.url));

const THUNDERBIRD_PERMISSIONS = new Set([
    "accountsFolders",
    "accountsIdentities",
    "accountsRead",
    "addressBooks",
    "compose",
    "messagesMove",
    "messagesRead",
    "messagesTags",
    "messagesUpdate"
]);

function isExpectedThunderbirdFinding(finding) {
    if (finding.code === "MANIFEST_FIELD_PRIVILEGED" && finding.message.includes("/experiment_apis")) {
        return true;
    }
    if (finding.code === "MANIFEST_UPDATE_URL") {
        return true;
    }
    if (finding.code === "KEY_FIREFOX_ANDROID_UNSUPPORTED_BY_MIN_VERSION") {
        return true;
    }
    if (finding.code === "MANIFEST_PERMISSIONS") {
        const permission = finding.message.match(/Invalid permissions "([^"]+)"/)?.[1];
        return THUNDERBIRD_PERMISSIONS.has(permission);
    }
    return false;
}

const result = spawnSync(
    "npx",
    [
        "--no-install",
        "web-ext",
        "lint",
        "--output",
        "json",
        "--source-dir",
        ".",
        "--ignore-files",
        "node_modules/**",
        "test/**",
        "scripts/**",
        "dist/**",
        "web-ext-artifacts/**",
        "package.json",
        "package-lock.json"
    ],
    { cwd: rootDir, encoding: "utf8", shell: process.platform === "win32" }
);

let report;
try {
    report = JSON.parse(result.stdout);
} catch (_) {
    console.error("web-ext lint did not produce a JSON report.");
    console.error(result.stdout, result.stderr);
    process.exit(1);
}

const findings = [
    ...report.errors.map((finding) => ({ ...finding, type: "error" })),
    ...report.warnings.map((finding) => ({ ...finding, type: "warning" }))
];
const ignored = findings.filter(isExpectedThunderbirdFinding);
const failures = findings.filter((finding) => !isExpectedThunderbirdFinding(finding));

for (const finding of ignored) {
    console.log(`ignored (expected for this add-on) ${finding.code}: ${finding.message}`);
}
for (const finding of report.notices) {
    console.log(`notice ${finding.code}: ${finding.message} ${finding.file ?? ""}`);
}
for (const finding of failures) {
    const location = [finding.file, finding.line].filter(Boolean).join(":");
    console.error(`${finding.type} ${finding.code}: ${finding.message} ${location}`);
}

if (failures.length > 0) {
    console.error(`web-ext lint failed with ${failures.length} finding(s).`);
    process.exit(1);
}
console.log("web-ext lint passed.");
