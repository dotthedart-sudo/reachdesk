# ReachDesk Project Rules

## No Emojis in UI
**Never use emoji characters in JSX render output, user-visible strings, button labels, or any UI-facing text.**
- Replace any emoji in the UI with appropriate `lucide-react` icons (already imported throughout the project).
- Use `<CheckCircle>` instead of ✅, `<Info>` or `<Lightbulb>` instead of 💡, `<BarChart2>` instead of 📊, etc.
- Text-only contexts (e.g. plain `<span>` pro-tip callouts) should use a lucide icon component alongside the text instead of embedding an emoji character.
- Code comments are exempt from this rule — only the rendered JSX/HTML output matters.
- This rule applies to ALL files: .jsx, .tsx, .js, edge functions render output, etc.
- The `✓` and `✕` unicode symbols are acceptable as they are not emoji but plain punctuation — however prefer lucide `<Check>` and `<X>` icons when possible.
