# Icon Mappings

All icons have been replaced with Font Awesome Free 7.1.0 icons.

## Icon Mapping Table

| Original Icon | Font Awesome Icon | FA Icon Name |
|--------------|-------------------|--------------|
| bug.svg | 🐛 | `bug.svg` |
| check.svg | ✓ | `check.svg` |
| close.svg | ✕ | `xmark.svg` |
| info.svg | ℹ | `info.svg` |
| logs.svg | 📄 | `file-lines.svg` |
| play.svg | ▶ | `play.svg` |
| profiles.svg | 👤 | `user.svg` |
| project.svg | 📊 | `diagram-project.svg` |
| refresh.svg | ↻ | `arrows-rotate.svg` |
| restart.svg | ↻ | `arrow-rotate-right.svg` |
| section.svg | ☰ | `bars.svg` |
| stop-square.svg | ■ | `stop.svg` |
| tasks.svg | ☑ | `list-check.svg` |
| terminal.svg | 💻 | `terminal.svg` |
| zapfile.svg | 📝 | `file-code.svg` |

## Color Scheme

- **Dark theme icons**: `#ffffff` (white)
- **Light theme icons**: `#424242` (dark gray)

## Source

Icons are sourced from `@fortawesome/fontawesome-free` package (devDependency).
All icons use the "solid" style from Font Awesome.

## Regenerating Icons

If you need to update or regenerate icons in the future, you can create a script similar to the one used initially:

1. Ensure `@fortawesome/fontawesome-free` is installed
2. Icons are located at: `node_modules/@fortawesome/fontawesome-free/svgs/solid/`
3. Replace `fill="currentColor"` with specific color values
4. Add `aria-hidden="true"` attribute
5. Copy to both `resources/icons/dark/` and `resources/icons/light/` directories

