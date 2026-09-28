import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    // Pure-logic tests over the domain modules (export, search, migrations);
    // no DOM needed. The one file that renders a component opts into jsdom
    // itself (`// @vitest-environment jsdom`). Test files follow the
    // OSS_SPEC §20.2 `_test` suffix.
    environment: "node",
    include: ["tests/**/*_test.ts"],
  },
});
