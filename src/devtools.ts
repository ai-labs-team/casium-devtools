import { INSTRUMENTER_KEY } from './instrumenter';

type Panel = chrome.devtools.panels.ExtensionPanel & { show: () => void };

let panelCreated = false;

const PAGE_HAS_CASIUM_EVAL = `!!(window.${INSTRUMENTER_KEY}.stateManager)`;

const createPanelIfCasiumLoaded = () => {
  if (panelCreated) {
    return;
  }

  chrome.devtools.inspectedWindow.eval(PAGE_HAS_CASIUM_EVAL, (pageHasCasium, err) => {
    if (!pageHasCasium || panelCreated) {
      return;
    }

    chrome.devtools.panels.create('Casium', 'icon.png', 'panel.html', (_: chrome.devtools.panels.ExtensionPanel) => {
      const panel: Panel = _ as any;

      clearInterval(loadCheckInterval);
      panelCreated = true;

      const listener = (window: chrome.windows.Window) => {
        console.log(window);
        debugger;
        panel.onShown.removeListener(listener);
      };

      panel.onShown.addListener(listener);
    });
  });
}

chrome.devtools.network.onNavigated.addListener(createPanelIfCasiumLoaded);

const loadCheckInterval = setInterval(createPanelIfCasiumLoaded, 1000);

createPanelIfCasiumLoaded();
