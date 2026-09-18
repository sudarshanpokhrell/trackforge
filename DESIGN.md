# TrackForge Design System

## Overview

TrackForge is a project management and issue tracking app for small teams: projects, issues grouped by status, members with roles (superadmin, admin, member) and an inbox. The interface is a **dense, dark working surface**. People sit in it all day and scan long issue lists, so the chrome stays quiet and the content carries the page.

The default theme is dark. `{colors.canvas}` is #010102, almost pure black with a faint blue tint. On top of it sits a four-step surface ladder (`{colors.surface-1}` through `{colors.surface-4}`) for cards, group headers, dialogs and menus. Hairline borders run from `{colors.hairline}` (#23252a) up through `{colors.hairline-strong}` and `{colors.hairline-tertiary}`. Near-white text (`{colors.ink}` #f7f8f8) carries titles and body copy, and three dimmer steps of gray handle secondary information.

The single chromatic accent is **Cobalt Blue** `{colors.primary}` (#2f6bff), a saturated, confident blue that looks crisp and trustworthy on the black canvas. It is deliberately *not* a lavender or indigo: a pure, high-chroma blue keeps TrackForge clearly separate from lavender-accented tools. It is reserved for the brand mark, the primary action on a screen, focus rings, links and unread indicators. Buttons use white `{colors.on-primary}` text on cobalt. Cobalt text on dark surfaces uses the lighter tint `{colors.primary-ink}` (#8fb0ff).

Type is **Inter Variable** with tight negative tracking on titles. It runs from -1px at 40px down to -0.05px on body text, with weights between 400 and 600. The monospace stack is used only for issue IDs.

A light theme ships as a secondary option (sidebar footer toggle, stored in `localStorage` under `trackforge-theme`). It uses the same token names and structure with inverted values. Design dark first, then check light.

**Key Characteristics:**
- **Dark by default.** `{colors.canvas}` #010102 is the base of every authenticated screen.
- **One accent.** Cobalt Blue (`{colors.primary}` #2f6bff) marks the single most important action or state on screen.
- **Hierarchy through surfaces, not shadows.** Canvas → surface-1 → surface-2 → surface-3 → surface-4, each step outlined by a 1px hairline.
- **Density over decoration.** Issue rows are about 36px tall, tables are compact and buttons are 32px by default.
- **Negative tracking on titles.** Headline -0.6px at 28px; body -0.05px.
- **Rounded, never bubbly.** 8px controls, 12px cards and dialogs, 16px auth panel. Only badges, tabs and avatars are pill- or circle-shaped.
- No second brand color. No gradients. No glows. No drop shadows on in-page surfaces.

## Colors

All tokens are defined in `web/src/index.css`, under `:root` (light) and `.dark` (dark). Each one is available as a Tailwind color: `bg-surface-2`, `text-ink-subtle`, `border-hairline-strong`, `bg-primary-hover`, `text-primary-ink` and so on. shadcn's semantic names (`background`, `card`, `popover`, `muted`, `accent`, `border`, `input`, `ring`) are aliases onto the same values.

### Brand & Accent
- **Cobalt Blue** ({colors.primary}): #2f6bff. Primary buttons, the TF brand mark, unread dots, the default badge tint.
- **On Primary** ({colors.on-primary}): #ffffff. White text on cobalt fills (about 4.5:1 contrast; always 14px medium or larger).
- **Cobalt Hover** ({colors.primary-hover}): #4a7fff. Hovered primary button.
- **Cobalt Pressed** ({colors.primary-focus}): #2257e0. Pressed (`:active`) primary button.
- **Focus Ring** ({colors.ring}): #5b8cff at 50% opacity. Keyboard focus on every interactive control. It is brighter than the fill so it stays visible on the canvas.
- **Cobalt Ink** ({colors.primary-ink}): #8fb0ff. Links and cobalt-tinted badge text. Full-strength cobalt is too dim for small text on dark surfaces.
- **Brand Secure** ({colors.brand-secure}): #7a8bb0. Muted blue-gray for settings and security surfaces and neutral chart series.

### Surface
- **Canvas** ({colors.canvas}): App background, sidebar background, auth screen background.
- **Surface 1** ({colors.surface-1}): Cards, stat tiles, tables, inputs, issue group headers, the auth panel, the dialog footer.
- **Surface 2** ({colors.surface-2}): Dialogs and dropdown menus (`popover`), hovered buttons, the selected tab pill, secondary badges, table header rows, the active sidebar item.
- **Surface 3** ({colors.surface-3}): Avatar fills, nested lifted elements, the light-theme sidebar active item.
- **Surface 4** ({colors.surface-4}): The deepest lift. Reserved; don't use it for anything that isn't already on surface-3.
- **Hairline** ({colors.hairline}): Default 1px border for cards, tables, rows, dividers and the sidebar edge.
- **Hairline Strong** ({colors.hairline-strong}): Dialog borders, focused input borders, avatar rings, hovered outline buttons.
- **Hairline Tertiary** ({colors.hairline-tertiary}): Borders on elements nested inside surface-2/3.

### Text
- **Ink** ({colors.ink}): Page titles, issue titles, table primary cells, button labels.
- **Ink Muted** ({colors.ink-muted}): Sidebar labels, read inbox items, avatar initials, secondary badge text.
- **Ink Subtle** ({colors.ink-subtle}): Metadata, dates, eyebrow labels, table headers, descriptions, placeholder text.
- **Ink Tertiary** ({colors.ink-tertiary}): Disabled text, issue IDs, project dots, footnotes.

### Semantic
- **Destructive** ({colors.destructive}): #eb5757. Used as a tint (`bg-destructive/10`–`/20` with `text-destructive`) for delete buttons, error messages and "Deactivated" badges. Never used as a solid fill.
- **Success** ({colors.success}): #27a644. Success indicators and the Done status icon.
- **Issue status palette** (`web/src/components/issues/icons.tsx`): the one place other hues are allowed, and only as small 16px icons.
  - Backlog: dashed circle, ink-subtle at 50%.
  - Todo: circle, ink-subtle.
  - In progress: timer, amber-400.
  - Done: check, `{colors.success}` green. It is deliberately not blue, so completed issues never read as primary actions.
  - Cancelled: x, ink-subtle at 60%.
- **Priority icons**: signal-bar glyphs in neutral gray. Urgency is shown by shape, not color.

### Token Table

| Token | Dark | Light |
|---|---|---|
| `{colors.canvas}` | #010102 | #f9f9f9 |
| `{colors.surface-1}` | #0f1011 | #ffffff |
| `{colors.surface-2}` | #141516 | #f3f3f3 |
| `{colors.surface-3}` | #191a1b | #ececec |
| `{colors.surface-4}` | #1f2023 | #e4e4e4 |
| `{colors.hairline}` | #23252a | #e8e8e8 |
| `{colors.hairline-strong}` | #34343a | #d9d9d9 |
| `{colors.hairline-tertiary}` | #3e3e44 | #c8c8c8 |
| `{colors.ink}` | #f7f8f8 | #202020 |
| `{colors.ink-muted}` | #d0d6e0 | #3d3d3d |
| `{colors.ink-subtle}` | #8a8f98 | #6b6b6b |
| `{colors.ink-tertiary}` | #62666d | #9b9b9b |
| `{colors.primary}` | #2f6bff | #1f5ae6 |
| `{colors.on-primary}` | #ffffff | #ffffff |
| `{colors.primary-hover}` | #4a7fff | #1a4bc4 |
| `{colors.primary-focus}` | #2257e0 | #3a72f0 |
| `{colors.primary-ink}` | #8fb0ff | #1f5ae6 |
| `{colors.ring}` | #5b8cff | #3b82f6 |
| `{colors.brand-secure}` | #7a8bb0 | #5d6e94 |
| `{colors.destructive}` | #eb5757 | #d23c3c |
| `{colors.success}` | #27a644 | #1f8a3a |

## Typography

### Font Family

- **Inter Variable** (`@fontsource-variable/inter`, bundled) with font features `cv01` and `ss03`. Fallbacks: `SF Pro Display, -apple-system, system-ui, Segoe UI, Roboto`. Used for everything from page titles to captions.
- **Mono**: `JetBrains Mono, Geist Mono, ui-monospace, SF Mono, Menlo`. Neither named font is bundled, so most machines render the system monospace. Used only for issue IDs.

### Hierarchy

Each token is a Tailwind text utility (`text-headline`, `text-eyebrow`, …) that sets size, line height, tracking and weight together. Don't add `font-bold` or `tracking-*` on top of it.

| Token | Size | Weight | Line Height | Letter Spacing | Use in TrackForge |
|---|---|---|---|---|---|
| `{typography.display-md}` | 40px | 600 | 1.15 | -1.0px | Project name on project overview; stat tile numbers |
| `{typography.headline}` | 28px | 600 | 1.20 | -0.6px | Page titles (Dashboard, Inbox, Members, Profile, Issues); auth screen titles; issue detail title |
| `{typography.card-title}` | 22px | 500 | 1.25 | -0.4px | Dialog titles, empty-state titles |
| `{typography.subhead}` | 20px | 400 | 1.40 | -0.2px | Lead paragraph under a page title (rare) |
| `{typography.body-lg}` | 18px | 400 | 1.50 | -0.1px | Long-form issue descriptions |
| `{typography.body}` | 16px | 400 | 1.50 | -0.05px | Base body, mobile input text |
| `{typography.body-sm}` | 14px | 400 | 1.50 | 0 | **The app default.** Issue rows, table cells, sidebar items, form labels, auth descriptions |
| `{typography.caption}` | 12px | 400 | 1.40 | 0 | Dates, table headers, badge text, timestamps |
| `{typography.eyebrow}` | 13px | 500 | 1.30 | +0.4px | Section labels (Overview, Account, Password), stat tile labels |
| `{typography.button}` | 14px | 500 | 1.20 | 0 | All button labels (`text-sm font-medium`) |
| mono | 14px | 400 | 1.50 | 0 | Issue IDs in the issue row |

`display-lg` (56px) and `display-xl` (80px) exist as tokens but have no use inside the app. Keep them for a future landing or marketing page.

### Principles

- **Negative tracking scales with size.** Titles pull tight, body is almost neutral, and eyebrows go *positive* to read as labels.
- **Weights stay between 400 and 600.** Titles use 600, emphasis and labels 500, body 400. No 700+.
- **One family.** Hierarchy comes from size, weight and ink level, never from a second typeface.
- **Mono is for identifiers.** Issue IDs only; never headings or labels.

## Layout

### Spacing System

- **Base unit**: 4px (Tailwind's default scale).
- **Common steps**: 4 · 8 · 12 · 16 · 24 · 32 · 40px.
- **Main content padding**: 24px (`p-6`) around the routed page.
- **Card padding**: 24px (`--card-spacing`), 16px for `size="sm"` cards.
- **Dialog padding**: 24px; the footer uses 16px vertical and 24px horizontal padding.
- **Auth panel padding**: 32px.
- **Issue row**: 7px vertical, 16px horizontal.
- **Table cells**: 12px vertical, 16px horizontal (header 8px vertical).
- **Button padding**: 14px horizontal at the default 32px height.
- **Input padding**: 12px horizontal.
- **Section gaps**: 24–32px between blocks on a page, 40px between major sections (Profile, Project overview).

### App Shell

- **Sidebar** (`web/src/components/sidebar/`): 16rem wide on `{colors.canvas}` with a hairline right edge. It collapses to 3rem icons. ⌘B / Ctrl+B toggles it.
  - **Header**: TF brand mark and wordmark, with a hairline bottom border.
  - **Main nav**: Inbox, My Issues, and Members (admins only).
  - **Projects**: a collapsible group. Each project expands to Overview and Issues.
  - **Footer**: theme toggle, profile and log out.
- **Main**: fills the remaining width and scrolls on its own.
- **Content widths**: Dashboard `max-w-6xl`; project overview `max-w-5xl`; Profile `max-w-2xl`; issue lists and tables use the full width.
- **Grids**: stat tiles 1 → 2 → 4 columns (`sm:grid-cols-2 lg:grid-cols-4`). The project overview uses a 2/3 + 1/3 split at `md`.

### Whitespace Philosophy

The dark canvas *is* the whitespace. Groups of content separate by lifting onto a surface-1 card or by a hairline divider, not by large empty gaps. Inside lists, density wins: rows separate with hairlines, not margins.

## Elevation & Depth

| Level | Treatment | Use |
|---|---|---|
| 0 (flat) | Canvas, no border | Page background, sidebar, page titles |
| 1 (card) | `{colors.surface-1}` + 1px `{colors.hairline}` + edge highlight | Cards, stat tiles, tables, inbox list, auth panel, inputs |
| 2 (overlay) | `{colors.surface-2}` + 1px `{colors.hairline-strong}` + edge highlight | Dialogs |
| 2 (menu) | `{colors.surface-2}` + `ring-foreground/10` + `shadow-md` | Dropdown menus, select lists, popovers |
| 3 (nested) | `{colors.surface-3}` | Avatars, elements inside overlays |
| Focus | 2px `{colors.ring}` at 50% opacity | Focused input, button, badge |

### Decorative Depth

- **Edge highlight**: lifted surfaces carry `shadow-[inset_0_1px_0_0_var(--edge-highlight)]`, a 1px top edge of white at 4% opacity in dark mode (transparent in light). It gives dark panels a crisp, "machined" feel.
- **Primary buttons and the brand mark** use a stronger inset top highlight (white at 18–25% opacity) so cobalt fills read as lit, not flat.
- **Shadows** are allowed only on floating layers (menus, popovers, toasts) that must separate from arbitrary content below them.
- **No gradients, glows, blurs or background images.**

## Shapes

### Border Radius Scale

| Token | Tailwind | Value | Use |
|---|---|---|---|
| `{rounded.xs}` | `rounded-xs` | 4px | Project color dots, small chips, row checkboxes |
| `{rounded.sm}` | `rounded-sm` | 6px | Inline tags, icon buttons inside rows |
| `{rounded.md}` | `rounded-md` / `rounded-lg` | 8px | Buttons, inputs, selects, textareas, menus, sidebar items, brand mark |
| `{rounded.lg}` | `rounded-xl` | 12px | Cards, stat tiles, tables, inbox list, dialogs |
| `{rounded.xl}` | `rounded-2xl` | 16px | Auth panel |
| `{rounded.xxl}` | `rounded-3xl` | 24px | Reserved for oversized banners |
| `{rounded.pill}` | `rounded-full` / `rounded-4xl` | 9999px | Badges, tab toggles |
| `{rounded.full}` | `rounded-full` | 9999px | Avatars, unread dots |

Note: Tailwind's `rounded-lg` and `rounded-md` both map to 8px here, and `rounded-xl` is 12px. Use the Tailwind names above, not Tailwind's stock values.

### Avatars

TrackForge has no uploaded photos. Avatars are initials on `{colors.surface-3}` with `{colors.ink-muted}` text and a 1px `{colors.hairline-strong}` ring. Sizes: 20px (issue row, assignee menu), 24px (project member list), 32px (members table). Avatars are never cobalt.

## Components

Primitives live in `web/src/components/ui/` (shadcn, base-nova style, on Base UI). Feature components live in `web/src/components/{issues,projects,members,sidebar}/`.

### Buttons (`ui/button.tsx`)

**`default` (primary)**: Cobalt. One per view, for the main action ("New issue", "Sign in", "Create project", "Save").
- `bg-primary text-primary-foreground`, inset top highlight, `hover:bg-primary-hover`, `active:bg-primary-focus`.

**`secondary`**: Charcoal. For secondary actions next to a primary one.
- `bg-surface-1` with a hairline border and edge highlight; hover `bg-surface-2`.

**`outline`**: Card-colored. For standalone neutral actions ("Sign in with Google", toolbar triggers).
- `bg-card` with a hairline border; hover lifts to `bg-surface-2` with `border-hairline-strong`.

**`ghost`**: Text-only. For low-emphasis actions (Back, Mark all as read, Log out, icon buttons).
- Transparent; hover `bg-surface-2`.

**`destructive`**: Tinted red. For Delete and Remove.
- `bg-destructive/10 text-destructive`; hover `/20`. Always confirm first.

**`inverse`**: `bg-foreground text-background`. For rare high-contrast calls to action on a surface that already uses cobalt.

**`link`**: `text-primary-ink`, underline on hover.

**Sizes**: `xs` 24px · `sm` 28px · `default` 32px · `lg` 40px · `icon` 32px (`icon-xs` 24, `icon-sm` 28, `icon-lg` 36). Auth and full-width form submits use 40px (`h-10`).

All buttons: `rounded-lg` (8px), `text-sm font-medium`, a 2px focus ring at `ring/50`, and a 1px press nudge (`translate-y-px`).

### Inputs & Forms (`ui/input.tsx`, `ui/textarea.tsx`, `ui/select.tsx`)

- **Rest**: `bg-card`, 1px `{colors.hairline}` border, `rounded-lg`, 12px horizontal padding, 32px tall (40px in auth and account forms).
- **Focus**: border steps up to `{colors.hairline-strong}`, plus a 2px `{colors.ring}` at 50% opacity. The surface does not change.
- **Invalid**: `aria-invalid` switches the border and ring to destructive. The error message sits below the field in `text-sm text-destructive`.
- **Form-level error**: `rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive` with `role="alert"`, above the submit button.
- **Labels**: `ui/label.tsx`, 14px medium, 8–10px above the field.
- **Password fields**: an eye / eye-off ghost toggle sits inside the right edge of the input.

### Badges (`ui/badge.tsx`)

All badges are 20px tall pills with caption-size text.
- **`default`**: cobalt tint (`bg-primary/15 text-primary-ink ring-1 ring-primary/30`). For unread counts and highlighted states.
- **`secondary`**: `bg-surface-2 text-ink-muted`. For roles (admin, superadmin) and neutral status.
- **`outline`**: hairline border, `text-ink-muted`. For the member role and issue status on the detail page.
- **`destructive`**: red tint. For Deactivated and urgent/high priority on the detail page.

### Cards (`ui/card.tsx`)

- **`card`**: `bg-card`, hairline border, `rounded-xl`, edge highlight, 24px padding (`size="sm"` → 16px). `CardTitle` is 16px medium; `CardFooter` sits on `bg-surface-2/60` above a hairline.
- **`stat-tile`** (Dashboard): a card whose header is an eyebrow label in `text-ink-subtle` with a 16px `text-ink-subtle` icon, and whose body is a `text-display-md` tabular number. Icons are neutral, never color-coded.

### Dialogs (`ui/dialog.tsx`)

- `bg-popover` (surface-2), 1px `{colors.hairline-strong}` border, `rounded-xl`, 24px padding, edge highlight.
- **Title**: `text-card-title`. **Close**: ghost icon button at top-right (16px inset).
- **Footer**: stretches to the dialog edges on `bg-surface-1` with a hairline top border. Actions are right-aligned on desktop and stacked in reverse order on mobile, with the primary action last (rightmost).
- Used for New issue, Create project, Add member, Create member and project settings.

### Menus & Popovers (`ui/dropdown-menu.tsx`, `ui/select.tsx`, `issues/popovers.tsx`)

- `bg-popover`, `rounded-lg`, 4px inner padding, `ring-1 ring-foreground/10`, `shadow-md`.
- Items are 14px with 16px leading icons. The selected item shows a 14px check in `text-muted-foreground` on the right.
- Status, priority and assignee pickers in the issue row open these menus directly on click.

### Navigation — Sidebar (`components/sidebar/`, `ui/sidebar.tsx`)

- **`brand-mark`**: 24px `rounded-md` cobalt square with white "TF" (11px semibold) and an inset top highlight, next to the "TrackForge" wordmark (15px semibold, -0.2px tracking).
- **`nav-item`**: 32px tall, `rounded-md`, 16px icon plus 14px label in `text-sidebar-foreground` (ink-muted). Hover and active use `bg-sidebar-accent` (surface-2) with ink text; active is also `font-medium`. **Active items are never cobalt.**
- **`nav-group-label`**: "Projects", a collapsible trigger with a rotating chevron. A `+` ghost icon button (admins only) opens Create project.
- **`nav-sub-item`**: 28px tall, indented behind a hairline left rule. Used for a project's Overview and Issues.
- **Footer**: theme toggle (ghost icon button), profile and log out.

### Issues (`components/issues/`)

**`issue-tabs`**: pill toggles above the list: Active, Backlog, All issues.
- Rest: `text-muted-foreground`, `rounded-full`, 4px × 14px padding.
- Selected: `bg-surface-2 text-foreground font-medium ring-1 ring-border`.
- Sits above a hairline divider.

**`issue-group-header`**: full-width band on `bg-surface-1` with a hairline bottom border. It contains a collapse chevron, status icon, status label (14px medium), count in `text-muted-foreground`, and a `+` shown on hover.

**`issue-row`**: the core unit of the app, about 36px tall with a `border-b border-border/60` bottom hairline and `hover:bg-surface-1`. Columns left to right:
1. Selection checkbox slot (16px, appears on hover)
2. Priority icon button
3. Issue ID in mono, 14px `text-muted-foreground/60`, 56px wide
4. Status icon button
5. Title, 14px ink, truncated, underlines on hover, links to the issue
6. Optional project tag: 8px `rounded-xs` dot in `bg-ink-tertiary` with the project name as caption text
7. Assignee avatar (20px), or a dashed-border placeholder when unassigned
8. Created date, caption text, right-aligned, 80px wide

**`issue-detail`**: Back (ghost) and Delete (destructive) on one line, then a `text-headline` title, then Status and Priority as badges.

### Projects (`routes/_authed/projects/`)

- **`project-header`**: a 48px `rounded-xl` card tile with a 24px `FolderKanban` icon in `text-ink-subtle`, a `text-display-md` project name, and an optional 15px description in `text-muted-foreground` (max width 2xl). The settings menu (admins) sits top-right.
- **`section`**: a 14px medium heading with a hairline bottom border and 12px spacing between rows.
- **`detail-row`**: a 96px label column (icon + label in `text-muted-foreground`) and the value in ink. Unset values read "Not set" in muted text.
- **`member-list`**: 24px avatar + name. Deactivated members are struck through and muted, with a destructive badge. The remove (`×`) button appears on row hover for admins.

### Tables (`routes/_authed/members.tsx`)

- **Container**: `rounded-xl border bg-card` with edge highlight; scrolls horizontally when needed.
- **Header**: `bg-surface-2/60`, caption text in `text-ink-subtle`, medium weight, left-aligned.
- **Rows**: separated with `divide-y` hairlines, 12px × 16px cells.
  - The primary cell stacks a 32px avatar, the name (medium, ink) and the email (caption, muted).
  - Inactive rows drop to `text-muted-foreground`.
- **Loading**: three rows of 32px skeletons. **Empty**: a centered muted message, 40px vertical padding.

### Inbox (`routes/_authed/inbox.tsx`)

- **List container**: `rounded-xl border bg-card` with edge highlight.
- **Rows**: 12px × 16px padding, hairline dividers, `hover:bg-surface-2`.
- **Unread**: an 8px cobalt dot with ink text. **Read**: no dot, `text-ink-muted`.
- **Row trailing icon**: 16px `text-muted-foreground` for the event type.
- **Page header**: `text-headline` title with a cobalt-tint unread count badge, and a ghost "Mark all as read" action on the right.

### Auth Screens (`login-form.tsx`, `setup-form.tsx`, `routes/change-password.tsx`)

- Centered on the canvas with 16px outer padding.
- **`auth-panel`**: 400px max width, `rounded-2xl`, `bg-card`, hairline border, edge highlight, 32px padding.
- **Header**: a 40px `rounded-lg` cobalt TF brand mark, a `text-headline` title and a `text-body-sm text-ink-subtle` description, all centered.
- **Body**: 40px-tall fields and a full-width 40px primary submit with a trailing arrow icon (spinner while submitting).
- **Secondary actions**: an outline "Sign in with Google" button above an "or sign in with email" divider; a ghost "Log out" on change-password.

### Profile (`routes/_authed/profile.tsx`)

- 672px (`max-w-2xl`) column, `text-headline` title, sections separated by eyebrow headings with a hairline bottom border.
- The account section is a two-column definition list: 128px label column in muted text, values in ink, role shown as a secondary badge.

### Feedback

- **Toasts** (`sonner`): top-right, close button, theme follows the app theme. Short, past-tense copy ("Profile updated.", "Password changed.").
- **Skeletons**: `bg-muted` (surface-2) with `animate-pulse`, `rounded-md`, sized to match the content they replace.
- **Empty states**: centered; a 32px icon on a `rounded-xl` card tile, a `text-card-title` heading and a 14px muted description no wider than 384px (`max-w-sm`).
- **Tooltips**: inverted, `bg-foreground text-background`, caption size. Used on collapsed sidebar icons.

## Do's and Don'ts

### Do

- Build on the canvas and surface ladder. Decide which surface a new block sits on before styling anything else.
- Use design tokens (`bg-surface-1`, `text-ink-subtle`, `border-hairline-strong`) instead of raw Tailwind palette colors (`bg-zinc-900`, `text-gray-500`).
- Keep one cobalt primary button per view; everything else is secondary, outline or ghost.
- Use `{colors.primary-ink}` for cobalt text on dark surfaces.
- Separate list items with hairlines and keep rows dense.
- Use the typography utilities (`text-headline`, `text-eyebrow`, `text-card-title`) as-is for titles and labels.
- Give every interactive element the 2px `ring/50` focus ring.
- Check every new screen in light mode after designing it in dark.

### Don't

- Don't use cobalt as a card, row, section or sidebar-active background. Cobalt tints (`bg-primary/15`) are for badges only.
- Don't set small text in full-strength `{colors.primary}` on dark surfaces.
- Don't make avatars, project dots, stat icons or decorative icons cobalt or rainbow-colored. They stay on the neutral ink and surface scale.
- Don't introduce a second accent color. Status icons are the only exception, and only as 16px glyphs.
- Don't use gradients, neon blue glows, blue-to-purple gradients, blur backdrops or drop shadows on in-page surfaces.
- Don't use solid red fills. Destructive is always a tint.
- Don't use `#000000` as the canvas, or pure white as dark-mode text; use `{colors.ink}` #f7f8f8.
- Don't pill-round buttons or inputs. Pills are for badges and tab toggles.
- Don't go above weight 600 or add positive tracking to titles.

## Responsive Behavior

### Breakpoints

| Name | Width | Key Changes |
|---|---|---|
| Desktop | ≥ 1024px (`lg`) | Stat tiles 4-up; sidebar expanded |
| Tablet | 768–1023px (`md`) | Stat tiles 2-up; project overview keeps its 2/3 + 1/3 split |
| Mobile | < 768px | Sidebar becomes an 18rem off-canvas sheet; project overview stacks to one column; dialog footers stack |
| Small | < 640px (`sm`) | Stat tiles 1-up; dialogs span full width minus a 16px gutter |

### Touch Targets

- Buttons are 32px by default. Primary form submits and auth fields are 40px.
- Inputs use 16px text below `md`, which stops iOS from zooming on focus, and 14px above.
- Hover-only controls (the row checkbox, group `+`, member remove) must also be reachable by keyboard focus.

### Collapsing Strategy

- **Sidebar**: expanded (16rem) → icon rail (3rem, with tooltips) → mobile sheet below 768px.
- **Issue row**: the title truncates first. The project tag and date columns are the first to drop if space is tight.
- **Tables**: scroll horizontally inside their rounded container rather than reflowing.
- **Titles**: `text-display-md` project names may step down to `text-headline` below `sm`.

## Iteration Guide

1. Tokens live in `web/src/index.css`. Add or change a color in **both** `:root` and `.dark`, then expose it in `@theme inline` as `--color-*`.
2. Change a primitive in `web/src/components/ui/` only when the change should apply everywhere. Otherwise pass `className` at the call site.
3. For a new screen: pick the surface, set the page title with `text-headline`, choose the single primary action, then lay out content with hairline separators.
4. Reuse existing patterns (issue row, auth panel, stat tile, table container, empty state) before inventing new ones.
5. Treat cobalt as scarce: brand mark, primary action, focus, links, unread.
6. Verify with `bun run build` in `web/`, and check the screen in both themes.
7. Update this document when a new reusable component or token is added.

## Known Gaps

- **Issue status colors**: In progress (amber-400) is still a raw Tailwind color rather than a token. Never change a status to blue, or it will read as the primary accent.
- **Priority** is neutral gray for every level. Urgent may need a destructive tint once priority triage becomes a core flow.
- **Issue labels** (`ALL_LABELS` in `issues/types.ts`) use raw red, blue, emerald and purple placeholders and are not yet tokenized. The blue label will clash with cobalt when labels ship.
- **Dashboard and Inbox** still render placeholder data; their components are specified here but not wired to the API.
- **Mono font** is not bundled, so issue IDs render in the platform monospace.
- **Form validation** styles exist for fields but there is no documented success or inline-help pattern yet.
- **No marketing or landing page** exists; the `display-lg` and `display-xl` tokens are reserved for one.
