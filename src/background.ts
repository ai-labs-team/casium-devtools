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

/**
 * If source port's name contains a Tab ID, use the source port name verbatim, otherwise infer the source port from
 * `sender.tab.id`.
 */
const portId = (port: browser.runtime.Port) => {
  if (port.name.indexOf('@') > -1) {
    return port.name;
  }

  if (port.sender && port.sender.tab && port.sender.tab.id !== undefined) {
    return `${port.name}@${port.sender.tab.id}`;
  }

  throw new Error('Port does not contain `@<tabId>` in name or have `sender.tab.id`');
}

// DevTools / page connection
browser.runtime.onConnect.addListener(sourcePort => {
  const sourceId = portId(sourcePort);
  const [sourceName, sourceTabId] = sourceId.split('@');

  console.log("%c[Client Connected]: " + sourceId, "font-weight: bold; color: #2eb82e;", sourcePort);
  ports[sourceId] = sourcePort;

  if (queues[sourceId] && queues[sourceId].length) {
    queues[sourceId].forEach(sourcePort.postMessage.bind(sourcePort));
    queues[sourceId] = [];
  }

  const portListener = function(message: any, sender: browser.runtime.Port, sendResponse: (response?: any) => void) {
    console.log("%c[Client Message]: From " + sourceId, "font-weight: bold; color: #e6b800;", message);

    if (!channels[sourceName]) {
      throw new Error('NO CHANNEL DEFINED FOR SENDER');
    }

    const destinationName = channels[sourceName];
    const destinationId = `${destinationName}@${sourceTabId}`;
    const destinationPort = ports[destinationId];

    if (!destinationPort) {
      console.log("%c[Message Queued]: To " + destinationId, "font-weight: bold; color: #cc2900;", message, { ports, sender });

      if (!queues[destinationId]) {
        queues[destinationId] = [];
      }

      queues[destinationId].push(message);
      return;
    }

    console.log("%c[Message Relayed]: To " + destinationId, "font-weight: bold; color: #2eb82e;", message, { ports, sender });
    destinationPort.postMessage(message);
  }

  sourcePort.onDisconnect.addListener(function() {
    broadcast({ state: 'disconnected' });
    console.log(`%c[Client Disconnected]: ${sourceId}`, "font-weight: bold; color: #cc2900;");
    sourcePort.onMessage.removeListener(portListener as any);
    delete ports[sourceId];
  });

  sourcePort.onMessage.addListener(portListener as any);
});
