# MMM-Departures
[Magic mirror](https://github.com/MichMich/MagicMirror) module for public transport departure times. Data source is pulled from a server running the [public-transport-enabler](https://github.com/schildbach/public-transport-enabler/blob/master/enabler/README.md) which uses the same data as the popular [Oeffi](https://oeffi.schildbach.de/index.html) smartphone app uses: 13 countries and almost 20 cities are supported.

## Setup

### Determining API Parameters
You first have to determine a data provider. Open the URL http://transportrest-sbiermann.rhcloud.com/provider to get a list of providers. Note the content of the field *name*, i.e. "Sbb" (Swiss Federal Railways) for departure information for Switzerland.

Now you must search your station ID: i.e. to find the station ID for *Markthalle* in Basel open the URL http://transportrest-sbiermann.rhcloud.com/station/suggest?q=Basel&provider=Sbb, use the search function of your browswer to find *Basel* and pick the content of the field *id*.

Repeat the search if you want to configure more stations. 

### Optional Parameters
| Option | Description |
| --- | --- |
| maxElements | Restrict the number of departures shown per station. Default value: 5 |
| updateInterval | Pause between data updates in microseconds. Default value: 10 minutes |

### Example Configuration
```
modules: [
  {
		module: 'MMM-Departures',
		position: 'bottom_right',
		config: {
      provider: 'Sbb',
      maxElements: 4,
      updateInterval: 5 * 60 * 1000, // 5 minutes
      stations: [
        {
          "stationName": "Markthalle",
          "stationId": "8500193"
        },
        {
          "stationName": "Heuwaage",
          "stationId": "8577412"
        },
      ],
    },
  },
],
```

