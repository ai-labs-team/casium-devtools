// Can use
// chrome.devtools.*
// chrome.extension.*

// Create a tab in the devtools area
var panelCreated = false;

function createPanelIfCasiumLoaded() {
  if (panelCreated) {
    return;
  }

  chrome.devtools.inspectedWindow.eval(`!!(
    Object.keys(window._ARCH_DEV_TOOLS_STATE.contexts).length
  )`, function (pageHasCasium, err) {
      if (!pageHasCasium || panelCreated) {
        return;
      }

      clearInterval(loadCheckInterval);
      panelCreated = true;
      chrome.devtools.panels.create("Casium", null, "panel.html", function (panel) { });
    });
}

chrome.devtools.network.onNavigated.addListener(createPanelIfCasiumLoaded);

// Check to see if Casium has loaded once per second in case React is added
// after page load
var loadCheckInterval = setInterval(createPanelIfCasiumLoaded, 1000);

createPanelIfCasiumLoaded();