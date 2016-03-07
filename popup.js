// Note that this script gets called on parent window as well as popup window
// So, make sure scripts are loaded at the document end! Or have to use proper on load events
var port = chrome.runtime.connect({name: "viewcount"});
port.postMessage({question: 'getViewCountMan'});
port.onMessage.addListener(function(msg) {
    view_count = msg.count;
    d3.select(".card h1").text(view_count);
});