// SPDX-License-Identifier: PolyForm-Noncommercial-1.0.0
import { useState } from "react";

import type { WeekStart } from "@niclaslindstedt/oss-framework/calendar";
import {
  Button,
  ConfirmDialog,
  SegmentedControl,
  Section,
  ToggleRow,
  CogIcon,
  DatabaseIcon,
  CloudIcon,
  InfoIcon,
  PaletteIcon,
  ScrollTextIcon,
} from "@niclaslindstedt/oss-framework/components";
import { LogViewer } from "@niclaslindstedt/oss-framework/logging";

import { logStore } from "./log.ts";
import { downloadBackup, readBackupFile } from "./backup.ts";
import type { DemoDataToggle } from "./dev/useDemoData.ts";
import { useT } from "./i18n/index.ts";
import { mergeDocs } from "./merge.ts";
import { serializeDoc } from "./migrations.ts";
import { emptyDoc } from "./types.ts";
import type { AppSettings, ThemeChoice } from "./useAppSettings.ts";
import type { DocStore } from "./useDocStore.ts";
import {
  AVAILABLE_BACKENDS,
  PROVIDER_NAMES,
  type SyncBackendId,
  type SyncEngine,
} from "./useSyncEngine.ts";

// One scrolling page rather than the tabbed dialog the sibling apps use: this
// app has a handful of settings groups, and paging between tabs to find one
// toggle costs more than scrolling past it.
//
// The screen owns no state of its own beyond the confirm dialog — every knob
// reads and writes the caller's settings store, so what is on screen is
// always what is persisted.

type Props = {
  settings: AppSettings;
  update: <K extends keyof AppSettings>(key: K, value: AppSettings[K]) => void;
  store: DocStore;
  sync: SyncEngine;
  /** The in-memory demo-data takeover. Not part of `settings` on purpose: it
   *  is never persisted, so a reload always lands back on the real document. */
  demoData: DemoDataToggle;
  onNotice: (message: string) => void;
};

export function SettingsScreen({
  settings,
  update,
  store,
  sync,
  demoData,
  onNotice,
}: Props) {
  const t = useT();
  const [confirmClear, setConfirmClear] = useState(false);
  const [busy, setBusy] = useState(false);

  const importBackup = async (file: File) => {
    try {
      const doc = await readBackupFile(file);
      // The same merge the cloud path uses — a restore adds to what is here
      // rather than replacing it, so restoring an old backup onto a live
      // phone can't silently drop this month.
      store.replaceAll(mergeDocs(store.data, doc));
      onNotice(t("settings.imported"));
    } catch {
      onNotice(t("settings.importFailed"));
    }
  };

  return (
    <div className="flex flex-col gap-3 px-3 py-3">
      <Section
        title={t("settings.appearance")}
        icon={<PaletteIcon className="h-3.5 w-3.5" />}
      >
        <SegmentedControl<ThemeChoice>
          value={settings.theme}
          options={[
            { value: "light", label: t("settings.themeLight") },
            { value: "dark", label: t("settings.themeDark") },
            { value: "system", label: t("settings.themeSystem") },
          ]}
          onChange={(theme) => update("theme", theme)}
          ariaLabel={t("settings.theme")}
          fullWidth
        />
      </Section>

      <Section
        title={t("settings.calendar")}
        icon={<CogIcon className="h-3.5 w-3.5" />}
      >
        <Labelled label={t("settings.weekStart")}>
          <SegmentedControl
            value={String(settings.weekStartsOn)}
            options={[
              { value: "1", label: t("settings.monday") },
              { value: "0", label: t("settings.sunday") },
            ]}
            onChange={(next) =>
              update("weekStartsOn", Number(next) as WeekStart)
            }
            ariaLabel={t("settings.weekStart")}
            fullWidth
          />
        </Labelled>
        <p className="text-xs text-muted">{t("settings.weekStartHint")}</p>
      </Section>

      <Section
        title={t("settings.sync")}
        icon={<CloudIcon className="h-3.5 w-3.5" />}
      >
        <p className="text-xs text-muted">{t("settings.syncHint")}</p>
        <SegmentedControl<SyncBackendId>
          value={sync.backend}
          options={AVAILABLE_BACKENDS.map((id) => ({
            value: id,
            label: PROVIDER_NAMES[id],
          }))}
          onChange={(next) => {
            if (next === sync.backend) return;
            if (next === "local") {
              sync.disconnect();
              return;
            }
            setBusy(true);
            void sync
              .connect(next)
              .catch((err: unknown) =>
                onNotice(err instanceof Error ? err.message : String(err)),
              )
              .finally(() => setBusy(false));
          }}
          ariaLabel={t("settings.backend")}
          fullWidth
        />
        <p className="text-xs text-muted">
          {sync.connected
            ? t("settings.connected", { name: sync.providerName })
            : t("settings.localOnly")}
          {" · "}
          {sync.location.path}
        </p>
        {sync.connected && (
          <div className="flex gap-2">
            <Button onClick={sync.saveNow} disabled={busy || !sync.dirty}>
              {t("settings.saveNow")}
            </Button>
            <Button onClick={() => void sync.reload()} disabled={busy}>
              {t("settings.reload")}
            </Button>
            <Button variant="danger" onClick={sync.disconnect}>
              {t("settings.disconnect")}
            </Button>
          </div>
        )}
      </Section>

      <Section
        title={t("settings.data")}
        icon={<DatabaseIcon className="h-3.5 w-3.5" />}
      >
        <div className="flex flex-col gap-1">
          <Button onClick={() => downloadBackup(store.data)}>
            {t("settings.export")}
          </Button>
          <p className="text-xs text-muted">{t("settings.exportHint")}</p>
        </div>
        <div className="flex flex-col gap-1">
          <label className="inline-flex">
            {/* A styled `<input type="file">`: the visually hidden input keeps
                the native picker (and its keyboard behaviour) while the label
                supplies the framework button look. */}
            <input
              type="file"
              accept="application/json,.json"
              className="sr-only"
              onChange={(e) => {
                const input = e.target as HTMLInputElement;
                const file = input.files?.[0];
                if (file) void importBackup(file);
                // Clear the value so re-picking the same file fires again.
                input.value = "";
              }}
            />
            <span className="cursor-pointer rounded-md border border-line px-3 py-1.5 text-sm text-fg hover:bg-surface-2">
              {t("settings.import")}
            </span>
          </label>
          <p className="text-xs text-muted">{t("settings.importHint")}</p>
        </div>
        <div className="flex flex-col gap-1">
          <Button variant="danger" onClick={() => setConfirmClear(true)}>
            {t("settings.deleteAll")}
          </Button>
          <p className="text-xs text-muted">{t("settings.deleteAllHint")}</p>
        </div>
      </Section>

      <Section
        title={t("settings.developer")}
        icon={<ScrollTextIcon className="h-3.5 w-3.5" />}
      >
        <ToggleRow
          label={t("settings.devMode")}
          hint={t("settings.devModeHint")}
          checked={settings.devMode}
          onChange={(next) => {
            update("devMode", next);
            // Everything below is only reachable while developer mode is on,
            // so leaving demo data running as the switch that reveals it goes
            // off would strand the app on a document with no way back short
            // of a reload.
            if (!next && demoData.on) demoData.setOn(false);
          }}
        />
        {settings.devMode && (
          <>
            <ToggleRow
              label={t("settings.demoData")}
              hint={t("settings.demoDataHint")}
              checked={demoData.on}
              onChange={(next) => {
                demoData.setOn(next);
                onNotice(
                  next ? t("settings.demoDataOn") : t("settings.demoDataOff"),
                );
              }}
            />
            <ToggleRow
              label={t("settings.captureLogs")}
              hint={t("settings.captureLogsHint")}
              checked={settings.captureLogs}
              onChange={(next) => {
                update("captureLogs", next);
                logStore.setCaptureEnabled(next);
              }}
            />
            <p className="text-xs text-muted">
              {t("settings.documentSize")}:{" "}
              {serializeDoc(store.data).length.toLocaleString()} bytes
            </p>
            {/* The viewer draws its own rows edge to edge — it is built to
                sit in a modal that supplies the inset. In a settings card it
                has to bring one, or the filter row and every log line print
                against the border. */}
            <div className="max-h-64 overflow-auto rounded-md border border-line p-2">
              <LogViewer store={logStore} />
            </div>
          </>
        )}
      </Section>

      <Section
        title={t("settings.about")}
        icon={<InfoIcon className="h-3.5 w-3.5" />}
      >
        <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-sm">
          <dt className="text-muted">{t("settings.version")}</dt>
          <dd className="text-fg">{__APP_VERSION__}</dd>
          <dt className="text-muted">{t("settings.build")}</dt>
          <dd className="text-fg">{__BUILD_LABEL__}</dd>
        </dl>
        <p className="text-xs leading-snug text-muted">
          {t("settings.privacy")}
        </p>
        <p className="text-xs leading-snug text-muted">
          {t("settings.disclaimer")}
        </p>
      </Section>

      <ConfirmDialog
        open={confirmClear}
        title={t("settings.deleteAllConfirm")}
        description={t("settings.deleteAllHint")}
        confirmLabel={t("common.delete")}
        tone="danger"
        labels={{ cancel: t("common.cancel"), close: t("common.close") }}
        onConfirm={() => {
          store.replaceAll(emptyDoc());
          setConfirmClear(false);
          onNotice(t("settings.deleted"));
        }}
        onCancel={() => setConfirmClear(false)}
      />
    </div>
  );
}

/** A label above a control, matching the spacing the framework's own labelled
 *  inputs use so a segmented control sits in the same rhythm as a text
 *  field. */
function Labelled({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1">
      <span className="text-xs font-medium text-fg">{label}</span>
      {children}
    </div>
  );
}
