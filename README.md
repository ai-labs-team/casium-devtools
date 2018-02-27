# Dev Tools for Casium – An application architecture for React

[![CircleCI](https://circleci.com/gh/ai-labs-team/casium-devtools.svg?style=svg)](https://circleci.com/gh/ai-labs-team/casium-devtools) [![Maintainability](https://api.codeclimate.com/v1/badges/4b7cb6dab31383dcff91/maintainability)](https://codeclimate.com/github/ai-labs-team/casium-devtools/maintainability) [![Test Coverage](https://api.codeclimate.com/v1/badges/4b7cb6dab31383dcff91/test_coverage)](https://codeclimate.com/github/ai-labs-team/casium-devtools/test_coverage)

## Installation & Development

 - `yarn deps`
 - `yarn build`, or `yarn watch`, to auto-reload on saved changes

### Chrome

 - Open [`chrome://extensions`](chrome://extensions)
 - Make sure `[✔] Developer Mode` is ✔'d
 - Click `Load unpacked extension...`
 - Select the `dist` directory
 - If DevTools is open, close and reopen it

 - Open DevTools in separate window, navigate to `Casium` tab
 - `⌘ + Opt + I` to initiate DevTools-ception
 - With Meta-DevTools window selected, `⌘ + R` to reload
 - You may need to also reload the inspected page

### Firefox

- Open [`about:debugging`](about:debugging)
- Make sure `[✔] Enable add-on debugging` is ✔'d
- Click `Load Temporary Add-on`
- Select the `dist` directory
- If the Inspector is open, close and reopen it

- In the entry that appears for 'Casium Developer Tools', click the `Debug` button
- Accept the remote debugging request

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
