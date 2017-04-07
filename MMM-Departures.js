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
    absoluteTime: true,
    maxElements: 5,
    initialLoadDelay: 1000,
    updateInterval: 30 * 60 * 1000, // every 30 minutes
    debug: false,
  },
  
  getStyles: function () {
    return ["MMM-Departures.css"];
  },
  
  // Method is called when all modules are loaded an the system is ready to boot up
  start: function() {
    var self = this;
    Log.info('Starting module: ' + this.name);
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

  // Filter departures
  filterPassedDepartures: function(departures, minutesSinceUpdate, threshold) {
    var filteredDepartures = [];
    
    for (var i = 0; i < departures.length; i++) {
      if (parseInt(departures[i][2], 10) - minutesSinceUpdate > 0) {
        if (parseInt(departures[i][2], 10) - minutesSinceUpdate >= threshold) {
          filteredDepartures.push(station.departures[i]);
        }
      }
    }     
    return filteredDepartures;
  },
  filterIncludedLines: function(departures, wantedLines ) {
    var filteredDepartures = [];
    for (var i = 0; i < departures.length; i++) {
      for (var j = 0; j < wantedLines.length; j++) {
        if (wantedLines[j] == departures[i][0]) {
          filteredDepartures.push(departures[i]);
        }
      }
    }
    return filteredDepartures;
  },
  filterExcludedLines: function(departures, unwantedLines ) {
    var filteredDepartures = [];
    for (var i = 0; i < departures.length; i++) {
      for (var j = 0; j < unwantedLines.length; j++) {
        if (unwantedLines[j] != departures[i][0]) {
          filteredDepartures.push(departures[i]);
        }
      }
    }
    return filteredDepartures;
  },
  filterDepartures: function(departures, station, minutesSinceUpdate) {
    if (station.hasOwnProperty("hideBelow")) {
      departures = this.filterPassedDepartures(departures, minutesSinceUpdate, station.hideBelow);
    } else {
      departures = this.filterPassedDepartures(departures, minutesSinceUpdate, 0);
    }
    // Filter wanted/unwanted lines
    if (station.hasOwnProperty("includeLines")) {
      departures = this.filterIncludedLines(departures, station.includeLines);
    }
    if (station.hasOwnProperty("excludeLines")) {
      departures = this.filterExcludedLines(departures, station.excludeLines);
    }
    return departures;
  },

  
  // Update the information on screen
  getDom: function() {
    var self = this;

    // global config check
    if ( ! this.config.hasOwnProperty("provider")) {
      var errorWrapper = document.createElement("div");
      errorWrapper.className = "small";
      errorWrapper.innerHTML = "MMM-Departures: No provider set";
      return errorWrapper;
    }
    if ( ! this.config.hasOwnProperty("stations")) {
      var errorWrapper = document.createElement("div");
      errorWrapper.className = "small";
      errorWrapper.innerHTML = "MMM-Departures: No station set";
      return errorWrapper;
    }
    
    if (this.config.debug) { Log.log("Stations defined: " + this.config.stations.length) };
    
    if (!this.loaded) {
      if (this.config.debug) { Log.log("State: module not completely loaded yet") };
      var wrapper = document.createElement("div");
      wrapper.innerHTML = this.translate("LOADING");
      wrapper.className = "small dimmed";
      return wrapper;
    }

    var wrapper = document.createElement("table");
    wrapper.className = "small";

    // Now iterate over defined stations
    for (var si = 0; si < this.config.stations.length; si++) {
      station = this.config.stations[si];
      if (this.config.debug) { Log.log("Processing station " + station.stationName) };

      // station config check
      if (station.hasOwnProperty("includeLines") && station.hasOwnProperty("excludeLines")) {
        var stationRowWrapper = document.createElement("tr");
        var stationWrapper = document.createElement("td");
        stationWrapper.setAttribute("colspan", "3");
        stationWrapper.innerHTML = station.stationName + ": only one of 'includeLines' and 'excludeLines' allowed";
        stationRowWrapper.appendChild(stationWrapper);
        wrapper.append(stationRowWrapper);
        if (this.config.debug) { Log.log("- Processing stopped: both 'includeLines' and 'excludeLines' used") };
        break;
      }
      
      var minutesSinceUpdate = (Date.now() - this.lastUpdate)/60000;
      // Process only stations with departures
      if (station.hasOwnProperty("departures") && station.departures.length > 0) {

        // Filter departures, eliminate if too late to reach or even passed
        var activeDepartures = station.departures;
        Log.log("Minutes since update " + minutesSinceUpdate);
        activeDepartures = this.filterDepartures(activeDepartures, station, minutesSinceUpdate);

        // station may be not ready yet during startup
        try {
          var departuresShown = Math.min(this.config.maxElements, station.departures.length);
        } catch (e) {
          departuresShown = this.config.maxElements;
        }

        if (this.config.debug) { Log.log("- Departures found: " + departuresShown) };
        
        // Build departure table: header with station name
        var stationRowNameWrapper = document.createElement("tr");
        // stationRowNameWrapper.className = "small";

        var stationNameWrapper = document.createElement("td");
        //stationNameWrapper.className = "bright";
        stationNameWrapper.className = "heading";
        stationNameWrapper.setAttribute("colspan", "3");
        stationNameWrapper.innerHTML = station.stationName;

        var stationRowWrapper = document.createElement("tr");
        stationRowWrapper.appendChild(stationNameWrapper);
        stationRowWrapper.appendChild(document.createElement("td"));
        stationRowWrapper.appendChild(document.createElement("td"));
        wrapper.appendChild(stationRowWrapper);

        // Now list departures
        for (var i = 0; i < departuresShown; i++) {
          if (this.config.debug) { Log.log("-- Processing departure: " + activeDepartures[i]) };
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
              // cut destination station if configured
              if (j == 1 && this.config.hasOwnProperty("maxDestinationLength")) {
                departureInfoWrapper.innerHTML = activeDepartures[i][j].substr(0, this.config.maxDestinationLength) + "&nbsp;";
              } else {
                departureInfoWrapper.innerHTML = activeDepartures[i][j] + "&nbsp;";
              }
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
