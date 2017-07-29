// Chrome automatically creates a background.html page for this to execute.
// This can access the inspected page via executeScript
// 
// Can use:
// chrome.tabs.*
// chrome.extension.*

chrome.extension.onConnect.addListener(function (port) {

  var extensionListener = function (message, sender, sendResponse) {

    console.log("Message beh?", message);

    if (message.tabId) {

      if (message.action === 'code' && message.content) {
        // Evaluate script in inspectedPage
        chrome.tabs.executeScript(message.tabId, {code: message.content});
      } else if (message.action === 'script' && message.content) {
        // Attach script to inspectedPage
        chrome.tabs.executeScript(message.tabId, {file: message.content});
      } else {
        console.log("Relaying message to tab", message);
        // Pass message to inspectedPage
        chrome.tabs.sendMessage(message.tabId, message, sendResponse);
      }

    // This accepts messages from the inspectedPage and 
    // sends them to the panel
    } else {
      port.postMessage(message);
    }
    sendResponse(message);
  }

  // Listens to messages sent from the panel
  chrome.extension.onMessage.addListener(extensionListener);

  port.onDisconnect.addListener(function(port) {
    chrome.extension.onMessage.removeListener(extensionListener);
  });

  port.onMessage.addListener(function (message) {
    port.postMessage(message);
  });

});

var ports = window.PORTS = {};

// DevTools / page connection
chrome.runtime.onConnect.addListener(port => {

  console.log("Client connected to background", port.name, port);
  ports[port.name] = port;

  var portListener = function(message, sender, sendResponse) {
    console.log("Client message to background", sender.name, message);

    if (sender.name === "ArchDevToolsPageScript" && ports.ArchDevToolsPanel) {
      ports.ArchDevToolsPanel.postMessage(message);
    } else if (sender.name === "ArchDevToolsPanel" && ports.ArchDevToolsPageScript) {
      ports.ArchDevToolsPageScript.postMessage(message);
    } else {
      // @TODO: Queue messages for when the panel is activated
      console.log("Message not relayed", { message, ports, sender });
    }

    if (message.tabId && message.scriptToInject) {
      chrome.tabs.executeScript(message.tabId, { file: message.scriptToInject });
    }
  }

  port.postMessage({ info: "Client connected to background", name: port.name });

  port.onDisconnect.addListener(function() {
    port.onMessage.removeListener(portListener);
    delete ports[port.name];
  });
  port.onMessage.addListener(portListener);
});

// DevTools -> background message
// chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
//   console.log("Runtime message", { request, sender });
//   sendResponse();
// });