// A couple of notes:
//
// Two variables are used on the top-level PF object to remember what the last
// search text and search locations were... These are:
// PF.lastSearchText
// PF.lastSearchLocation
//
//
//
// In some functions, you will see code like this:
// function () {
// var thisController = PF.app.getController("Main");
// thisController.startSearchingAroundPoint(PF.lastSearchLocation);
// }
//
// When a function is called as a callback, the value of "this" is unlikely to be the Sencha object
// on which that function is defined. In that case, we need to get a handle onto the Sencha object.
// In this case, since this is a controller, we know there is just one instance of it, so we ask
// Sencha for it ourselves and use that reference.

Ext.define('PF.controller.Main', {
    extend: 'Ext.app.Controller',

	// Service URL Endpoints.
	poiServiceURL: "http://services.arcgis.com/uCXeTVveQzP4IIcx/arcgis/rest/services/SF_Chi_Bell_POI/FeatureServer/0",
	geocodeServiceURL: "http://tasks.arcgisonline.com/ArcGIS/rest/services/Locators/TA_Address_NA_10/GeocodeServer",
	driveTimeServiceURL: "http://sampleserver1.arcgisonline.com/ArcGIS/rest/services/Network/ESRI_DriveTime_US/GPServer/CreateDriveTimePolygons",

	config: {
		refs: {
			// Get Sencha to give us a handle on the main PizzaFinderMap View instance
			pizzaShopsMap: '#mainPizzaMap',
			pizzaShopAddressForm: 'formpanel'
		},
	
		control: {
			// Our PizzaFinderMap View Class throws these events when the user interacts appropriately.
			pizzaShopsMap: {
				// Note we have 3 events thrown for the various ways of finding a place to search...
				geolocationRequested: 'searchNearMe',
				addressEntered: 'locateToAddress',
				mapLocationTapped: 'tapOnMap',
				// ...and one event fired when the user taps on a search result in the map.
				pizzaShopSelected: 'pizzaShopSelected'
			},
			pizzaShopAddressForm: {
				beforesubmit: 'cancelFormSubmit'
			}
		}
	},
	
	// Some remote services we're going to hit.
	geocodeService:null,
	driveTimeService:null,
	pizzaShopFeatureService:null,
	
	// Set up some drive time properties.
	driveTimes:"1 2 3",
	driveTimeResults:null,

	// And initialise after the UI has been set up.
	launch: function() {
		// Set up our feature service connection. We'll use this to run queries against.
		this.pizzaShopFeatureService = new esri.tasks.QueryTask(this.poiServiceURL);

		// Setup Geoprocessing Service to generate drive time polygons
		this.driveTimeService = new esri.tasks.Geoprocessor(this.driveTimeServiceURL);

		// And to find addresses that are entered
		this.geocodeService = new esri.tasks.Locator(this.geocodeServiceURL);
	},

	cancelFormSubmit: function (c,e,o) {
		return false;
	},


	// Let's handle the user requesting a search in one of the three ways. These are
	// triggered by events fired from the View tier.
	
	// 1) SEARCH BY ADDRESS
	locateToAddress: function(address) {
		Ext.Viewport.setMasked({
				xtype:'loadmask',
				message:'Finding Address...'
			});

        var addressPackage = { "SingleLine": address };
        var options = {
            address: addressPackage,
            outFields: ["Loc_name"]
        };

		PF.lastSearchText = address;

		var map = this.getPizzaShopsMap().getMap();
        this.geocodeService.setOutSpatialReference(map.spatialReference);
	    this.geocodeService.addressToLocations(options, this.foundAddressCandidates, this.serviceFailed);
	},
	
	// The service returned one (or more) address matches.
	foundAddressCandidates: function(candidates) {
		Ext.Viewport.unmask();

        Ext.each(candidates, function (candidate) {
            if (candidate.score > 80) {
                var attributes = { 
					address: candidate.address, 
					score: candidate.score, 
					locatorName: candidate.attributes.Loc_name
				};

				// Store our location
				PF.lastSearchText = candidate.address;
				PF.lastSearchLocation = candidate.location;

                return false; //break out of loop after one candidate with score greater  than 80 is found.
            }

			// Reset and note that we didn't find anything.
			PF.lastSearchText = '';
			PF.lastSearchLocation = null;
        });

		if (PF.lastSearchLocation)
		{
			// An address was found.
			var thisController = PF.app.getController("Main");
			thisController.startSearchingAroundPoint(PF.lastSearchLocation);
		}
	},
	
	serviceFailed: function(error) {
		Ext.Viewport.unmask();
		Ext.Msg.alert('Something went wrong!', error.message);
	},



	// 2) SEARCH BY TAPPING ON THE MAP
	tapOnMap:function(mapPoint) {
		PF.lastSearchLocation = mapPoint;
		PF.lastSearchText = 'Where you tapped';
		
		this.startSearchingAroundPoint(mapPoint);
	},
	


	// 3) SEARCH NEAR YOU BY USING YOUR LOCATION
	searchNearMe:function () {
        if (navigator.geolocation) {
			Ext.Viewport.setMasked({
					xtype:'loadmask',
					message:'Hunting you down...'
				});

            navigator.geolocation.getCurrentPosition(this.foundMyLocation, this.geolocationError);
        }
        else {
            Ext.Msg.alert('Geolocation Error', 'Geolocation not available!', Ext.emptyFn);
        }
    },

	foundMyLocation: function(location) {
		Ext.Viewport.unmask();

        var centerPoint = esri.geometry.geographicToWebMercator(new esri.geometry.Point(location.coords.longitude, location.coords.latitude));

		PF.lastSearchText = "Your Location";
		PF.lastSearchLocation = centerPoint;

		var thisController = PF.app.getController("Main");
		thisController.startSearchingAroundPoint(centerPoint);
	},
	
	geolocationError: function(error) {
		Ext.Viewport.unmask();

        switch (error.code) {
            case error.PERMISSION_DENIED:
                Ext.Msg.alert('GeoLocation', 'Permission Denied.', Ext.emptyFn);
                break;
            case error.POSITION_UNAVAILABLE:
                Ext.Msg.alert('GeoLocation', 'Position Unavailable.', Ext.emptyFn);
                break;
            case error.TIMEOUT:
                Ext.Msg.alert('GeoLocation', 'Timeout.', Ext.emptyFn);
                break;
            default:
                Ext.Msg.alert('GeoLocation', 'Unknown Error.', Ext.emptyFn);
        }
    },



	
	// However we got a point to search around (address, map click, or device location),
	// let's search for pizza shops within a certain driving distance...

	// 1) Start with a point on the map.
	startSearchingAroundPoint: function(mapPoint) {
		// Ext.Viewport.unmask();
		if (mapPoint !== undefined) {
			this.getPizzaShopsMap().showSearchLocationOnMap(mapPoint);
			this.getDriveTimePolygonsForGeometry(mapPoint);
		}
	},
	
	// 2) Now get drivetime polygons to see how far you can get in 1, 2, or 3 minutes...
	getDriveTimePolygonsForGeometry:function(geom) {
		Ext.Viewport.setMasked({
				xtype:'loadmask',
				message:'Calculating Drivetimes...'
			});

		// Set up the drivetime service parameters
        var featureSet = new esri.tasks.FeatureSet();
        var features= [];
        features.push(new esri.Graphic(geom));
        featureSet.features = features;

        var params = { "Input_Location":featureSet, "Drive_Times":this.driveTimes };

		// Call the drive time service.
		var map = this.getPizzaShopsMap().getMap();
        this.driveTimeService.setOutSpatialReference(map.spatialReference);
		this.driveTimeService.execute(params, this.processDriveTimeResults, this.drivetimeServiceFailed);
	},
	
	drivetimeServiceFailed: function(error) {
		Ext.Viewport.unmask();
		console.log("Drive Time Service Error: " + error.message);
		Ext.Msg.alert('Could not process drive times!', 'The drive time service is limited to the USA & Canada.<br/>If you\'re searching there, it\'s possible no streets are near your search location.');
	},
	
	
	// 2a) When the drivetime results come back, we display them on the map and use them query for our POI data
	processDriveTimeResults: function(results, messages) {
		Ext.Viewport.unmask();
	
		// We get here from a callback on the GP Service.
		// Let's give ourselves some better context...
		var thisController = PF.app.getController("Main");

	    thisController.driveTimeResults = results[0].value.features;
		
		// Show the results on the map.
		var outF = thisController.getPizzaShopsMap().showDriveTimePolygons(thisController.driveTimeResults);

		// Now use the results to query the feature service for results.
		if (outF != null)
		{
			Ext.Viewport.setMasked({
					xtype:'loadmask',
					message:'Finding Pizza Shops...'
				});

			// Get the outer boundary of the outer drive time polygon.
			var searchGeom = new esri.geometry.Polygon(outF.geometry.spatialReference);
			var ring = outF.geometry.rings[0];
			searchGeom.addRing(ring);
	
			// Set up the query to find pizza shops within the drive time polygon.
			var q = new esri.tasks.Query();
			q.returnGeometry = true;
			q.outFields = ["POI_ID", "NAME", "ADDRESS", "STREET", "CITY", "COUNTY", "STATE", "PHONE", "DESCRIPTIO", "CUISINE", "CHAIN"];
			q.geometry = searchGeom;
            q.outSpatialReference = { "wkid": 102100 };
            q.where = "Cuisine = 'pizza'";

			// And fire off the query to the feature service. Success takes us to step 3 below.
			thisController.pizzaShopFeatureService.execute(q, thisController.gotPizzaShops, thisController.serviceFailed);
		}
	},
	
	// 3) Show the filtered result set on the map.
	gotPizzaShops: function(pizzaShops) {
		Ext.Viewport.unmask();
		// Tell the view to display the result set on the map.
		PF.app.getController("Main").getPizzaShopsMap().showPizzaShops(pizzaShops);
	},



	


	// If the user picked a POI (search result) on the map, let's act on that.
	// This is triggered by an event fired by the View tier.
	pizzaShopSelected:function(pizzaShopGraphic)
	{
		if (pizzaShopGraphic)
		{
			// We want to find out roughly how far away it is - which drive time polygon did it lie in...
			var containingDTR = null;
			Ext.each(this.driveTimeResults, function (dtr) {
				// Let's see which drive time polygon contained this pizza shop.
				// Note, this is a client-side check.
				if (dtr.geometry.contains(pizzaShopGraphic.geometry))
				{
					containingDTR = dtr;
					return false;
				}
			});
			
			// Get the PizzaShop Controller, and tell it we're looking at a Pizza Shop now.
			var pizzaShopController = PF.app.getController("PizzaShop");
			
			// We'll add the drive time polygon that contains this pizza shop
			// so that when the View displays it, it can give us an estimated drive time.
			//
			// This is the hand-off from the Main Controller to the PizzaShop Controller.
			pizzaShopGraphic.attributes['containingDTR'] = containingDTR;
			pizzaShopController.showDetails(pizzaShopGraphic);	
		}
	}
});
