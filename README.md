# MMM-Departures
[Magic mirror](https://github.com/MichMich/MagicMirror) module for public transport departure times. Data source is pulled from a server running the [public-transport-enabler](https://github.com/schildbach/public-transport-enabler/blob/master/enabler/README.md) which uses the same data as the popular [Oeffi](https://oeffi.schildbach.de/index.html) smartphone app uses: 13 countries and almost 20 cities are supported.

Many thanks to Stefan Biermann who provides the REST wrapper used by this module, initially designed for the [FHEM home automation system](http://www.fhem.de).

## Setup

### Determining API Parameters
You first have to determine a data provider. Open the URL http://transportrest-sbiermann.rhcloud.com/provider to get a list of providers. Note the content of the field *name*, i.e. "Sbb" (Swiss Federal Railways) for departure information for Switzerland.

Now you must search your station ID: i.e. to find the station ID for *Markthalle* in Basel open the URL http://transportrest-sbiermann.rhcloud.com/station/suggest?q=Basel&provider=Sbb, use the search function of your browswer to find *Basel* and pick the content of the field *id*.

Repeat the search if you want to configure more stations. 

### Optional Parameters

Module global parameters:

| Option | Description |
| --- | --- |
| maxElements | Restrict the number of departures shown per station. Default value: 5 |
| absoluteTime | Display departures as hours and minutes (HH:MM), or minutes until departure. Default value: true |
| updateInterval | Pause between data updates in microseconds. Default value: 30 minutes |

Since the request retrieves several future departures and the module eliminates departures which have passed, you don't have to fetch data updates very often. To reduce load on the server, start with the default of 15 minutes and reduce the interval if needed.

There are also optional parameters per station:

| Option | Description |
| --- | --- |
| hideBelow | Hide departures sooner than current time minus this value, so departures you wouldn't reach anyway aren't displayed. Default value: unset (display until departure is in the past)|
| includeLines | Show only listed lines. Default: show all lines |
| excludeLines | Hide lines listed. Default: show all lines |
| maxDestinationLength | Number of characters to truncate destination names. Default: none |

Options *includeLines* and *excludeLines* are mutually exclusive, use only one of them.

### Example Configuration
```
modules: [
  {
    module: 'MMM-Departures',
    position: 'bottom_right',
    config: {
      provider: 'Sbb',
      maxElements: 4,
      absoluteTime: false,
      stations: [
        {
          stationName: "Markthalle",
          stationId: "8500193",
          hideBelow: 5;
          excludeLines: [
            "NFB2",
          ],
        },
        {
          stationName: "Heuwaage",
          stationId: "8500079",
          includeLines: [
            "NFT6",
            "NFT10",
          ],
        },
      ],
    },
  },
],
```

## Known Problems

In rare circumstances, the backend server does not respond fast enough during startup and no departures are listed. They should appear after the next data update (happended once during development).
