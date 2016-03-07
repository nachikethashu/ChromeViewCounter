var port = chrome.runtime.connect({name: "viewcount"});
chrome.runtime.onConnect.addListener(function(port) {
    port.onMessage.addListener(function(msg) {
        getCurrentTabUrl(function(url){
            var domainPart = extractDomain(url);
            chrome.storage.sync.get(domainPart, function (val) {
                if (val[domainPart]) {
                    port.postMessage({count: val[domainPart]});
                }
            });
        });
    });
});

chrome.tabs.onUpdated.addListener(function(tabId, changeInfo) {
    console.info("background listener: onUpdated");
    if (changeInfo.status === 'loading') {
        chrome.tabs.get(tabId, function(tab) {
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

// for testing specs in https://developer.chrome.com/extensions/storage#property-sync
var testCases = {
    // Fails with untime.lastError while running storage.set: MAX_ITEMS quota exceeded
    // QOUATA=512
    // conclusion: major setback! have to incorporate some server storage mechanism
    maxItemsTest: function() {
        var i = 0;
        var timer = setInterval(function() {
            var val = {};
            val[Math.random()*1000] = Math.random()*1000;
            chrome.storage.sync.set(val, function() {
                console.log('saving: ' + i);
                i++;
            });
            if (i === 520) {
                clearInterval(timer);
                chrome.storage.sync.get(null, function(items) {
                    var allKeys = Object.keys(items);
                    console.log("total length: " + allKeys.length);
                });
            }
        }, 600);
    },
    // Only 120 items per minute is allowed to be writen into sync storage
    // lastError while running storage.set: This request exceeds the MAX_WRITE_OPERATIONS_PER_MINUTE quota.
    maxWritesPerMinTest: function() {
        var i = 0;
        var timer = setInterval(function() {
            var val = {};
            val[Math.random()*1000] = Math.random()*1000;
            chrome.storage.sync.set(val, function() {
                console.log('saving: ' + i);
                i++;
            });
            if (i === 130) {
                clearInterval(timer);
                chrome.storage.sync.get(null, function(items) {
                    var allKeys = Object.keys(items);
                    console.log("total length: " + allKeys.length);
                    console.log(items);
                });
            }
        }, 100);
    },
    // runtime.lastError while running storage.set: QUOTA_BYTES_PER_ITEM quota exceeded
    // max length allowed per item: 8192 -> including item key val!
    // relevant links: http://stackoverflow.com/questions/13373187/can-i-increase-quota-bytes-per-item-in-chrome
    // concusion: approximately we can store < 500 timestamps per item safely without worrying abt key length.
    maxBytesPerItem: function() {
        var times = [], i=0;
        var timer = setInterval(function() {
            times.push(new Date().getTime());
            i++;
            if (i === 600) {
                clearInterval(timer);
                console.log('max length allowed per item: ' + chrome.storage.sync.QUOTA_BYTES_PER_ITEM);
                console.log("trying to save item of length: " + JSON.stringify(times).length);
                chrome.storage.sync.set({testItem: JSON.stringify(times)}, function() {
                    /*commenting out, since get of this code works only on new installation
                    chrome.storage.sync.get("testItem", function(item) {
                        console.log("checking if the item is saved!");
                        console.log(item);
                    });*/
                });
            }
        }, 2);
    }
}
// testCases.maxBytesPerItem();
// testCases.maxWritesPerMinTest();
// testCases.maxItemsTest();