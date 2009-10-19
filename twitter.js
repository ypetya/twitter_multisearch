
Twitter = {

    // plugin defaults
    defaults: {
        preloaderId: "preloader",
        loaderText: "Loading tweets...",
        poller_timeout: 2000,
        poller_thread_timeout: 10000,
        dom_feed_length: 20,
        cache_max_size: 100,
        insert_ad_after: 10,
        callback_name: 'push_json',
        template_item: 
            "<li><div class='clearfix'>" + 
            "<div class='user'><img class='thumbnail'/><div class='floating_text'><div class='user_name'></div><br/>" + 
            "<div class='message'></div></div></div></div></li>"
    },


    is_running: false,
    initialize: function(options){
        Twitter.config = $.extend({}, Twitter.defaults, options);

        Twitter.initialize_twitterbox();

        if(!Twitter.is_running){
            Twitter.is_runnig = true;

            // starting poller instances...
            var searches = Twitter.config.searchCriteria.split(',');
            var url_base = 'http://search.twitter.com/search.json';

            for(var i=0; i < searches.length; i++){
                var url = url_base + "?q=" + escape(searches[i]) + "&callback=" + Twitter.config.callback_name;
                // it will poll twitter.com with searches
                Twitter.refresher( url );
            }
            // it's the cache_poller - dom ui
            Twitter.start_poller();
        }
    },


    initialize_twitterbox: function(){
        Twitter.elem = $('#twitter');
        // hide container element
        $(Twitter.elem).hide();
        // add preLoader to container element
        var pl = $('<p id="' + Twitter.config.preloaderId + '">' + Twitter.config.loaderText+'</p>');
        $(Twitter.elem).append(pl);
        // show container element
        $(Twitter.elem).show();
        $("ul#twitter_update_list").show();
        // link replacer from twitter... we have it in local
        //$.getScript("blogger.js");
    },
   

    create_timestamp: function(){
        var dt = new Date();
        return dt.getTime().toString(); 
    },


    refresher: function(url){
        // remove preLoader from container element
        $("#" + Twitter.config.preloaderId).remove();
        
        console.log('trying to download url : ' + url );
        
        $.getScript(url + '&random=' + Twitter.create_timestamp() );
        setTimeout( function(){ return( Twitter.refresher(url));} , Twitter.config.poller_thread_timeout );
    },


    // from twitter blogger.js
    status_replacer: function(status_msg){
        return status_msg.replace(/((https?|s?ftp|ssh)\:\/\/[^"\s\<\>]*[^.,;'">\:\s\<\>\)\]\!])/g, function(url) {
          return '<a href="'+url+'">'+url+'</a>';
        }).replace(/\B@([_a-z0-9]+)/ig, function(reply) {
          return  reply.charAt(0)+'<a href="http://twitter.com/'+reply.substring(1)+'">'+reply.substring(1)+'</a>';
        }).replace(/\n/g,"")
    },


    ad_counter: 0,
    cache_lock: false,
    cache: [],


    poller: function(){
        console.log('poller, cache_size:' + Twitter.cache.length.toString());
        // berendezzük a cache-t
        Twitter.cache = Twitter.cache.sort(function(a,b){ return( b.id - a.id);});
        // top 20 (and empty lasts from cache)
        var results = [];
        var new_cache = [];

        for( var i = 0; i < Twitter.cache.length && i < Twitter.config.cache_max_size; i++ ){
            
            if( i < Twitter.config.dom_feed_length ) 
                results.push(Twitter.cache[i]);

            new_cache.push( Twitter.cache[i] );
        }

        Twitter.cache = new_cache;

        if(results.length==0) return;

        if( Twitter.ad_counter > Twitter.config.insert_ad_after ){
            Twitter.ad_counter = 0;
            var a = Twitter.adverts[ Math.floor( Math.random() * Twitter.adverts.length) ];
            results.push(a);
        }

        var last_inserted = null;

        for(var i = results.length-1; i >= 0 ;i--){
            var result = results[i];

            if( $('#twitter_update_list').find("li#"+result.id).length == 0 || result.id < 1000 ){

                var template = $(Twitter.config.template_item).clone();
                template.hide();
                template[0].id = result.id.toString();

                if(result.id < 1000 ) $(template[0]).addClass('advert');
                else 
                    Twitter.ad_counter +=1 ;

                $(template.find('.user_name')[0]).html( Twitter.status_replacer( "@" + result.from_user ));
                $(template.find('.thumbnail')[0]).attr('src', result.profile_image_url );
                $(template.find('.message')[0]).html( Twitter.status_replacer(result.text) );

                if(last_inserted == null){
                    if($('#twitter_update_list li:first').size()==0)            
                        $('#twitter_update_list').append(template);
                    else
                        $('#twitter_update_list li:first').before(template);
                }
                else{
                    last_inserted.show();
                    last_inserted.before(template);
                }
                last_inserted = template;
                // 5: max adverts count in dom 
                if($('#twitter_update_list li').size() > Twitter.config.dom_feed_length + 5){
                    $('#twitter_update_list li:last').remove();
                }
            }
        }

        if(last_inserted != null ){
            $("#twitter_update_list li").each(function(){ $(this).removeClass('firstTweet').removeClass('lastTweet');});
            $("ul#twitter_update_list li:first").addClass("firstTweet");
            $("ul#twitter_update_list li:first").show();
            $("ul#twitter_update_list li:last").addClass("lastTweet");
        }
    },



    is_poller_running: false,

    start_poller: function(){

        if( ! Twitter.is_poller_running && ! Twitter.cache_lock ){
            Twitter.cache_lock = Twitter.is_poller_running = true;
            // this will draw
            Twitter.poller();
            Twitter.cache_lock = Twitter.is_poller_running = false;
        }
        setTimeout('Twitter.start_poller();', Twitter.config.poller_timeout);
    },


    // it generates a timeout in millisec range: ( 100 .. 1000 )
    generate_random_wait_time: function(){ 100 * ( Math.ceil(Math.random()*10)) },


    push_json: function(resp){
        if( Twitter.cache_lock ){
            setTimeout( function(){ return( Twitter.push_json(resp)); }, 
                    Twitter.generate_random_wait_time() );
        }
        else {
            Twitter.cache_lock = true;
            
            for(var i=0; i < resp.results.length; i++){
                var element = resp.results[i];
                var j = 0;

                for(j=0; j < Twitter.cache.length; j++){
                    if( Twitter.cache[j].id == element.id ) break;
                }
                if(j == Twitter.cache.length ){
                    Twitter.cache.unshift(element);
                }
            }
            Twitter.cache_lock = false;
        }
    
    }
}


//handle callback from outside
function push_json(resp){
    Twitter.push_json(resp);
}


//jQuery hook
$.fn.getTwitter = function(options){
    Twitter.initialize(options);
}
