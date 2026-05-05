# Agent File Format Notes

Use UTF-8 for Markdown and other plain-text repo notes.

On Windows, some tools can accidentally write text as UTF-16. That makes normal Markdown look like it has null characters between letters, for example `H\0A\0N\0D\0O\0F\0F`.

For future agent handoffs:

- Keep `HANDOFF.md` and other Markdown scratch files as UTF-8.
- Avoid writing Markdown through APIs or commands that default to UTF-16.
- If a note renders with null characters between letters, decode it as UTF-16 and rewrite it as UTF-8.
