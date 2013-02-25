Ext.define('PF.view.DirectionsMap', {
    extend:'PF.view.EsriMap',
    xtype:'esridirectionsmap',
    config:{
		basemapLayer:"http://server.arcgisonline.com/ArcGIS/rest/services/World_Street_Map/MapServer",
		mapHeight:"140px",
		routeGeom:null
    },
	
	// Some handles onto graphics layers for displaying directions.
	routeGraphicLayer:null,
	routePointsGraphicLayer:null,
	routeHighlightLayer:null,
	geofenceGraphicLayer:null,
	
	routeExtent:null,
	
	// And some symbols.
	// For the route and highlighting the selected turn-by-turn segment.
	routeSymbol:null,
	segSymbol:null,
	
	// For the user's current location (always the start of the current turn-by-turn, for now).
	ptSymbolCheckedOut:null,
	ptSymbolCheckedIn:null,
	ptSymbolCanCheckedIn:null,
	
	// Other symbols for the directions display
	fromSymbol:null,
	toSymbol:null,
	geofenceSymbol:null,
	geofenceHighlighSymbol:null,
	

	initialize:function () {
        this.callParent();
		
		// We need a symbol style to draw the routes
		this.routeSymbol = new esri.symbol.SimpleLineSymbol(esri.symbol.SimpleLineSymbol.STYLE_SOLID, 
								new dojo.Color([0, 0, 0, 0.5]), 4.5);

		// And another symbol style to draw the current segment of the route as we step through the directions.
		this.segSymbol = new esri.symbol.SimpleLineSymbol(esri.symbol.SimpleLineSymbol.STYLE_SOLID,
							new dojo.Color([0,157,247,0.65]), 4);

		// The current point should be displayed in a couple of different ways depending on
		// whether we're checked in, checked out, or close enough to check in.
		var symWidth = 14, symHeight = 14, symYOffset = 0;

		this.ptSymbolCheckedOut = new esri.symbol.PictureMarkerSymbol(				
			{
				"angle":0,"xoffset":0,"yoffset":symYOffset,
				"type":"esriPMS",
				"url":"http://static.arcgis.com/images/Symbols/Shapes/BlueCircleLargeB.png",
				"contentType":"image/png","width":symWidth,"height":symHeight
			});
		this.ptSymbolCheckedIn = new esri.symbol.PictureMarkerSymbol(			
			{
				"angle":0,"xoffset":0,"yoffset":symYOffset,
				"type":"esriPMS",
				"url":"http://static.arcgis.com/images/Symbols/Shapes/RedCircleLargeB.png",
				"contentType":"image/png","width":symWidth,"height":symHeight
			});
		this.ptSymbolCanCheckedIn = new esri.symbol.PictureMarkerSymbol(			
			{
				"angle":0,"xoffset":0,"yoffset":symYOffset,
				"type":"esriPMS",
				"url":"http://static.arcgis.com/images/Symbols/Shapes/GreenCircleLargeB.png",
				"contentType":"image/png","width":symWidth,"height":symHeight
			});

		// We'll define a couple of symbols to display the start and end points of a route.
		symWidth = 28, symHeight = 28, symYOffset = 11;

		this.fromSymbol = new esri.symbol.PictureMarkerSymbol(
			{
				"angle":0,
				"xoffset":0,"yoffset":symYOffset,"type":"esriPMS",
				"url":"http://static.arcgis.com/images/Symbols/Shapes/BluePin1LargeB.png","contentType":"image/png",
				"width":symWidth,"height":symHeight
			});
		this.toSymbol = new esri.symbol.PictureMarkerSymbol(
			{
				"angle":0,
				"xoffset":0,"yoffset":symYOffset,"type":"esriPMS",
				"url":"http://static.arcgis.com/images/Symbols/Shapes/RedPin1LargeB.png","contentType":"image/png",
				"width":symWidth,"height":symHeight
			});

		// Let's create a symbol to use for the polygon that determines if we're close enough to check in.
		this.geofenceSymbol = new esri.symbol.SimpleFillSymbol(esri.symbol.SimpleFillSymbol.STYLE_SOLID,
									new esri.symbol.SimpleLineSymbol(esri.symbol.SimpleLineSymbol.STYLE_SOLID,
																	 new dojo.Color([0,200,0,0.5]), 2),
									new dojo.Color([0,255,0,0.15]));

		this.geofenceHighlightSymbol = new esri.symbol.SimpleFillSymbol(esri.symbol.SimpleFillSymbol.STYLE_SOLID,
											new esri.symbol.SimpleLineSymbol(esri.symbol.SimpleLineSymbol.STYLE_SOLID,
																			 new dojo.Color([236,96,1,0.5]), 2),
											new dojo.Color([254,173,65,0.15]));

		
		this.geofenceGraphicLayer = new esri.layers.GraphicsLayer();

		var routeRenderer = new esri.renderer.SimpleRenderer(this.routeSymbol);
		this.routeGraphicLayer = new esri.layers.GraphicsLayer();
		this.routeGraphicLayer.setRenderer(routeRenderer);

		this.routePointsGraphicLayer = new esri.layers.GraphicsLayer();

		this.routeHighlightLayer = new esri.layers.GraphicsLayer();
    },

	// Inherit from EsriMap, and implement this function to add config to your map beyond the basemap.
	initMap:function () {
		// Add the layers for displaying directions.
		var map = this.getMap();
		map.addLayer(this.geofenceGraphicLayer);
		map.addLayer(this.routeGraphicLayer);
		map.addLayer(this.routeHighlightLayer);
		map.addLayer(this.routePointsGraphicLayer);
		
		// And zoom to the route if necessary.
		this.zoomToRoute();
	},
	
	clear: function() {
		this.routeExtent = null;
		this.routePointsGraphicLayer.clear();
		this.routeGraphicLayer.clear();
		this.geofenceGraphicLayer.clear();
		this.routeHighlightLayer.clear();
	},

	// As we collect the various geometries we're going to display, we want to make sure
	// the map can be updated to display them. We call mergeExtent as the controller updates
	// the view.
	mergeExtent: function(geom, zoomMap) {
		zoomMap = (typeof zoomMap == "undefined")?true:zoomMap;
		
		if (geom)
		{
			var geomExtent = geom.getExtent();
			
			if (!geomExtent && geom.type == 'point')
			{
				// We'll just hack an extent for the point.
				// Assuming we're in Web Mercator Aux Sphere, the 
				// map units will be fine for this.
				var dX = dY = 0.1;
				geomExtent = new esri.geometry.Extent(geom.x - dX, geom.y - dY, 
					geom.x + dX, geom.y + dY,
					new esri.SpatialReference(102100));
			}
			
			if (geomExtent)
			{
				if (this.routeExtent)
				{
					this.routeExtent = this.routeExtent.union(geomExtent);
				}
				else
				{
					this.routeExtent = geomExtent;
				}
				if (zoomMap) { this.zoomToRoute(); }
			}
		}
	},
	
	setStartAndEndPoints: function(fromPt, toPt) {
		var map = this.getMap();
		
		// Set the map extent
		if (fromPt && toPt)
		{
			var pl = new esri.geometry.Polyline(new esri.SpatialReference({wkid:102100}));
			pl.addPath([fromPt, toPt]);
			this.mergeExtent(pl);
		}

		if (fromPt)
		{
			// Draw where we're starting from
			var startLoc = new esri.Graphic(fromPt, this.fromSymbol);
			this.routePointsGraphicLayer.add(startLoc);
			this.mergeExtent(fromPt);
		}

		if (toPt)
		{
			// Add where we're going to
			var endLoc = new esri.Graphic(toPt, this.toSymbol);
			this.routePointsGraphicLayer.add(endLoc);
			this.mergeExtent(toPt);
		}
	},
	
	setCheckinGeofence: function(geofencePolygon, isHighlighted) {
		this.geofenceGraphicLayer.clear();
		if (geofencePolygon)
		{
			// Add the geofence to the display.
			var graphic = new esri.Graphic(geofencePolygon, isHighlighted?this.geofenceHighlightSymbol:this.geofenceSymbol);
			this.geofenceGraphicLayer.add(graphic);

			// Resize the map if necessary to ensure the geofence is included.
			var map = this.getMap();
			this.mergeExtent(geofencePolygon, false);
		}
	},
	
	applyRouteGeom: function(routeGeom) {
		// Since this is a config option, the apply method is automatically called by Sencha.
		// We can take advantage of that to do any additional logic we want to.
		this.routeGraphicLayer.clear();

		if (routeGeom)
		{
			// Build the graphics
			var routeGraphic = new esri.Graphic(routeGeom);

			// Make sure the tracked extent includes the route
			this.mergeExtent(routeGeom);

			// Prep the graphics layers to display this result.
			this.routeGraphicLayer.add(routeGraphic);
		}
		
		return routeGeom;
	},
	
	zoomToRoute: function() {
		// We build up the extent with calls to this.mergeExtent.
		if (this.routeExtent)
		{
			// Zoom the map
			var map = this.getMap();
			if (map)
			{
				map.setExtent(this.routeExtent.expand(1.2), true);
			}
		}
	},

	drawRouteTurn:function(routeTurn, isCheckedIn, updateExtent) {
		// There's a graphics layer dedicated to displaying the selected
		// turn-by-turn direction. First of all, we'll clear any previous graphics.
		this.routeHighlightLayer.clear();
		
		// Get the geometry we want to display.
		var geometry = routeTurn.geometry;

		// Now we draw the user's location depending on whether they're checked in or
		// checked out.
		// We're taking a shortcut here for this demo and using the start point
		// of the current route segment.
		var ptSymbol = isCheckedIn?this.ptSymbolCheckedIn:this.ptSymbolCheckedOut;
		var ptGraphic = new esri.Graphic(geometry.getPoint(0,0), ptSymbol);
		var graphic = new esri.Graphic(geometry, this.segSymbol);

		// Add the route segment, and then draw the user's position at the start point.
		this.routeHighlightLayer.add(graphic);
		this.routeHighlightLayer.add(ptGraphic);

		if (updateExtent)
		{
			// Zoom to the current segment if necessary.
			var zoomExt = geometry.getExtent();

			var map = this.getMap();

			// The current segment is always a polyline, but in the special case of start
			// or end points of the route, we should zoom as if to a point with a fixed
			// zoom level. Users will thank us for it.
			var maneuverType = routeTurn.attributes['maneuverType'];

			// If we're looking at the start or end of the route, then
			// zoom as if to a point, but otherwise, zoom to the extent.
			if (maneuverType == 'esriDMTDepart' ||
				maneuverType == 'esriDMTStop')
			{
				var centerPt = zoomExt.getCenter();
				map.centerAndZoom(centerPt, 17);
			}
			else
			{
				map.setExtent(zoomExt.expand(1.05), true);
			}
		}
	}
});