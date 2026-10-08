# Stratagema native Stream Deck plugin — preview

Download the `.streamDeckPlugin` asset and double-click it to install. Requires
Windows 10 or later and Stream Deck 7.0 or later. The Windows macro helper is
included; this plugin does not require Advanced Launcher.

Add **Stratagema Stratagem** to a key, select a stratagem, and press the key to
send its sequence. The inspector supports custom sequences, cooldown values,
arrow keys, the CTRL toggle, commands.txt reload, and optional TCP broadcasts.

The dropdown, settings persistence, catalogue reload, and button activation have
been confirmed by the maintainer in Stream Deck on Windows. CI checks parsing,
process/socket registration, and inspector integration before packaging.

This is an early preview. The catalogue contains 84 stratagems from the existing
July 2025 set. Cooldown countdowns and long-press reset are not implemented yet,
and repeated presses can run overlapping helpers. See
`docs/plugin_runtime_review.md` for the remaining implementation concerns.

The existing Advanced Launcher version remains on `main`. Native plugin preview
releases use separate `streamdeck-v…` tags and do not replace that release line.
