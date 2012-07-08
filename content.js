var conf = {
  btnId: 'talking-gmail-btn',
  btnImgId: 'talking-gmail-btn-img',
  textClass: 'talking-gmail-text',
  readingClass: 'talking-gmail-reading',
  hiltClass: 'talking-gmail-highlight',
  ctrlerWrapperId: 'talking-gmail-controller-wrapper',
  ctrlerId: 'talking-gmail-controller',
  btnWrapperId: 'talking-gmail-controller-btn-wrapper',
  btnClass: 'T-I J-J5-Ji T-I-awG T-I-ax7',
  btnLeftClass: 'T-I-Js-IF',
  btnRightClass: 'T-I-Js-Gs',
  btnHoverClass: 'T-I-JW',
  prevBtnId: 'talking-gmail-controller-prev-btn',
  nextBtnId: 'talking-gmail-controller-next-btn',
  pauseBtnId: 'talking-gmail-controller-pause-btn',
  stopBtnId: 'talking-gmail-controller-stop-btn',
  ctrlerLogoId: 'talking-gmail-controller-logo'
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
    return $.trim(priv.text).length === 0;
  };
};

var view = (function() {
  var obj = {};

  var $frameContents;
  var $menu;
  var $menuBtn;
  var $curHilt;  // Current highlit elements

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
    });

    window.addEventListener('hashchange', function() {
      onHashchange();
      reader.onHashchange();
    });
    $(window).unload(function() {
      reader.stop();
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
      .html(chrome.i18n.getMessage('menuBtnText'))
      .appendTo($d0);
    var $icon = $('<img />')
      .attr({
        id: conf.btnImgId,
        src: 'images/cleardot.gif'
      })
      .addClass('f4 J-N-JX')
      .prependTo($d1);

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
    chrome.extension.sendRequest({
      e: 'readTextMail'
    });

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
    chrome.extension.sendRequest({
      e: 'readHTMLMail'
    });

    // DFS all nodes in $mail, replace text nodes with spans

    var contents = $mail.contents();
    var $newMail = $('<div />');

    var textObj = new TextObj;
    var dfs = function(ele, $parent, isLast) {
      if (ele.nodeName === '#text') {
        var textEleId = getTextElementId();
        $('<span />')
          .attr('id', textEleId)
          .addClass(conf.readingClass + ' ' + conf.textClass)
          .html(ele.data)
          .appendTo($parent);
        textObj
          .addText(ele.data)
          .addId(textEleId);
      } else {
        var $ele = $(ele);
        if (isQuoteEle($ele) || !$ele.is(':visible')) {
          // Mute this node
          $ele.appendTo($parent);
        } else {
          // Push textObj if $ele is a block element
          if ($ele.is('div, p, blockquote, pre, table, dl, ul, ol, li, hr, h1, h2, h3, h4, h5, h6')) {
            if (!textObj.isEmpty()) {
              reader.push(textObj);
            }
            textObj = new TextObj;
          }

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
        if (!textObj.isEmpty()) {
          reader.push(textObj);
        }
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
    view.ctrler.remove();
  };

  obj.clearHighlight = function() {
    $frameContents && $frameContents.find('.' + conf.textClass)
      .removeClass(conf.hiltClass)
      .removeClass(conf.readingClass);
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

  obj.ctrler = (function() {
    var obj = {};
    var $wrapper;
    var $ctrler;
    var $logo;
    var $prevBtn;
    var $nextBtn;
    var $pauseBtn;
    var $stopBtn;
    var isPaused = false;

    var addController = function() {
      var self = this;
      var $mailViewWrapper = $frameContents.find('.AO');
      $wrapper = $('<div />')
        .attr('id', conf.ctrlerWrapperId);
      $ctrler = $('<div />')
        .attr('id', conf.ctrlerId)
        .appendTo($wrapper);
      var $btnWrapper = $('<div />')
        .attr('id', conf.btnWrapperId)
        .appendTo($ctrler);
      $prevBtn = $('<div />')
        .addClass(conf.btnClass)
        .addClass(conf.btnLeftClass)
        .attr({
          id: conf.prevBtnId,
          'data-tooltip': chrome.i18n.getMessage('btnTooltipPrev')
        }).appendTo($btnWrapper);
      $stopBtn = $('<div />')
        .addClass(conf.btnClass)
        .addClass(conf.btnLeftClass)
        .addClass(conf.btnRightClass)
        .attr({
          id: conf.stopBtnId,
          'data-tooltip': chrome.i18n.getMessage('btnTooltipStop')
        }).appendTo($btnWrapper);
      $pauseBtn = $('<div />')
        .addClass(conf.btnClass)
        .addClass(conf.btnLeftClass)
        .addClass(conf.btnRightClass)
        .attr({
          id: conf.pauseBtnId,
          'data-tooltip': chrome.i18n.getMessage('btnTooltipPause')
        }).appendTo($btnWrapper);
      $nextBtn = $('<div />')
        .addClass(conf.btnClass)
        .addClass(conf.btnRightClass)
        .attr({
          id: conf.nextBtnId,
          'data-tooltip': chrome.i18n.getMessage('btnTooltipNext')
        }).appendTo($btnWrapper);

      $logo = $('<div />')
        .attr('id', conf.ctrlerLogoId)
        .html('Talking Gmail')
        .appendTo($ctrler);

      $wrapper.hover(function() {
        $(this).addClass('expanded');
      }, function() {
        if (!isPaused) {
          $(this).removeClass('expanded');
        }
      })
      $wrapper.find('.T-I').hover(function() {
        $(this).addClass(conf.btnHoverClass);
      }, function() {
        $(this).removeClass(conf.btnHoverClass);
      });

      $wrapper.on('click', '#' + conf.prevBtnId, function() {
        chrome.extension.sendRequest({
          e: 'ctrlerPrev'
        });

        if (isPaused) {
          resumeView();
        }
        reader.prev();
      }).on('click', '#' + conf.nextBtnId, function() {
        chrome.extension.sendRequest({
          e: 'ctrlerNext'
        });

        if (isPaused) {
          resumeView();
        }
        reader.next();
      }).on('click', '#' + conf.pauseBtnId, function() {
        var $this = $(this);
        if (isPaused) {
          chrome.extension.sendRequest({
            e: 'ctrlerResume'
          });

          resumeView();
          reader.resume();
        } else {
          chrome.extension.sendRequest({
            e: 'ctrlerPause'
          });

          isPaused = true;
          $this
            .addClass('paused')
            .attr('data-tooltip', chrome.i18n.getMessage('btnTooltipResume'));
          reader.pause();
        }
      }).on('click', '#' + conf.stopBtnId, function() {
        chrome.extension.sendRequest({
          e: 'ctrlerStop'
        });

        if (isPaused) {
          resumeView();
        }
        reader.stop();
      });

      $wrapper.appendTo($mailViewWrapper);
      return this;
    };

    var resumeView = function() {
      isPaused = false;
      $pauseBtn && $pauseBtn
        .removeClass('paused')
        .attr('data-tooltip', chrome.i18n.getMessage('btnTooltipPause'));
    };

    obj.show = function() {
      $wrapper || addController.call(this);
      $wrapper.addClass('visible');
      return this;
    };

    obj.remove = function() {
      $wrapper && $wrapper.removeClass('expanded visible');
      resumeView();
      return this;
    };

    return obj;
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
    if (idx !== undefined) {
      queues[curMailId].pos = idx;
    } else {
      idx = queues[curMailId].pos;
    }
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
          onEnd();
          readQueue(queues[curMailId].pos + 1);
        }
      });
    }
  };

  var onEnd = function() {
    // on finishing speaking an item
    isReading = false;
  };

  var finish = function() {
    // Finish an mail
    view.ctrler.remove();
    isReading = false;
    view.clearHighlight();
  };

  obj.switchTo = function(mailId) {
    // Switch to a new mail
    this.stop();
    curMailId = mailId;
    return this;
  };

  obj.readAgain = function() {
    // Read the same mail again
    return this.startReading();
  };

  obj.startReading = function() {
    chrome.extension.sendRequest({
      e: 'startReading'
    });
    view.ctrler.show();
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
    // Force stop
    this.pause();
    finish();
    return this;
  };

  obj.pause = function() {
    initPort();
    isReading = false;
    port.postMessage({
      e: 'stopSpeaking'
    });
    return this;
  };

  obj.resume = function() {
    readQueue();
    return this;
  };

  obj.next = function() {
    var len = queues[curMailId].length;
    var idx = queues[curMailId].pos + 1;
    if (idx < len) {
      this.pause();
      readQueue(idx);
    }
    return this;
  };

  obj.prev = function() {
    var idx = queues[curMailId].pos - 1;
    if (idx >= 0) {
      this.pause();
      readQueue(idx);
    }
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
  e: 'visitGmail'
});

view.init();