Ext.define('PF.view.PizzaFinderMap', {
    extend:'PF.view.EsriMap',
    xtype:'pizzafindermap',
    config:{
		canClickToSelectFeatures:true
    },

	driveTimeLayer:null,
	pizzaShopGraphicLayer:null,
	currentLocationLayer:null,
	waitingForTapToFind:false,

	pizzaShopSymbol:null,
	locationSymbol:null,
	
	driveTimePolygonSymbolRed:null,
	driveTimePolygonSymbolBlue:null,
	driveTimePolygonSymbolGreen:null,	

    initialize:function () {
        this.callParent();

		PF.mainPizzaFinderMapView = this;
		
		this.pizzaShopSymbol = new esri.symbol.PictureMarkerSymbol(
		{
			"angle":0,"xoffset":0,
			"yoffset":8,"type":"esriPMS",
			"url":"http://static.arcgis.com/images/Symbols/Shapes/RedPin1LargeB.png","contentType":"image/png",
			"width":18,"height":18
		});
		
		this.locationSymbol = new esri.symbol.PictureMarkerSymbol(
		{
			"angle":0,
			"xoffset":0,"yoffset":11,
			"type":"esriPMS",
			"url":"http://static.arcgis.com/images/Symbols/Shapes/BluePin1LargeB.png","contentType":"image/png",
			"width":28,"height":28
		});
		
		this.driveTimePolygonSymbolRed = new esri.symbol.SimpleFillSymbol();
        this.driveTimePolygonSymbolRed.setOutline(new esri.symbol.SimpleLineSymbol(esri.symbol.SimpleLineSymbol.STYLE_SOLID, new dojo.Color([0, 0, 0, 0.05]), 1));
        this.driveTimePolygonSymbolRed.setColor(new dojo.Color([255, 0, 0, 0.15]));
        
        this.driveTimePolygonSymbolBlue = new esri.symbol.SimpleFillSymbol();
        this.driveTimePolygonSymbolBlue.setOutline(new esri.symbol.SimpleLineSymbol(esri.symbol.SimpleLineSymbol.STYLE_SOLID, new dojo.Color([0, 0, 0, 0.05]), 1));
        this.driveTimePolygonSymbolBlue.setColor(new dojo.Color([0, 0, 255, 0.15]));

        this.driveTimePolygonSymbolGreen = new esri.symbol.SimpleFillSymbol();
        this.driveTimePolygonSymbolGreen.setOutline(new esri.symbol.SimpleLineSymbol(esri.symbol.SimpleLineSymbol.STYLE_SOLID, new dojo.Color([0, 0, 0, 0.05]), 1));
        this.driveTimePolygonSymbolGreen.setColor(new dojo.Color([0, 255, 0, 0.15]));
    },

	// Inherit from EsriMap, and implement this function to add config to your map beyond the basemap.
    initMap:function () {
		var map = this.getMap();
		
		// Add graphic layer for showing drive-time polygons
		this.driveTimeLayer = new esri.layers.GraphicsLayer();
		map.addLayer(this.driveTimeLayer);

		// Add a layer to display Pizza Shops
		var pizzaRenderer = new esri.renderer.SimpleRenderer(this.pizzaShopSymbol);
		this.pizzaShopGraphicLayer = new esri.layers.GraphicsLayer();
		this.pizzaShopGraphicLayer.renderer = pizzaRenderer;
		map.addLayer(this.pizzaShopGraphicLayer);

		// Handle what happens when we click on a pizza shop.
		var myEsriMapView = this;
		dojo.connect(this.pizzaShopGraphicLayer, 'onClick', function (e) {
			myEsriMapView.clickOnPizzaLayer(e);
		});

		// Add a layer to show our current location.
		var locRenderer = new esri.renderer.SimpleRenderer(this.locationSymbol);
		this.currentLocationLayer = new esri.layers.GraphicsLayer();
		this.currentLocationLayer.renderer = locRenderer;
		map.addLayer(this.currentLocationLayer);

		// Lastly, allow us to search by clicking on the map.
		dojo.connect(map, 'onClick', function (e) {
			myEsriMapView.clickOnMap(e);
		});
    },

	// Reset our map layers.
	clearMap:function() {
		this.pizzaShopGraphicLayer.clear()
		this.currentLocationLayer.clear();
		this.driveTimeLayer.clear();		
	},

	// The user clicked on the Pizza Shop layer.
	// Get the graphic and fire an event for the controller to catch.
	clickOnPizzaLayer: function(evt) {
		if (!this.waitingForTapToFind)
		{
			var pizzaShopGraphic = evt.graphic;
			var eventHandledOK = this.fireEvent('pizzaShopSelected', pizzaShopGraphic);
		}
	},
	
	// The user clicked on the map (and not on the Pizza Shop Layer)
	// If we're in "Click On The Map To Search" mode, we'll fire an event
	// for the controller to act on.
	clickOnMap:function(evt) {
		var map = this.getMap();
		if (map) {
			
			if (this.waitingForTapToFind)
			{
				// Drop out of "Clock On The Map To Search" mode.
				this.waitingForTapToFind = false;

				// Since the interaction is outside the floating
				// panel, we'll close it explicitly.
				PF.clickToFindPanel.hide();
				
				// And let the controller know...
				var eventHandledOK = this.fireEvent('mapLocationTapped', evt.mapPoint);
			}
		}
	},
	
	// Let the controller know we want to search using an address.
	locateToAddress: function(address) {
		var eventHandledOK = this.fireEvent('addressEntered', address);
	},
	
	// Let the controlled know we want to search using our location.
	locateToMe: function() {
		var eventHandledOK = this.fireEvent('geolocationRequested');
	},
	
	// Call this to display a point on the map as the point being searched around.
	showSearchLocationOnMap: function(mapPoint) {
		var graphic = new esri.Graphic(mapPoint);
		this.clearMap();
		this.currentLocationLayer.add(graphic);
		var map = this.getMap();
		map.centerAndZoom(graphic.geometry, 12);
	},
	
	// Given an array of DriveTimePolygon service results, display them on the map.
	// This function returns the outermost polygon which is used in the spatial filter
	// to query the POI layer.
	showDriveTimePolygons: function(driveTimePolygons) {
		this.driveTimeLayer.clear();
		
		var outPolygon = null;
		
        for (var f = 0, fl = driveTimePolygons.length; f < fl; f++) {
            var driveTimePolygon = driveTimePolygons[f];
            if (f == 0) {
				outPolygon = driveTimePolygon;
                driveTimePolygon.setSymbol(this.driveTimePolygonSymbolRed);
            }
           	else if (f == 1) {
                driveTimePolygon.setSymbol(this.driveTimePolygonSymbolBlue);
            }
            else if (f == 2) {
                driveTimePolygon.setSymbol(this.driveTimePolygonSymbolGreen);
            }

            this.driveTimeLayer.add(driveTimePolygon);
        }

		if (outPolygon)
		{
			// Zoom to our drive time polygon.
			this.setExtent(outPolygon.geometry.getExtent());
		}

		return outPolygon;
	},

	// Given a set of results from a Feature Service Query, display them on the map.
	showPizzaShops: function(pizzaShops) {
		this.pizzaShopGraphicLayer.clear();
		if (pizzaShops.features.length > 0)
		{
			var thisPizzaFinderMap = this;
			Ext.each(pizzaShops.features, function(feature) {
				thisPizzaFinderMap.pizzaShopGraphicLayer.add(feature);
			});
		}
		else
		{
			Ext.Msg.alert('Sorry', 'There\'s no pizza nearby!');
		}
	}
});