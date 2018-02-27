// Browser automatically creates a background.html page for this to execute.
// This can access the inspected page via executeScript
//
// Can use:
// browser.tabs.*
// browser.extension.*

browser.runtime.onConnect.addListener(port => {
  const extensionListener = (message: any, sender: browser.runtime.MessageSender, sendResponse: (response?: any) => void) => {
    if (message.tabId) {
      if (message.action === 'code' && message.content) {
        // Evaluate script in inspectedPage
        browser.tabs.executeScript(message.tabId, { code: message.content });
      } else if (message.action === 'script' && message.content) {
        // Attach script to inspectedPage
        browser.tabs.executeScript(message.tabId, { file: message.content });
      } else {
        console.log("%c[Relaying Message]", "font-weight: bold; color: #e6b800;", message);
        // Pass message to inspectedPage
        browser.tabs.sendMessage(message.tabId, message).then(sendResponse);
      }

      // This accepts messages from the inspectedPage and
      // sends them to the panel
    } else {
      port.postMessage(message);
    }
    sendResponse(message);
  }

  // Listens to messages sent from the panel
  browser.runtime.onMessage.addListener(extensionListener);

  port.onDisconnect.addListener(() => {
    browser.runtime.onMessage.removeListener(extensionListener);
  });

  port.onMessage.addListener(message => {
    port.postMessage(message);
  });
});

const ports: typeof window.PORTS = window.PORTS = {};
const queues: typeof window.QUEUES = window.QUEUES = {};

const channels: { [key: string]: string } = {
  CasiumDevToolsPageScript: "CasiumDevToolsPanel",
  CasiumDevToolsPanel: "CasiumDevToolsPageScript"
};

// DevTools / page connection
browser.runtime.onConnect.addListener(port => {

  console.log("%c[Client Connected]: " + port.name, "font-weight: bold; color: #2eb82e;", port);
  ports[port.name] = port;

  if (queues[port.name] && queues[port.name].length) {
    queues[port.name].forEach(port.postMessage.bind(port));
    queues[port.name] = [];
  }

  const portListener = function(message: any, sender: browser.runtime.Port, sendResponse: (response?: any) => void) {
    console.log("%c[Client Message]: " + sender.name, "font-weight: bold; color: #e6b800;", message);

    if (!channels[sender.name]) {
      throw new Error('NO CHANNEL DEFINED FOR SENDER');
    }

    const destination = channels[sender.name], port = ports[destination];

    if (!port) {
      console.log("%c[Message Not Relayed]", "font-weight: bold; color: #cc2900;", message, { ports, sender });
      queues[destination] = queues[destination] || [];
      queues[destination].push(message);
      return;
    }
    console.log("%c[Message Relayed]: " + destination, "font-weight: bold; color: #e6b800;", message, { ports, sender });
    port.postMessage(message);

    if (message.tabId && message.scriptToInject) {
      browser.tabs.executeScript(message.tabId, { file: message.scriptToInject });
    }
  }

  port.postMessage({ info: "Client connected to background", name: port.name });

  port.onDisconnect.addListener(function() {
    (port.onMessage.removeListener as any)(portListener);
    delete ports[port.name];
  });
  (port.onMessage.addListener as any)(portListener);
});
