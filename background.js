// Talking Gmail by Scott Cheng
// Background script

var _gaq = _gaq || [];
// _gaq.push(['_setAccount', '']);
// _gaq.push(['_trackPageview']);

// (function() {
//   var ga = document.createElement('script'); ga.type = 'text/javascript'; ga.async = true;
//   ga.src = 'https://ssl.google-analytics.com/ga.js';
//   var s = document.getElementsByTagName('script')[0]; s.parentNode.insertBefore(ga, s);
// })();

var msgListeners = {
  speak: function(opt, port) {
    chrome.tts.speak(opt.utterance, {
      onEvent: function(e) {
        if (e.type === 'end') {
          port.postMessage({
            e: 'end'
          });
        }
      }
    });

  },
  stopSpeaking: function() {
    chrome.tts.stop();
  }
};

var reqListeners = {
  visitGmail: function(opt, sender) {
    _gaq.push(['_trackEvent', 'Gmail', 'visit']);
  },
  readTextMail: function(opt, sender) {
    _gaq.push(['_trackEvent', 'Reader', 'readTextMail']);
  },
  readHTMLMail: function(opt, sender) {
    _gaq.push(['_trackEvent', 'Reader', 'readHTMLMail']);
  },
  startReading: function(opt, sender) {
    _gaq.push(['_trackEvent', 'Reader', 'startReading']);
  },
  ctrlerPrev: function(opt, sender) {
    _gaq.push(['_trackEvent', 'Controller', 'previous']);
  },
  ctrlerNext: function(opt, sender) {
    _gaq.push(['_trackEvent', 'Controller', 'next']);
  },
  ctrlerResume: function(opt, sender) {
    _gaq.push(['_trackEvent', 'Controller', 'resume']);
  },
  ctrlerPause: function(opt, sender) {
    _gaq.push(['_trackEvent', 'Controller', 'pause']);
  },
  ctrlerStop: function(opt, sender) {
    _gaq.push(['_trackEvent', 'Controller', 'stop']);
  }
};

chrome.extension.onConnect.addListener(function(port) {
  port.onMessage.addListener(function(msg) {
    var func = msgListeners[msg.e];
    func && func(msg.opt, port);
  });
});

chrome.extension.onRequest.addListener(function(req, sender, sendResponse) {
  var func = reqListeners[req.e];
  var ret;
  func && (ret = func(req.opt, sender));
  ret && sendResponse(ret);
});
