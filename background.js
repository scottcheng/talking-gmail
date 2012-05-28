// Renren Album Downloader by Scott Cheng
// Background script

var _gaq = _gaq || [];
// _gaq.push(['_setAccount', '']);
// _gaq.push(['_trackPageview']);

// (function() {
//   var ga = document.createElement('script'); ga.type = 'text/javascript'; ga.async = true;
//   ga.src = 'https://ssl.google-analytics.com/ga.js';
//   var s = document.getElementsByTagName('script')[0]; s.parentNode.insertBefore(ga, s);
// })();

var reqListeners = {
  visitMail: function(opt, sender) {
    _gaq.push(['_trackEvent', 'Mail', 'visit']);
  }
};

chrome.extension.onRequest.addListener(
  function(req, sender, sendResponse) {
    var func = reqListeners[req.e];
    var ret = func(req.opt, sender);
    if (ret) {
      sendResponse();
    }
});