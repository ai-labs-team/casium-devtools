// Executes on client page load
(() => {
  const port = browser.runtime.connect(undefined, { name: 'CasiumDevToolsPageScript' });
  const seen: string[] = [];

  // Get messages from background script
  port.onMessage.addListener(function(msg) {
    window.postMessage(msg, '*');
  });

  port.postMessage({
    from: 'CasiumDevToolsPageScript',
    state: 'initialized'
  });

  window.addEventListener('message', function(message) {
    if (!message || !message.data || !message.data.id || message.data.from === 'CasiumDevToolsPageScript') {
      return;
    }
    if (seen.includes(message.data.id)) return;
    seen.push(message.data.id);

    if (message.data.from !== 'Arch') {
      return;
    }

    try {
      port.postMessage(message.data);
    } catch (e) {
      // Probably a cached version of this script trying to talk to a version of the extension
      // that no longer exists
      console.warn([
        "The page's connection to Architecture Dev Tools has gone out of sync.",
        "Please refresh the page. If this issue persists, please restart the browser."
      ].join(' '));
    }
  }, false);
})();
