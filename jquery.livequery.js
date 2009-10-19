/*! Copyright (c) 2008 Brandon Aaron (http://brandonaaron.net)
 * Dual licensed under the MIT (http://www.opensource.org/licenses/mit-license.php) 
 * and GPL (http://www.opensource.org/licenses/gpl-license.php) licenses.
 *
 * Version: 1.0.3
 * Requires jQuery 1.1.3+
 * Docs: http://docs.jquery.com/Plugins/livequery
 */

(function(jQuery) {
	
jQuery.extend(jQuery.fn, {
	livequery: function(type, fn, fn2) {
		var self = this, q;
		
		// Handle different call patterns
		if (jQuery.isFunction(type))
			fn2 = fn, fn = type, type = undefined;
			
		// See if Live Query already exists
		jQuery.each( jQuery.livequery.queries, function(i, query) {
			if ( self.selector == query.selector && self.context == query.context &&
				type == query.type && (!fn || fn.jQuerylqguid == query.fn.jQuerylqguid) && (!fn2 || fn2.jQuerylqguid == query.fn2.jQuerylqguid) )
					// Found the query, exit the each loop
					return (q = query) && false;
		});
		
		// Create new Live Query if it wasn't found
		q = q || new jQuery.livequery(this.selector, this.context, type, fn, fn2);
		
		// Make sure it is running
		q.stopped = false;
		
		// Run it immediately for the first time
		q.run();
		
		// Contnue the chain
		return this;
	},
	
	expire: function(type, fn, fn2) {
		var self = this;
		
		// Handle different call patterns
		if (jQuery.isFunction(type))
			fn2 = fn, fn = type, type = undefined;
			
		// Find the Live Query based on arguments and stop it
		jQuery.each( jQuery.livequery.queries, function(i, query) {
			if ( self.selector == query.selector && self.context == query.context && 
				(!type || type == query.type) && (!fn || fn.jQuerylqguid == query.fn.jQuerylqguid) && (!fn2 || fn2.jQuerylqguid == query.fn2.jQuerylqguid) && !this.stopped )
					jQuery.livequery.stop(query.id);
		});
		
		// Continue the chain
		return this;
	}
});

jQuery.livequery = function(selector, context, type, fn, fn2) {
	this.selector = selector;
	this.context  = context || document;
	this.type     = type;
	this.fn       = fn;
	this.fn2      = fn2;
	this.elements = [];
	this.stopped  = false;
	
	// The id is the index of the Live Query in jQuery.livequery.queries
	this.id = jQuery.livequery.queries.push(this)-1;
	
	// Mark the functions for matching later on
	fn.jQuerylqguid = fn.jQuerylqguid || jQuery.livequery.guid++;
	if (fn2) fn2.jQuerylqguid = fn2.jQuerylqguid || jQuery.livequery.guid++;
	
	// Return the Live Query
	return this;
};

jQuery.livequery.prototype = {
	stop: function() {
		var query = this;
		
		if ( this.type )
			// Unbind all bound events
			this.elements.unbind(this.type, this.fn);
		else if (this.fn2)
			// Call the second function for all matched elements
			this.elements.each(function(i, el) {
				query.fn2.apply(el);
			});
			
		// Clear out matched elements
		this.elements = [];
		
		// Stop the Live Query from running until restarted
		this.stopped = true;
	},
	
	run: function() {
		// Short-circuit if stopped
		if ( this.stopped ) return;
		var query = this;
		
		var oEls = this.elements,
			els  = jQuery(this.selector, this.context),
			nEls = els.not(oEls);
		
		// Set elements to the latest set of matched elements
		this.elements = els;
		
		if (this.type) {
			// Bind events to newly matched elements
			nEls.bind(this.type, this.fn);
			
			// Unbind events to elements no longer matched
			if (oEls.length > 0)
				jQuery.each(oEls, function(i, el) {
					if ( jQuery.inArray(el, els) < 0 )
						jQuery.event.remove(el, query.type, query.fn);
				});
		}
		else {
			// Call the first function for newly matched elements
			nEls.each(function() {
				query.fn.apply(this);
			});
			
			// Call the second function for elements no longer matched
			if ( this.fn2 && oEls.length > 0 )
				jQuery.each(oEls, function(i, el) {
					if ( jQuery.inArray(el, els) < 0 )
						query.fn2.apply(el);
				});
		}
	}
};

jQuery.extend(jQuery.livequery, {
	guid: 0,
	queries: [],
	queue: [],
	running: false,
	timeout: null,
	
	checkQueue: function() {
		if ( jQuery.livequery.running && jQuery.livequery.queue.length ) {
			var length = jQuery.livequery.queue.length;
			// Run each Live Query currently in the queue
			while ( length-- )
				jQuery.livequery.queries[ jQuery.livequery.queue.shift() ].run();
		}
	},
	
	pause: function() {
		// Don't run anymore Live Queries until restarted
		jQuery.livequery.running = false;
	},
	
	play: function() {
		// Restart Live Queries
		jQuery.livequery.running = true;
		// Request a run of the Live Queries
		jQuery.livequery.run();
	},
	
	registerPlugin: function() {
		jQuery.each( arguments, function(i,n) {
			// Short-circuit if the method doesn't exist
			if (!jQuery.fn[n]) return;
			
			// Save a reference to the original method
			var old = jQuery.fn[n];
			
			// Create a new method
			jQuery.fn[n] = function() {
				// Call the original method
				var r = old.apply(this, arguments);
				
				// Request a run of the Live Queries
				jQuery.livequery.run();
				
				// Return the original methods result
				return r;
			}
		});
	},
	
	run: function(id) {
		if (id != undefined) {
			// Put the particular Live Query in the queue if it doesn't already exist
			if ( jQuery.inArray(id, jQuery.livequery.queue) < 0 )
				jQuery.livequery.queue.push( id );
		}
		else
			// Put each Live Query in the queue if it doesn't already exist
			jQuery.each( jQuery.livequery.queries, function(id) {
				if ( jQuery.inArray(id, jQuery.livequery.queue) < 0 )
					jQuery.livequery.queue.push( id );
			});
		
		// Clear timeout if it already exists
		if (jQuery.livequery.timeout) clearTimeout(jQuery.livequery.timeout);
		// Create a timeout to check the queue and actually run the Live Queries
		jQuery.livequery.timeout = setTimeout(jQuery.livequery.checkQueue, 20);
	},
	
	stop: function(id) {
		if (id != undefined)
			// Stop are particular Live Query
			jQuery.livequery.queries[ id ].stop();
		else
			// Stop all Live Queries
			jQuery.each( jQuery.livequery.queries, function(id) {
				jQuery.livequery.queries[ id ].stop();
			});
	}
});

// Register core DOM manipulation methods
jQuery.livequery.registerPlugin('append', 'prepend', 'after', 'before', 'wrap', 'attr', 'removeAttr', 'addClass', 'removeClass', 'toggleClass', 'empty', 'remove');

// Run Live Queries when the Document is ready
jQuery(function() { jQuery.livequery.play(); });


// Save a reference to the original init method
var init = jQuery.prototype.init;

// Create a new init method that exposes two new properties: selector and context
jQuery.prototype.init = function(a,c) {
	// Call the original init and save the result
	var r = init.apply(this, arguments);
	
	// Copy over properties if they exist already
	if (a && a.selector)
		r.context = a.context, r.selector = a.selector;
		
	// Set properties
	if ( typeof a == 'string' )
		r.context = c || document, r.selector = a;
	
	// Return the result
	return r;
};

// Give the init function the jQuery prototype for later instantiation (needed after Rev 4091)
jQuery.prototype.init.prototype = jQuery.prototype;
	
})(jQuery);
