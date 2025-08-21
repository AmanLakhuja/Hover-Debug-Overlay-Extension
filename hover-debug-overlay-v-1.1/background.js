// background.js

const TAG_NAME_MENU_ID = "showTagName";
const EDGE_LABELS_MENU_ID = "showEdgeLabels";
const COPY_ELEMENT_NAME_MENU_ID = "copyElementName";

// Create context menu items on install
chrome.runtime.onInstalled.addListener(() => {
  // Set default states in storage
  chrome.storage.local.set({
    overlayActive: false,
    showTagName: true, // Changed to true by default
    showEdgeLabels: true
  });

  // Create "Show Element Name" menu item (now checked by default)
  chrome.contextMenus.create({
    id: TAG_NAME_MENU_ID,
    title: "Show Element Name",
    type: "checkbox",
    checked: true,
    contexts: ["all"]
  });

  // Create "Show Edge Labels" menu item
  chrome.contextMenus.create({
    id: EDGE_LABELS_MENU_ID,
    title: "Show Edge Labels",
    type: "checkbox",
    checked: true,
    contexts: ["all"]
  });
  
  // Create "Copy Element Name" menu item, initially hidden
  chrome.contextMenus.create({
    id: COPY_ELEMENT_NAME_MENU_ID,
    title: "Copy Element Name",
    contexts: ["all"],
    visible: false
  });
});

// Listener for context menu clicks
chrome.contextMenus.onClicked.addListener((info, tab) => {
  if (info.menuItemId === TAG_NAME_MENU_ID) {
    chrome.storage.local.set({
      showTagName: info.checked
    });
    sendMessage(tab.id, 'toggleTagName', info.checked);
  } else if (info.menuItemId === EDGE_LABELS_MENU_ID) {
    chrome.storage.local.set({
      showEdgeLabels: info.checked
    });
    sendMessage(tab.id, 'toggleEdgeLabels', info.checked);
  } else if (info.menuItemId === COPY_ELEMENT_NAME_MENU_ID) {
    sendMessage(tab.id, 'copyElementName');
  }
});

// Listener for the extension icon click
chrome.action.onClicked.addListener((tab) => {
  chrome.storage.local.get('overlayActive', (data) => {
    const isEnabled = data.overlayActive || false;
    const newState = !isEnabled;

    chrome.storage.local.set({
      overlayActive: newState
    });

    // Control visibility of the "Copy Element Name" menu item
    chrome.contextMenus.update(COPY_ELEMENT_NAME_MENU_ID, {
      visible: newState
    });

    // Inject content script and send a message
    chrome.scripting.executeScript({
      target: {
        tabId: tab.id
      },
      files: ['content.js']
    }).then(() => {
      chrome.tabs.sendMessage(tab.id, {
        action: newState ? 'enable' : 'disable'
      });
    }).catch(err => {
      console.error("Failed to execute script on the active tab:", err);
    });
  });
});

// Listener to disable the overlay when the user switches tabs or windows
chrome.tabs.onActivated.addListener(() => {
  chrome.storage.local.get('overlayActive', (data) => {
    if (data.overlayActive) {
      chrome.storage.local.set({
        overlayActive: false
      });
      // Hide the "Copy Element Name" menu item
      chrome.contextMenus.update(COPY_ELEMENT_NAME_MENU_ID, {
        visible: false
      });
    }
  });
});

chrome.windows.onFocusChanged.addListener((windowId) => {
  if (windowId === chrome.windows.WINDOW_ID_NONE) {
    chrome.storage.local.get('overlayActive', (data) => {
      if (data.overlayActive) {
        chrome.storage.local.set({
          overlayActive: false
        });
        // Hide the "Copy Element Name" menu item
        chrome.contextMenus.update(COPY_ELEMENT_NAME_MENU_ID, {
          visible: false
        });
      }
    });
  }
});

// Helper function to send messages to the content script
function sendMessage(tabId, action, value) {
  chrome.tabs.query({
    active: true,
    currentWindow: true
  }, (tabs) => {
    if (tabs.length > 0) {
      chrome.tabs.sendMessage(tabs[0].id, {
        action,
        value
      }).catch(err => {
        console.error("Failed to send message to the content script:", err);
      });
    }
  });
}