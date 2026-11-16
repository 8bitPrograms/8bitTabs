# Publishing 8bitTabs

Version 1.3.0 is prepared for the public [8bitPrograms/8bitTabs repository](https://github.com/8bitPrograms/8bitTabs). The repository's existing GNU GPL v3.0 license is preserved. Chrome Web Store submission is performed separately by the publisher.

## Repository and public URLs

- Homepage and source: https://github.com/8bitPrograms/8bitTabs
- Support: https://github.com/8bitPrograms/8bitTabs/issues
- Privacy policy: https://github.com/8bitPrograms/8bitTabs/blob/main/PRIVACY.md
- Releases: https://github.com/8bitPrograms/8bitTabs/releases

Keep private tab URLs, real user backups, credentials, signing keys, browser profiles and developer account information out of this public repository. Local test results, dependencies and generated ZIPs are ignored. Release packages are built from explicitly listed project files.

## Prepare the upload files

Run `npm run icons`, `npm run test:browser`, `npm run store`, `npm run submission`, then `npm run package`. The browser script uses an isolated test profile. `npm run submission` generates five description text files, individual permission/review text files, a Turkish field-by-field guide, and a local copy-button helper from `store/listing.json`.

- `dist/8bitTabs-1.3.0-chromium.zip`: the Chrome Web Store upload; `manifest.json` is at the root.
- `dist/8bitTabs-1.3.0-source.zip`: matching readable source, tests, documentation and store files.
- `dist/8bitTabs-1.3.0-store-assets.zip`: icon, screenshots, promo images and the form-filling guide.
- `dist/SHA256SUMS.txt`: checksums for all three packages.

Attach these files to the matching GitHub version release. To update the existing store item, upload the 1.3.0 Chromium ZIP through **Upload new package** and submit the update for review.

## Complete the store form

Follow [the Turkish field guide](../store/submission/README.tr.md), or open `store/submission/fill-form.html` locally to copy one field at a time. English remains the default; Turkish, German, French and Spanish descriptions are supplied separately.

Declare **Web history** because URLs, titles and archive timestamps are handled locally. Leave the other data-type boxes unchecked for this version's actual features. Confirm all three data-use certifications. Select **No remote code**. These declarations match the privacy policy and runtime: there are no account services, analytics, content scripts, page-content access, or developer-operated network connections.

Use **Workflow & Planning**, **Free of charge**, **Public**, and **All regions** for the intended release. Leave the optional official verified-domain URL and videos blank. GitHub is the homepage/support host; it is not a domain owned by this publisher. Optional Verified CRX Uploads needs a separate signing-key and recovery process before opting in.

Version 1.3.0 adds disabled-by-default empty/internal tab cleanup. Update the listing description and permission justification from the generated submission guide. It closes those pages without archiving them and retains the existing pinned-tab/window safeguards. No new permission or network access is added.

The publisher completes the account's verified contact email and trader/non-trader declaration. Account-specific details are not stored in this project.

Check the uploaded package, listing and links before sending the item for review. The current automated browser evidence and its limits are recorded in [TEST-REPORT.md](TEST-REPORT.md); do not describe Brave Chromium checks as separate Google Chrome or Edge validation.

## Official references

- [Listing fields, language variants and URLs](https://developer.chrome.com/docs/webstore/cws-dashboard-listing)
- [Image sizes and formats](https://developer.chrome.com/docs/webstore/images)
- [Privacy fields](https://developer.chrome.com/docs/webstore/cws-dashboard-privacy)
- [Local data handling must also be disclosed](https://developer.chrome.com/docs/webstore/program-policies/user-data-faq)
- [Categories](https://developer.chrome.com/docs/webstore/best-practices)
- [Distribution](https://developer.chrome.com/docs/webstore/cws-dashboard-distribution)
- [Optional Verified CRX Uploads](https://developer.chrome.com/docs/webstore/update)
