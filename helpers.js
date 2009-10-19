
/*{{{ helpers */

$.fn.extend({
  up: function(selector)
  {
    var found = "";
    selector = $.trim(selector || "");
    $(this).parents().each(function()
    {
      if (selector.length == 0 || $(this).is(selector))
        {
          found = this;
          return false;
        }
    });
    return $(found);
  }
});

$.fn.extend({
  getHref: function() {
    var host = document.location.host;
    var href = $(this)[0].getAttribute('href');
    if ($(this)[0].getAttribute('href').match(host)) {
      var l = href.search(host)+host.length;
      var href = href.substring(l);
    }
    return href;
  }
});

var isdefined = function(variable){
  return (typeof(variable) == "undefined") ? false : true;
}

var get_timestamp = function(){
  return '?' + (new Date()).getTime().toString();
}
/*}}}*/
