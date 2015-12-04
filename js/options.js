// ready
$(function() {
	// load settings
	input.init();

	// menu functionality
	$('.menu a').click(function(e) {
		goToPanel($(e.currentTarget).attr('href'));
		return false;
	});
	$('.mainview > *:not(.selected)').css('display', 'none');
	

	// go to hash location
	var hash = window.location.hash;
	if (hash !== '' && hash !== '#') {
		goToPanel(hash);
	}
	$(window).on('hashchange', function() {
		goToPanel(window.location.hash);
	});
});

function goToPanel(hash) {
	var selected = 'selected';
	$('.mainview > *').removeClass(selected);
	$('.menu li').removeClass(selected);
	setTimeout(function() {
		$('.mainview > *:not(.selected)').css('display', 'none');
	}, 100);

	$('[href="'+hash+'"]').parent().addClass(selected);
	var currentView = $(hash);
	currentView.css('display', 'block');
	setTimeout(function() {
		currentView.addClass(selected);
		window.location.hash = hash;
	}, 0);
	setTimeout(function() {
		$('body')[0].scrollTop = 0;
	}, 200);
};


var sizeList = $('#size-list'),
	selectAll = $('#all-size'),
	removeButton = $('.remove:button'),

	analytics = $('#analytics'),

	initialOptions, options, defaultOptions,

	analyticeLoaded = false,
	_gaq = [];

	input = {
		init : function() {
			// grab settings from background page (async)
			chrome.extension.sendMessage({request: 'options'}, function(response) {
				options = response;
				// create clone for safekeeping
				input.setInitialOptions(options);
				console.log('Options page options loaded: ' + JSON.stringify(options));

				// populate size presets
				input.sizePresets.populate();

				// analytics checkbox
				input.analytics.set();

				// listeners

				// select all checkbox
				selectAll.change(function(e) {
					sizeList.find('.size-item input:checkbox').prop('checked', this.checked).trigger('change');
				});

				// buttons
				$('.function:button').click(function(e) {
					//alert(e.currentTarget.value);
					var buttonVal = e.currentTarget.value.split(' ');
					var func = buttonVal[0];
					var setting = buttonVal[1];
					//alert(setting);

					if (input.hasOwnProperty(setting)) {
						if (input[setting].hasOwnProperty(func)) {
							input[setting][func]();
						}
						else alert('Error: no such function (' + func + ') for setting (' + setting + ')');
					}
					else alert('Error: no such setting (' + setting + ')');

					e.preventDefault();
				});

				// checkboxes & remove button
				sizeList.on('change', 'input:checkbox', function(e) {
					// if any boxes are ticked, enable remove button
					if (sizeList.find('input:checkbox:checked').length)
						removeButton.prop('disabled') && removeButton.prop('disabled', false);
					else {
						removeButton.prop('disabled', true);
						// untick select all if ticked
						selectAll.prop('checked') && selectAll.prop('checked', false);
					}
				});

				// Google Analytics
				if (options.analytics) {
					input.loadAnalytics();
				}
			});
		},
		sizePresets : {
			save : function() {
				input.save(this.getData());
			},
			add : function() {
				sizeList.append(this.getSizeItem('','',''));
			},
			undo : function() {
				console.log('Undo');
				// set current options back to what they were at pageload
				console.log('Resetting to initial size settings...', JSON.stringify(options.sizePresets), '--->', JSON.stringify(initialOptions.sizePresets));
				//options.sizePresets = JSON.parse(JSON.stringify(initialOptions.sizePresets));
				options.sizePresets = copyObject(initialOptions.sizePresets);
				this.repopulate();
			},
			reset : function() {
				// confirm
				if (confirm('Reset Size Presets to default settings? Reset will not be permanent until you save.')) {
					// load defaults and reset via callback
					input.loadDefaultOptions(input.resetSizePresets);
				}
			},
			remove : function() {
				// confirm
				if (confirm('Remove selected Size Presets? Removal will not be permanent until you save.')) {
					// find & remove selected settings
					var rmPresets = this.getChecked();
					console.log('presets to remove: ' + rmPresets);
					/*
					for (var i = 0; i < rmPresets.length; i++) {
						if (options.sizePresets.hasOwnProperty(rmPresets[i])) {
							delete options.sizePresets[rmPresets[i]];
						}
					}
					*/
					// loop backwards so that we can remove items without the array rearranging under us
					for (var i = rmPresets.length - 1; i >= 0; i--) {
						console.log('removing preset ' + rmPresets[i]);
						options.sizePresets.splice(rmPresets[i], 1);
					}
					// refresh list
					this.repopulate();
					// set button back to disabled
					removeButton.prop('disabled', true);
				}
			},
			populate : function() {
				/*
				for (var size in options.sizePresets) {
					var w = options.sizePresets[size]['w'];
					var h = options.sizePresets[size]['h'];
					sizeList.append(this.getSizeItem(size, w, h));
				}
				*/
				var o = options.sizePresets;
				for (var i = 0; i < o.length; i++) {
				if (o[i].hasOwnProperty('name') && o[i].hasOwnProperty('width') && o[i].hasOwnProperty('height')) {
					sizeList.append(this.getSizeItem(o[i].name, o[i].width, o[i].height));
				}
			}
			},
			depopulate : function() {
				sizeList.empty();
			},
			repopulate : function() {
				this.depopulate();
				this.populate();
				console.log('Size options repopulated');
			},
			getChecked : function() {
				//console.log('finding checked presets');
				// returns array of setting names
				var checked = [];
				// check each checkbox and save it's index if checked
				sizeList.find('input:checkbox').each(function(i) {
					//console.log('found: ' + $(this).next('input.size-name').val());
					//checked.push($(this).next('input.size-name').val());
					if ($(this).is(':checked')) checked.push(i);
				});
				//console.log('checked items: ' + checked);
				// Make sure list is sorted, just in case
				return checked.sort(function(a,b) {
					return (a > b) ? 1 : -1;
				});
			},
			getData : function() {
				var data = {sizePresets: []};
				sizeList.children('li').each(function(i, el) {
					var n = $(el).find('.size-name').val();
					var w = $(el).find('.size-w').val();
					var h = $(el).find('.size-h').val();
					//data.sizePresets[name] = {"w": w, "h": h};
					if (n.length > 0 && w.length > 0 && h.length > 0) {
						data.sizePresets.push({"name" : n, "width" : w, "height" : h});
					}
					else {
						 $(this).append('<strong class="warning"> * Not saved (not well formed; is something empty?)</strong>');
					}
				});
				return data;
			},
			getSizeItem : function(n, w, h) {
				return '<li class="size-item"><input type="checkbox" /> <input class="size-name" type="text" size="24" value="'+n+'" /> <label>w: <input class="size-w" type="number" min="1" max="9999" value="'+w+'" /></label> <label>h: <input class="size-h" type="number" min="1" max="9999" value="'+h+'" /></label></li>'; 
			}
		},
		analytics : {
			save : function() {
				var data = this.getData();

				// If analytics arent loaded but user is turning them on, we
				// need to load the analytics script to since it wasn't loaded
				if (data.analytics && !analyticsLoaded) {
					input.loadAnalytics();
				}

				// Save to settings, and also to options object
				input.save(data);

				// Track event if we're allowed
				/*
				if (analyticsLoaded) {
					ga('send', 'event', 'settings', 'changed', 'analytics', (data.analytics ? 1 : -1));
					console.log('Event tracked: analytics changed to: ' + data.analytics);
				}
				*/
				if (analyticsLoaded) {
					_gaq.push(['_trackEvent', 'settings', 'changed', 'analytics', (data.analytics ? 1 : -1)]);
				}
			},
			set : function() {
				analytics.prop('checked', options.analytics);
			},
			getData : function() {
				var data = {analytics: analytics.prop('checked')};
				return data;
			}
		},
		save : function(d) {
			// set local options
			for (var item in d) {
				options[item] = d[item];
			}
			console.log('Saving options: ' + JSON.stringify(options));
			// save to storage
			chrome.extension.sendMessage({submit: 'options', data: options}, function(response) {
				input.setInitialOptions(response);
			});
		},
		loadDefaultOptions : function(callback) {
			if (!defaultOptions) {
				chrome.extension.sendMessage({request: 'defaultOptions'}, function(response) {
					defaultOptions = response;
					console.log('Options page defaultOptions loaded: ' + JSON.stringify(defaultOptions));
					// callback
					typeof callback === 'function' && callback();
				});
			}
			else typeof callback === 'function' && callback();
		},
		resetSizePresets : function() {
			options['sizePresets'] = copyObject(defaultOptions['sizePresets']);
			input.sizePresets.repopulate();
		},
		setInitialOptions : function(o) {
			// NOTE: setting this directly equal to options doesn't work, as objects pass by reference instead of value
			initialOptions = copyObject(o);
			//console.log('initialOptions set: ' + JSON.stringify(initialOptions));
		},
		loadAnalytics : function(callback) {
			/*
			// Universal Analytics script
			(function(i,s,o,g,r,a,m){i['GoogleAnalyticsObject']=r;i[r]=i[r]||function(){
			(i[r].q=i[r].q||[]).push(arguments)},i[r].l=1*new Date();a=s.createElement(o),
			m=s.getElementsByTagName(o)[0];a.async=1;a.src=g;m.parentNode.insertBefore(a,m)
			})(window,document,'script','https://www.google-analytics.com/analytics.js','ga');
			
			ga('create', 'UA-50964912-1', 'coryhughart.com');
			ga('set', 'checkProtocolTask', function(){});
			ga('send', 'pageview');
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
			console.log('Google Analytics loaded');

			// callback
			typeof callback === 'function' && callback();

		},
	};

// utility functions
function isChecked(e) {
	return $(e).is(':checked');
}
function printSettings(s) {
	var string = '';
	for (var p in s) {
		string += '\n';
		string += '"' + p + '"';
		for (var subP in s[p]) {
			string += ' ' + subP + ': ' + s[p][subP];
		}
	}
	return string;
}
function copyObject(o) {
	return JSON.parse(JSON.stringify(o));
}