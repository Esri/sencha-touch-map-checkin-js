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

	Ext.Loader.setPath('PF', 'app');
	Ext.Loader.setConfig({disableCaching: false});

	Ext.application({
		name:'PF',
		viewport: { autoMaximize: true },
		tabletStartupScreen:'resources/images/tabletStartupScreen.png',
		phoneStartupScreen:'resources/images/phoneStartupScreen.png',
		icon:'resources/images/icon.png',
		glossOnIcon:false,
		requires:[
			'Ext.Anim'
		],
		controllers:[
			'Main', 'PizzaShop'
		],
		models:[
		],
		stores:[
		],
		views:[
			'Main', 'PizzaFinderMap', 'PizzaShop', 'PizzaShopMap', 'DirectionsMap', 'PizzaShopDirections'
		],
		launch: function () {
			// Create our main view and load it up...
			PF.mainView = Ext.create('PF.view.Main');
			Ext.Viewport.add(PF.mainView);
		}
	});
}
