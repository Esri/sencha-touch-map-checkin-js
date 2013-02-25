function mapResults(results, info) {
            //move to the map view to display the route
            var widget = dijit.byId('resultsView');
            widget.performTransition('mapView', 1, "slide", info, function () {
                map.resize();
                resultLocationsLayer.clear();
                routeGraphicLayer.clear();
                segmentGraphicsLayer.clear();


                //Define the route input parameters
                params.directionsLengthUnits = esri.Units.MILES;
                params.outSpatialReference = map.spatialReference;
                params.stops.features = [];

                //Add the starting location to the map
                var fromSymbol = new esri.symbol.SimpleMarkerSymbol().setColor(new dojo.Color([105, 153, 0]));
                var startLoc = new esri.Graphic(esri.geometry.geographicToWebMercator(new esri.geometry.Point(searchLocation, new esri.SpatialReference({
                    wkid: 4326
                }))), fromSymbol, {
                    Name: dojo.byId('loc').textContent,
                    RouteName: info.title
                });
                resultLocationsLayer.add(startLoc);
                params.stops.features[0] = startLoc;

                //Add the ending location to the map
                var toSymbol = new esri.symbol.SimpleMarkerSymbol().setColor(new dojo.Color([204, 0, 0]));
                var endLoc = new esri.Graphic(esri.geometry.geographicToWebMercator(new esri.geometry.Point(info.lon, info.lat, new esri.SpatialReference({
                    wkid: 4326
                }))), toSymbol, {
                    Name: info.title,
                    RouteName: info.title
                });
                resultLocationsLayer.add(endLoc);
                params.stops.features[1] = endLoc;

                //Get the Route and display it and the directions on the MapView
                routeTask.solve(params, function (solveResult) {
                    var directions = solveResult.routeResults[0].directions;
                    directionFeatures = directions.features;
                    var content = [];
                    content.push("<ol>");
                    routeGraphicLayer.add(new esri.Graphic(directions.mergedGeometry));
                    dojo.forEach(directions.features, function (feature, index) {
                        if (index === 0 || index === directions.features.length - 1) {
                            content.push("<li>" + feature.attributes.text + "</li>");
                        }
                        else {
                            content.push("<li onclick='zoomToSegment(" + index + "); return false;' class=\"segment\"><a href=\"#\">" + feature.attributes.text + "</a></li>");
                        }
                    });
                    content.push("</ol>");
                    dojo.byId("directions").innerHTML = content.join("");
                    map.setExtent(directions.extent, true);
                }, function (error) {
                    dojo.byId("directions").innerHTML = "<b>Error:</b> ";
                });
            });
        }


        routeTask = new esri.tasks.RouteTask("http://servicesbeta.esri.com/arcgis/rest/services/Network/USA/NAServer/Route");            
        params = new esri.tasks.RouteParameters();
        params.stops = new esri.tasks.FeatureSet();
        params.returnRoutes = true;
        params.returnDirections = true;
