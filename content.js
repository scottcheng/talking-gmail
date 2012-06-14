// Talking Gmail by Scott Cheng
// Content script

var conf = {
  btnId: 'talking-gmail-btn',
  textClass: 'talking-gmail-text',
  readingClass: 'talking-gmail-reading',
  hiltClass: 'talking-gmail-highlight',
  ctrlerId: 'talking-gmail-controller'
};

var util = (function() {
  var obj = {};

  obj.getTextElementId = function(mailId, idx) {
    return conf.btnId + '-' + mailId.replace(':', '') + '-' + idx;
  };

  return obj;
})();

var TextObj = function(text, id) {
  var priv = {
    ids: [],
    text: ''
  };

  (text !== undefined) && (priv.text = text);
  (id !== undefined) && priv.ids.push(id);

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

  this.isEmpty = function() {
    return priv.text.length === 0;
  };
};

var view = (function() {
  var obj = {};

  var $frameContents;
  var $menu;
  var $menuBtn;
  var $curHilt;  // Current highlit elements
  var $ctrler;

  var mailId;
  var readMailList = [];  // A list of ids of the emails already read

  obj.init = function() {
    var self = this;
    var $frame = $('#canvas_frame');

    $frame.ready(function() {
      $frameContents = $frame.contents();

      // Insert css
      $('<link />')
        .attr({
          rel: 'stylesheet',
          type: 'text/css',
          href: chrome.extension.getURL('style.css')
        })
        .appendTo($frameContents.find('head'));

      // Add menu item
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
        readMail($mailBody.children().filter(function() {
          return !isQuoteEle($(this))
        }));
      }).on('mouseover', '#' + conf.btnId, function() {
        $(this).addClass('J-N-JT');
      }).on('mouseleave', '#' + conf.btnId, function() {
        $(this).removeClass('J-N-JT');
      });

      // Add controller
      var $mailViewWrapper = $frameContents.find('.AO');
      $ctrler = $('<div />')
        .attr('id', conf.ctrlerId)
        .html('test ctrler');
      // $ctrler.appendTo($mailViewWrapper);
    });

    window.addEventListener('hashchange', function() {
      onHashchange();
      reader.onHashchange();
    });

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
      $mail.find('.' + conf.textClass).addClass(conf.readingClass);
      reader.readAgain(mailId);
      return;
    }
    readMailList.push(mailId);

    reader.newMail(mailId);

    var $divs = $mail.children('div');
    var isHTML = false;
    $divs.each(function(idx, ele) {
      var $ele = $(ele);
      if (!isQuoteEle($ele)) {
        isHTML = true;
        return false;
      }
    });

    isHTML ? readHTMLMail($mail) : readTextMail($mail);
  };

  var readTextMail = function($mail) {
    // Replace all text nodes with spans, and send them to reader
    // Other elements are put back as they were

    var contents = $mail.contents();
    $mail.empty();

    var textObj = new TextObj;
    var endParagraph = function() {
      if (!textObj.isEmpty()) {
        reader.push(textObj);
        textObj = new TextObj;
      }
    };
    var len = contents.length;
    var bred = false;
    for (var i = 0; i < len; i++) {
      var node = contents[i];

      if (node.nodeName === "#text") {
        bred = false;
        if ($.trim(node.data).length === 0) {
          endParagraph();
          continue;
        }

        var textEleId = getTextElementId();
        var $span = $('<span />')
          .attr('id', textEleId)
          .addClass(conf.readingClass + ' ' + conf.textClass)
          .html(node.data)
          .appendTo($mail);
        textObj.addText(node.data);
        textObj.addId(textEleId);
      } else {
        var $node = $(node);
        if ($node.is('br')) {
          if (bred) {
            endParagraph();
            bred = false;
          } else {
            bred = true;
          }
        }
        $node.appendTo($mail);
      }
    }
    reader
      .push(textObj)
      .startReading();
  };

  var readHTMLMail = function($mail) {
    // DFS all nodes in $mail, replace text nodes with spans

    var contents = $mail.contents();
    var $newMail = $('<div />');

    var dfs = function(ele, $parent, isLast) {
      if (ele.nodeName === '#text') {
        var textEleId = getTextElementId();
        $('<span />')
          .attr('id', textEleId)
          .addClass(conf.readingClass + ' ' + conf.textClass)
          .html(ele.data)
          .appendTo($parent);
        reader.push(new TextObj(ele.data, textEleId));
      } else {
        var $ele = $(ele);
        if (isQuoteEle($ele) || !$ele.is(':visible')) {
          // Mute this node
          $ele.appendTo($parent);
        } else {
          // Audible node, go on with dfs
          var eleContents = $ele.contents();
          var $newParent = $ele.clone().empty().appendTo($parent);
          var len = eleContents.length;
          for (var i = 0; i < len; i++) {
            dfs(eleContents[i], $newParent);
          }
        }
      }
      if (isLast) {
        $mail
          .empty()
          .append($newMail.children());
        reader.startReading();
      }
    };

    var len = contents.length;
    for (var i = 0; i < len - 1; i++) {
      dfs(contents[i], $newMail);
    }
    dfs(contents[len - 1], $newMail, true);
  };

  obj.highlight = function(ids) {
    $curHilt && $curHilt.removeClass(conf.hiltClass);

    var sel = ids.map(function(ele) {
      return '#' + ele;
    }).join(',');

    $curHilt = $frameContents.find(sel).addClass(conf.hiltClass);

    return this;
  };

  var onHashchange = function() {
    readMailList = [];
  };

  obj.finishMail = function() {
    $frameContents.find('.' + conf.hiltClass).removeClass(conf.hiltClass);
    $frameContents.find('.' + conf.readingClass).removeClass(conf.readingClass);
    return this;
  };

  var isQuoteEle = function($ele) {
    if ($ele.hasClass('yj6qo') || $ele.hasClass('adL') || $ele.hasClass('im')) {
      return true;
    } else if ($ele.is('div')) {
      var $children = $ele.children();
      if ($children.length === 2 && $children.is('.adm') && $children.is('.h5')) {
        return true;
      }
    }
    return false;
  };

  var getTextElementId = (function() {
    var i = 0;
    return function() {
      return conf.textClass + (i++);
    };
  })();

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
    view.finishMail();
  };

  obj.switchTo = function(mailId) {
    this.stop();
    curMailId = mailId;
    return this;
  };

  obj.readAgain = function() {
    return this.startReading();
  };

  obj.startReading = function() {
    initPort();
    readQueue(0);
    return this;
  };

  obj.newMail = function() {
    queues[curMailId] = [];
    queues[curMailId].pos = 0;
    return this;
  };

  obj.push = function(textObj) {
    queues[curMailId].push(textObj);
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
    // TODO
    return this;
  };

  obj.prev = function() {
    // TODO
    return this;
  };

  obj.onHashchange = function() {
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