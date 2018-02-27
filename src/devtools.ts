let panelCreated = false;

const PAGE_HAS_CASIUM_EVAL = `!!(
  Object.keys(window._ARCH_DEV_TOOLS_STATE.contexts).length
)`;

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
