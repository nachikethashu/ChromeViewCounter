chrome.extension.onMessage.addListener(function(message, sender) {
    var ba = chrome.browserAction;
    ba.setBadgeBackgroundColor({color: "#0091ea"});
    ba.setBadgeText({text: "" + message});
});

chrome.tabs.onUpdated.addListener(function(tabId, changeInfo) {
    console.info("background listener: onUpdated");
    if (changeInfo.status === 'loading') {
        chrome.tabs.get(tabId, function(tab){
            if (tab.url) {
                updateViewCount(tab.url);
            }
        });
    }
});

function updateViewCount(url) {
    var domainPart = extractDomain(url);
    chrome.storage.sync.get(domainPart, function (val) {
        val[domainPart] = val[domainPart] || 0;
        val[domainPart]++;
        saveCountInStorage(val, domainPart);
    });
}

function saveCountInStorage(val, domainPart) {
    chrome.storage.sync.set(val, function() {
        updateBadge(val[domainPart]);
    });
}

function updateBadge(count) {
    var ba = chrome.browserAction;
    ba.setBadgeBackgroundColor({color: "#0091ea"});
    ba.setBadgeText({text: "" + count});
}

chrome.tabs.onActivated.addListener(function(activeInfo) {
    console.info("background listener: onActivated");
    chrome.tabs.get(activeInfo.tabId, function(tab){
        var domainPart = extractDomain(tab.url);
        chrome.storage.sync.get(domainPart, function (val) {
            if (val[domainPart]) {
                updateBadge(val[domainPart]);
            } else {
                // when plugin is installed and switched to pre-opened tab.
                val[domainPart] = 1;
                saveCountInStorage(val, domainPart);
            }
        });
    });
});

function extractDomain(url) {
    var domain;
    //find & remove protocol (http, ftp, etc.) and get domain
    if (url.indexOf("://") > -1) {
        domain = url.split('/')[2];
    }
    else {
        domain = url.split('/')[0];
    }

    //find & remove port number
    domain = domain.split(':')[0];

    return domain;
}

function getCurrentTabUrl(callback) {
    var queryInfo = {
        active: true,
        currentWindow: true
    };

    chrome.tabs.query(queryInfo, function(tabs) {
        var tab = tabs[0], url;
        if (tab) {
            url = tab.url;
        }
        callback(url);
    });
}