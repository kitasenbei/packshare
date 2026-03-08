# PackShare UI Design System

## Buttons

### Hierarchy

| Level | MUI Props | When to use |
|-------|-----------|-------------|
| **Primary** | `variant="contained"` | Actions that create, submit, or confirm: "Create Pack", "New Tournament", "Generate Bracket", "Save", "Import". Can appear multiple times if each triggers a distinct creation/submission. |
| **Secondary** | `variant="outlined"` | Actions that navigate away, open external links, or support a primary in the same group: "Cancel", "Export", "View Profile", "Sign In", "Open public page". |
| **Ghost** | `variant="text"` | Utility and low-emphasis actions: "Share" (copy link), "Deselect", "Clear", "Show more". Actions that don't create, navigate, or destroy — they just do something small in place. |
| **Destructive** | `color="error"` | Delete, remove, revoke. Use `variant="text"` for the initial trigger ("Delete"), `variant="contained"` for the final confirmation ("Confirm Delete", "Yes, delete permanently"). Never outlined — it either whispers (text) or shouts (contained). |
| **Success** | `color="success"` | Download actions (DownloadButton). Always `variant="text"` for inline use. |
| **Icon** | `<IconButton size="small">` + `<Tooltip>` | Compact utility actions: dark mode toggle, copy, edit, close, reorder. Always wrap in Tooltip for accessibility. |

### Rules

- **Contained = creates or confirms.** If clicking it produces something new or saves state, it's contained.
- **Outlined = navigates or supports.** If clicking it goes somewhere else, opens an external link, or is the "other option" next to a contained button, it's outlined.
- **No hardcoded colors on buttons.** Use theme tokens: `primary.main`, `error.main`, `success.main`. The theme handles dark/light mode and accent swaps automatically.
- **No pill buttons.** Theme sets `borderRadius: 8` globally. Don't override with `borderRadius: 99`.
- **No `textTransform` overrides.** Theme sets `textTransform: 'none'` globally on all buttons.
- **Clickable elements must be semantic.** No `<Box cursor="pointer">` or `<Typography cursor="pointer">`. Use `Button`, `IconButton`, or `ListItemButton`.

### Sizing

- `size="small"` — toolbars, nav bars, inline actions, table rows
- default (medium) — content area CTAs, dialog actions, form submissions
- `size="large"` — hero actions, full-width submit buttons (rare)

## Colors

All colors come from the theme palette (`src/shared/theme/palette.ts`). Never use raw hex values in component styles for interactive elements.

| Token | Usage |
|-------|-------|
| `primary.main` | Accent color, active states, primary buttons |
| `error.main` | Delete/destructive actions, validation errors |
| `success.main` | Download, upload complete, positive confirmations |
| `text.primary` | Default text |
| `text.secondary` | Supporting text, labels |
| `text.disabled` | Placeholder text, inactive elements |
| `divider` | Borders, separators |
| `action.hover` | Hover backgrounds for non-button elements |

Exception: Domain-specific colors (slot colors like RC/LN/HB, mod colors, status colors) are defined as constants in their feature modules and are not part of the theme.

## Components

### Cards

- Use `<Card variant="outlined">` for content sections, not `<Paper>` with manual borders.
- Use `<CardHeader>` with `avatar`, `title`, `subheader`, `action` props — don't manually compose headers with Box.
- Empty states go inside a Card with centered icon + message + optional CTA.

### Lists

- Use `<List>` / `<ListItem>` for structured data, not stacked Boxes with manual dividers.
- Use `<ListItemButton>` for clickable list rows.
- Use `<ListItemAvatar>` + `<Avatar>` for leading visuals.

### Feedback

- `<Tooltip>` on every `<IconButton>`.
- `<Chip>` for status indicators and metadata — not for actions.
- `<Badge>` for counts on icons/avatars.
- `<Alert>` for inline messages. `<Snackbar>` for transient notifications.

## Layout

- Top nav height: `56px` (exported as `TOPNAV_HEIGHT` from Sidebar).
- Dashboard sidebar: fixed position, `240px` wide, `top: 80px`, `bottom: 16px`.
- Content max-width: `lg` container for standard pages, full-width for dashboard.
- Spacing unit: MUI's default `8px`. Use `sx={{ p: 2 }}` (16px), `gap: 1.5` (12px), etc.
