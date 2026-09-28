// SPDX-License-Identifier: PolyForm-Noncommercial-1.0.0
// THE FRAMEWORK'S `save-file` CONTRACT, THE SHELL'S HALF: exports through the
// share sheet.
//
// A browser export is a download — an anchor clicked at a `blob:` URL — and
// inside a WebView that click goes nowhere. So the page's export (the
// framework's `saveFile`, which is what Settings → Export a backup calls)
// looks for a shell that says it can take a file, and when it finds one posts
// the bytes here instead: `{ type: "oss-framework/save-file", version: 1, id,
// filename, mimeType, base64 }`. The shell writes them to a file in its cache,
// opens the system share sheet on it, and answers with exactly one
// `oss-framework/save-file-result` event carrying `{ id, ok }`.
//
// The contract is the framework's (docs/native-shell.md in oss-framework);
// the names are spelled again here because this tree does not install it, and
// `tests/native_save_file_test.ts` pins them against the framework's own.
//
// **Pure**, like `authSessionBridge.ts`: the file system and the share sheet
// arrive as a parameter (`SaveFileIo`), bound to Expo in `saveFile.ts`, so the
// root test suite can run the whole round trip without an Expo install.
//
// The payload is the user's medication log. It is never logged, only the
// latest export is kept (in the cache directory, which the next export clears
// and the OS may purge), and it goes to nothing but the share sheet.

export const SAVE_FILE_TYPE = "oss-framework/save-file";
export const SAVE_FILE_RESULT_EVENT = "oss-framework/save-file-result";

/** Injected before the page loads, beside the service-worker teardown. It
 *  merges into a descriptor another contract may already have set. */
export const SAVE_FILE_DESCRIPTOR = `(function () {
  var shell = window.__ossShell || { version: 1, capabilities: [] };
  if (shell.capabilities.indexOf("save-file") < 0) shell.capabilities.push("save-file");
  window.__ossShell = shell;
})(); true;`;

export type SaveFileRequest = {
  type: string;
  version: number;
  id: string;
  filename: string;
  mimeType: string;
  base64: string;
};

export function isSaveFileRequest(value: unknown): value is SaveFileRequest {
  const m = value as Partial<SaveFileRequest> | null;
  return (
    typeof m === "object" &&
    m !== null &&
    m.type === SAVE_FILE_TYPE &&
    typeof m.id === "string" &&
    typeof m.filename === "string" &&
    typeof m.mimeType === "string" &&
    typeof m.base64 === "string"
  );
}

/** iOS picks share targets by UTI, not MIME type. Extend as exports need; a
 *  backup is the only export this app has. */
const UTI: Record<string, string> = {
  "application/json": "public.json",
  "text/plain": "public.plain-text",
};

/** The name to write under: the last path component, whatever the page sent,
 *  and `file` when that leaves nothing usable. */
export function bareName(name: string): string {
  const last = name.split(/[\\/]/).pop()?.trim() ?? "";
  return last === "" || last === "." || last === ".." ? "file" : last;
}

/** The script that settles the page's promise. */
export function saveFileResultScript(
  id: string,
  ok: boolean,
  error?: string,
): string {
  const detail = ok ? { id, ok } : { id, ok, error };
  return `window.dispatchEvent(new CustomEvent(${JSON.stringify(
    SAVE_FILE_RESULT_EVENT,
  )}, { detail: ${JSON.stringify(detail)} })); true;`;
}

/** The effects an answer needs — `expo-file-system/legacy` and
 *  `expo-sharing`, in the app (see `saveFile.ts`). */
export type SaveFileIo = {
  cacheDirectory: string | null;
  deleteAsync: (uri: string) => Promise<void>;
  makeDirectoryAsync: (uri: string) => Promise<void>;
  writeBase64Async: (uri: string, base64: string) => Promise<void>;
  isSharingAvailableAsync: () => Promise<boolean>;
  shareAsync: (
    uri: string,
    options: { mimeType: string; UTI?: string; dialogTitle: string },
  ) => Promise<void>;
};

/** Write the bytes to the cache, open the share sheet, answer. Never throws:
 *  every failure is an `ok: false` answer the page can settle on. */
export async function answerSaveFile(
  request: SaveFileRequest,
  inject: (script: string) => void,
  io: SaveFileIo,
): Promise<void> {
  if (request.version !== 1) {
    inject(saveFileResultScript(request.id, false, "Unsupported version."));
    return;
  }
  const name = bareName(request.filename);
  try {
    if (io.cacheDirectory === null) {
      throw new Error("There is no cache directory to write the file to.");
    }
    if (!(await io.isSharingAvailableAsync())) {
      throw new Error("Sharing is not available on this device.");
    }
    // One directory per request, so the file keeps exactly the name the user
    // sees in the sheet. The previous export's directory goes first: it is
    // not deleted when its sheet closes, because an Android target may still
    // be reading it after the chooser has returned.
    const root = `${io.cacheDirectory}exports/`;
    const dir = `${root}${request.id.replace(/[^\w-]/g, "_")}/`;
    const uri = dir + name;
    await io.deleteAsync(root);
    await io.makeDirectoryAsync(dir);
    await io.writeBase64Async(uri, request.base64);
    await io.shareAsync(uri, {
      mimeType: request.mimeType,
      UTI: UTI[request.mimeType],
      dialogTitle: name,
    });
    inject(saveFileResultScript(request.id, true));
  } catch (error) {
    inject(
      saveFileResultScript(
        request.id,
        false,
        error instanceof Error ? error.message : String(error),
      ),
    );
  }
}

/** Whether a navigation is to bytes that only exist inside the WebView — a
 *  `blob:` or `data:` URL a download anchor would have opened. Nothing
 *  outside the page can open one, so the shell refuses it rather than handing
 *  it to the system browser. */
export function isInPageBytesUrl(url: string): boolean {
  return /^(blob|data):/i.test(url);
}
