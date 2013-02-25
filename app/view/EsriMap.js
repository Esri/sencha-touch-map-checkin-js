var __mapID = 0;

Ext.define('PF.view.EsriMap', {
    extend:'Ext.Component',
    xtype:'esrimap',
    config:{
        map:null,
        mapOptions:{
			navigationMode:'css-transforms',
			wrapAround180:true
		},
		basemapLayer:"http://server.arcgisonline.com/ArcGIS/rest/services/World_Street_Map/MapServer",
		mapID:null,
		mapWidth:"100%",
		mapHeight:"100%",
		mapInitializerFunction:'initMap',
		recenterOnResize: true
    },

	__lastCenterPoint:null,

    initialize:function () {
        this.callParent();

        if (!(window.esri && window.esri.Map)) 
		{
            throw 'JS API for ArcGIS is required';
        }

		// Each ESRI map needs a unique DIV in the page's DOM to live in.
		// Even though sections of the DOM may not be visible as views pop into and 
		// out of the stack, it's a good idea to make sure each one has a unique
		// DIV ID to attach to.
		var thisMapID = this.getMapID();
		if (thisMapID == null)
		{
			thisMapID = __mapID;
			this.setMapID(thisMapID);
			__mapID = __mapID + 1;
		};

		// Write the HTML. Unfortunately, this doesn't make it to the built-out DOM model immediately,
		// so any actual creation of the map control and subsequent setup needs to happen in the
		// paintedHandler.
        this.setHtml('<div id="map' + thisMapID + '" style="position:absolute; height:' + this.getMapHeight() + '; width:' + this.getMapWidth() + ';"></div>');

        this.element.setVisibilityMode(Ext.Element.OFFSETS);
        this.element.on('touchstart', 'onTouchStart', this);

		this.on({
			painted:this.__esrimap__initmap__paintedHandler__,
			scope:this,
			single:true
		});
		
        this.on({
            resize: { 
				buffer: 40, 
				fn: this.resizeHandler
			},
            scope:this
        });

		this.on({
			painted: this.resizeHandler,
			scope: this
		});
    },

    onTouchStart:function (e) {
        e.makeUnpreventable();
    },

    __esrimap__initmap__paintedHandler__:function () {
		// console.log('EsriMap initialized');

        if (!(window.esri && window.esri.Map)) 
		{
            throw 'JS API for ArcGIS is required';
        }

        var map = this.getMap();
        if (!map) {
			var thisMapID = this.getMapID();
            map = new esri.Map('map' + thisMapID, this.getMapOptions());

			// Add the basemap layer as configured.
			var basemapUrl = this.getBasemapLayer();
            var basemap = new esri.layers.ArcGISTiledMapServiceLayer(basemapUrl);
            map.addLayer(basemap);

			map.senchaContainer = this;
			
            this.setMap(map);
        }

		if (this.getRecenterOnResize())
		{
			dojo.connect(map, 'onExtentChange', this.extentChanged);	
			dojo.connect(map, 'onResize', this.recenterAfterResize);
		}
		
		// We see whether any class inheriting from us has an init method we should call for their own
		// map initialization. It's likely they will. By default this will be called initMap
		var subInit = false;
		var initFuncName = this.getMapInitializerFunction();
		if (Ext.isDefined(this[initFuncName]))
		{
			if (Ext.isFunction(this[initFuncName]))
			{
				this[initFuncName]();
				subInit = true;
			}
		}
		
		if (!subInit)
		{
			console.log('If you inherit from EsriMap, define initMap() on your class to do any map initialization.');
			console.log('Alternatively, specify the mapInitializerFunction config item with the string name of an init function.')
		}
    },

    resizeHandler:function () {
		// Ensure the map resizes whenever it needs to (device orientation, etc.)
        var map = this.getMap();
        if (map) {
            map.resize();
        }
    },

	extentChanged: function(extent, delta, levelChange, lod) {
		var newCenter = extent.getCenter();
		this.senchaContainer.__lastCenterPoint = newCenter;
	},

	recenterAfterResize: function(extent, width, height) {
		var newCenter = this.senchaContainer.__lastCenterPoint
		var map = this.senchaContainer.getMap();
		setTimeout(function() {
			map.centerAt(newCenter);
		}, 200);
	},

	setExtent: function(newExtent, includeExisting) {
		// Set the map extent. Optionally, ensure the current extent is also included.
		includeExisting = (typeof includeExisting == "undefined")?false:includeExisting;
		
		var map = this.getMap();
		
		if (map && newExtent)
		{
			if (includeExisting)
			{
				newExtent = map.extent.union(newExtent);
			}
			
			map.setExtent(newExtent, true);
		}
	}
});