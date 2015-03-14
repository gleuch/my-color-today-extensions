/*
* Your Internet Color
* a piece by @gleuch <http://gleu.ch>
* (c)2015, all rights reserved
*
* -----------------------------------------------------------------------------
*
* Extension page script
* - wait until window (images, etc.) is loaded, msg back when complete
*
*/


var YourInternetColorPage = function() {};


// Setup and wait...
YourInternetColorPage.prototype.start = function() {
  var _t = this;

  // Check if window.onload has already fired
  if (document.readyState == 'complete') {
    _t.triggerResponse();
  } else {
    window.onload = function() { _t.triggerResponse(); };
  }

}


// Send response back to page, include some additional info (todo later)
YourInternetColorPage.prototype.triggerResponse = function() {
  var data = {
    name: this.msgName,
    pageWidth: window.innerWidth,
    pageHeight: window.innerHeight
    // pageWidth: document.body.clientWidth,
    // pageHeight: document.body.clientHeight,
  };

  setTimeout(function() {
    chrome.extension.sendRequest(data, function() {});
  }, 100);

};
