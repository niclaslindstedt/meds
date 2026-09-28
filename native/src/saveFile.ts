// SPDX-License-Identifier: PolyForm-Noncommercial-1.0.0
// WHAT THE WRAPPER DOES WITH AN EXPORT FROM THE PAGE.
//
// The page asks (see `saveFileBridge.ts`); this binds that answer to the
// phone: the bytes go to a file in the app's cache (`expo-file-system`) and
// the system share sheet opens on it (`expo-sharing`), where the user saves it
// to Files, sends it, or dismisses it. Both ship with the Expo SDK and need no
// config plugin.

import * as FileSystem from "expo-file-system/legacy";
import * as Sharing from "expo-sharing";

import {
  answerSaveFile as answer,
  type SaveFileIo,
  type SaveFileRequest,
} from "./saveFileBridge";

const io: SaveFileIo = {
  cacheDirectory: FileSystem.cacheDirectory,
  deleteAsync: (uri) => FileSystem.deleteAsync(uri, { idempotent: true }),
  makeDirectoryAsync: (uri) =>
    FileSystem.makeDirectoryAsync(uri, { intermediates: true }),
  writeBase64Async: (uri, base64) =>
    FileSystem.writeAsStringAsync(uri, base64, {
      encoding: FileSystem.EncodingType.Base64,
    }),
  isSharingAvailableAsync: () => Sharing.isAvailableAsync(),
  shareAsync: (uri, options) => Sharing.shareAsync(uri, options),
};

/** Save one export through the share sheet and settle the page's call. */
export function answerSaveFile(
  request: SaveFileRequest,
  inject: (script: string) => void,
): Promise<void> {
  return answer(request, inject, io);
}
