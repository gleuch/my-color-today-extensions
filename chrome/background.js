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
*/


var YourInternetColor = function() {
  // todo, use localstorage to store urls
  this.started = false;
  this.check_intv = null;
  this.icon_canvas_id = 'iconcolorcanvas';

  this.start();
};


// Add webRequest onComplete listener. 
YourInternetColor.prototype.start = function() {
  var _t = this;

  if (_t.started) return;

  // Listen only for completed web pages from main_frame (parent level). This does not listen for changes in history caused by push/pop/replaceState.
  chrome.webRequest.onCompleted.addListener(function(obj) {
    if (_t.isValidPageRequest(obj.url, obj.ip)) _t.addToHistory(obj.url);
    return {};
  }, {
    types: ["main_frame"],
    urls: ["<all_urls>"]
  }, []);

  // add canvas element, used to generate the browseraction icon with the average color
  var c = document.createElement('canvas')
  c.setAttribute('id', _t.icon_canvas_id);
  c.setAttribute('width', 38);
  c.setAttribute('height', 38);
  document.body.appendChild(c);

  _t.check_intv = setInterval(function() { _t.queryTodayColor(); }, 2 * 60 * 1000);
  _t.queryTodayColor();

  _t.started = true;
};


// Store your browsing info to server. Easiest is to call as image.
YourInternetColor.prototype.addToHistory = function(url) {
  var _t = this, page_info = {},
      date_key = _t.storageDateKey(), 
      page_key = 'page:' + _t.storagePageKey();

  // Store basic info
  page_info[page_key] = {url: url, hex: null, rgb: {r: null, g: null, b: null}};

  // Get date key list, then save updated date key list and page info
  chrome.storage.sync.get(date_key, function(items) {
    var date_list = items[date_key];
    if (typeof(date_list) === undefined || date_list === null) date_list = [];
    date_list.push(page_key);

    page_info[date_key] = date_list;
    chrome.storage.sync.set(page_info, function() {
      // queue page for color processing
      _t.processPageColor(page_key);
    });
  })


};


// Process through the color result
YourInternetColor.prototype.processPageColor = function(page_key) {
  console.log('TODO: process page color')
};



// Check URL and ip address against blacklisted sites/ips
YourInternetColor.prototype.isValidPageRequest = function(url,ip) {
  // Is request to self or not an http/https request?
  if (ip == "::1" || ip == '127.0.0.1' || url.match(/^(?!http)/)) return false;

  // Is url matched against any blacklisted url formats?
  for (var i=0; i < this.blacklistUrls.length; i++) if (url.match(this.blacklistUrls[i])) return false;

  // Must be valid if we got this far.
  return true;
};


// Query a result for today's colors
YourInternetColor.prototype.queryTodayColor = function() {
  var _t = this, date_key = _t.storageDateKey(), ct = 0, ct_with_color = 0;

  chrome.storage.sync.get(date_key, function(items) {
    var date_list = items[date_key];

    if (typeof(date_list) !== undefined && date_list != null) {
      chrome.storage.sync.get(date_list, function(items) {
        var data = _t.getAvgColorFromItems(items);
        console.log('---------')
        console.log(data)
        _t.setBrowserIcon(data);
      });
    }
  });
};


YourInternetColor.prototype.getAvgColorFromItems = function(items) {
  var ct = Object.keys(items).length, ct_with_color = 0, sums = {r: 0, g: 0, b: 0}, rgb = [0,0,0], hex;

  for (var k in items) {
    // sum here
  }

  // average rgb sums with count, convert to hex
  if (ct_with_color > 0) rgb = [Math.round(sums.r / ct_with_color), Math.round(sums.g / ct_with_color), Math.round(sums.b / ct_with_color)];
  hex = this.rgbToHex(rgb);

  return {pages_count: ct, pages_with_color_count: ct_with_color, hex_color: hex, rgb_color: rgb};
};

// Update browser action color info
YourInternetColor.prototype.setBrowserIcon = function(data) {
  var c = document.getElementById(this.icon_canvas_id), ctx = c.getContext('2d');
  ctx.fillStyle = '#' + data.hex_color;
  ctx.fillRect(0,0,38,38);
  chrome.browserAction.setIcon({imageData: {'38' : ctx.getImageData(0,0,38,38)}});
  chrome.browserAction.setTitle({title: 'Your Internet Color: #' + data.hex_color + ' (' + data.pages_count + ' pages today, ' + data.pages_with_color_count + ' w/ color)'});
};


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


// URLs to ignore
YourInternetColor.prototype.blacklistUrls = [
  // chrome:about, default start page
  /^http(s)?\:\/\/(www\.)?google\.com\/(_\/chrome\/newtab|webhp)/i,

  // because i do web dev, skip over these pages, as not really "browsing"
  /^http(s)?:\/\/([a-z0-9\.\-]+)?(localhost|.*\.dev)(\:\d+)?\//i
];


// Start it up!
this.yourInternetColor = new YourInternetColor();




// kthxbye!