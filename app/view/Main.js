Ext.define('PF.view.Main', {
	extend:"Ext.NavigationView",
	xtype:"mainview",
	requires: [
		'Ext.form.Panel',
		'Ext.field.Search',
		'Ext.Sheet',
		'Ext.Label',
		'Ext.Img',
		'Ext.Toolbar'
	],
	config:
	{
		items:
		[
			{
				xtype:'panel',
				id:'searchPanel',
				title:'Pizza Finder',
				layout:'fit',
				items:
				[
					{
						xtype:'panel',
						layout:'fit',
						flex:1,
						items: [
						{
							id:'mainPizzaMap',
							xtype:"pizzafindermap",
							title:"Pizza Finder",
							useCurrentLocation:false,

							baseMapLayer:"http://server.arcgisonline.com/ArcGIS/rest/services/World_Street_Map/MapServer",
							mapOptions:
							{
								// If we reference esri components from the statically defined structure
								// of the Sencha component (rather than in a function definition) we will
								// get errors in production, since all this code is bundled up and loaded
								// with evaluate(), potentially before dojo has loaded. In that case (like here)
								// we simply wrap in an anonymous function which we call in-line...
								// Like this:
								// (function () { return esri.foo() }) ()
								// 
								// It's unfortunate, but thankfully rarely necessary.
								extent:(function() {
											return new esri.geometry.Extent(-13900983.502243, 90052.215888, 
																			-7639262.145123, 9091276.666748,
																			new esri.SpatialReference({"wkid":102100}))
										})()
							}
						}]
					},
					{
						xtype:'formpanel',
						id:'singleLineAddressPanel',
						submitOnAction: false,
						left:10,
						right: 10,
						top:10,
						height:'3em',
						scrollable:false,
						padding:0,
						centered: true,
						hidden: true,
						modal: true,
						hideOnMaskTap: true,
						showAnimation: 'fadeIn',
						hideAnimation: 'fadeOut',
						items:
						[
							{
								xtype:'searchfield',
								id:'singleLineAddress',
								//value:'450 West Randolph Street, Chicago',
								value:'222 Mason Street, San Francisco',
								//value:'50 5th St., San Francisco',
								padding:0,
								height:"1em",
								placeHolder: 'Enter an address',
								listeners: {
									action: function(c,e,o) {
										var address = c.getValue();
										if (address === "")
										{
											Ext.Msg.alert("Empty Search!", "Enter a place name or address!");
											return false;
										}

										var mapView = c.up('#searchPanel').down('#mainPizzaMap');
										c.up('#singleLineAddressPanel').hide();
										mapView.locateToAddress(address);
										return false;
									},
									clearicontap: function(c,e,o) {
										// The keyboard hides on the iPhone when you click clear.
										// That's not like native behaviour.
										c.focus();
										return false;
									}							
								}
							}
						],
						zIndex:'40'
					},
					{
						xtype:'sheet',
						id:'clickingOnMapPanel',
						hidden: true,
						enter: 'left',
						exit: 'left',
						docked: 'bottom',
						modal: false,
						bottom: 0,
						height:47,
						stretchX: true,
						stretchY: false,
						layout:'hbox',
						items:
						[
							{
								id:'clickMapMessage',
								xtype:'label',
								html:'Tap on the map to search...',
								layout: 'fit',
								style: {
									'color': 'white'
								},
								flex: 1
							},
							{
								xtype: 'image',
								src: 'resources/images/white-cross.png',
								width: 23,
								height: 23,
								listeners: {
									tap: function() {
										this.getParent().hide();
										PF.mainPizzaFinderMapView.waitingForTapToFind = false;
									}
								}
							}
						],
						listeners: {
							show: function() {
								PF.clickToFindPanel = this;
							}
						},
						zIndex:'40'
					},
					{
						xtype:'toolbar',
						docked:'bottom',
						defaults:{flex:1},
						items:
						[
// 							{
// 								xtype: 'button',
// 								text:'Me',
// 								handler: function() {
// 									var enterAddressBox = this.up('#searchPanel').down('#singleLineAddressPanel');
// 									var clickOnMapPanel = this.up('#searchPanel').down('#clickingOnMapPanel');
// 
// 									enterAddressBox.hide();
// 									clickOnMapPanel.hide();
// 
// 									PF.mainPizzaFinderMapView.locateToMe();
// 									PF.mainPizzaFinderMapView.waitingForTapToFind = false;
// 								}
// 							},
							{
								xtype: 'button',
								text:'Address',
								handler: function() {
									var enterAddressBox = this.up('#searchPanel').down('#singleLineAddressPanel');
									var clickOnMapPanel = this.up('#searchPanel').down('#clickingOnMapPanel');

									enterAddressBox.show();
									clickOnMapPanel.hide();

									enterAddressBox.getComponent('singleLineAddress').focus();
									PF.mainPizzaFinderMapView.waitingForTapToFind = false;
								}
							},
							{
								xtype: 'button',
								text:'Map',
								handler: function() {
									var enterAddressBox = this.up('#searchPanel').down('#singleLineAddressPanel');
									var clickOnMapPanel = this.up('#searchPanel').down('#clickingOnMapPanel');

									enterAddressBox.hide();
									clickOnMapPanel.show();

									PF.mainPizzaFinderMapView.waitingForTapToFind = true;
								}
							}
						]
					}
				]
			}
		]
	}
});