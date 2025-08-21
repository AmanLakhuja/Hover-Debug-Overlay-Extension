// content.js
(() => {
    if (window.hoverDebugOverlayInitialized) {
        return;
    }
    window.hoverDebugOverlayInitialized = true;

    let overlay = null;
    let style = null;
    let tagNameLabel = null;
    let showTagName = false;
    let showEdgeLabels = true;
    let elementToCopy = null; // New variable to store the element to be copied

    function createOverlay() {
        if (overlay) return;

        style = document.createElement('style');
        style.textContent = `
        .debug-overlay {
          position: absolute;
          background: rgba(255, 255, 0, 0.15);
          pointer-events: none;
          z-index: 999999;
          box-sizing: border-box;
          border: 2px solid red;
          transition: all 0.2s ease;
        }
        .debug-label {
          position: absolute;
          font-weight: bold;
          font-size: 12px;
          color: white;
          background: #333;
          padding: 2px 6px;
          border-radius: 4px;
          pointer-events: none;
          font-family: Arial, sans-serif;
          white-space: nowrap;
          margin: 4px;
          z-index: 999999;
        }
        .debug-top {
          top: 0;
          left: 50%;
          transform: translate(-50%, -100%);
        }
        .debug-bottom {
          bottom: 0;
          left: 50%;
          transform: translate(-50%, 100%);
        }
        .debug-left {
          left: 0;
          top: 50%;
          transform: translate(-100%, -50%);
        }
        .debug-right {
          right: 0;
          top: 50%;
          transform: translate(100%, -50%);
        }
        .tag-name-label {
          position: absolute;
          color: white;
          background: #333;
          padding: 4px 8px;
          border-radius: 4px;
          font-size: 12px;
          font-family: monospace;
          pointer-events: none;
          z-index: 1000000;
          white-space: normal;
          word-break: break-word;
          max-width: 300px;
          box-shadow: 0 2px 4px rgba(0,0,0,0.4);
        }
      `;
        document.head.appendChild(style);

        overlay = document.createElement('div');
        overlay.className = 'debug-overlay';

        ['top', 'bottom', 'left', 'right'].forEach(pos => {
            const label = document.createElement('div');
            label.className = `debug-label debug-${pos}`;
            label.textContent = pos.toUpperCase();
            overlay.appendChild(label);
        });

        tagNameLabel = document.createElement('div');
        tagNameLabel.className = 'tag-name-label';
        tagNameLabel.style.display = 'none';
        document.body.appendChild(tagNameLabel);

        document.body.appendChild(overlay);
        overlay.style.display = 'none';
    }

    function getElementDescriptor(el) {
        if (!el) return '';
        let desc = el.tagName.toLowerCase();
        if (el.id) desc += `#${el.id}`;
        if (el.classList.length) desc += '.' + [...el.classList].join('.');
        return desc;
    }

    function updateOverlay(elem) {
        if (!elem || !overlay || overlay.contains(elem)) {
            if (overlay) overlay.style.display = 'none';
            if (tagNameLabel) tagNameLabel.style.display = 'none';
            return;
        }

        const rect = elem.getBoundingClientRect();
        overlay.style.width = rect.width + 'px';
        overlay.style.height = rect.height + 'px';
        overlay.style.top = window.scrollY + rect.top + 'px';
        overlay.style.left = window.scrollX + rect.left + 'px';
        overlay.style.display = 'block';

        const labels = {
            top: overlay.querySelector('.debug-top'),
            bottom: overlay.querySelector('.debug-bottom'),
            left: overlay.querySelector('.debug-left'),
            right: overlay.querySelector('.debug-right')
        };

        for (const [pos, label] of Object.entries(labels)) {
            if (!showEdgeLabels) {
                label.style.display = 'none';
                continue;
            }

            label.style.display = 'block';

            const buffer = 8;
            if (pos === 'top' && rect.top < 20) {
                label.style.transform = 'translate(-50%, 0)';
            } else if (pos === 'bottom' && (window.innerHeight - rect.bottom) < 20) {
                label.style.transform = 'translate(-50%, 0)';
            } else if (pos === 'left' && rect.left < 60) {
                label.style.transform = 'translate(0, -50%)';
            } else if (pos === 'right' && (window.innerWidth - rect.right) < 60) {
                label.style.transform = 'translate(0, -50%)';
            } else {
                if (pos === 'top') label.style.transform = 'translate(-50%, -100%)';
                if (pos === 'bottom') label.style.transform = 'translate(-50%, 100%)';
                if (pos === 'left') label.style.transform = 'translate(-100%, -50%)';
                if (pos === 'right') label.style.transform = 'translate(100%, -50%)';
            }
        }

        if (showTagName) {
            tagNameLabel.textContent = getElementDescriptor(elem);
            const labelRect = tagNameLabel.getBoundingClientRect();
            let top = rect.top - labelRect.height - 8;
            if (top < 0) top = rect.bottom + 8;
            tagNameLabel.style.left = rect.left + window.scrollX + 'px';
            tagNameLabel.style.top = top + window.scrollY + 'px';
            tagNameLabel.style.display = 'block';
        } else {
            tagNameLabel.style.display = 'none';
        }
    }

    function onMouseMove(e) {
        const el = document.elementFromPoint(e.clientX, e.clientY);
        updateOverlay(el);
    }
    
    // New: Capture the element when the context menu is opened
    function onContextMenu(e) {
        elementToCopy = document.elementFromPoint(e.clientX, e.clientY);
    }

    function enableOverlay() {
        createOverlay();
        chrome.storage.local.get(['showTagName', 'showEdgeLabels'], data => {
            showTagName = data.showTagName || false;
            showEdgeLabels = data.showEdgeLabels !== false;
        });
        document.addEventListener('mousemove', onMouseMove);
        document.addEventListener('contextmenu', onContextMenu); // New: Add context menu listener
    }

    function disableOverlay() {
        if (overlay) {
            overlay.remove();
            overlay = null;
        }
        if (tagNameLabel) {
            tagNameLabel.remove();
            tagNameLabel = null;
        }
        if (style) {
            style.remove();
            style = null;
        }
        document.removeEventListener('mousemove', onMouseMove);
        document.removeEventListener('contextmenu', onContextMenu); // New: Remove context menu listener
        elementToCopy = null;
    }

    function copyElementName() {
        // Use the stored elementToCopy instead of the live tag name
        if (elementToCopy) {
            const descriptor = getElementDescriptor(elementToCopy);
            navigator.clipboard.writeText(descriptor).then(() => {
                console.log("Element name copied to clipboard:", descriptor);
            }).catch(err => {
                console.error("Failed to copy element name:", err);
            });
        }
    }

    chrome.runtime.onMessage.addListener((msg) => {
        if (msg.action === 'enable') enableOverlay();
        else if (msg.action === 'disable') disableOverlay();
        else if (msg.action === 'toggleTagName') {
            showTagName = !!msg.value;
        } else if (msg.action === 'toggleEdgeLabels') {
            showEdgeLabels = !!msg.value;
        } else if (msg.action === 'copyElementName') {
            copyElementName();
        }
    });

    chrome.storage.onChanged.addListener((changes, namespace) => {
        if (namespace === 'local' && changes.overlayActive && changes.overlayActive.newValue === false) {
            disableOverlay();
        }
    });
})();