# OpenFlow Cozy UI Theme

## Brand Feel

OpenFlow should feel cozy, modern, fresh, and focused. The product blends a calm document workspace with expressive whiteboard energy, so the UI should be warm enough for long sessions and colorful enough to make creation feel alive.

## Color Palette

- Base canvas: `#fbf7ee`, warm off-white for app backgrounds.
- Surface: `#ffffff` with light translucency when layered over soft gradients.
- Ink: `#111827` for primary text and active navigation.
- Muted ink: `#64748b` for labels, metadata, and helper text.
- Border: `#dbe3ea` for clean separation without heavy outlines.
- Mint: `#34d399` for collaboration, health, and positive status.
- Sky: `#38bdf8` for dashboards, search, links, and flow states.
- Coral: `#fb7185` for whiteboard accents and human moments.
- Amber: `#f59e0b` for notes, highlights, and AI emphasis.
- Lavender: `#8b5cf6` for AI, templates, and creative automation.

## Typography

- Use system sans fonts: `Inter`, `ui-sans-serif`, `system-ui`, `Segoe UI`, and platform fallbacks.
- Keep navigation labels compact at `13px-14px`.
- Use `11px-12px` for metadata, group labels, and status copy.
- Dashboard headings should be confident but restrained; avoid oversized marketing type inside the app shell.
- Letter spacing should stay at `0` for normal text. Use small positive uppercase tracking only for section labels.

## Spacing, Radius, and Shadows

- Prefer an `8px` radius for cards, sidebar items, inputs, and buttons.
- Use compact spacing in navigation: `8px-10px` horizontal padding and `36px-40px` item height.
- Keep page gutters around `20px-32px` depending on viewport width.
- Shadows should be soft and low contrast, used for depth rather than decoration.
- Avoid nested cards. Use direct dashboard panels and lightweight repeated items.

## Sidebar Guidelines

- Expanded width should stay near `248px`; collapsed width should stay near `72px`.
- Group related navigation under short labels such as `Workspace`, `Create`, and `System`.
- Collapsed navigation hides text and group labels, keeps icons centered, and exposes labels through `title` and `aria-label`.
- Active navigation should use the dark ink fill with a warm accent icon.
- Footer content should show workspace/account context when expanded and reduce to one clear icon affordance when collapsed.

## Icon Guidance

- Use Lucide icons for all navigation and tool controls.
- Icons should be colorful by function, not randomly decorative:
  - Dashboard: sky
  - AI: lavender
  - Calendar and collaboration: mint
  - Kanban/tasks: orange
  - Notes: amber
  - Whiteboard: coral
  - Pages/spaces: teal
  - Settings: slate
- Icon-only buttons need accessible labels and hover states.

## Component Tone

- Dashboard cards should feel useful immediately: show concise metrics, current work, upcoming schedule, and creation prompts.
- Controls should be compact and predictable, with clear hover/focus feedback.
- Empty states should suggest one next action and avoid marketing copy.
- AI surfaces should feel helpful and calm, using dark ink or lavender accents sparingly for contrast.
