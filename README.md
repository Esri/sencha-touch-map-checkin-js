sencha-touch-map-checkin-js
===========================

A sample application demonstrating integration of the [ArcGIS API for JavaScript](http://help.arcgis.com/en/webapi/javascript/arcgis/jshelp/#overview_api) with [Sencha Touch](http://www.sencha.com/products/touch). The application makes use of the Service Area task, querying an ArcGIS Online Feature Service, and writing checkin/checkout information to additional ArcGIS Feature Services.

**[View it live](http://esri.github.io/sencha-touch-map-checkin-js/)**

![PizzaFinder](https://raw.github.com/Esri/sencha-touch-map-checkin-js/master/sencha-touch-map-checkin-js.jpg)

## Features
* Find an address, use your current location, or tap on a map
* Find pizza restaurants within 1, 2, and 3 minutes drive
* Show ArcGIS JavaScript API integration with Sencha Touch
* Demonstrate [Geocoding](http://geocode.arcgis.com/arcgis/index.html), [Routing](http://route.arcgis.com/arcgis/index.html), and [Service Area](http://route.arcgis.com/arcgis/index.html) ArcGIS services
* Demonstrate Querying [ArcGIS Online Feature Services](http://resources.arcgis.com/en/help/main/10.1/#/Hosted_feature_services/01w100000051000000/)
* Demonstrate Editing against [ArcGIS Online Feature Services](http://resources.arcgis.com/en/help/main/10.1/#/Hosted_feature_services/01w100000051000000/)

## Getting Started

### Configure the application

1. Set this repo up as a URL on your webserver (e.g. http://localhost/pizzafinder)
2. Unzip the [Sencha Touch download](http://www.sencha.com/products/touch/download/) to the repo's parent, and name it sencha (e.g. http://localhost/sencha). A symlink will do.

Browse to the web page (e.g.http://localhost/pizzafinder). Best viewed in Safari on an iPhone. Note: this application makes use of a proxy page for full functionality (see below).

### Proxy page
This sample includes a PHP proxy page. Your Web Server must be enabled for PHP.

If you prefer to use ASP.NET or Java/JSP, refer to [this page](http://help.arcgis.com/en/webapi/javascript/arcgis/jshelp/#ags_proxy) and change the reference in [app.js](https://raw.github.com/Esri/sencha-touch-map-checkin-js/master/app.js)

### Development vs Production
Note, this repo includes the source for working in development mode. The project has been tested for production compilation with Sencha Cmd v3.0.2.288.

To build the project, ignore the [Sencha documentation](http://docs.sencha.com/touch/2-1/#!/guide/building). It's woefully, perhaps maliciously out of date. Instead, install the [Sencha Cmd](http://docs.sencha.com/touch/2-1/#!/guide/command), cd to this repo, and run the following command:
```
sencha app build production
```
You can then visit your compact, minified, production build at e.g. http://localhost/pizzafinder/build/PF/Production

[New to Github? Get started here.](http://htmlpreview.github.com/?https://github.com/Esri/esri.github.com/blob/master/help/esri-getting-to-know-github.html)

## Requirements

* A web server
* [Sencha Touch 2.1.1](http://www.sencha.com/products/touch/download/)
* This sample includes a PHP proxy file. To use it, ensure your web server has PHP enabled.
* Some experience with JavaScript development
* See also [Sencha Touch's requirements](http://docs.sencha.com/touch/2-1/#!/guide/getting_started-section-2)

## Resources

* [ArcGIS API for JavaScript](http://help.arcgis.com/en/webapi/javascript/arcgis/)
* [ArcGIS API for JavaScript Forums](http://forums.arcgis.com/forums/15-ArcGIS-API-for-JavaScript)
* [ArcGIS Blog](http://blogs.esri.com/esri/arcgis/)
* Twitter [@esri](http://twitter.com/esri)
* [Getting Started with Sencha Touch](http://docs.sencha.com/touch/2-1/#!/guide/getting_started)

## Issues

Find a bug or want to request a new feature?  Please let us know by submitting an Issue.

## Contributing

Anyone and everyone is welcome to contribute. 

## Licensing
Copyright 2012 Esri

Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at

   http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.

A copy of the license is available in the repository's [license.txt](https://raw.github.com/Esri/quickstart-map-ios/master/license.txt) file.
[](Esri Tags: Geocoding Routing ServiceArea DriveTime ArcGISOnline Editing Mobile Mapping ArcGIS Sencha SenchaTouch Pizza)
[](Esri Language: JavaScript)
