// Renren Album Downloader by Scott Cheng
// Content script

var conf = {
  btnId: 'talking-gmail-btn'
};

var util = (function() {
  var obj = {};

  obj.getTextElementId = function(maildId, idx) {
    return conf.btnId + '-' + mailId + '-' + idx;
  };

  return obj;
})();

var TextObj = function() {
  this.id = [];
  this.text = '';

  this.addText = function(text) {
    this.text += text;
  };

  this.addId = function(id) {
    this.id.push(id);
  };

  this.br = function() {
    this.text += '\n';
  }
};

var view = (function() {
  var obj = {};

  var $frameContents;
  var $menu;
  var $menuBtn;

  var mailId;

  obj.init = function() {
    var self = this;
    var $frame = $('#canvas_frame');

    $frame.ready(function() {
      $frameContents = $frame.contents();

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
      .appendTo($d0);
    var $d2 = $('<div />')
      .addClass('cj')
      .html(chrome.i18n.getMessage('btnText'))
      .appendTo($d1);

    $btn.appendTo($menu);
  };

  var findMailBody = function($menuBtn) {
    var $wrapper = $menuBtn.closest('div.gs');
    return $wrapper.find('div.ii.gt.adP');
  };

  var readMail = function($mail) {
    mailId = $mail.attr('id');
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
    // readTextMail($mail);

    chrome.extension.sendRequest({
      e: 'speak',
      opt: {
        utterance: $mail.text()
      }
    });
  };

  var readTextMail = function($mail) {
    var contents = $mail.contents().slice();
    $mail.empty();

    var bred = false;
    for (var i in contents) {
      var node = contents[i];

      var textObj = new TextObj;

      if (node.nodeName === "#text") {
        var textEleId = util.getTextElementId(mailId, i);
        $mail.append('<span />')
          .attr('id', textEleId)
          .html(node.data);
        textObj.addText(node.data);
        textObj.addId(textEleId);
      }

      if (node.tagName === 'BR') {
        if (bred) {
          bred = false;

          reader.push(textObj);
          textObj = new TextObj;
        } else {
          bred = true;
          textObj.br();
        }
      } else {
        bred = false;
      }
    }
  };

  var readHTMLMail = function($mail) {
    // TODO
  };

  return obj;
})();

var reader = (function() {
  var obj = {};

  var queue = [];

  var queueReader = function() {
    // TODO
  };

  obj.push = function(textObj) {
    queue.push(textObj);
  };

  return obj;
})();

chrome.extension.sendRequest({
  e: 'visitMail'
});

view.init();