// resp0nsv

//var originTab = JSON.parse(decodeURI(window.location.search.substring(5)));
//console.log('originTab: ' + JSON.stringify(originTab));

var url = decodeURIComponent(window.location.search.substring(5));

var resizer = $('#resizer'),
	viewport = $('#viewport'),
	inputURL = $('#src'),
	refresh = $('#refresh'),
	inputWidth = $('#size-w'),
	inputHeight = $('#size-h'),
	rotate = $('#rotate'),
	presetSelect = $('#presets'),
	addPreset = $('#add-preset'),
	addPresetDialog = $('#add-preset-dialog'),
	iframeFix = $('<div class="iframe-fix" />');

var options;

var verbose = true;

var analyticeLoaded = false,
	_gaq = [];

var input = {
	init : function() {
		// size can be changed with arrow keys & mouse wheel
		$().add(inputWidth).add(inputHeight).change(function(e) {
			resp0nsv.setWidth(input.getWidth());
			resp0nsv.setHeight(input.getHeight());
			return false;
		});
		// init url input listener
		inputURL.keypress(function(e) {
			// check for ENTER
			if (e.which == 13) {
				// submit
				var inURL = input.getSource();
				var regex = /^[https?:\/\/|file:\/\/].*/i;
				if (!regex.test(inURL)) {
					input.setSource('http://' + inURL);
				}
				resp0nsv.setSource(input.getSource());
				return false;
			}
		});
		// init rotate button listener
		rotate.click(function(e) {
			var w = input.getWidth();
			var h = input.getHeight();
			//input.setWidth(h);
			//input.setHeight(w);
			input.setSize(h, w);
			resp0nsv.setSize();
		});
		// init refresh button listener
		refresh.click(function(e) {
			//resp0nsv.setSource(input.getSource());
			if (input.getSource() !== viewport.attr('src'))
				input.setSource(viewport.attr('src'));
			resp0nsv.refresh();
		});
		// init preset select listener
		presetSelect.change(function(e) {
			var val = input.presets.getValue();
			if (val && val !== 'default') {
				resp0nsv.applyPreset(val);
			}
		});
		// init add preset dialog
		addPresetDialog.dialog({
			autoOpen: false,
			height: 'auto',
			width: 300,
			modal: true,
			buttons: {
				"Save Preset": function() {
					$( this ).dialog( "close" );
					var w = addPresetDialog.find('input[name="width"]').val();
					var h = addPresetDialog.find('input[name="height"]').val();
					var n = addPresetDialog.find('input[name="name"]').val();

					input.presets.newPreset(n, w, h);
				},
				Cancel: function() {
					$( this ).dialog( "close" );
				}
			},
			open: function(event, ui) {
				addPresetDialog.find('input[name="width"]').val(input.getWidth());
				addPresetDialog.find('input[name="height"]').val(input.getHeight());
			},
			close: function(event, ui) {
				
			}
		});
		// init add preset listener
		addPreset.click(function(e) {
			$('#add-preset-dialog').dialog('open');
		});
		// set url
		//this.setSource(originTab.url);
		this.setSource(url);
		// populate size presets dropdown
		this.presets.set(options.sizePresets);
	},

	setSource : function(v) { inputURL.val(v) /* TODO: url validation? */ },
	getSource : function() { return inputURL.val() },

	setWidth : function(v) { inputWidth.val(v) },
	getWidth : function() { return inputWidth.val() },

	setHeight : function(v) { inputHeight.val(v) },
	getHeight : function() { return inputHeight.val() },

	setSize : function(w, h) {
		inputWidth.val(w);
		inputHeight.val(h);
	},

	presets : {
		set : function(o) {
			// check all presets before adding them
			/*
			for (var p in o) {
				if (o[p].hasOwnProperty('w') && o[p].hasOwnProperty('h')) {
					this.addPreset(p, o[p]['w'], o[p]['h']);
				}
			}*/
			for (var i = 0; i < o.length; i++) {
				if (o[i].hasOwnProperty('name') && o[i].hasOwnProperty('width') && o[i].hasOwnProperty('height')) {
					this.addPreset(o[i].name, o[i].width, o[i].height);
				}
			}
		},
		addPreset : function(n, w, h) {
			return $(this.getPresetItem(n, w, h)).appendTo(presetSelect);
		},
		getPresetItem : function(n, w, h) {
			//return '<option value="' + n + '">' + n + ': ' + w + 'x' + h + '</option>';
			return '<option value="' + w + 'x' + h + '">' + n + ': ' + w + 'x' + h + '</option>';
		},
		getValue : function() {
			return presetSelect.children('option').filter(':selected').val();
		},
		newPreset : function(n, w, h) {
			/*
			options.sizePresets[n] = {"w" : w, "h" : h};
			 this.addPreset(n, w, h);
			presetSelect.val(n);
			*/
			options.sizePresets.push({"name" : n, "width" : w, "height" : h});
			this.addPreset(n, w, h);
			presetSelect.val(n);

			// send message to save options with new entries
			chrome.extension.sendMessage({submit: 'options', data: options}, function(response) {
				debug.log('New preset saved successfully.');
			});
		}
	}
};

var resp0nsv = {
	init : function() {
		// iframe resize fix (iframe mousemove doesn't bubble up)
		iframeFix.css({
			position: 'absolute',
			top: 0,
			left: 0,
			width: '100%',
			height: '100%'
		}).prependTo(resizer).hide();
		// load options, do rest asynchronously after load
		this.loadOptions(function() {
			// invoke input.init() with input as local scope
			input.init.call(input);
			document.title = 'resp0nsv - ' + input.getSource();
			resp0nsv.setSource(input.getSource());
			resp0nsv.setWidth(input.getWidth());
			resp0nsv.setHeight(input.getHeight());
			resizer.resizable(resizeOptions);

			// Google Analytics
			if (options.analytics) {
				resp0nsv.loadAnalytics();
			}
		});
	},
	loadOptions : function(callback) {
		if (!options) {
			chrome.extension.sendMessage({request: 'options'}, function(response) {
				options = response;
				debug.log('Options loaded: ' + JSON.stringify(options));
				// callback
				typeof callback === 'function' && callback();
			});
		}
		else {
			debug.log('resp0nsv options already loaded: ' + JSON.stringify(options));
			typeof callback === 'function' && callback();
		}
	},
	loadAnalytics : function(callback) {
		/*
		// Universal Analytics script (seems to not be working?)
		(function(i,s,o,g,r,a,m){i['GoogleAnalyticsObject']=r;i[r]=i[r]||function(){
		(i[r].q=i[r].q||[]).push(arguments)},i[r].l=1*new Date();a=s.createElement(o),
		m=s.getElementsByTagName(o)[0];a.async=1;a.src=g;m.parentNode.insertBefore(a,m)
		})(window,document,'script','https://www.google-analytics.com/analytics.js','ga');

		ga('create', 'UA-50964912-1', 'auto');
		ga('set', 'checkProtocolTask', function(){});
		ga('send', 'pageview');

		debug.log('Google Analytics loaded');
		*/

		// Old Analytics script
		_gaq.push(['_setAccount', 'UA-50964912-1'], ['_trackPageview']);

		(function(d) {
		  var ga = d.createElement('script'),
		  	  s = d.getElementsByTagName('script')[0];
		  ga.type = 'text/javascript';
		  ga.async = true;
		  ga.src = 'https://ssl.google-analytics.com/ga.js';
		  s.parentNode.insertBefore(ga, s);
		})(document);

		analyticsLoaded = true;
		debug.log('Google Analytics loaded');

		// callback
		typeof callback === 'function' && callback();
		
	},
	refresh : function() {
		/*viewport[0].contentDocument.location.reload(true);*/
		viewport.attr('src', viewport.attr('src'));
	},
	// setting source is done this way to preserve url if browser reload is used
	setSource : function(v) {
		try {
			// if src is same as origin url, just refresh iframe
			//if (v == originTab.url) {
			if (v == url) {
				viewport.attr('src', v);
			} else {
				/*
				chrome.extension.sendMessage({
					tab : JSON.stringify(originTab),
					setURL : v
				});
				*/
				//chrome.extension.sendMessage({setURL: v});
				chrome.tabs.update({url: chrome.extension.getURL('resp0nsv.html?url='+encodeURIComponent(v))});
			}
		} catch(e) {
			viewport.attr('src', '');
			alert(e);
		}
	},
	/*
	setSource : function(v) {
		viewport.attr('src', v);
	},
	*/
	setWidth : function(v) {
		if (v) {
			input.setWidth(v);
			resizer.width(v);
		}
		else
			resizer.width(input.getWidth());
	},
	setHeight : function(v) {
		if (v) {
			input.setHeight(v);
			resizer.height(v);
		}
		else
			resizer.height(input.getHeight());
	},
	setSize : function(w, h) {
		//resizer.width(w|input.getWidth());
		//resizer.height(h|input.getHeight());
		if (w && h) {
			input.setSize(w, h);
			resizer.width(w);
			resizer.height(h);
		}
		else {
			resizer.width(input.getWidth());
			resizer.height(input.getHeight());
		}
	},
	applyPreset : function(v) {
		/*
		if (options.sizePresets.hasOwnProperty(v)) { 
			this.setSize(options.sizePresets[v]['w'], options.sizePresets[v]['h']);
		}
		else {
			alert('Preset named "' + v + '" not found.');
		}
		*/
		// Expects ###x###
		var size = v.split('x');
		if (size.length == 2) {
			this.setSize(size[0], size[1]);
		}
		else {
			alert('Preset is malformed: ' + v);
		}
	}
};

// Initialization on DOM ready
$(function() {
	// check first if a tab was correctly passed through the url
	//if (originTab.id && originTab.url) {
	if (url) {
		resp0nsv.init();
	} else {
		// TODO: fail gracefully?
		debug.log('error: tab undefined');
	}
});

var resizeOptions = {
	resize : function() {
		var w = viewport.width(),
			h = viewport.height();
		input.setWidth(w);
		input.setHeight(h);
	},
	start : function() { iframeFix.show() },
	stop : function() { iframeFix.hide() }
}

// Debug output
var debug = {
	log: function() {
		if (verbose) console.log.apply(console, arguments);
	},
	warn: function() {
		if (verbose) console.warn.apply(console, arguments);
	},
	dir: function() {
		if (verbose) console.dir.apply(console, arguments);
	},
	group: function() {
		if (verbose) console.group.apply(console, arguments);
	},
	groupEnd: function() {
		if (verbose) console.groupEnd.apply(console, arguments);
	}
}
