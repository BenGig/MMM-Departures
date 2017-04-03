'use strict';

/* Magic Mirror
 * Module: MMM-Departures
 *
 * By Bengt Giger
 * MIT Licensed.
 */

const NodeHelper = require('node_helper');
var request = require('request');
// var _ = require('underscore');

module.exports = NodeHelper.create({
  start: function() {
    this.config = {};
  },


  processJson: function(json, id) {
    var self = this;
    var departures = JSON.parse(json);
    var stationInfo = '{"id": "' + id + '", "departures": ' + json + "}";
    return JSON.parse(stationInfo);
  },
  
  getStationData: function(config, i, callback) {
    var self = this;
    var url = config.apiUrl + "?from=" + config.stations[i].stationId + "&provider=" + config.provider;
    request(url, function(error, response, body) {
      if (!error && response.statusCode == 200) {
        var structuredData = callback(body, this.id);
        self.sendSocketNotification('DATARECEIVED', structuredData);
      }  else {
        console.log("MMM-Departures error: " + error)
      }
    }.bind({id: config.stations[i].stationId}));
  },
            
  
  
  // Subclass socketNotificationReceived received.
  socketNotificationReceived: function(notification, payload) {
    if (notification === 'GETDATA') {
      var self = this;
      self.config = payload;

      for (var i = 0; i < self.config.stations.length; i++) {
        this.getStationData(this.config, i, this.processJson);
      }
        
      self.sendSocketNotification('DATARECEIVED', self.config);
    }
  }

});
