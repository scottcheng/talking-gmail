// Talking Gmail by Scott Cheng
// Content script

var conf = {
  btnId: 'talking-gmail-btn',
  textClass: 'talking-gmail-text',
  readingClass: 'talking-gmail-reading',
  hiltClass: 'talking-gmail-highlight'
};

var util = (function() {
  var obj = {};

  obj.getTextElementId = function(mailId, idx) {
    return conf.btnId + '-' + mailId.replace(':', '') + '-' + idx;
  };

  return obj;
})();

var TextObj = function() {
  var priv = {
    ids: [],
    text: ''
  };

  this.addText = function(text) {
    priv.text += text + ' ';
    return this;
  };

  this.addId = function(id) {
    priv.ids.push(id);
    return this;
  };

  this.getText = function() {
    return priv.text;
  };

  this.getIds = function() {
    return priv.ids;
  };
};

var view = (function() {
  var obj = {};

  var $frameContents;
  var $menu;
  var $menuBtn;
  var $curHilt;  // Current highlit elements
  var mailTexts = [];  // List of reformatted email text

  var mailId;
  var readMailList = [];  // A list of ids of the emails already read

  obj.init = function() {
    var self = this;
    var $frame = $('#canvas_frame');

    $frame.ready(function() {
      $frameContents = $frame.contents();

      $('<link />')
        .attr({
          rel: 'stylesheet',
          type: 'text/css',
          href: chrome.extension.getURL('style.css')
        })
        .appendTo($frameContents.find('head'));

      var menuBtnSel = 'div.T-I.J-J5-Ji.T-I-Js-Gs.aap.T-I-awG.T-I-ax7.L3';
      $frameContents.on('click', menuBtnSel, function() {
        $menuBtn = $(this);
        if ($frameContents.find('#' + conf.btnId).length === 0) {
          addBtn();
        }
      }).on('click', '#' + conf.btnId, function() {
        // Fire click on the menu button
        var evt = document.createEvent("HTMLEvents");
        evt.initEvent('click', true, true);
        $menuBtn[0].dispatchEvent(evt);

        var $mailBody = findMailBody($menuBtn);
        readMail($mailBody.children());
      }).on('mouseover', '#' + conf.btnId, function() {
        $(this).addClass('J-N-JT');
      }).on('mouseleave', '#' + conf.btnId, function() {
        $(this).removeClass('J-N-JT');
      });
    });

    window.onhashchange = function() {
      clearHash();
      reader.clearHash();
    };

    return this;
  };

  var addBtn = function() {
    $menu = $frameContents.find('div[role="menu"][class="b7 J-M"]');

    var $btn = $('<div />')
      .addClass('J-N')
      .attr({
        id: conf.btnId,
        role: 'menuitem',
        style: '-webkit-user-select: none;'
      });
    var $d0 = $('<div />')
      .addClass('J-N-Jz')
      .appendTo($btn);
    var $d1 = $('<div />')
      .addClass('cj')
      .html(chrome.i18n.getMessage('btnText'))
      .appendTo($d0);

    $btn.appendTo($menu);
  };

  var findMailBody = function($menuBtn) {
    var $wrapper = $menuBtn.closest('div.gs');
    return $wrapper.find('div.ii.gt.adP');
  };

  var readMail = function($mail) {
    mailId = $mail.attr('id');
    reader.switchTo(mailId);

    if (readMailList.indexOf(mailId) >= 0) {
      reader.readAgain(mailId);
      return;
    }
    readMailList.push(mailId);

    reader.newMail(mailId);

    var $divs = $mail.children('div');
    $divs.each(function(idx, ele) {
      var $ele = $(ele);
      if (!$ele.hasClass('yj6qo') && !$ele.hasClass('adL')) {
        // HTML
        // readHTMLMail($mail);
        return;
      }
    });

    // Plain text
    readTextMail($mail);

    // chrome.extension.sendRequest({
    //   e: 'speak',
    //   opt: {
    //     utterance: $mail.text()
    //   }
    // });
  };

  var readTextMail = function($mail) {
    var contents = $mail.contents().slice();

    // Email unread
    $mail.empty();

    var textObj = new TextObj;
    var len = contents.length;
    for (var i = 0; i < len; i++) {
      var node = contents[i];

      if (node.nodeName === "#text") {
        if ($.trim(node.data).length === 0) {
          reader.push(textObj);
          textObj = new TextObj;
          continue;
        }

        // Replace the text node with a span
        var textEleId = util.getTextElementId(mailId, i);
        var $span = $('<span />')
          .attr('id', textEleId)
          .addClass(conf.readingClass + ' ' + conf.textClass)
          .html(node.data)
          .appendTo($mail);
        mailTexts.push($span);
        textObj.addText(node.data);
        textObj.addId(textEleId);
      } else {
        $(node).appendTo($mail);
      }
    }
    reader.push(textObj);
  };

  var readHTMLMail = function($mail) {
    // TODO
  };

  obj.highlight = function(ids) {
    $curHilt && $curHilt.removeClass(conf.hiltClass);

    var sel = ids.map(function(ele) {
      return '#' + ele;
    }).join(',');

    $curHilt = $frameContents.find(sel).addClass(conf.hiltClass);

    return this;
  };

  var clearHash = function() {
    readMailList = [];
  };

  obj.clearMail = function() {
    var len = mailTexts.length;
    for (var i = 0; i < len; i++) {
      mailTexts[i].removeClass(conf.hiltClass + ' ' + conf.readingClass);
    }
    mailTexts = [];
    return this;
  };

  return obj;
})();

var reader = (function() {
  var obj = {};
  var port = null;

  var queues = {};
  var curMailId = null;

  var isReading = false;

  var readQueue = function(idx) {
    (idx !== undefined) || (idx = queues[curMailId].pos);
    var textObj = queues[curMailId][idx];
    if (textObj) {
      isReading = true;
      port.postMessage({
        e: 'speak',
        opt: {
          utterance: textObj.getText()
        }
      });
      view.highlight(textObj.getIds());
      queues[curMailId].pos = idx + 1;
    } else {
      finish();
    }
  };

  var initPort = function() {
    if (!port) {
      // Initiate port connection
      port = chrome.extension.connect();
      port.onMessage.addListener(function(msg) {
        if (msg.e === 'end') {
          end();
          readQueue();
        }
      });
    }
  };

  var end = function() {
    isReading = false;
  };

  var finish = function() {
    isReading = false;
    view.clearMail();
  };

  obj.switchTo = function(mailId) {
    this.stop();
    curMailId = mailId;
    return this;
  };

  obj.readAgain = function() {
    readQueue(0);
    return this;
  };

  obj.newMail = function() {
    queues[curMailId] = [];
    queues[curMailId].pos = 0;
    return this;
  };

  obj.push = function(textObj) {
    initPort();
    queues[curMailId].push(textObj);
    if (!isReading) {
      readQueue();
    }
    return this;
  };

  obj.stop = function() {
    initPort();
    finish();
    port.postMessage({
      e: 'stopSpeaking'
    });
    return this;
  };

  obj.next = function() {
    return this;
  };

  obj.prev = function() {
    return this;
  };

  obj.clearHash = function() {
    queues = {};
    curMailId = null;
    this.stop();
  };

  return obj;
})();

chrome.extension.sendRequest({
  e: 'visitMail'
});

view.init();