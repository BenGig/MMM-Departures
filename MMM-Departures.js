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
        stationName: "Aazopf",
        stationId: "8577410",
        hideBelow: 8,
      },
      {
        stationName: "Tafelstatt",
        stationId: "8577412",
      },
    ],
    absoluteTime: true,
    maxElements: 5,
    initialLoadDelay: 1000,
    updateInterval: 30 * 60 * 1000, // every 30 minutes
  },
  
  // Method is called when all modules are loaded an the system is ready to boot up
  start: function() {
    var self = this;
    Log.info('Starting module: ' + this.name);
    for (var i = 0; i<this.config.stations.length; i++) {
      this.config.stations[i].departures = [];
      Log.info(this.name + ': added station ' + this.config.stations[i].stationName);
    }
    this.updateTimer = null;
    this.lastUpdate = NaN;

    this.scheduleUpdate(this.config.initialLoadDelay);

    setInterval(function() {
      self.updateDom();
    }, 30000);
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
    // Timer to fetch new data
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
      this.lastUpdate = Date.now();
      this.updateDom();
      this.scheduleUpdate(this.config.updateInterval);
    }
  },

  leadingZero: function(num) {
    num = (num < 10 ? '0' : '' )+ num;
    return num;
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

    // Now iterate over defined stations
    for (var si = 0; si < this.config.stations.length; si++) {
      station = this.config.stations[si];

      var departuresShown = Math.min(this.config.maxElements, station.departures.length);
      var minutesSinceUpdate = (Date.now() - this.lastUpdate)/60000;

      // Process only stations with departures
      if (station.departures.length > 0) {
      
        var activeDepartures = [];
        // Filter departures, eliminate if too late to reach or even passed
        for (var i = 0; i < station.departures.length; i++) {
          if (parseInt(station.departures[i][2], 10) - minutesSinceUpdate > 0) {
            if (station.hasOwnProperty("hideBelow")) {
              if (parseInt(station.departures[i][2], 10) - minutesSinceUpdate >= station.hideBelow) {
                activeDepartures.push(station.departures[i]);
               }
            } else {
              activeDepartures.push(station.departures[i]);
            }
          }
        }     

        // Build departure table: header with station name
        var stationRowNameWrapper = document.createElement("tr");
        stationRowNameWrapper.className = "small";

        var stationNameWrapper = document.createElement("td");
        stationNameWrapper.className = "bright";
        stationNameWrapper.setAttribute("colspan", "3");
        stationNameWrapper.innerHTML = station.stationName;

        var stationRowWrapper = document.createElement("tr");
        stationRowWrapper.appendChild(stationNameWrapper);
        stationRowWrapper.appendChild(document.createElement("td"));
        stationRowWrapper.appendChild(document.createElement("td"));
        wrapper.appendChild(stationRowWrapper);

        // Now list departures
        for (var i = 0; i < departuresShown; i++) {
          var departureWrapper = document.createElement("tr");
          // Fade out last 2 entries (only if more than 2 entries...)
          if (departuresShown > 2) {
            if (i == departuresShown - 2) {
              departureWrapper.setAttribute("style", "opacity: 0.777777");
            } else if (i == departuresShown - 1) {
              departureWrapper.setAttribute("style", "opacity: 0.444444");
            }
          }

          // Split departure info into table fields
          for (var j = 0; j < 3; j++) {
            var departureInfoWrapper = document.createElement("td");
            // first 2 fields with spacer
            if (j < 2) {
              departureInfoWrapper.innerHTML = activeDepartures[i][j] + "&nbsp;";
              departureInfoWrapper.className = "align-left";
            }
            // time field
            if (j == 2) {
              if (this.config.absoluteTime) {
                // Calculate absolute time
                var now = new Date();
                var departureTime = new Date();
                departureTime.setTime(now.getTime() + parseInt(activeDepartures[i][j],10)*1000*60)
                departureInfoWrapper.innerHTML = departureTime.getHours() + ":" + this.leadingZero(departureTime.getMinutes());
              } else {
                // Correction for relative time since some time passed since data update
                departureInfoWrapper.innerHTML = parseInt(parseInt(activeDepartures[i][j],10)-minutesSinceUpdate)+"m";
              }
              departureInfoWrapper.className = "align-right";
            }
            departureWrapper.appendChild(departureInfoWrapper);
          }

          wrapper.appendChild(departureWrapper);
        }
      }
    }

    return wrapper;
  },

});
