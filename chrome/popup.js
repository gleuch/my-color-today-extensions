var MyColorTodayPopup = function() {
  this.user = null;
  this.report = null;  
  this.initialize();
};


jQuery.extend(MyColorTodayPopup.prototype, {
  
  initialize : function() {
    this.checkUserLoggedIn();
  },

  checkUserLoggedIn : function() {
    // Check if user is logged in
    chrome.storage.local.get('auth-token', function(items) {
      var data = items['auth-token']

      // User is (likely) logged in
      if (typeof(data) !== 'undefined' && data.user) {
        this.user = data.user;
        this.getUserDailyReport();

      // Not logged in
      } else {
        this.render();
      }

    }.bind(this));
  },

  getUserDailyReport : function() {
    chrome.storage.local.get('daily-report', function(items) {
      var data = items['daily-report'];

      // User has data?
      if (typeof(data) !== 'undefined') {
        this.report = data;
      }

      this.render()
    }.bind(this));
  },


  renderDailyReport : function() {
    jQuery('#content').html(' \
      <div id="report"> \
        <div class="canvas"> \
          <div class="wrapper"> \
            <div class="content">report details will go here soon</div> \
          </div> \
        </div> \
        <div class="buttons"> \
          <strong>Hi ' + this.user.name + '!</strong> \
          <a href="https://mycolor.today/u/' + this.user.login + '" target="_blank" tabindex="-1" class="btn btn-inline right">view</a> \
        </div> \
      </div> \
    ')
  },

  renderNotLoggedIn : function() {
    jQuery('#content').html(' \
      <div id="login"> \
        <div class="canvas"> \
          <div class="wrapper"> \
            <h3>Hey there! To use this extension, you need to sign up or login. <small>Otherwise you won\'t get to see really cool stuff.</small></h3> \
            <div> \
              <a href="https://mycolor.today/signup" target="_blank" tabindex="-1" class="btn btn-login">signup / login now</a> \
            </div> \
          </div> \
        </div> \
      </div> \
    ')
  },

  render : function() {
    if (this.user) {
      this.renderDailyReport();
    } else {
      this.renderNotLoggedIn();
    }

    jQuery('body').removeClass('loading');
  }  
});



(function() {
  var colorPopup = new MyColorTodayPopup();
})();