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

  var queue = [];

  window.FLUSH_QUEUE = () => {
    queue.forEach(msg => window.LISTENERS.forEach(processMsg(msg)));
    queue = [];
  };

  const processMsg = msg => ([predicate, ...listeners]) => predicate(msg) && listeners.map(l => l(msg));

  var backgroundPageConnection = chrome.runtime.connect({ name: 'CasiumDevToolsPanel' });

  backgroundPageConnection.onMessage.addListener(message => {
    window.LISTENERS.length ? window.LISTENERS.forEach(processMsg(message)) : queue.push(message);
  });

  window.messageClient = (data) => {
    backgroundPageConnection.postMessage(Object.assign({
      from: "CasiumDevToolsPanel",
      tabId: chrome.devtools.inspectedWindow.tabId,
    }, data));
  }

  window.messageClient({ state: 'initialized' });

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
