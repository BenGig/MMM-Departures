/* global Module */

/* Magic Mirror
 * Module: MMM-Departures
 *
 * By Bengt Giger
 * MIT Licensed.
 */

Module.register('MMM-Departures', {

  defaults: {
    apiUrl: 'http://transportrest-sbiermann.rhcloud.com/departureFHEM',
    provider: 'Sbb',
    stations: [
      {
        "stationName": "Aazopf",
        "stationId": "8577410"
      },
      {
        "stationName": "Tafelstatt",
        "stationId": "8577412"
      },
    ],
    absoluteTime: true,
    maxElements: 5,
    initialLoadDelay: 1000,
    updateInterval: 10 * 60 * 1000, // every 10 minutes
  },
  
  // Define required scripts.
  getStyles: function () {
    return ['MMM-Departures.css','font-awesome.css'];
  },

  // Method is called when all modules are loaded an the system is ready to boot up
  start: function() {
    Log.info('Starting module: ' + this.name);
    for (var i = 0; i<this.config.stations.length; i++) {
      this.config.stations[i].departures = ['no information yet'];
      Log.info(this.name + ': added station ' + this.config.stations[i].stationName);
    }
    this.updateTimer = null;
    this.scheduleUpdate(this.config.initialLoadDelay);
  },

  /* scheduleUpdate()
   * Schedule next update.
   *
   * argument delay number - Milliseconds before next update. If empty, this.config.updateInterval is used.
   */
  scheduleUpdate: function (delay) {
    var nextLoad = this.config.updateInterval;
    if (typeof delay !== 'undefined' && delay >= 0) {
      nextLoad = delay;
    }
    
    var self = this;
    clearTimeout(this.updateTimer);
    this.updateTimer = setTimeout(function () {
      self.sendSocketNotification('GETDATA', self.config);
      // Log.log('Departures new data fetched...');
    }, nextLoad);
  },

  // Override socket notification handler.
  // Module notifications from node_helper
  socketNotificationReceived: function(notification, payload) {
    if (notification === 'DATARECEIVED') {
      for (var i = 0; i < this.config.stations.length; i++){
        if (this.config.stations[i].stationId == payload.id) {
          this.config.stations[i].departures = payload.departures;
          this.loaded = true;
        }
      }
      this.updateDom(2000);
      this.scheduleUpdate(this.config.updateInterval);
    }
  },
      
  // Update the information on screen
  getDom: function() {
    var self = this;
    var wrapper = document.createElement("table");
    wrapper.className = "small";
    
    if (!this.loaded) {
      wrapper.innerHTML = this.translate("LOADING");
      wrapper.className = "small dimmed";
      return wrapper;
    }

    
    for (var si = 0; si < this.config.stations.length; si++) {
      station = this.config.stations[si];
      var departuresShown = Math.min(this.config.maxElements, station.departures.length);
      
      var stationRowNameWrapper = document.createElement("tr");
      stationRowNameWrapper.className = "small";

      var stationNameWrapper = document.createElement("td");
      stationNameWrapper.className = "bright";
      stationNameWrapper.setAttribute("colspan", "2");
      stationNameWrapper.innerHTML = station.stationName;

      var stationRowWrapper = document.createElement("tr");
      stationRowWrapper.appendChild(stationNameWrapper);
      stationRowWrapper.appendChild(document.createElement("td"));
      stationRowWrapper.appendChild(document.createElement("td"));
      wrapper.appendChild(stationRowWrapper);

      for (var i = 0; i < departuresShown; i++) {
        departureInfo = station.departures[i];
        var departureWrapper = document.createElement("tr");
        if (departuresShown > 3) {
          if (i == departuresShown - 2) {
            departureWrapper.setAttribute("style", "opacity: 0.777777");
          } else if (i == departuresShown - 1) {
            departureWrapper.setAttribute("style", "opacity: 0.444444");
          }
        }

        for (var j = 0; j < 3; j++) {
          var departureInfoWrapper = document.createElement("td");
          if (j < 2) {
            departureInfoWrapper.innerHTML = departureInfo[j] + "&nbsp;";
            departureInfoWrapper.className = "align-left";
          }
          if (j == 2) {
            if (this.config.absoluteTime) {
              var now = new Date();
              var departureTime = new Date();
              departureTime.setTime(now.getTime() + parseInt(departureInfo[j],10)*1000*60)
              departureInfoWrapper.innerHTML = departureTime.getHours() + ":" + departureTime.getMinutes();
            } else {
              departureInfoWrapper.innerHTML = departureInfo[j];
            }
            departureInfoWrapper.className = "align-right";
          }
          departureWrapper.appendChild(departureInfoWrapper);
        }

        wrapper.appendChild(departureWrapper);
      }
    }

    return wrapper;
  },

});
