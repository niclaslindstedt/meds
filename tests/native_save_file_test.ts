// @vitest-environment jsdom
// SPDX-License-Identifier: PolyForm-Noncommercial-1.0.0
// The backup export, both ways it can leave: a browser download on the web,
// and the share sheet inside the phone app — the framework's `save-file`
// contract, whose shell half is `native/src/saveFileBridge.ts`.
//
// Like the auth-session bridge, every failure on this seam is quiet: a name
// that drifts leaves the page downloading into a WebView that cannot follow
// the link, which is exactly the "Export does nothing" this replaced. So the
// shell's names are pinned against the framework's, the injected descriptor is
// RUN against this window, and the round trip goes page → bridge → page with
// only the file system and the share sheet stood in for.

import {
  SAVE_FILE_MESSAGE,
  SAVE_FILE_RESULT_EVENT,
} from "@niclaslindstedt/oss-framework/files";
import { nativeShellCan } from "@niclaslindstedt/oss-framework/pwa";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { backupFileName, backupText, saveBackup } from "../src/app/backup.ts";
import { emptyDoc, type AppData } from "../src/app/types.ts";
import {
  SAVE_FILE_DESCRIPTOR,
  SAVE_FILE_RESULT_EVENT as SHELL_RESULT_EVENT,
  SAVE_FILE_TYPE,
  answerSaveFile,
  bareName,
  isInPageBytesUrl,
  isSaveFileRequest,
  type SaveFileIo,
  type SaveFileRequest,
} from "../native/src/saveFileBridge.ts";

type ShellWindow = Window & {
  __ossShell?: { version: number; capabilities: string[] };
  ReactNativeWebView?: { postMessage: (data: string) => void };
};
const shellWindow = window as ShellWindow;

const DOC: AppData = {
  ...emptyDoc(),
  medications: {
    m1: {
      id: "m1",
      name: "Levothyroxine",
      dose: "50 µg",
      times: ["08:00"],
      asNeeded: false,
      courses: [],
      maxPerDay: null,
      maxRun: null,
      maxRunUnit: "days",
      weekdays: null,
      startDate: "2024-03-01",
      endDate: null,
      updatedAt: "2024-03-01T08:00:00.000Z",
    },
  },
};

/** The file system and the share sheet, recording what they were asked. */
function fakeIo(overrides: Partial<SaveFileIo> = {}) {
  const files = new Map<string, string>();
  const shared: { uri: string; mimeType: string; UTI?: string }[] = [];
  const io: SaveFileIo = {
    cacheDirectory: "file:///cache/",
    deleteAsync: async (uri) => {
      for (const key of [...files.keys()]) {
        if (key.startsWith(uri)) files.delete(key);
      }
    },
    makeDirectoryAsync: async () => {},
    writeBase64Async: async (uri, base64) => {
      files.set(uri, base64);
    },
    isSharingAvailableAsync: async () => true,
    shareAsync: async (uri, options) => {
      shared.push({ uri, mimeType: options.mimeType, UTI: options.UTI });
    },
    ...overrides,
  };
  return { io, files, shared };
}

/** Put this window inside a shell: the descriptor exactly as the wrapper
 *  injects it, and a `ReactNativeWebView` whose messages reach the bridge. */
function enterShell(io: SaveFileIo, posted: SaveFileRequest[] = []) {
  shellWindow.ReactNativeWebView = {
    postMessage: (data: string) => {
      const parsed = JSON.parse(data) as unknown;
      if (!isSaveFileRequest(parsed)) return;
      posted.push(parsed);
      // The wrapper's `injectJavaScript`, which runs the script in the page.
      void answerSaveFile(parsed, (script) => window.eval(script), io);
    },
  };
  window.eval(SAVE_FILE_DESCRIPTOR);
  return posted;
}

function fromBase64(base64: string): string {
  return new TextDecoder().decode(
    Uint8Array.from(atob(base64), (c) => c.charCodeAt(0)),
  );
}

beforeEach(() => {
  // jsdom has no object URLs; a download needs one to point its anchor at.
  URL.createObjectURL = vi.fn(() => "blob:backup");
  URL.revokeObjectURL = vi.fn();
});

afterEach(() => {
  delete shellWindow.__ossShell;
  delete shellWindow.ReactNativeWebView;
  vi.restoreAllMocks();
});

describe("the shell's names", () => {
  it("are the framework's", () => {
    expect(SAVE_FILE_TYPE).toBe(SAVE_FILE_MESSAGE);
    expect(SHELL_RESULT_EVENT).toBe(SAVE_FILE_RESULT_EVENT);
  });

  it("advertise save-file once the descriptor runs, keeping what was there", () => {
    shellWindow.ReactNativeWebView = { postMessage: () => {} };
    expect(nativeShellCan("save-file")).toBe(false);
    shellWindow.__ossShell = { version: 1, capabilities: ["other"] };
    window.eval(SAVE_FILE_DESCRIPTOR);
    window.eval(SAVE_FILE_DESCRIPTOR); // a reload re-runs it
    expect(shellWindow.__ossShell.capabilities).toEqual(["other", "save-file"]);
    expect(nativeShellCan("save-file")).toBe(true);
  });
});

describe("a backup in a browser", () => {
  it("downloads as meds-backup-<day>.json", async () => {
    let clicked: HTMLAnchorElement | null = null;
    vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(function (
      this: HTMLAnchorElement,
    ) {
      clicked = this;
    });
    await expect(saveBackup(DOC)).resolves.toBe("downloaded");
    expect(clicked!.download).toBe(backupFileName());
    expect(clicked!.href).toBe("blob:backup");
  });
});

describe("a backup in the phone app", () => {
  it("goes to the share sheet as the same JSON, and nothing is downloaded", async () => {
    const click = vi.spyOn(HTMLAnchorElement.prototype, "click");
    const { io, files, shared } = fakeIo();
    const posted = enterShell(io);

    await expect(saveBackup(DOC)).resolves.toBe("shared");

    expect(click).not.toHaveBeenCalled();
    expect(posted).toHaveLength(1);
    expect(posted[0]!.filename).toBe(backupFileName());
    expect(posted[0]!.mimeType).toBe("application/json");
    const uri = `file:///cache/exports/${posted[0]!.id.replace(/[^\w-]/g, "_")}/${backupFileName()}`;
    expect(shared).toEqual([
      { uri, mimeType: "application/json", UTI: "public.json" },
    ]);
    expect(fromBase64(files.get(uri)!)).toBe(backupText(DOC));
    expect(JSON.parse(fromBase64(files.get(uri)!))).toMatchObject({
      medications: { m1: { name: "Levothyroxine", dose: "50 µg" } },
    });
  });

  it("keeps only the latest export on disk", async () => {
    const { io, files } = fakeIo();
    enterShell(io);
    await saveBackup(DOC);
    await saveBackup(DOC);
    expect(files.size).toBe(1);
  });

  it("rejects when the sheet cannot open, so Settings can say so", async () => {
    const { io } = fakeIo({ isSharingAvailableAsync: async () => false });
    enterShell(io);
    await expect(saveBackup(DOC)).rejects.toThrow(/not available/);
  });
});

describe("the bridge", () => {
  const request = (patch: Partial<SaveFileRequest> = {}): SaveFileRequest => ({
    type: SAVE_FILE_TYPE,
    version: 1,
    id: "sf-1",
    filename: "backup.json",
    mimeType: "application/json",
    base64: "e30=",
    ...patch,
  });

  it("recognises only its own messages", () => {
    expect(isSaveFileRequest(request())).toBe(true);
    expect(isSaveFileRequest({ ...request(), type: "meds-native/theme" })).toBe(
      false,
    );
    expect(isSaveFileRequest({ ...request(), base64: 1 })).toBe(false);
    expect(isSaveFileRequest(null)).toBe(false);
  });

  it("answers a version it does not know with a failure", async () => {
    const scripts: string[] = [];
    const { io, shared } = fakeIo();
    await answerSaveFile(request({ version: 2 }), (s) => scripts.push(s), io);
    expect(shared).toEqual([]);
    expect(scripts).toHaveLength(1);
    expect(scripts[0]).toContain('"ok":false');
  });

  it("never trusts the name", () => {
    expect(bareName("../../Documents/backup.json")).toBe("backup.json");
    expect(bareName("a\\b\\c.json")).toBe("c.json");
    expect(bareName("..")).toBe("file");
    expect(bareName("dir/")).toBe("file");
  });

  it("refuses blob: and data: navigations, and nothing else", () => {
    expect(isInPageBytesUrl("blob:http://localhost:8765/abc")).toBe(true);
    expect(isInPageBytesUrl("DATA:application/json;base64,e30=")).toBe(true);
    expect(isInPageBytesUrl("http://localhost:8765/")).toBe(false);
    expect(isInPageBytesUrl("https://www.dropbox.com/")).toBe(false);
  });
});
