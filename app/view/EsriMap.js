var __mapID = 0;

Ext.define('PF.view.EsriMap', {
    extend:'Ext.Component',
    xtype:'esrimap',
    config:{
        map:null,
        mapOptions:{
			navigationMode:'css-transforms',
			wrapAround180:true,
			autoResize:false
		},
		basemapLayer:"http://server.arcgisonline.com/ArcGIS/rest/services/World_Street_Map/MapServer",
		mapID:null,
		mapWidth:"100%",
		mapHeight:"100%",
		mapInitializerFunction:'initMap',
		recenterOnResize: true,
		inResizableState: false,
		centerHandler: null
    },

	__lastCenterPoint:null,
	__erased:true,

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
		
		// We stop the map updating when it's removed from the DOM.
		this.onBefore({
			erased:function(a,b)
			{
				// We have to track things ourselves - perhaps events are queued.
				// Unexpectedly, Resize gets called even after we call un() below.
				this.__erased = true;
// 				console.log("ERASED MAP! " + this.getMapID());
				this.un({
					resize:this.onActiveResize
				});
				
				var ch = this.getCenterHandler();
				if (ch)
				{
					ch.pause();
				}
			},
		});

		// And when it's put back into the DOM we can start tracking again.
		this.on({
			painted:function(a,b)
			{
				this.__erased = false;
// 				console.log("PAINTED MAP! " + this.getMapID());
				this.on({
					resize:this.onActiveResize,
					buffer:100
				});
				
				var ch = this.getCenterHandler();
				if (ch)
				{
					ch.resume();
				}
			},
		});

		this.on({
			resize:this.onActiveResize,
			buffer:100
		});
    },
    
    onActiveResize:function(a,b) {
//     	console.log("TRY RESIZE MAP! " + this.getMapID());
		if (!this.__erased)
		{
// 			console.log("RESIZE MAP! " + this.getMapID());
			var map = this.getMap();
			if (map)
			{
				map.resize();
			}
		}
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

            this.setMap(map);
        }

		if (this.getRecenterOnResize())
		{
			dojo.connect(map, 'onExtentChange', this.extentChanged);	
			var senchaMap = this;
			require(["dojo/on"], function(on) {
				var centerHandler = on.pausable(map, "resize", senchaMap.recenterAfterResize);
				senchaMap.setCenterHandler(centerHandler);
			});
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

	extentChanged: function(extent, delta, levelChange, lod) {
// 		console.log("EXTENT CHANGED MAP! " + this.id);
		var newCenter = extent.getCenter();
		this.__lastCenterPoint = newCenter;
	},

	recenterAfterResize: function(extent, width, height) {
		var newCenter = this.__lastCenterPoint
		var map = this;
		setTimeout(function() {
// 			console.log("CENTER MAP! " + map.id);
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