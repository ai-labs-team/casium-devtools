import { INSTRUMENTER_KEY } from './instrumenter';

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

    clearInterval(loadCheckInterval);
    panelCreated = true;
    chrome.devtools.panels.create('Casium', 'icon.png', 'panel.html', () => { });
  });
}

chrome.devtools.network.onNavigated.addListener(createPanelIfCasiumLoaded);

const loadCheckInterval = setInterval(createPanelIfCasiumLoaded, 1000);

createPanelIfCasiumLoaded();
