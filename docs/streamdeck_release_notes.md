# Stratagema native Stream Deck plugin — first public preview

Run stratagem macros directly from Stream Deck without Advanced Launcher.

## Install

Download **com.stratagema.sdplugin-0.1.7.0.streamDeckPlugin** below and double-click
it to install or update. Requires **Windows 10 or later** and **Stream Deck 7.0
or later**. The Windows keyboard helper is included.

1. Drag **Stratagema Stratagem** from the Stratagema action list onto a key.
2. Select a stratagem in the key's settings. Configure WASD or arrow input and
   the CTRL modifier to match your game bindings.
3. Press the key to send the sequence. A successful send starts its countdown;
   presses during cooldown are ignored.
4. Drag the separate **Reset Round** action onto a spare key. Press it at the
   start of a round to clear every cooldown, including keys on other pages.

## Included

- A bundled catalogue of 84 stratagems, with per-key code and cooldown overrides.
- Working dropdown selection, saved settings, and commands.txt reload with clear
  connection and file diagnostics.
- Centered white countdowns over translucent charcoal artwork, retaining the
  original icon borders. Explicit zero cooldown disables the timer for that key.
- Reset Round with matching gold/charcoal artwork. Resetting during a sequence
  lets playback finish without restarting its old cooldown.
- One sequence at a time: additional presses during playback are discarded and
  never queued. Failed sends do not start cooldowns.
- Optional TCP broadcasts, arrow-key playback, and a CTRL modifier toggle.
- No green success checkmark covering the buttons.

## Preview limitations

The catalogue is the existing July 2025 set and has not been updated for newer
stratagems. Cooldowns are estimates after successful keyboard playback; the
plugin cannot detect whether the game accepted a cast. Restarting the plugin
clears cooldowns. Individual long-press reset is not implemented. Optional TCP
error reporting and configuration still need further work.

The maintainer has confirmed selection, settings persistence, catalogue reload,
and activation in Windows Stream Deck. CI tests the backend and real inspector
in Chromium, builds the Windows helper, validates the plugin, and packages the
installer. Automated checks do not test input inside the game.

**SHA256SUMS.txt** provides the installer checksum. This is an unsigned preview
installer, separate from the existing Advanced Launcher releases on `main`.
