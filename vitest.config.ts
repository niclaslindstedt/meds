import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    // Pure-logic tests over the domain modules (export, search, migrations);
    // no DOM needed. The one file that renders a component opts into jsdom
    // itself (`// @vitest-environment jsdom`). Test files end in
    // `_test`.
    environment: "node",
    include: ["tests/**/*_test.ts"],
  },
});
