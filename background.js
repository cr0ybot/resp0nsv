// resp0nsv
/*
TODO:
x iframe
x detect resp0nsv (deny recursive use)
  - handle error on recursive attempt
x custom resize handles (corner, right, bottom)
? custom scrollbars that don't interfere with width (none currently)
x refresh button
? tab title reflects iframe content (may be impossible)
- exit button (or togglable browser button)
x rotate button (swap w/h)
- remember viewport size on refresh
? size input custom increment/decrement buttons (can use mouse wheel & arrow keys)
- size dropdown
X preset sizes
  X editable presets
- option to sync settings (chrome.storage.sync)
x url box
- snap to grid while resizing (http://jqueryui.com/resizable/#snap-to-grid)
  - grid drawn on canvas
  - custom grid size (or offer selection, 2, 4, 5, 10, 20)
- scroll bars
- snapshot feature (capture only inside viewport)
- user agent settings
- emulate touch
- license (GPL?)
*/

var options, defaultOptions;

var analytics = {
	load: function() {
		/*
		// Universal Analytics script
		(function(i,s,o,g,r,a,m){i['GoogleAnalyticsObject']=r;i[r]=i[r]||function(){
		(i[r].q=i[r].q||[]).push(arguments)},i[r].l=1*new Date();a=s.createElement(o),
		m=s.getElementsByTagName(o)[0];a.async=1;a.src=g;m.parentNode.insertBefore(a,m)
		})(window,document,'script','https://www.google-analytics.com/analytics.js','ga');
		
		ga('create', 'UA-50964912-1', 'auto');
		ga('set', 'checkProtocolTask', function(){});
		ga('send', 'pageview');
		
		console.log('Google Analytics loaded');
		*/

		// Old Analytics script
		var _gaq = _gaq || [];
		_gaq.push(['_setAccount', 'UA-50964912-1']);
		_gaq.push(['_trackPageview']);

		console.log('Analytics loaded');

		(function() {
		  var ga = document.createElement('script'); ga.type = 'text/javascript'; ga.async = true;
		  ga.src = 'https://ssl.google-analytics.com/ga.js';
		  var s = document.getElementsByTagName('script')[0]; s.parentNode.insertBefore(ga, s);
		})();
	}
}

init();

// browser button listener
chrome.browserAction.onClicked.addListener(function(tab) {
	
	//chrome.tabs.executeScript(tab.id, {code: "var data = false; try {data = document.getElementById('body').dataset.resp0nsv} catch(e) {} if (data === undefined) data = false; chrome.extension.sendMessage({resp0nsv: data, tabID: "+tab.id+"});"});

	// this will attempt to run and throw an error on chrome-extension:// pages
	// luckily, that stops it from running recursivley, but it's still an error.
	// should request permission for chrome-extension://
	// just to deny use on those pages?
	chrome.tabs.executeScript(tab.id, {code: "var data = document.getElementById('body').dataset.resp0nsv; if (data === undefined) data = false; return data"}, function(data) {
		if (data == false) {
			chrome.tabs.get(tab.id, function(tab){
				resp0nsvize(tab);
			});
		}
	});
});

// message listener
chrome.extension.onMessage.addListener(function(message, sender, sendResponse) {
	if (message.setURL !== undefined /*&& message.tab !== undefined*/) {
		/*
		var srcTab = JSON.parse(message.tab);
		srcTab.url = message.setURL;
		srcTab.title = null;
		chrome.tabs.update(sender.tab.id, {url : chrome.extension.getURL('resp0nsv.html?tab='+JSON.stringify(srcTab))});
		*/

	}
	else if (message.resp0nsv === false) {
		chrome.tabs.get(message.tabID, function(tab){
			resp0nsvize(tab);
		});
	}
	else if (message.request === 'options') {
		console.log('sending options');
		sendResponse(options);
	}
	else if (message.submit === 'options' && message.data !== undefined) {
		console.log('receiving options');
		saveOptions(message.data);
		sendResponse(message.data);
	}
	else if (message.request === 'defaultOptions') {
		console.log('sending defaultOptions');
		sendResponse(defaultOptions);
	}
});

// resp0nsv tab initialization
function resp0nsvize(tab) {
	/*
	console.log('resp0nsvizing: ' + JSON.stringify(tab));
	chrome.tabs.create({url : chrome.extension.getURL('resp0nsv.html?tab='+JSON.stringify(tab))}, function(newTab) {
		// move tab so it's next to previously active one
		chrome.tabs.move(newTab.id, {index: tab.index + 1});
	});
	*/
	console.log('resp0nsvizing: ' + tab.url);
	chrome.tabs.create({url : chrome.extension.getURL('resp0nsv.html?url='+encodeURIComponent(tab.url))}, function(newTab) {
		// move tab so it's next to previously active one
		chrome.tabs.move(newTab.id, {index: tab.index + 1});
	});
}

function saveOptions(data) {
	options = data;
	chrome.storage.sync.set(options, function() {
		alert('settings saved');
		console.log('options saved: ' + JSON.stringify(options));
	});
}

function init() {
	//chrome.storage.sync.clear();
	// init settings using chrome.storage.sync (check if exists first)
	chrome.storage.sync.get(function(items) {
		options = items;
		console.log('options (precheck): ' + JSON.stringify(options));
		$.getJSON('defaultoptions.json', function(json) {
			defaultOptions = json;
			// check all options
			for (var item in defaultOptions) {
				//options[item] = options[item] | defaultOptions[item];
				if (options[item] === undefined) options[item] = defaultOptions[item];
			}
			//chrome.storage.sync.set(options);

			console.log('options (postcheck): ' + JSON.stringify(options));
			//console.log('defaultOptions: ' + JSON.stringify(defaultOptions));
		});
	});
}