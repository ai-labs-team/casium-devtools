// Browser automatically creates a background.html page for this to execute.
// This can access the inspected page via executeScript
//
// Can use:
// browser.tabs.*
// browser.extension.*

const ports: { [name: string]: browser.runtime.Port } = {};
const queues: { [dest: string]: browser.runtime.Port['postMessage'][] } = {};

const channels: { [key: string]: string } = {
  CasiumDevToolsPageScript: "CasiumDevToolsPanel",
  CasiumDevToolsPanel: "CasiumDevToolsPageScript"
};

const broadcast = (msg: {}) => {
  for (const source in channels) {
    const dest = ports[source];

    if (!dest) {
      return;
    }

    try {
      const message = Object.assign({ from: 'CasiumDevToolsBackgroundScript' }, msg);
      console.log(`%c[Broadcast]: ${dest.name}`, "font-weight: bold; color: #e6b800;", message);
      dest.postMessage(message);
    } catch (e) {
      // Thrown when a port is diconnected; this is fine
      console.log(`%c[Broadcast failed]: ${dest.name}`, "font-weight: bold; color: #cc2900;");
    }
  }
}

const senderId = (sender: browser.runtime.Port) => sender.sender && sender.sender.tab && sender.sender.tab.id || null;

// DevTools / page connection
browser.runtime.onConnect.addListener(port => {

  console.log("%c[Client Connected]: " + port.name, "font-weight: bold; color: #2eb82e;", port);
  ports[port.name] = port;

  if (queues[port.name] && queues[port.name].length) {
    queues[port.name].forEach(port.postMessage.bind(port));
    queues[port.name] = [];
  }

  const portListener = function(message: any, sender: browser.runtime.Port) {
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
    port.postMessage(Object.assign(message, { tab: senderId(sender) }));
  }

  port.postMessage({ info: "Client connected to background", name: port.name });

  port.onDisconnect.addListener(function() {
    broadcast({ state: 'disconnected' });
    console.log(`%c[Client Disconnected]: ${port.name}`, "font-weight: bold; color: #cc2900;");
    port.onMessage.removeListener(portListener as any);
    delete ports[port.name];
  });

  port.onMessage.addListener(portListener as any);
});
