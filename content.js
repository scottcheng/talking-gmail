// Renren Album Downloader by Scott Cheng
// Content script

var conf = {
  btnId: 'talking-gmail-btn'
};

var view = (function() {
  var obj = {};

  var $frameContents;

  obj.init = function() {
    var self = this;
    var $frame = $('#canvas_frame');

    $frame.ready(function() {
      $frameContents = $frame.contents();

      var menuBtnSel = 'div.T-I.J-J5-Ji.T-I-Js-Gs.aap.T-I-awG.T-I-ax7.L3';
      $frameContents.on('click', menuBtnSel, function() {
        if ($frameContents.find('#' + conf.btnId).length === 0) {
          addBtn();
        }
      }).on('click', '#' + conf.btnId, function() {
        console.log('btn clicked');
      }).on('mouseover', '#' + conf.btnId, function() {
        $(this).addClass('J-N-JT');
      }).on('mouseleave', '#' + conf.btnId, function() {
        $(this).removeClass('J-N-JT');
      });
    });
  };

  var addBtn = function() {
    console.log('render');

    var $menu = $frameContents.find('div[role="menu"][class="b7 J-M"]');
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

  return obj;
})();

chrome.extension.sendRequest({
  e: 'visitMail'
});

view.init();