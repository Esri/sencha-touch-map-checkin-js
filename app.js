dojo.require('esri.map');
dojo.require("esri.geometry");
dojo.require('esri.layers.FeatureLayer');
dojo.require("esri.tasks.geometry");
dojo.require("esri.tasks.gp");
dojo.require("esri.tasks.locator");
dojo.require("esri.tasks.route");

dojo.addOnLoad(initDojo);

function initDojo() {
	
	// We want to use the following proxy file for our Esri service calls.
	esri.config.defaults.io.proxyUrl = "proxy.php";

	var warningDiv = Ext.getDom('browserWarning');

	if (!Ext.browser.is('webkit'))
	{
		warningDiv.style.display = '';
		return;
	}
	else
	{
		if (warningDiv)
		{
			warningDiv.outerHTML = '';
			warningDiv = null;
		}
	}
	
	//<debug>
	Ext.Loader.setPath({
		'Ext': 'touch/src',
		'PF': 'app'
	});
	//</debug>

	Ext.application({
		name: 'PF',

		requires: [
			'Ext.MessageBox'
		],

		controllers:['Main', 'PizzaShop'],

		views: ['Main', 'PizzaFinderMap', 'PizzaShop', 'PizzaShopMap', 'DirectionsMap', 'PizzaShopDirections'],

		icon: {
			'57': 'resources/icons/Icon.png',
			'72': 'resources/icons/Icon~ipad.png',
			'114': 'resources/icons/Icon@2x.png',
			'144': 'resources/icons/Icon~ipad@2x.png'
		},

		isIconPrecomposed: true,

		startupImage: {
			'320x460': 'resources/startup/320x460.jpg',
			'640x920': 'resources/startup/640x920.png',
			'768x1004': 'resources/startup/768x1004.png',
			'748x1024': 'resources/startup/748x1024.png',
			'1536x2008': 'resources/startup/1536x2008.png',
			'1496x2048': 'resources/startup/1496x2048.png'
		},

		launch: function() {
			// Destroy the #appLoadingIndicator element
			Ext.fly('appLoadingIndicator').destroy();

			// Initialize the main view
			PF.mainView = Ext.create('PF.view.Main');
			Ext.Viewport.add(PF.mainView);
		},

		onUpdated: function() {
			Ext.Msg.confirm(
				"Application Update",
				"This application has just successfully been updated to the latest version. Reload now?",
				function(buttonId) {
					if (buttonId === 'yes') {
						window.location.reload();
					}
				}
			);
		}
	});
}