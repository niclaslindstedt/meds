// SPDX-License-Identifier: PolyForm-Noncommercial-1.0.0
// Export and restore. A backup is exactly the document the app stores — no
// wrapper, no proprietary container — so a file taken out of here can be read
// with any text editor and put back with the same code path a cloud pull
// uses.
//
// The framework owns the saving (`saveFile`): a download in a browser, the
// share sheet inside the phone app, which advertises that it can take a file
// (see the framework's docs/native-shell.md). This module owns the file name
// and the validation on the way back in.

import {
  MIME_JSON,
  saveFile,
  type SaveFileOutcome,
} from "@niclaslindstedt/oss-framework/files";
import { dayKeyOf } from "@niclaslindstedt/oss-framework/calendar";

import { normalizeDoc, serializeDoc } from "./migrations.ts";
import type { AppData } from "./types.ts";

/** The exported file's name — dated so a folder of backups sorts itself. */
export function backupFileName(today = dayKeyOf(new Date())): string {
  return `meds-backup-${today}.json`;
}

/** The backup's contents. Pretty-printed rather than the compact storage
 *  form: a backup is a file a person may well open, and the extra bytes are
 *  irrelevant at this size. */
export function backupText(data: AppData): string {
  return JSON.stringify(JSON.parse(serializeDoc(data)), null, 2);
}

/** Save the whole document to a file the user picks a home for. Rejects when
 *  the phone app reports it could not hand the file to the share sheet. */
export function saveBackup(data: AppData): Promise<SaveFileOutcome> {
  return saveFile({
    text: backupText(data),
    filename: backupFileName(),
    mimeType: MIME_JSON,
  });
}

/**
 * Read a picked file as a document. Throws when the bytes aren't JSON at all;
 * a *shape* problem is not an error — `normalizeDoc` drops what it can't read
 * and keeps every medication and tap it can, which is the right outcome for a
 * restore.
 */
export async function readBackupFile(file: File): Promise<AppData> {
  const text = await file.text();
  return normalizeDoc(JSON.parse(text) as unknown);
}
