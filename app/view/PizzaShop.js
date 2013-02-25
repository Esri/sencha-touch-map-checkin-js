Ext.define('PF.view.PizzaShop', {
    extend:'Ext.Container',
    xtype:'pizzashop',
	id:'pizzaShopDetailsView',
    config:{
        pizzaShop:null,

		fullscreen: true,
	    layout: 'vbox',
		title:'A Pizza Shop',

	    items:
		[
	        {
				id: 'localMap',
				xtype: 'pizzashopmap',
	            style: 'background-color: #5E99CC;',
	            height: '140px',
	        },
			{
				xtype: 'panel',
				id:'shopDetails',
				layout: 'vbox',
				padding: 10,
				items: [
					{
						xtype:'panel',
						layout:'vbox',
						items:
						[
							{
								xtype: 'panel',
								layout: 'hbox',
								items:
								[
								{ xtype: 'label', html: 'Address:' },
								{ id:'shopAddress', xtype: 'label', padding: '0 0 0 5' },
								]
							},
							{
								xtype: 'panel',
								layout: 'hbox',
								items:
								[
								{ xtype: 'label', html: 'Phone:' },
								{ id:'shopPhone', xtype: 'label', padding: '0 0 0 5' },
								]
							},
							{
								xtype: 'panel',
								layout: 'hbox',
								items:
								[
								{ xtype: 'label', html: 'Drive Time:' },
								{ id:'shopDriveTime', xtype: 'label', padding: '0 0 0 5' },
								]
							},
							{
								xtype: 'panel',
								layout: 'hbox',
								items:
								[
								{ xtype: 'label', html: 'Rating:' },
								{ id:'shopRating', xtype: 'label', width:80, height:15 },
								]
							},
						]
					}
				]
			},
			{
				xtype:'button',
				id:'getPizzaShopDirections',
				text:'Get Directions',
				margin: 10,
				docked: 'bottom'
			}
		]
	},
	
	containingDriveTimeResult:null,
	
	applyPizzaShop: function(pizzaShop) {
		// Get some info off the pizza shop graphic and update the display.
		this.containingDriveTimeResult = pizzaShop.attributes['containingDTR'];
		this.updateDisplay(pizzaShop);
		return pizzaShop;
	},

	updateDisplay: function(f) {
		var mapDisplay = this.down('pizzashopmap');
		mapDisplay.setPizzaShop(f);

		// We have a Title config property, which is read automatically by the containing
		// Sencha Navigation View.
		this.setTitle(f.attributes['NAME']);

		// Set the labels for the pizza shop info display.
		var address = Ext.ComponentManager.get('shopAddress');
		address.setHtml(f.attributes['ADDRESS']);
		var phone = Ext.ComponentManager.get('shopPhone');
		phone.setHtml(f.attributes['PHONE']);
		var dtr = this.containingDriveTimeResult;
		if (dtr)
		{
			var driveTimeLabel = Ext.ComponentManager.get('shopDriveTime');
			var driveTimeText = '< ' + dtr.attributes.ToBreak + ' min';
			if (dtr.attributes.ToBreak > 1)
			{
				driveTimeText += 's';
			}
			driveTimeLabel.setHtml(driveTimeText);
		}
		var rating = Ext.ComponentManager.get('shopRating');
		rating.setCls('checkin-rating-3');
	}
});