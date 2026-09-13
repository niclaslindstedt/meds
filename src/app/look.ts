// SPDX-License-Identifier: PolyForm-Noncommercial-1.0.0
import {
  DEFAULT_THEME_APPEARANCE,
  type ThemeAppearance,
} from "@niclaslindstedt/oss-framework/theme";

import type { ThemeChoice } from "./useAppSettings.ts";

// The app's look. The framework ships a dozen palettes and a full appearance
// picker; this app exposes exactly two — one light, one dark — plus "follow
// the device". A logbook that gets fifteen seconds of attention a day earns
// nothing from a theme gallery, and every extra palette is another surface to
// keep legible.
//
// Everything else (font family, scale, density, elevation) stays at the
// framework defaults, except three: the sans font, because the screens are
// prose and numbers rather than code; the corner radius; and how a modal
// separates itself from the screen it opened over.
//
// The radius is the framework's largest preset. It is projected onto
// `--radius-sm` / `--radius-md` / `--radius-lg` on <html> at paint time, which
// is what every `rounded-*` utility in this app *and* in the framework's own
// components resolves against — so one line here rounds the buttons, the
// cards, the modals and the segmented controls together, and nothing can drift
// apart later by being styled one corner at a time. The two ends of the scale
// the engine does not write (`rounded` and `rounded-xl` upwards) are matched to
// it in `styles.css`, so the ramp stays in order.
//
// The backdrop is the other one. This app is dark cards on a dark page, and
// at the framework's default — a flat half-black scrim, no blur — the
// quick-log sheet's own surface sat on a dimmed copy of the same greys and
// read as one more panel on the page rather than as a layer above it: the
// checklist behind it stayed legible enough to compete with the list you had
// just asked for. Blur is what fixes that and dimming alone is not — content
// that is out of focus reads as *behind* at a glance, at any contrast — and
// the darker scrim is what keeps the blurred page from showing through the
// sheet's edges.
//
// Set here rather than as a `--modal-backdrop-*` rule in `styles.css`,
// because the theme engine writes both onto <html> as inline styles at paint
// time and an inline style beats any stylesheet rule. Same reason the radius
// is set here: these are the engine's to write, so this is the one place a
// change to them can actually take.

/** The framework preset behind each of the three choices. */
const PRESET = {
  light: "githubLight",
  dark: "githubDark",
  system: "system",
} as const;

/** Project the user's theme choice onto the framework's appearance shape. */
export function appearanceFor(choice: ThemeChoice): ThemeAppearance {
  return {
    ...DEFAULT_THEME_APPEARANCE,
    theme: PRESET[choice],
    fontFamily: "sans",
    ui: {
      ...DEFAULT_THEME_APPEARANCE.ui,
      radius: "lg",
      backdropBlur: "strong",
      backdropDarkness: "dark",
    },
  };
}

/** The look the app boots in before the persisted settings have been read —
 *  the same "follow the device" default `DEFAULT_SETTINGS` carries, so the
 *  first paint never flashes the wrong side. */
export const APP_LOOK: ThemeAppearance = appearanceFor("system");
