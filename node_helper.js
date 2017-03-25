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

// https://www.tomas-dvorak.cz/posts/nodejs-request-without-dependencies/
const getContent = function(url) {
  // return new pending promise
  return new Promise((resolve, reject) => {
    // select http or https module, depending on reqested url
    const lib = url.startsWith('https') ? require('https') : require('http');
    const request = lib.get(url, (response) => {
      // handle http errors
      if (response.statusCode < 200 || response.statusCode > 299) {
        reject(new Error('Failed to load page, status code: ' + response.statusCode));
      }
      // temporary data holder
      const body = [];
      // on every content chunk, push it to the data array
      response.on('data', (chunk) => body.push(chunk));
      // we are done, resolve promise with those joined chunks
      response.on('end', () => resolve(body.join('')));
    });
    // handle connection errors of the request
    request.on('error', (err) => reject(err))
  })
};



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
        
        /*
        var url = self.config.apiUrl + "?from=" + self.config.stations[i].stationId + "&provider=" + self.config.provider;
        self.i = i;
        request(url, function(error, response, body) {
          if (!error && response.statusCode == 200) {
            self.config.stations[self.i].departures = JSON.parse(body);
          } else {
            self.config.stations[self.i].departures = [];
          }
        }.bind( {self: self}));
      }*/
      
      self.sendSocketNotification('DATARECEIVED', self.config);
    }
  }

});
