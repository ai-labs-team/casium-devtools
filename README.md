# Axiom Architecture DevTools

## Installation

 - Open [`chrome://extensions`](chrome://extensions)
 - Make sure `[✔] Developer Mode` is ✔'d
 - Click `Load unpacked extension...`
 - Select this directory
 - If DevTools is open, close and reopen it

## Development

 - Follow installation instructions
 - `yarn`
 - `yarn build`, or `yarn watch`, to auto-reload on saved changes
 - `cd node_modules/react-inspector; yarn; yarn build; cd ../..`
 - Open DevTools in separate window, navigate to `Architecture` tab
 - `⌘ + Opt + I` to initiate DevTools-ception
 - With Meta-DevTools window selected, `⌘ + R` to reload
 - You may need to also reload the inspected page

## Roadmap

 - [x] Control bar
 - [x] Clear button
 - [x] Make unit test view slide down from the top
 - [x] Time travel
 - [x] Export
 - [x] Diff view
 - [x] Toggle next state / prev state / diff view
 - [x] Message timestamps, toggle relative / absolute
 - [x] Clear on reload / preserve log button
 - [ ] Replay last / replay selected
 - [ ] Import / replay log
 - [ ] Compare runs
 - [ ] Tab isolation
 - [ ] Preserve state across reloads
 - [ ] Do a better job surfacing errors
 - [ ] Better formatting for object output in generated unit tests
 - [ ] Resizable panels
 - [ ] Remote pairing
 - [ ] Remote control
 - [ ] Command-line interface
