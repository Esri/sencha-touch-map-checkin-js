Ext.define('PF.view.PizzaShopDirections', {
    extend:'Ext.Panel',
    xtype:'pizzashopdirections',
	id:'pizzaShopDirectionsView',
	requires:['Ext.dataview.DataView'],
    config:{
		map:null,

        fromPoint:null,

		pizzaShop:null,
		toPoint:null,
		toName:'your destination',
		
		routeResult:null,

		title: 'Directions',
		
	    layout: 'vbox',
	    items:
		[
	        {
				id: 'directionsMap',
				xtype: 'esridirectionsmap',
	            style: 'background-color: #5E99CC;',
	            height: '140px',
				docked: 'top'
	        },
			{
				xtype: 'panel',
				id:'routeDetails',
				layout: 'vbox',
				scrollable: true,
				flex:1,
				margin:3,
				items:
				[
					{
						xtype: 'panel',
						id:'checkInDetails',
						showAnimation: 'slideIn',
						cls:'checkin-display',
						layout: 'hbox',
						hidden: true,
						margin: 5,
						padding: 5,
						docked:'top',
						items:
						[
							{
								id:'inLabel',
								xtype: 'label',
								html: 'In',
								flex: 2
							},
							{
								id:'outLabel',
								xtype: 'label',
								html: 'Just now',
								disabled: true,
								flex: 2
							},
							{
								id: 'ratingDisplay',
								xtype: 'label',
								hidden: true,
								showAnimation:'slideIn',
								hideAnimation:'fadeOut',
								width:80,
								height:15
							}
						]
					},
					{
						id:'directionsList',
						xtype:'dataview',
						// layout:'fit',
						// scrollable: {direction: 'vertical', directionLock: true },
						flex:1,
						store: {
							fields: [
								'description', 
								'index',
								'displayindex',
								'dirstep'
							],
							data: 
							[
							]
						},
						itemTpl:'<div class="ddl"><div class="ddl-index" routestep="{index}">{displayindex}:</div><div class="ddl-desc">{description}</div></div>'
						// itemTpl:'<div>{index}{displayindex}{description}</div>'
					}
				]
			},
			{
				id:'checkinButton',
				xtype:'button',
				text:'Check In',
				disabled: true,
				margin: 10,
				docked: 'bottom'
			}
		]
    },

	checkinStartLayer:null,
	checkinRouteLayer:null,
	
    constructor:function () {
        this.callParent(arguments);

		// These layers will be used to write CheckIn/CheckOut info to a remote feature service.
		this.checkinStartLayer = new esri.layers.FeatureLayer("http://services.arcgis.com/uCXeTVveQzP4IIcx/arcgis/rest/services/CheckInsStart/FeatureServer/0", {visible: false, id: "ciStart"} );
		this.checkinRouteLayer = new esri.layers.FeatureLayer("http://services.arcgis.com/uCXeTVveQzP4IIcx/arcgis/rest/services/CheckInsRoute/FeatureServer/0", {visible: false, id: "ciRoute"} );
    },

    addLayers:function () {
		var dMap = this.down('#directionsMap');
		var map = dMap.getMap();
		
		// We have to add the layers to a map, even though they're invisible, to initialize them
		// and connect them with their feature service.
		if (!map.getLayer("ciStart"))
		{
			map.addLayer(this.checkinStartLayer);
		}
		if (!map.getLayer("ciRoute"))
		{
			map.addLayer(this.checkinRouteLayer);
		}
	},
	
	applyPizzaShop: function(pizzaShop) {
		this.setToPoint(pizzaShop.geometry);
		this.setToName(pizzaShop.attributes['NAME']);
		
		var dMap = this.down('#directionsMap');
		dMap.clear();
		
		dMap.mergeExtent(pizzaShop.geometry);
		
		return pizzaShop;
	},

	applyRouteResult: function(routeResult) {
		this.addLayers();

		// Build the Sencha DataView of turn-by-turn details
		var dView = this.down('#directionsList');
		var dStore = dView.getStore();

		dStore.suspendEvents();
		dStore.removeAll(true);
		for (var i=0, iMax = routeResult.features.length; i < iMax; i++)
		{
			var dirStep = routeResult.features[i];
			var desc = dirStep.attributes.text;
			if (i > 0 && i < iMax - 1)
			{
				var dist = dirStep.attributes.length;
				desc += ' (' + dist.toFixed(2) + ' miles)'
			}
			dStore.add({ 'description':desc, 'index':i, 'displayindex':i+1, 'dirstep': dirStep});
		}
		dStore.resumeEvents();
		dView.refresh();

		// And update the map
		var dMap = this.down('#directionsMap');
		dMap.setRouteGeom(routeResult.mergedGeometry);
		
		return routeResult;
	},

	setStartAndEndPoints: function(fromPt, toPt) {
		var dMap = this.down('#directionsMap');
		dMap.setStartAndEndPoints(fromPt, toPt);
	},
	
	setCheckinGeofence: function(geofencePolygon, isHighlighted) {
		var dMap = this.down('#directionsMap');
		dMap.setCheckinGeofence(geofencePolygon, isHighlighted);
	},





	showCheckIn: function(checkInDateTime) {
		var checkInDetailsPanel = this.down('#checkInDetails');
		var ratingDisplay = this.down('#ratingDisplay');

		ratingDisplay.hide();

		var formattedCheckInTime = Ext.Date.format(checkInDateTime,'g:ia');
		checkInDetailsPanel.getComponent('inLabel').setHtml('In: ' + formattedCheckInTime);

		checkInDetailsPanel.show();
		
		this.drawCurrentRouteTurn(false);	
	},
	
	updateCheckInDisplay: function (msSinceCheckIn) {
		var sSinceCheckIn = Math.floor(msSinceCheckIn/1000);
		var feedbackText = null;
		var feedbackSuffix = ' ago';
		if (sSinceCheckIn < 5)
		{
			feedbackText = 'Just now';
			feedbackSuffix = '';
		}
		else if (sSinceCheckIn < 60)
		{
			feedbackText = sSinceCheckIn + 's';
		}
		else
		{
			var hours = Math.floor(sSinceCheckIn/3600);
			var minutes = Math.floor(sSinceCheckIn/60);
			var seconds = sSinceCheckIn%60;
			if (minutes < 10) { minutes = '0' + minutes; }
			if (seconds < 10) { seconds = '0' + seconds; }
			if (hours > 0)
			{
				feedbackText = hours + ':' + minutes + ':' + seconds;
			}
			else
			{
				feedbackText = minutes + 'm' + seconds + 's';
			}
		}
		
		this.down('#checkInDetails #outLabel').setHtml(feedbackText + feedbackSuffix);
	},

	showCheckOut: function(checkOutDateTime, rating) {
		var ratingDisplay = this.down('#ratingDisplay');
		ratingDisplay.setCls('checkin-rating-' + rating);
		ratingDisplay.show();

		var checkInDetailsPanel = this.down('#checkInDetails');
		var formattedCheckOutTime = Ext.Date.format(checkOutDateTime,'g:ia');
		checkInDetailsPanel.getComponent('outLabel').setHtml('Out: ' + formattedCheckOutTime);

		this.drawCurrentRouteTurn(false);
	},

	updateCheckInControls: function(isCheckedIn, canCheckIn) {
		var checkinButton = this.down('#checkinButton');

		var buttonActive = false;
		var buttonText = 'Check In';
		
		if (isCheckedIn)
		{
			// Always allow them to check out.
			buttonActive = true;
			buttonText = 'Check Out';
		}
		else
		{
			buttonText = 'Check In';
			buttonActive = canCheckIn;
		}

		checkinButton.setDisabled(!buttonActive);
		checkinButton.setText(buttonText);
	},

	currentRouteTurn: function() {
		var pizzaShopController = PF.app.getController('PizzaShop');

		if (pizzaShopController)
		{
			return pizzaShopController.currentRouteTurn;
		}

		return false;
	},

	isCheckedIn: function() {
		var pizzaShopController = PF.app.getController('PizzaShop');

		if (pizzaShopController)
		{
			return pizzaShopController.isCheckedIn;
		}
		
		return false;
	},

	drawCurrentRouteTurn: function(updateExtent)
	{
		updateExtent = (typeof updateExtent == "undefined")?true:updateExtent;
		
		var routeTurn = this.currentRouteTurn();
		
		var dirMap = this.down('#directionsMap');
		dirMap.drawRouteTurn(routeTurn, this.isCheckedIn(), updateExtent);
	}
});