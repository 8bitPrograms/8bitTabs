# 8bitTabs privacy policy

Version 1.2.1 · 13 November 2026

[Türkçe](PRIVACY.tr.md)

8bitTabs archives browser tabs into searchable sessions on your device. It has no developer-operated server, account system, analytics service, advertising service, or cloud synchronization.

## Data handled

When you choose to archive tabs, the extension reads their URLs, titles, window/tab order, pin state, and mute state. It stores these records in IndexedDB in the current browser profile, together with session timestamps, names, notes, folders, favorites, Trash state, and your appearance/language/archiving preferences.

The extension reads a backup or OneTab text file only when you choose that file for import. It creates a local JSON download only when you request an export.

There are no content scripts. The extension does not read page content, form fields, passwords, cookies, authentication sessions, file contents behind archived file URLs, or the browser's browsing-history database. Private windows are not supported or archived.

An archived URL itself can contain personal information, credentials, or access tokens in its address or query parameters. Session titles, folders, and notes can also contain information you enter. Consider this before sharing a backup.

## Use and sharing

The data is used only to provide the visible archiving, search, organization, restore, and backup features you request. Archiving starts when you click the extension icon or the archive button. There is no scheduled collection or automatic archiving.

8bitTabs does not transmit archived data to the developer or third parties, sell it, use it for advertising, or make it available for human review. All translations and icons are packaged with the extension. There are no external favicon requests or remotely executed files. The extension's content security policy blocks its own network connections.

If you choose to restore a URL, that page opens in your browser and can make its normal network requests. Other websites and the browser have their own privacy practices.

8bitTabs uses browsing information only for its visible tab archiving and restoring features. Its handling of that information follows the Chrome Web Store User Data Policy, including the Limited Use requirements.

## Storage, retention, and deletion

8bitTabs does not encrypt its local database or JSON backups. Anyone with access to the browser profile, device, or exported backup may be able to read that data. Store backups somewhere appropriate for their contents.

Sessions remain until you delete them. Trash has no automatic expiration. Permanent deletion requires confirmation. Deleting records in the extension does not delete previously downloaded backups. JSON exports include Trash and folders, but exclude settings.

You can edit or delete sessions through the archive interface, permanently remove them from Trash, or remove the extension. Uninstalling the extension, deleting its browser profile, or losing/ corrupting the device can remove the local archive. Export a backup before uninstalling or changing installations.

The `unlimitedStorage` permission avoids the normal storage quota and eviction limits; it does not provide cloud backup, encryption, or protection from disk failure. Imports have a 25 MB and 100,000-tab limit per file.

## Changes and contact

This policy describes the source code distributed in version 1.2.1. A future release that changes data handling must update this policy and its store declarations. The project is distributed under the [GNU General Public License v3.0](LICENSE).

8bitTabs is maintained by 8bitPrograms. The public source is available at [8bitPrograms/8bitTabs](https://github.com/8bitPrograms/8bitTabs). For support or questions about this policy, use the [project issue tracker](https://github.com/8bitPrograms/8bitTabs/issues). Do not include private URLs, credentials, or backups containing personal data in public issues.
