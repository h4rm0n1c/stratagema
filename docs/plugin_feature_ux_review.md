# Native plugin feature and user experience review

Reviewed 2026-10-08 against commit `82a5de5`. The maintainer has confirmed the
repaired 0.1.2.0 plugin works in Windows Stream Deck. This review tracks the
next work beyond the first public preview.

Implemented since review: a global playback guard, per-key countdown with press
blocking, and a separate Reset Round action clearing all cooldowns (including
hidden keys). Explicit zero cooldown now survives defaults. Helper failures
appear in the inspector. Six deterministic runtime tests cover expiry, reset,
page changes, overlapping presses, reset during playback, failure, and zero.

The maintainer chose Reset Round as the reset interaction. Long-press reset is
deferred; stratagems still execute on keyDown. Countdown state clears on restart.

## Original review findings (before cooldown and Reset Round work)

| Work | Current behavior | Intended outcome |
| --- | --- | --- |
| Reliable macro execution | Every press launches a helper; different keys can overlap too. | Only one helper sends keyboard input at a time. Give immediate busy feedback and discard additional presses rather than playing delayed stratagems. |
| Valid inputs and honest overrides | Direction input is unrestricted; zero cooldown is replaced with the default; clearing a selected command's code restores its default. | Define default versus override explicitly. Preserve an explicit zero, reject invalid values, and provide a Restore defaults control. |
| Cooldown feedback | The duration is stored and broadcast but no key countdown exists. | Start a per-key timer after successful helper completion; display remaining time, restore the normal key when ready, and reset on plugin restart. |
| Reset interaction | No keyUp or long-press handling exists. | Holding a key clears its cooldown without sending another sequence. Make the gesture visible in the inspector. |
| Useful errors | Failed execution shows a temporary triangle and logs the reason. The inspector receives no explanatory failure. | Show the last execution result in the inspector, including empty/invalid code and helper failures. TCP status should distinguish enabled, listening, connected, and failed. |
| Catalogue and first-use instructions | The existing catalogue has 84 entries; the root README still describes a scaffold. | Review catalogue accuracy for the intended release; document download, install, add key, select stratagem, and game keybind setup. |

The execution guard must cover the whole plugin, while cooldowns belong to
individual action instances. A busy guard only on one key cannot prevent two
different helpers from holding and releasing CTRL simultaneously. Avoid queuing
inputs: a queued stratagem could fire after the player has moved on.

## Inspector improvements

- Use readable names, alphabetical ordering, and search. Keep stable IDs in
  saved settings; display `Machine Gun` rather than `machine_gun (saswd)`.
- Show the icon and an arrow sequence for the selected stratagem. Explain that
  stored codes use WASD even when playback uses arrow keys.
- Keep basic setup to stratagem selection and input bindings. Put custom code,
  cooldown overrides, file reload diagnostics, and TCP integration in clearly
  labelled expandable sections.
- Distinguish a custom sequence from an unconfigured key. Today selecting
  `Custom / not set` retains the previously selected code and cooldown.
- Expose whether a value follows the catalogue or is overridden. Restore
  defaults should remove overrides; catalogue reload should update inherited
  values while preserving overrides, including zero.
- Replace the negative `Skip hold-CTRL modifier` label with `Hold CTRL while
  entering sequence`, accompanied by an explanation of the game's binding.
- Explain that TCP settings apply to every Stratagema key and are optional.
  Disable dependent controls when TCP is off; validate the port as 1–65535;
  apply edits after validation rather than restarting on each typed digit.
- Use proper labels associated with the dropdown/text/number inputs. The current
  visual labels are div elements and do not provide accessible control names.
- Keep normal status short. Put the absolute commands.txt path and detailed
  diagnostics behind an expandable section, with a clear way to find the file.

The current inspector was rendered in Chromium at a 360-pixel viewport. It does
not overflow horizontally at that size. This is a local preview, not a screenshot
of the actual Stream Deck application; narrow host layouts still need testing.

## Cooldown interaction decisions

Suggested behavior for discussion:

- **Ready + short press:** send the sequence once, then start cooldown on success.
- **Sending:** additional presses on any key show busy feedback and do not queue.
- **Cooling down + short press:** do not send another sequence; keep remaining
  time visible. A manual reset handles early readiness or changed game conditions.
- **Hold:** reset this key's cooldown without invoking the helper.
- **Failure:** show its reason; do not start cooldown.
- **Restart:** all keys return to ready, as specified in the original plan.

Long-press reset requires deciding the gesture before macro dispatch. Executing
on keyDown and later detecting a hold on keyUp would send a sequence during a
reset. Short-press execution on keyUp is a straightforward option, but changes
the feel of the button and needs real-device testing.

Cooldowns are estimates: the plugin has no game-state integration to know when
a cast actually succeeds. Consider an optional cooldown display/guard setting
if users need different behavior. Changing pages, removing keys, and waking the
computer must not leave stale timers or silently cancel tracking unintentionally.

Stream Deck supports key events, title/image updates, disappearance, and wake
events. Timer rendering must account for custom titles, which can take precedence
over plugin titles; choose a deliberate title policy or render the countdown into
the image. References:

- https://docs.elgato.com/streamdeck/sdk/references/websocket/plugin/
- https://docs.elgato.com/streamdeck/sdk/guides/keys/
- https://docs.elgato.com/streamdeck/sdk/references/manifest/

## Later improvements

Global input defaults with per-key overrides, adjustable playback timing (the
helper already accepts `--cast-time`), drag-and-drop profiles, richer category
browsing, and store submission can follow a reliable preview. External helper
path selection is unnecessary for ordinary installation because the helper is
bundled. Repair the stale helper-contract document rather than implementing an
override solely to match that old description.

TCP also needs focused lifecycle work: a failed bind currently leaves server/port
state populated, and editing the whitelist does not disconnect existing clients
that are no longer allowed. It is optional, but users who enable it should see
accurate status and recover from a port conflict without restarting the plugin.

## Suggested implementation order and validation

1. Correct override semantics and validate direction/cooldown inputs in the
   inspector, runtime, and helper. Test explicit zero, invalid data, restoring
   defaults, and catalogue changes.
2. Add one global execution guard, helper timeout/cleanup, and inspector error
   feedback. Test same-key and cross-key presses; ensure no delayed input plays.
3. Implement per-key countdown and the agreed reset gesture together. Test helper
   failure, short press, hold, expiry, restart, profile changes, and wake behavior.
4. Improve selection and progressive disclosure; verify keyboard accessibility,
   saved keys, readable narrow layouts, and custom sequences in real Stream Deck.
5. Review catalogue and docs, exercise optional TCP, then run Windows CI and test
   its generated installer before preparing the public preview release.
