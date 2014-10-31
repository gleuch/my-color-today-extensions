/*
* Your Internet Color
* a piece by @gleuch <http://gleu.ch>
* (c)2014, all rights reserved
*
* -----------------------------------------------------------------------------
*
* Extension background script
* - listens to completed web requests, check blacklist, & ping server with url.
*
* -----------------------------------------------------------------------------
*
* How it works:
* - Initialize script [ new YourInternetColor() ]
*   - Create default canvas for browser action
*   - Add listener for when tab page is loaded
*   - Add listener for receiving msgs back from page
*   - Draw browseraction icon
* - When valid url is loaded in tab, execute content script to check if window
*   has loaded (images, etc) [ checkWindowLoaded() ]
* - After loaded message received, screenshot the page, resize, and process 
*   page for color [ processPageForColor() ]
* - Once capatured, store information in localStorage [ storePageResults() ]
*
*/



// Initialize the script
var YourInternetColor = function() {
  var d = new Date();

  this.check_intv = null;
  this.icon_canvas_id = 'iconcolorcanvas';
  this.msgName = 'yourInternetColor_' + d.getTime();

  var _t = this;

  // Listen for response messages from content scripts
  chrome.extension.onRequest.addListener(function(req,s,cb) {
    if (req.name == _t.msgName) _t.processPageForColor(req,s);
  });

  // Listen only for completed web pages from main_frame (parent level). This does not listen for changes in history caused by push/pop/replaceState.
  chrome.webRequest.onCompleted.addListener(function(obj) { 
    _t.checkWindowLoaded(obj);
  }, { types: ["main_frame"], urls: ["<all_urls>"] }, []);

  // add canvas element, used to generate the browseraction icon with the average color
  var c = document.createElement('canvas');
  c.setAttribute('id', _t.icon_canvas_id);
  c.setAttribute('width', 38);
  c.setAttribute('height', 38);
  document.body.appendChild(c);

  // Draw browseraction icon at regular intervals
  _t.check_intv = setInterval(function() { _t.prepareBrowserActionIcon(); }, .25 * 60 * 1000);
  _t.prepareBrowserActionIcon();
};



// --- PAGE PROCESSING --------------------------------------------------------
// Send content script to message back when window has loaded (images, etc.)
YourInternetColor.prototype.checkWindowLoaded = function(obj) {
  var _t = this;

  // Skip if not a URL or part of URL blacklist
  if (_t.isValidPageRequest(obj.url, obj.ip)) {
    // Load content script into tab
    chrome.tabs.executeScript(obj.tabId, {file: 'page.js'}, function() {
      // On success, run code to start load cheeck
      chrome.tabs.executeScript(obj.tabId, {code: "this.yourInternetColorPage = new YourInternetColorPage(); this.yourInternetColorPage.msgName = '" + _t.msgName + "'; this.yourInternetColorPage.start();"}, function() {});
    });
  }
};

// Process through the color result
YourInternetColor.prototype.processPageForColor = function(data,s) {
  var _t = this, tabId = s.tab.id, prevTabId = tabId;

  // We need visible tab, so switch it over, then switch back (if prev was not self)
  chrome.tabs.query({active: true, windowId: s.tab.windowId}, function(tab) {
    prevTabId = tab[0].id;

    // if (_t.preventFlickering && tabId != prevTabId) {
    //   console.log('Tab not visible, aborting capture', s.tab.url);
    //   return;
    // }

    // Make tab visible, capture screenshot
    chrome.tabs.update(tabId, {active: true, highlighted: true}, function(t) {
      // Pause it every so slightly before flipping back to other tab. sometimes get internal errors if to quick.
      setTimeout(function() {
        chrome.tabs.captureVisibleTab(s.tab.windowId, {format: 'png'}, function(dataURI) {
          // Switch back to other tab after capture
          if (tabId != prevTabId) chrome.tabs.update(prevTabId, {active: true}, function(t) {});

          // Send message, go back to previous scroll position
          // TODO

          // Process through image
          if (dataURI) {
            var image = new Image();
            image.onload = function() {
              var canvas = document.createElement('canvas'), ctx, pixel;
              canvas.width = 1;
              canvas.height = 1;
              ctx = canvas.getContext('2d');
              ctx.drawImage(image,0,0,1,1);
              pixel = ctx.getImageData(0,0,1,1).data;
              _t.storePageResults({url: s.tab.url, hex: _t.rgbToHex(pixel), rgb: {r: pixel[0], g: pixel[1], b: pixel[2]}});
            };
            image.src = dataURI;
          }
        });
      }, 250);
    });
  })

  // {url: url, hex: null, rgb: {r: null, g: null, b: null}}
};

// Store your browsing info to server. Easiest is to call as image.
YourInternetColor.prototype.storePageResults = function(data) {
  var _t = this, page_info = {},
      date_key = _t.storageDateKey(), 
      page_key = 'page:' + _t.storagePageKey();

  // Store basic info
  page_info[page_key] = data;

  // Get date key list, then save updated date key list and page info
  chrome.storage.local.get(date_key, function(items) {
    var date_list = items[date_key];

    if (typeof(date_list) == 'undefined') date_list = [];
    date_list.push(page_key);

    page_info[date_key] = date_list;
    chrome.storage.local.set(page_info, function() {});
  })
};



// --- AVERAGE COLOR PROCESSING -----------------------------------------------
// Determine the average color from a list of items
YourInternetColor.prototype.getAvgColorFromItems = function(items) {
  var ct = Object.keys(items).length, ct_with_color = 0, sums = {r: 0, g: 0, b: 0}, rgb = [0,0,0], hex;

  for (var k in items) {
    if (items[k].hex != undefined) {
      sums.r += items[k].rgb.r
      sums.g += items[k].rgb.g
      sums.b += items[k].rgb.b
      ct_with_color++;
    }
  }

  // average rgb sums with count, convert to hex
  if (ct_with_color > 0) rgb = [Math.round(sums.r / ct_with_color), Math.round(sums.g / ct_with_color), Math.round(sums.b / ct_with_color)];
  hex = this.rgbToHex(rgb);

  return {pages_count: ct, pages_with_color_count: ct_with_color, hex_color: hex, rgb_color: rgb};
};



/* --- BROWSER ACTION --------------------------------------------------------- */
// Query a result for today's colors
YourInternetColor.prototype.prepareBrowserActionIcon = function() {
  var _t = this, date_key = _t.storageDateKey(), ct = 0, ct_with_color = 0;

  chrome.storage.local.get(date_key, function(items) {
    var date_list = items[date_key];

    if (typeof(date_list) != 'undefined') {
      chrome.storage.local.get(date_list, function(items) {
        var data = _t.getAvgColorFromItems(items);
        _t.setBrowserActionIcon(data);
      });
    }
  });
};

// Update browser action color info
YourInternetColor.prototype.setBrowserActionIcon = function(data) {
  var c = document.getElementById(this.icon_canvas_id), ctx = c.getContext('2d');
  ctx.fillStyle = '#' + data.hex_color;
  ctx.fillRect(0,0,38,38);
  chrome.browserAction.setIcon({imageData: {'38' : ctx.getImageData(0,0,38,38)}});
  chrome.browserAction.setTitle({title: 'Your Internet Color: #' + data.hex_color + ' (' + data.pages_count + ' pages today, ' + data.pages_with_color_count + ' w/ color)'});
};



/* --- URL FILTERING & BLACKLISTS --------------------------------------------- */
// Check URL and ip address against blacklisted sites/ips
YourInternetColor.prototype.isValidPageRequest = function(url,ip) {
  // Is request to self or not an http/https request?
  if (ip == "::1" || ip == '127.0.0.1' || url.match(/^(?!http)/)) return false;

  // Is url matched against any blacklisted url formats?
  for (var i=0; i < this.blacklistUrls.length; i++) if (url.match(this.blacklistUrls[i])) return false;

  // Must be valid if we got this far.
  return true;
};

// URLs to ignore
YourInternetColor.prototype.blacklistUrls = [
  // chrome:about, default start page
  /^http(s)?\:\/\/(www\.)?google\.com\/(_\/chrome\/newtab|webhp)/i,

  // because i do web dev, skip over these pages, as not really "browsing"
  /^http(s)?:\/\/([a-z0-9\.\-]+)?(localhost|.*\.dev)(\:\d+)?\//i
];


/* --- MISC FUNCTIONS --------------------------------------------------------- */
// UTF-8 safe URI encoding
YourInternetColor.prototype.encodeUrl = function(str) {return window.btoa(encodeURIComponent(escape(str)));};

// date storage key, in format "date:MM/DD/YYYY"
YourInternetColor.prototype.storageDateKey = function() {return 'date:' + (new Date()).toLocaleDateString("en-US");};

// page storage key, in format "page:0000000000.0"
YourInternetColor.prototype.storagePageKey = function() {return 'page:' + ((new Date()).getTime() / 1000).toFixed(1);}

// rgb to hex
YourInternetColor.prototype.rgbToHex = function(r,g,b) {if (typeof(r) == 'object') {var g = r[1], b = r[2], r = r[0];} var fn = function(c) {var h = c.toString(16); return h.length == 1 ? "0" + h : h;}; return (fn(r) + fn(g) + fn(b)).toUpperCase();};

// hex to rgb
YourInternetColor.prototype.hexToRgb = function(hex) {var i = parseInt(hex, 16); return [((i >> 16) & 255), ((i >> 8) & 255), (i & 255)];};


// Start it up!
this.yourInternetColor = new YourInternetColor();

// kthxbye!