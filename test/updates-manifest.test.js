import test from "node:test";
import assert from "node:assert/strict";
import { buildUpdatesManifest, repositoryFromUpdateUrl } from "../scripts/build-updates-json.mjs";

const manifest = {
    version: "1.2.3",
    browser_specific_settings: {
        gecko: {
            id: "addon@example.local",
            strict_min_version: "140.0",
            update_url: "https://github.com/owner/repo/releases/latest/download/updates.json"
        }
    }
};

test("buildUpdatesManifest points at the release asset of this version", () => {
    const result = buildUpdatesManifest(manifest, "addon-1.2.3.xpi", "abc123");
    assert.deepEqual(result, {
        addons: {
            "addon@example.local": {
                updates: [
                    {
                        version: "1.2.3",
                        update_link: "https://github.com/owner/repo/releases/download/v1.2.3/addon-1.2.3.xpi",
                        update_hash: "sha256:abc123",
                        update_info_url: "https://github.com/owner/repo/releases/tag/v1.2.3",
                        applications: { gecko: { strict_min_version: "140.0" } }
                    }
                ]
            }
        }
    });
});

test("buildUpdatesManifest omits applications without strict_min_version", () => {
    const withoutMin = structuredClone(manifest);
    delete withoutMin.browser_specific_settings.gecko.strict_min_version;
    const entry = buildUpdatesManifest(withoutMin, "a.xpi", "00").addons["addon@example.local"].updates[0];
    assert.equal("applications" in entry, false);
});

test("repositoryFromUpdateUrl rejects unexpected update URLs", () => {
    assert.equal(repositoryFromUpdateUrl(manifest.browser_specific_settings.gecko.update_url), "owner/repo");
    assert.throws(() => repositoryFromUpdateUrl("http://github.com/owner/repo/releases/latest/download/updates.json"));
    assert.throws(() => repositoryFromUpdateUrl("https://example.com/updates.json"));
    assert.throws(() => repositoryFromUpdateUrl(undefined));
});
