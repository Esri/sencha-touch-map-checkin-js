/*
 * When the user checks in and checks out of a venue (Pizza Shop)
 * data is written to live feature services on ArcGIS Online.
 *
 * It may be desirable to demonstrate the application without writing to the feature services,
 * and we make use of this global variable to determine whether writing should be abled or not.
 */

var __PREVENT_CHECKINCHECKOUT_WRITE__ = true;

/*
 * To disable writing, set this variable to true.
 *
 * To enable writing, set it to false or delete it.
 */

Ext.define('PF.controller.PizzaShop', {
    extend: 'Ext.app.Controller',

	// Service URL Endpoints.
	directionsServiceURL: "http://tasks.arcgisonline.com/ArcGIS/rest/services/NetworkAnalysis/ESRI_Route_NA/NAServer/Route",
	geometryServiceURL: "http://tasks.arcgisonline.com/ArcGIS/rest/services/Geometry/GeometryServer",

    requires:[
    	'Ext.MessageBox'
    ],

	config: {
		// Let's define handles onto the various Views we want to control
		refs: {
			pizzaShopPanel: {
				selector: '#pizzaShopDetailsView',
				xtype: 'pizzashop',
				autoCreate: true
			},
			pizzaShopDirectionsPanel: {
				selector: '#pizzaShopDirectionsView',
				xtype: 'pizzashopdirections',
				autoCreate: true
			},
			pizzaShopDirectionButton: {
				selector: '#pizzaShopDetailsView button#getPizzaShopDirections'
			},
			pizzaShopDirectionsList: {
				selector: '#pizzaShopDirectionsView dataview#directionsList'
			},
			pizzaShopCheckinPanel: {
				selector: '#pizzaShopDirectionsView #checkinDetails'
			},
			pizzaShopCheckInCheckOutButton: {
				selector: '#pizzaShopDirectionsView #checkinButton'
			}
		},
	
		// And now let's attach ourselves to events on some of those Views
		control: {
			pizzaShopDirectionButton: {
				tap: 'showDirections'
			},
			pizzaShopCheckInCheckOutButton: {
				tap: 'checkInCheckOutButtonTapped'
			},
			pizzaShopDirectionsList:{
				select: 'directionItemSelected'
			}
		}
	},

	// Let's define some properties
	pizzaShop:null,

	// Track the user's check-in status
	isCheckedIn:false,
	canCheckIn:false,
	checkInTime:null,
	checkOutTime:null,

	// The code is built to use an arbitrary geofence Polygon to check that the user 
	// might check in. However, in this case we'll just generate a radius around the 
	// end point (in most cases that's probably reasonable). See also geofenceGeometry.
	checkinTolerance: 25, // Map units - meters for Web Mercator Aux Sphere...
	
	// Some properties we'll use for turn-by-turn directions
	routeTask:null,
	routeParams:null,
	routeResult:null,
	
	// Track the current turn-by-turn direction item.
	currentRouteTurn:null,
	currentUserPosition:null,
	
	// This is an arbitrary polygon we use to determine whether the user is
	// currently close enough to check in (or indeed must be checked out).
	// In this case this is generated using checkinTolerance.
	geofenceGeometry:null,
	
	// Track where we're getting directions *from* (it's always *to* the pizzaShop).
	fromPt:null,
	
	// To generate the checkin polygon, we'll use an online geometry service to buffer around the end point.
	geomService: null,

	// Used to handle time-based updates to the UI.
	intervalID:null,
	
	
	
	
	// Calling this pushes the Pizza Shop Details View into... er... view.
	showDetails: function (pizzaShopGraphic) {
		// When the user clicks on a Pizza Shop in the map, the Main Controller gets notified
		// and calls this function - this is really the Pizza Shop "entry point"
		this.getPizzaShopPanel().setPizzaShop(pizzaShopGraphic);
		
		// BEGIN WORK-AROUND
		// This is a work-around for bug TOUCH-2395 in Sencha Touch 2.0
		// http://www.sencha.com/forum/showthread.php?185646
		var wrapperPanel = Ext.create('Ext.Container', {
			fullscreen: true,
			id:'wrapper-for-touch-2395-bug',
			title: pizzaShopGraphic.attributes['NAME'],
			layout: 'fit'
		});
		wrapperPanel.add(this.getPizzaShopPanel());
		wrapperPanel.down('pizzashop').setHidden(false);
		PF.mainView.push(wrapperPanel);
		
		// The following line works in 2.0.1 RC but that release has bigger problems.
		// PF.mainView.push(this.getPizzaShopPanel());
		// END WORK-AROUND
		
		this.pizzaShop = pizzaShopGraphic;
	},
	
	// This transitions from the Pizza Shop Details View to the Pizza Shop Directions View.
	showDirections: function() {
		// When the user clicks the "Show Directions" button on the details display, this is called.
		// We'll display the Directions panel and then kick off the process of getting directions.
		if (this.pizzaShop)
		{
			// Display the directions panel.
			var myPanel = this.getPizzaShopDirectionsPanel();
			this.getPizzaShopDirectionsPanel().setPizzaShop(this.pizzaShop);
			PF.mainView.push(this.getPizzaShopDirectionsPanel());

			// Lazy load some services and config
			if (!this.geomService) {
				this.geomService = new esri.tasks.GeometryService(this.geometryServiceURL);
			}
			
			if (!this.routeTask) {
				this.routeTask = new esri.tasks.RouteTask(this.directionsServiceURL);
			}

			if (!this.routeParams) {
	        	var params = new esri.tasks.RouteParameters();
		        params.stops = new esri.tasks.FeatureSet();
		        params.returnRoutes = true;
		        params.returnDirections = true;
		        params.directionsLengthUnits = esri.Units.MILES;
		        params.outSpatialReference = new esri.SpatialReference({ wkid:102100 });

				this.routeParams = params;
			}
			
			// And calculate directions from the last entered point (could be a Geocode result,
			// a tap on the map, or using the browser's geolocation).
			this.getDirections(PF.lastSearchLocation);
		}
	},
	
	getDirections: function(fromPt)
	{
		if (this.pizzaShop)
		{
			Ext.Viewport.setMasked({
				xtype:'loadmask',
				message:'Working it out...',
				zIndex: 50
			});

			// Get some parameters for the directions search.
			// We'll store the From Point for later reference if need be.
			this.fromPt = fromPt;
			var toPt = this.pizzaShop.geometry;
			var pizzaShopName = this.pizzaShop.attributes['NAME'];

			//Define the route input parameters
			var params = this.routeParams;
			params.stops.features = [];

			//Add the starting location to the map
			var startLoc = new esri.Graphic(fromPt).setAttributes({ Name: PF.lastSearchText });
			params.stops.features[0] = startLoc;

			//Add the ending location to the map
			var endLoc = new esri.Graphic(toPt).setAttributes({ Name: pizzaShopName });
			params.stops.features[1] = endLoc;

			// Kick off the routing service
			// If this succeeds, we'll drop into routeSolutionFound() below...
			this.routeTask.solve(params, this.routeSolutionFound, this.serviceError);
		}
	},
	
	routeSolutionFound: function(solveResult) {
		var thisController = PF.app.getController('PizzaShop');

		// Store the route solution step-by-step directions.
		var directions = solveResult.routeResults[0].directions;
		thisController.routeResult = directions;

		var fromPt = thisController.fromPt;
		var toPt = thisController.pizzaShop.geometry;
		// Tell the UI to update itself with various bits and pieces.
		thisController.getPizzaShopDirectionsPanel().setStartAndEndPoints(fromPt, toPt);
		thisController.getPizzaShopDirectionsPanel().setRouteResult(directions);
		
		// We track the user's position (as they click through the route).
		// Could extend to track realtime GPS location, but this will do for now.
		this.currentUserPosition = fromPt;

		// And calculate (and display) the geofence. We could have done this earlier in
		// the process, but we decided to wait to get a valid set of directions first.
		thisController.calculateAndShowGeofence();

		// And remove the progress mask.
		Ext.Viewport.unmask();
	},
	
	serviceError:function (error) 
	{
		// Something went wrong. This, of course, will never ever get called, right?
		Ext.Viewport.unmask();
		Ext.Msg.alert("Error getting route", error.message);
	},
	

 	directionItemSelected: function(c,record,opts) {
		// A turn-by-turn item was selected from the UI list.

		// Let's first update the map display.
		this.currentRouteTurn = record.data.dirstep;
		this.getPizzaShopDirectionsPanel().drawCurrentRouteTurn();
		
		var couldCheckIn = this.isCloseEnoughToCheckIn();
		
		// We'll assume the user is at the start of the selected segment.
		this.currentUserPosition = this.currentRouteTurn.geometry.getPoint(0,0);
		
		// Now let's see if that's within the geofence.
		this.canCheckIn = this.isCloseEnoughToCheckIn();
		
		if (couldCheckIn != this.canCheckIn)
		{
			this.updateGeofence();
		}
		
		// And if they have to be checked out, let's check them out.
		if (this.isCheckedIn && !this.canCheckIn)
		{
			// We need to automatically check out.
			this.checkOut('automatically');
		}

		// Lastly, update the UI to reflect this.
		this.getPizzaShopDirectionsPanel().updateCheckInControls(this.isCheckedIn, this.canCheckIn);
	},
	
	checkInCheckOutButtonTapped: function() {
		// The same button is used for check in or check out.
		// We'll rely on other code to ensure the button text matches.
		if (!this.isCheckedIn)
		{
			// Let's check in
			this.checkIn();
		}
		else
		{
			// Let's check out
			this.checkOut();
		}
		
		// And this code will ensure the button looks correct depending on our check-in status.
		this.getPizzaShopDirectionsPanel().updateCheckInControls(this.isCheckedIn, this.canCheckIn);
	},



	calculateAndShowGeofence: function() {
		// The spatial references are inferred from the toPt.
		var bufParams = new esri.tasks.BufferParameters();
		bufParams.distances = [ this.checkinTolerance ];
		bufParams.geometries = [ this.pizzaShop.geometry ];
		
		// Since we have a shortcut to the controller, we can set up a reference
		// that the embedded functions below can use as a handle back to the Sencha Controller.
		var thisController = this;

		this.geomService.buffer(bufParams, 
			function (geometries) {
				var bufferGeom = geometries[0];
				// Store the generated buffer geometry
				thisController.geofenceGeometry = bufferGeom;
				
				// Update the UI
				thisController.updateGeofence();
			},
			function (error) { 
				Ext.Msg.alert("Geometry Service Error", "Could not generate buffer: " + error.message);
				thisController.geofenceGeometry = null;
			}
		);
	},
	
	updateGeofence: function() {
		this.getPizzaShopDirectionsPanel().setCheckinGeofence(this.geofenceGeometry, this.isCloseEnoughToCheckIn());
	},
	
	isCloseEnoughToCheckIn: function(location)
	{
		location = (typeof location == "undefined")?this.currentUserPosition:location;
		
		var withinGeofence = false;
		if (location)
		{
			if (this.geofenceGeometry)
			{
				// See if we're within the geofence. Again, this is a client-side geometry function.
				withinGeofence = this.geofenceGeometry.contains(location);
			}
			else
			{
				// As a fallback in case the geofence geometry didn't get generated for some reason...
				var destinationPoint = this.pizzaShop.geometry;
				withinGeofence = esri.geometry.getLength(location, destinationPoint) < this.checkinTolerance
			}
		}
		
		return withinGeofence;
	},
	
	getRating: function(checkInTime, checkOutTime, distance) {
		// We could, and probably should, come up with something more complex
		// for the rating, based on how long the person was there, etc. etc.
		var baseRating = this.getRatingForDistance(distance);
		var durationFactor = this.getRatingDurationFactor(checkInTime, checkOutTime);
		
		return Math.min(Math.round(baseRating * durationFactor),5);
	},

	getRatingForDistance: function(distance) {
		var rating = 1;

		if (distance > 0 && distance < 2)
		    rating = 1;
		else if (distance >= 2 && distance < 3)
		    rating = 2;
		else if (distance >= 3 && distance < 4)
		    rating = 3;
		else if (distance >= 4 && distance < 5)
		    rating = 4;
		else if (distance >= 5)
		    rating = 5;

		return rating;		
	},
	
	getRatingDurationFactor: function(checkInTime, checkOutTime) {
		var durationFactor = 1;
		
		var durationInMinutes = Ext.Date.getElapsed(checkInTime, checkOutTime) / 1000; //60000;
		
		if (durationInMinutes < 0.5)
			durationFactor = 0.5;
		else if (durationInMinutes < 2)
			durationFactor = 1;
		else if (durationInMinutes < 5)
			durationFactor = 1.1;
		else if (durationInMinutes < 10)
			durationFactor = 1.2;
		else if (durationInMinutes < 15)
			durationFactor = 1.3;
		else if (durationInMinutes < 30)
			durationFactor = 1.4;
		else if (durationInMinutes < 60)
			durationFactor = 1.5;
		else
			durationFactor = 2;
			
		return durationFactor;
	},


	// Check-in/Check-out functionality
	
	checkIn: function() {
		// The user is checking in. For this, we just record the time it happened
		// and update the UI.
		var checkInDateTime = new Date();
		this.checkInTime = checkInDateTime;

		// Let the user know we're checking in...
		Ext.Viewport.setMasked({
				xtype:'loadmask',
				message:'Checking in...'
			});
			
		this.isCheckedIn = true;

		// Update the UI
		this.getPizzaShopDirectionsPanel().showCheckIn(this.checkInTime);
		
		// Clear the progress display after giving it 1.2 seconds on screen.
		setTimeout(function () { Ext.Viewport.unmask()}, 1200);
		
		// While they're checked in, let's update the display every second
		// with how long they've been there.
		//
		// Holding on to the handle we get back allows us to cancel the update 
		// function when we need to. In the meantime, it'll fire ever 1 second.
		var thisController = this;
		this.intervalID = setInterval(function() {
				thisController.updateCheckinStatus(thisController);
			}, 1000);
	},
	
	checkOut: function(reason) {
		// CheckOut could be automatic based on the geofence, or 
		// a manual click of the Check Out button.
		reason = (typeof reason == "undefined")?'':reason;

		// Stop updating the check-in display.
		clearInterval(this.intervalID);
		
		// Tidy up the reason code.
		if (reason != '')
		{
			reason = ' ' + reason;
		}

		// Let the user know we're checking out...
		Ext.Viewport.setMasked({
				xtype:'loadmask',
				message:'Checking out' + reason + '...'
			});

		this.checkOutTime = new Date();

		// Prepare some data to write out to our feature services.
		var checkInStartLayer = this.getPizzaShopDirectionsPanel().checkinStartLayer;
		var checkInRouteLayer = this.getPizzaShopDirectionsPanel().checkinRouteLayer;

		var routeGeom = this.routeResult.mergedGeometry;
		var startGeom = this.fromPt;
		if (startGeom == null)
		{
			startGeom = PF.lastSearchLocation;
		}
		var distance = this.routeResult.totalLength;
		var rating = this.getRating(this.checkInTime, this.checkOutTime, distance);

		// And write the data.
		this.writeCheckInCheckOut(checkInStartLayer, startGeom, distance, rating);
		this.writeCheckInCheckOut(checkInRouteLayer, routeGeom, distance, rating);

		// Make a note of our current state.
		this.isCheckedIn = false;

		// Now update the UI
		this.getPizzaShopDirectionsPanel().showCheckOut(this.checkOutTime, rating);
		
		// And clear the progress display.
		setTimeout(function () { Ext.Viewport.unmask()}, 1200);
	},

	updateCheckinStatus: function(thisController) {
		// Figure out how long we've been checked in.
		var startTime = thisController.checkInTime;
		var msSinceCheckIn = Ext.Date.getElapsed(startTime);

		// And update the UI.
		thisController.getPizzaShopDirectionsPanel().updateCheckInDisplay(msSinceCheckIn);
	},

	writeCheckInCheckOut: function(layer, geom, distance, rating) {
		// Do the work of actually writing our checkin/checkout data to the 
		// specified service.
		var graphic = new esri.Graphic(geom);

		// Get some data for the checkin...
		var checkInTime = this.checkInTime;
		var checkOutTime = this.checkOutTime;
		// The check-in duration is in minutes.
		var duration = Ext.Date.getElapsed(checkInTime, checkOutTime) / 60000;

		graphic.attributes = {
			"POI_ID": this.pizzaShop.attributes["POI_ID"],
			"Customer_I": 7,
			"CustomerNa": "Anonymous User",
			"Name": this.pizzaShop.attributes["NAME"],
			"CheckIn": checkInTime.getTime(),
			"CheckOut": checkOutTime.getTime(),
			"Duration": duration,
			"Distance": distance,
			"Rating": rating
		};

		var addGraphics = [ graphic ];

		// See the notes at the top of this file. This variable exists to easily disable
		// writing of checkin/checkout data to ArcGIS Online feature services for the 
		// purposes of testing and/or demonstration.
		if (__PREVENT_CHECKINCHECKOUT_WRITE__) return;
		
		layer.applyEdits(addGraphics, null, null, function(aResults, uResults, dResults) 
			{
				console.log("Checkin/out written");
			}, function(error) 
			{ 
				Ext.Msg.alert("Problem Writing Check-In", error.message); 
			}
		);
	}
});