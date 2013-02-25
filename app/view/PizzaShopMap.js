Ext.define('PF.view.PizzaShopMap', {
    extend:'PF.view.EsriMap',
    xtype:'pizzashopmap',
    config:{
		// Override some config which the base EsriMap will use...
		basemapLayer:"http://services.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer",
		mapHeight:"140px",
		// And provide a bit of our own.
		pizzaShop:null
    },

	pizzaShopGraphicsLayer: null,

	initialize: function() {
		this.callParent();
		
		var pizzaShopSymbol =  new esri.symbol.PictureMarkerSymbol(
		{
			"angle":0,
			"xoffset":0,"yoffset":11,"type":"esriPMS",
			"url":"http://static.arcgis.com/images/Symbols/Shapes/RedPin1LargeB.png","contentType":"image/png",
			"width":28,"height":28
		});
		
		this.pizzaShopGraphicsLayer = new esri.layers.GraphicsLayer();
		var pizzaShopRenderer = new esri.renderer.SimpleRenderer(pizzaShopSymbol);
		this.pizzaShopGraphicsLayer.setRenderer(pizzaShopRenderer);
	},


	// Inherit from EsriMap, and implement this function to add config to your map beyond the basemap.
	initMap:function () {
		var map = this.getMap();
		map.addLayer(this.pizzaShopGraphicsLayer);

		var me = this;
		dojo.connect(map, 'onLoad', function (e) {
			map.disablePan();
			me.zoomToPizzaShop();
		});
	},

	applyPizzaShop: function (pizzaShop) {
		this.pizzaShopGraphicsLayer.clear();
		if (pizzaShop != null)
		{
			this.pizzaShopGraphicsLayer.add(new esri.Graphic(pizzaShop.geometry));
			this.zoomToPizzaShop();
		}
		return pizzaShop;
	},

	zoomToPizzaShop: function() {
		var map = this.getMap();
		if (map)
		{
			var pizzaShop = this.getPizzaShop();
			if (pizzaShop)
			{
				map.centerAndZoom(pizzaShop.geometry, 17);
			}
		}
	}
});