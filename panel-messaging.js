// This creates and maintains the communication channel between
// the inspectedPage and the dev tools panel.
//
// In this example, messages are JSON objects
// {
//   action: ['code'|'script'|'message'], // What action to perform on the inspected page
//   content: [String|Path to script|Object], // data to be passed through
//   tabId: [Automatically added]
// }

(function createChannel() {

  window.MESSAGES = [];
  window.LISTENERS = []

  // Create a port with background page for continous message communication
  // var port = chrome.extension.connect({
  //   name: "ArchDevTools" // Given a Name
  // });

  var backgroundPageConnection = chrome.runtime.connect({
    name: "ArchDevToolsPanel"
  });

  backgroundPageConnection.onMessage.addListener(function (message) {
    if (message.from === 'Arch') {
      window.MESSAGES.push(message);
      window.LISTENERS.forEach(listener => listener(window.MESSAGES));
    }
  });

  // backgroundPageConnection.postMessage({ message: "test message from devtools to background" });

  const s = (json) => {
    try { return JSON.stringify(json); } catch (e) { return "{data}"; }
  };

  // Send message to background
  // backgroundPageConnection.postMessage({
  //   tabId: chrome.devtools.inspectedWindow.tabId,
  //   scriptToInject: "content_script.js"
  // });


  // Listen to messages from the background page
  // port.onMessage.addListener(function (message) {
  //   console.log("panel port message", message);
  //   document.write(s(message));
  //   // document.querySelector('#insertmessagebutton').innerHTML = message.content;
  //   // port.postMessage(message);
  // });

}());

// This sends an object to the background page 
// where it can be relayed to the inspected page
function sendObjectToInspectedPage(message) {
  message.tabId = chrome.devtools.inspectedWindow.tabId;
  chrome.extension.sendMessage(message);
}