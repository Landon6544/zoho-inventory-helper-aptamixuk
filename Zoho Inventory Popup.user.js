// ==UserScript==
// @name       Zoho Inventory Popup
// @version    0.1
// @updateURL https://github.com/Landon6544/zoho-inventory-helper-aptamixuk/raw/master/Zoho%20Inventory%20Popup.user.js
// @downloadURL https://github.com/Landon6544/zoho-inventory-helper-aptamixuk/raw/master/Zoho%20Inventory%20Popup.user.js
// @description  Opens links from the CodeProject newsletter
// @match      https://inventory.zoho.eu/*
// @match      https://books.zoho.eu/*
// @copyright  2020
// @resource jqueryUICSS https://code.jquery.com/ui/1.12.1/themes/base/jquery-ui.css
// @resource lobiBoxCSS https://cdn.jsdelivr.net/npm/lobibox@1.2.7/dist/css/lobibox.min.css
// @require https://code.jquery.com/jquery-1.12.4.js
// @require https://code.jquery.com/ui/1.12.1/jquery-ui.js
// @require https://cdnjs.cloudflare.com/ajax/libs/popper.js/1.12.9/umd/popper.min.js
// @require https://maxcdn.bootstrapcdn.com/bootstrap/4.0.0/js/bootstrap.min.js
// @require https://cdn.jsdelivr.net/npm/lobibox@1.2.7/dist/js/lobibox.min.js
// @grant       GM_addStyle
// @grant       GM_getResourceText
// @grant       GM_getResourceURL
// ==/UserScript==

document.head.appendChild(cssElement(GM_getResourceURL ("jqueryUICSS")));
document.head.appendChild(cssElement(GM_getResourceURL ("lobiBoxCSS")));
document.head.appendChild($(`
		<style>
			.lobibox-notify-error .lobibox-notify-msg {
				max-height: unset !important;
			}
		</style>
	`)[0]);
function cssElement(url) {
	var link = document.createElement("link");
	link.href = url;
	link.rel="stylesheet";
	link.type="text/css";
	return link;
}

var Zoho_Inventory_Helper = {
	lastLackStockItems: false,
	pageName: false,

    init: () => {
		Zoho_Inventory_Helper.initListeners();

		Zoho_Inventory_Helper.performPageChangeActions();
	},

	setPageName: () => {
		let hash = location.hash;

		if (hash.startsWith('#/salesorders/new')) {
			Zoho_Inventory_Helper.pageName = 'new_salesorders';
		}else if (hash.match(/#\/salesorders\/.{0,}\/edit/)) {
			Zoho_Inventory_Helper.pageName = 'new_salesorders';
		} else if (hash.match(/#\/salesorders\/.{0,}\/packages\/new/)) {
			Zoho_Inventory_Helper.pageName = 'new_package'
		} else if (hash.match(/#\/salesorders\/.{0,}\/salesreturns\/new.{0,}/)) {
			Zoho_Inventory_Helper.pageName = 'new_salesreturns'
		} else if (hash.match(/#\/salesorders\/.{0,}\/salesreturns\/edit.{0,}/)) {
			Zoho_Inventory_Helper.pageName = 'new_salesreturns'
		} else if (hash.match(/#\/salesreturns\/.{0,}\/edit.{0,}/)) {
			Zoho_Inventory_Helper.pageName = 'new_salesreturns'
		} else if(hash.match(/#\/salesorders\/.{0,}\/packages.{0,}/)) {
			Zoho_Inventory_Helper.pageName = 'show_package_in_salesorders'
		} else if(hash.match(/#\/purchaseorders\/receivedetails\/.{0,}/)) {
			Zoho_Inventory_Helper.pageName = 'purchaseorders_receivedetails';
		} else if(hash.match(/#\/inventory\/transferorders\/[0-9]{15,20}\?.{0,}/)) {
			Zoho_Inventory_Helper.pageName = 'inventory_transferorders_show';
		} else if(hash.match(/#\/inventory\/transferorders\?.{0,}/)) {
			Zoho_Inventory_Helper.pageName = 'inventory_transferorders_list';
		} else if(hash.match(/#\/packages\/[0-9]{15,20}\?.{0,}/)) {
			Zoho_Inventory_Helper.pageName = 'packages_show';
		} else if(hash.match(/#\/inventory\/compositeitems.{0,}\/bundling\/new/)) {
			Zoho_Inventory_Helper.pageName = 'inventory_compositeitems_bundling_new';
		} else if(hash.match(/#\/contacts\/.{0,}\/edit/)) {
			Zoho_Inventory_Helper.pageName = 'contact_edit';
		} else if(hash.match(/#\/contacts\/new/)) {
			Zoho_Inventory_Helper.pageName = 'contact_new';
		} else {
			Zoho_Inventory_Helper.pageName = false;
		}

		console.log(Zoho_Inventory_Helper.pageName);
	},

    initListeners: () => {
		/** New Sales Orders page event */
		//Quantity Change Event
		$(document).on('change', '#lineitems-section input.qty-field', function(e){
			if(Zoho_Inventory_Helper.pageName != 'new_salesorders') return;
			setTimeout(Zoho_Inventory_Helper.checkStocks, 200);
		})

		//Item selected event
		$(document).on('click', '.ac-dropdown-results .ac-item-details', function(){
			
			if(Zoho_Inventory_Helper.pageName == 'new_salesorders') {
				setTimeout(Zoho_Inventory_Helper.checkStocks, 1000);
			}

			if (Zoho_Inventory_Helper.pageName == 'inventory_compositeitems_bundling_new') {
				Composite_Items_Bundling_Helper.startValidationProcess();
			}
		})
		
		$(document).on('mousedown', '.datepicker td', function(e) {
			if(Zoho_Inventory_Helper.pageName != 'new_salesorders') return;
			setTimeout(Zoho_Inventory_Helper.validateSaveNewSalesOrder, 500);
		})

		// Dropdown change event
		$(document).on('mousedown', '.ac-dropdown-results .ac-option, .ac-selection-clear', function(){
			if(Zoho_Inventory_Helper.pageName != 'new_salesorders') return;
			setTimeout(Zoho_Inventory_Helper.validateSaveNewSalesOrder, 500);
			setTimeout(Zoho_Inventory_Helper.validateCustomerName, 200);
			setTimeout(New_Sales_Orders_Page_Helper.getExpectedShipmentDaysForCompany, 2500);
		})
		
		$('body').keydown(function(e){
			if(e.keyCode == 13 && $(".ac-dropdown-results:visible").length > 0) {
				if(Zoho_Inventory_Helper.pageName != 'new_salesorders') return;
				setTimeout(Zoho_Inventory_Helper.validateSaveNewSalesOrder, 500);
				setTimeout(Zoho_Inventory_Helper.validateCustomerName, 200);
				setTimeout(New_Sales_Orders_Page_Helper.getExpectedShipmentDaysForCompany, 2500);
			}
		})

		// Input form control change event
		$(document).on('change', 'input.form-control', function(){
			if(Zoho_Inventory_Helper.pageName == 'new_salesorders') {
				setTimeout(Zoho_Inventory_Helper.validateSaveNewSalesOrder, 500);	
			}

			if (Zoho_Inventory_Helper.pageName == 'inventory_compositeitems_bundling_new') {
				Composite_Items_Bundling_Helper.startValidationProcess(100);
			}

			if (['contact_edit', 'contact_new'].includes(Zoho_Inventory_Helper.pageName)) {
				Contact_Edit_Page_Helper.validateSaveButton();
			}
		})
		
		$(document).on('mousedown', 'input[placeholder="dd/MM/yyyy"]', function(e){
			if(Zoho_Inventory_Helper.pageName != 'new_salesorders') return;
			if (!New_Sales_Orders_Page_Helper.isExpectedShipmentInput(e.target)) return;
			setTimeout(New_Sales_Orders_Page_Helper.validateDaysForExpectedShipmentDatePopup, 100);
		})
		
		$(document).on('mousedown', '.datepicker-days th.prev, .datepicker-days th.next', function(e){
			if(Zoho_Inventory_Helper.pageName != 'new_salesorders') return;
			if (!$(".datepicker-days:visible").hasClass('expected-shipment-date-widget')) return;
			setTimeout(New_Sales_Orders_Page_Helper.validateDaysForExpectedShipmentDatePopup, 100);
		})

		/**New package page */
		$(document).on('click', ".item-actions .action", function() {
			if(Zoho_Inventory_Helper.pageName != 'new_package') return;
			setTimeout(Zoho_Inventory_Helper.checkStocks, 500);
		})

		$(document).on('change', "#lineitems-section .line-item input", function() {
			if(Zoho_Inventory_Helper.pageName != 'new_package') return;
			setTimeout(Zoho_Inventory_Helper.checkStocks, 200);
		})

		// Button Click event
		$(document).on('mousedown', 'button', function(e){
			if(['show_package_in_salesorders', 'packages_show'].includes(Zoho_Inventory_Helper.pageName)) {
				if( Package_Page_Helper.isPrintButton(e.target) ) {
					Package_Page_Helper.updatePackagePrintedField();
				}
			};
		})

		// Update Package attribute button
		$(document).on('click', '#update-package-attribute-button', function(){
			if(Zoho_Inventory_Helper.pageName != 'show_package_in_salesorders') return;
			setTimeout(Package_Page_Helper.setSalesOrderPackageUpdateFieldChecked, 400);
		})

		// Click check back orders button
		$(document).on('click', '#check-back-orders-button', function() {
			if(['purchaseorders_receivedetails', 'inventory_transferorders_show'].includes(Zoho_Inventory_Helper.pageName)) {
				if ($(this).hasClass('disabled')) return;

				$(this).addClass('disabled').attr('disabled', 'disabled');
				Purchase_Orders_Page_Helper.showSalesOrdersModal();	
			}
		})

		// Delete button event
		$(document).on('mousedown', '.item-autocomplete .zf-item-remove', function() {
			if (Zoho_Inventory_Helper.pageName == 'inventory_compositeitems_bundling_new') {
				Composite_Items_Bundling_Helper.startValidationProcess();
			}
		})
		
		// Bundle Items Link Click Event
		$(document).on('click', '.line-item-column.item-qty a.hightlight', function(e) {
			if (Zoho_Inventory_Helper.pageName == 'new_salesorders') {
				setTimeout(() => {
					Bundle_Items_Modal_Helper.startValidationProcess(e.target);
				}, 2000);
			}
		});

		// Modal input change event
		$(document).on('change', '.modal-content:visible input.form-control', function() {
			if (Zoho_Inventory_Helper.pageName == 'new_salesorders') {
				Bundle_Items_Modal_Helper.validateSaveButton();
			}
		})
	
		// Address select Event
		$(document).on('mousedown', '.scrollable-address-list li', function(){
			if(Zoho_Inventory_Helper.pageName == 'new_salesorders') {
				setTimeout(New_Sales_Orders_Page_Helper.getExpectedShipmentDaysForCompany, 800);
			};
		})

		// Modal save button event
		$(document).on('mousedown', '.modal-dialog:visible button[type=submit]', function() {
			if(Zoho_Inventory_Helper.pageName == 'new_salesorders') {
				setTimeout(New_Sales_Orders_Page_Helper.getExpectedShipmentDaysForCompany, 1500);
			};
		})

		// Update Report Click Button
		$(document).on('click', '#update-report-button', function(){
			Inventory_Transfer_Orders_List_Page_Helper.openUpdateReportWindow();
		})
	},

	performPageChangeActions: () => {
		Zoho_Inventory_Helper.setPageName();
		Zoho_Inventory_Helper.lastLackStockItems = false;

		if(Zoho_Inventory_Helper.pageName == 'new_package') {
			setTimeout(Zoho_Inventory_Helper.checkStocks, 1000);
		}

		if (Zoho_Inventory_Helper.pageName == 'new_salesorders') {
			Zoho_Inventory_Helper.addCustomerOnHoldPopup();
			New_Sales_Orders_Page_Helper.getDeliveryRoutes();
			setTimeout(Zoho_Inventory_Helper.validateSaveNewSalesOrder, 500);
			setTimeout(Zoho_Inventory_Helper.validateCustomerName, 200);
		}

		if (Zoho_Inventory_Helper.pageName == 'new_salesreturns') {
			setTimeout(New_SalesReturns_Helper.initReasonAutocomplete, 500);
		}

		if (Zoho_Inventory_Helper.pageName == 'show_package_in_salesorders') {
			//setTimeout(Package_Page_Helper.addUpdatePackageButton, 800);
		}

		if(['purchaseorders_receivedetails', 'inventory_transferorders_show'].includes(Zoho_Inventory_Helper.pageName)) {
			setTimeout(Purchase_Orders_Page_Helper.addCheckBackordersButton, 800);
		}

		if (Zoho_Inventory_Helper.pageName == 'inventory_compositeitems_bundling_new') {
			Composite_Items_Bundling_Helper.startValidationProcess(100);
		}

		if (['contact_edit', 'contact_new'].includes(Zoho_Inventory_Helper.pageName)) {
			setTimeout(Contact_Edit_Page_Helper.validateSaveButton, 1000);
		}

		if (Zoho_Inventory_Helper.pageName == 'inventory_transferorders_list') {
			setTimeout(Inventory_Transfer_Orders_List_Page_Helper.addUpdateReportButton, 500);
		}
	},

	checkStocks: async function() {
		Zoho_Inventory_Helper.addHiddenPopoverStyle();
		let itemsData = await Zoho_Inventory_Helper.getItemsData();
		$('body').trigger('click');
		Zoho_Inventory_Helper.deleteHiddenPopoverStyle();

		let lackStockItems = [];
		itemsData.forEach((itemData)=>{
			if (itemData.stock < itemData.quantity) {
				lackStockItems.push(itemData);
			}
		})

		if (lackStockItems.length > 0 && Zoho_Inventory_Helper.hasDifferentContent(lackStockItems)) {
			Zoho_Inventory_Helper.showModal(lackStockItems);
		}

		if (Zoho_Inventory_Helper.pageName == 'new_package') {
			if (lackStockItems.length > 0) {
				$(".fixed-actions button").eq(0).attr('disabled', 'disabled');
				$(".fixed-actions button").eq(0).addClass('disabled');
			} else {
				$(".fixed-actions button").eq(0).removeAttr('disabled');
				$(".fixed-actions button").eq(0).removeClass('disabled');
			}
		}
	},

	hasDifferentContent: (lackStockItems) => {
		if (Zoho_Inventory_Helper.lastLackStockItems == false) return true;
		lackStockItems.sort((a, b) => {
			return a.sku > b.sku;
		})
		Zoho_Inventory_Helper.lastLackStockItems.sort((a, b) => {
			return a.sku > b.sku;
		})

		if (lackStockItems.length != Zoho_Inventory_Helper.lastLackStockItems.length) {
			return true;
		}

		for (let i = 0; i < lackStockItems.length; i++) {
			if (lackStockItems[i].sku != Zoho_Inventory_Helper.lastLackStockItems[i].sku) {
				return true;
			}
			if (lackStockItems[i].quantity != Zoho_Inventory_Helper.lastLackStockItems[i].quantity) {
				return true;
			}
			if (lackStockItems[i].stock != Zoho_Inventory_Helper.lastLackStockItems[i].stock) {
				return true;
			}
		}

		return false;
	},

	showModal: (lackStockItems) => {
		Zoho_Inventory_Helper.lastLackStockItems = lackStockItems;

		let rowsContent = '';
		lackStockItems.forEach((itemData) => {
			rowsContent += `
					<tr>
						<td>
							${itemData.name}
						</td>
						<td>
							${itemData.sku}
						</td>
						<td class="text-right">
							${itemData.stock}
						</td>
					</tr>
				`;
		})

		let tableContent = `
				<div class="table-responsive-wrapper">
					<table class="table items-table" style="color:white;">
						<thead>
						<tr>
							<th scope="col" style="color: white;">Insufficient Stock</th>
							<th scope="col" style="color: white;">SKU</th>
							<th scope="col" width="150px" class="text-right" style="color: white;">Available for sale</th>
						</tr>
						</thead>
						<tbody>
							${ rowsContent }
						</tbody>
					</table>
				</div>
			`;
		Lobibox.notify('error', {
			title: false,
			icon: false,
			rounded: true,
			delay: 5000,
			width: 800,
			closable: false,
			delayIndicator: false,
			sound: false,
			position: 'center top', //or 'center bottom'
			msg: tableContent
		});
	},

	getItemsData: async function() {
		let items = [];
		let lineItems = $("#lineitems-section .line-item");
		for (let i = 0; i < lineItems.length; i++){
			element = $(lineItems[i]);
			itemData = false;
			if (Zoho_Inventory_Helper.pageName == 'new_salesorders'){
				itemData = await Zoho_Inventory_Helper.getItemDataFromElementOnOrderSalesPage($(element))
			}
			else if (Zoho_Inventory_Helper.pageName == 'new_package') {
				itemData = Zoho_Inventory_Helper.getItemDataFromElementOnNewPackagePage($(element))
			}
			if (itemData != false) {
				items.push(itemData);
			}
		}

		return items;
	},

	getItemDataFromElementOnOrderSalesPage: async function (itemElement) {

		//Get Item Name
		let nameLabels = itemElement.find('.line-item-column .name label');
		if (nameLabels.length == 0) return false;
		let itemName = nameLabels.eq(0).text().trim();
		if (itemName == "") return false;

		//Get Item SKU
		let itemSku = "";
		if (nameLabels.length > 1) {
			itemSku = nameLabels.eq(1).text().trim().replace('SKU: ', '');
		}

		//Get Item Quantity
		let quantityField = itemElement.find('.item-qty .qty-field');
		if (quantityField.length == 0) return false;
		let itemQuantity = parsePrettyFloat(quantityField.eq(0).val());

		//Get Item Stock
		let itemStock = await Zoho_Inventory_Helper.getItemStockForSalesOrders(itemElement);

		return {
			'name' : itemName,
			'sku' : itemSku,
			'quantity' : itemQuantity,
			'stock' : itemStock
		}
	},

	getItemStockForSalesOrders: async function(itemElement) {
		//Trigger Popup
		itemElement.find('.warehouse-lineitem > span').trigger('click');

		await delay(200);
		let stock = parsePrettyFloat(itemElement.find('div.popover .details-page-table tbody tr').eq(0).find('td').eq(3).text().trim());
		return stock;
	},

	getItemDataFromElementOnNewPackagePage: (itemElement) => {
		//Get Item Name
		let namesColumn = itemElement.find('.line-item-column').eq(0);
		if (namesColumn.length == 0) return false;
		let itemName = namesColumn.text().trim();
		if (itemName == "") return false;

		//Get Item SKU
		let skuWrapper = namesColumn.find("div").eq(1);
		if (skuWrapper == 0) return false;
		let itemSku = skuWrapper.find("small").text().trim().replace('SKU: ', '').trim();

		//Get Item Quantity
		let quantityColumn = itemElement.find('.line-item-column').eq(3);
		if (quantityColumn.length == 0) return false;
		let itemQuantity = parsePrettyFloat(quantityColumn.find('input').val());

		//Get Item Stock
		let itemStock = parsePrettyFloat(quantityColumn.find('div.ember-view > div > div').text().trim().replace('pcs', ''));

		return {
			'name' : itemName,
			'sku' : itemSku,
			'quantity' : itemQuantity,
			'stock' : itemStock
		}
	},

	validateSaveNewSalesOrder: () => {
		let errorFound = false;

		//Check expected shipmentdate
		let expectedShipmentDate = $(".zb-txn-form").eq(1).find('.form-group').eq(3).find('input').eq(0).val();
		if (expectedShipmentDate == '') {
			errorFound = true;
		}

		//Check Shipping Charges and Vat
		let shippingCharges = parsePrettyFloat($(".invoice-discount .total-label").eq($(".invoice-discount .total-label").length - 3).find('input.form-control').val());
		if (isNaN(shippingCharges)) shippingCharges = 0;
		let vatApplied = $(".total-label").eq(2).find('.popover-container').eq(0).find('.btn-link').text().trim() == "Edit VAT Applied";
		if (vatApplied == false && shippingCharges > 0) {
			errorFound = true;
		}

		//Validate save button
		if (errorFound) {
			$(".btn-toolbar.fixed-actions button").eq(0).addClass('disabled').attr('disabled', 'disabled');
			$(".btn-toolbar.fixed-actions button.btn-primary").addClass('disabled').attr('disabled', 'disabled');
		} else {
			$(".btn-toolbar.fixed-actions button").eq(0).removeClass('disabled').removeAttr('disabled');
			$(".btn-toolbar.fixed-actions button.btn-primary").removeClass('disabled').removeAttr('disabled');
		}
	},

	validateCustomerName: async () => {
		let customerName = $(".primary-info .form-group span.ac-selected.form-control span").eq(0).text().trim();
		if (customerName != '' && customerName != 'Select or Add Customer') {
			let response = await Zoho_Inventory_API.call({
				action: 'search_contacts_by_company_name',
				company_name: customerName
			});

			let contact = response.contacts[0];
			if (contact != undefined && contact != null && contact.cf_on_hold == 'true') {
				$("#customer-on-hold-warning-wrapper").show();
			} else {
				$("#customer-on-hold-warning-wrapper").hide();
			}
		}
	},

	addCustomerOnHoldPopup: () => {
		if ($("#customer-on-hold-warning-wrapper").length == 0) {
			$('.primary-info .form-group').eq(0).find(">div").append('<div id ="customer-on-hold-warning-wrapper" class="row" style="display:none;"><div class="col-sm-12 text-red"><strong>Warning! This customer is on Stop</strong></div></div>');
		}
	},

	addHiddenPopoverStyle: () => {
		var css = '.popover { display:none !important; }',
		head = document.head || document.getElementsByTagName('head')[0],
		style = document.createElement('style');

		head.appendChild(style);

		style.type = 'text/css';
		style.id = 'custom-popover-hidden-tag'
		if (style.styleSheet){
			style.styleSheet.cssText = css;
		} else {
			style.appendChild(document.createTextNode(css));
		}
	},

	deleteHiddenPopoverStyle: () => {
		$("#custom-popover-hidden-tag").remove();
	}
};

var New_SalesReturns_Helper = {

	Sales_Returns_Reasons : [
		'Damaged',
		'No Longer Required',
		'Faulty',
		'Order Entry Error',
		'Picking Error'
	],

	initReasonAutocomplete: () => {
		let reasonInputClass = 'new-sales-return-reason-input';
		$("input.form-control").eq(3).addClass(reasonInputClass)

		$('.' + reasonInputClass).autocomplete({
			minLength: 0,
			source: New_SalesReturns_Helper.Sales_Returns_Reasons,
			change: function(event,ui){
				$(this).val((ui.item == null ? '' : ui.item.label));
			}
		}).click(function () {
			$(this).autocomplete("search", "");
		});
	}
}

var Package_Page_Helper = {

	addUpdatePackageButton: async () => {
		if ($("#update-package-attribute-button").length == 0) {
			let response = await Zoho_Inventory_API.call({
				action: 'get_sales_order_details',
				sales_order_id: Package_Page_Helper.getSalesOrderIdFromUrl()
			});

			let packageChecked = response.salesorder.custom_fields.find(field => field.customfield_id == '112341000002890097').value;
			$(".sales-top-band .top-band-options .btn-toolbar").eq(0).prepend(`<button type="button" id="update-package-attribute-button" class="btn btn-info" ${packageChecked ? 'style="display:none;"' : ''}>Update Package</button>`);
		}
	},

	setSalesOrderPackageUpdateFieldChecked: async () => {
		$("#update-package-attribute-button").addClass('disabled');
		$("#update-package-attribute-button").attr('disabled', 'disabled');
		await Zoho_Inventory_API.call({
			action: 'set_sales_order_package_update_field',
			sales_order_id: Package_Page_Helper.getSalesOrderIdFromUrl()
		});

		alert("Updated cf_package_update field for sales order");
		$("#update-package-attribute-button").hide();
	},

	getSalesOrderIdFromUrl: () => {
		let hash = location.hash.substr(14)
		return hash.substr(0, hash.indexOf('/'))
	},

	getPackageIdFromUrl: () => {
		let result = location.hash.split('packages/')[1];
		return result.substr(0, result.indexOf('?'))
	},

	isPrintButton: (button) => {
		return $(".sales-top-band .top-band-options .btn-toolbar").eq(0).find('button.btn-secondary').eq(2)[0] === $(button).closest('button')[0];
	},

	updatePackagePrintedField: async () => {
		await Zoho_Inventory_API.call({
			action: 'set_package_printed_field',
			package_id: Package_Page_Helper.getPackageIdFromUrl()
		});
		alert("Updated cf_printed field for package!");
	}
}

var Purchase_Orders_Page_Helper = {
	addCheckBackordersButton: () => {
		if ($("#check-back-orders-button").length == 0) {
			$(".content-column .btn-toolbar").eq(0).prepend(`<button type="button" id="check-back-orders-button" class="btn btn-info">Check Back Orders</button>`);
		}
		
		if ($("#sales-orders-modal-for-items-modal").length == 0) {
			$('body').append(`
				<div id="sales-orders-modal-for-items-modal" class="modal" tabindex="-1" role="dialog">
					<div class="modal-dialog" role="document" style="max-width:800px">
						<div class="modal-content">
							<div class="modal-header">
								<h5 class="modal-title" style="font-size: 1.2rem;font-weight: 600;">
									Back Sales Orders
								</h5>
								<button type="button" class="close" data-dismiss="modal" aria-label="Close">
									<span aria-hidden="true">&times;</span>
								</button>
						</div>
						<div class="modal-body">
						</div>
					</div>
				</div>
			`);			
		}
	},

	showSalesOrdersModal: async () => {
		let response = false;

		if(Zoho_Inventory_Helper.pageName == 'purchaseorders_receivedetails') {
			let purchase_service_id = Purchase_Orders_Page_Helper.getPurchaseServiceIdFromUrl();
		
			response = await Zoho_Inventory_API.call({
				action: 'get_related_salesorders_from_packageservice',
				purchase_service_id
			});
		} else if(Zoho_Inventory_Helper.pageName == 'inventory_transferorders_show') {
			let transfer_order_id = Purchase_Orders_Page_Helper.getTransferOrderIdFromUrl();
		
			response = await Zoho_Inventory_API.call({
				action: 'get_related_salesorders_from_transferorder',
				transfer_order_id
			});
		}

		if (response == false) return;

		modalContents = '';
		response.salesOrders.forEach((salesOrderForItem) => {
			salesOrdersTableBodyContent = '';
			salesOrderForItem.salesOrders.forEach((salesOrder) => {
				salesOrdersTableBodyContent += `
					<tr>
						<td><a target="_blank" href="https://inventory.zoho.eu/app#/salesorders/${salesOrder.salesorder_id}">${salesOrder.salesorder_number}</a></td>
						<td>${salesOrder.salesorder_id}</td>
						<td>${salesOrder.company_name}</td>
						<td>${salesOrder.shipment_date}</td>
					</tr>
				`;
			})

			modalContents += `
				<p class="mb-0 mt-2">${salesOrderForItem.item.name} ( <strong>${salesOrderForItem.item.sku}</strong> )</p>
				<div class="table-responsive-wrapper">
					<table class="table items-table">
						<thead>
						  <tr>
							<th scope="col">Sales Order Number</th>
							<th scope="col">Sales Order ID</th>
							<th scope="col">Customer Name</th>
							<th scope="col">Expected Shipment Date</th>
						  </tr>
						</thead>
						<tbody>
							${salesOrdersTableBodyContent == '' ? '<tr>&nbsp;&nbsp;&nbsp;No Sales Orders found.</tr>' : salesOrdersTableBodyContent}
						</tbody>
					</table>
				</div>
			`;
		});

		$("#sales-orders-modal-for-items-modal div.modal-body").html(modalContents);
		$("#sales-orders-modal-for-items-modal").modal('show');

		$("#check-back-orders-button").removeClass('disabled').removeAttr('disabled');
	},

	getPurchaseServiceIdFromUrl: () => {
		let result = location.hash.split('purchaseorders/receivedetails/')[1];
		return result.substr(0, result.indexOf('?'))
	},
	getTransferOrderIdFromUrl: () => {
		let result = location.hash.split('inventory/transferorders/')[1];
		return result.substr(0, result.indexOf('?'))
	},
}

var Composite_Items_Bundling_Helper = {

	startValidationProcess: (delay=500) => {
		Composite_Items_Bundling_Helper.addPhysicalStoreColumnToItemsTable();
		Composite_Items_Bundling_Helper.disableSaveButtons();
		setTimeout(Composite_Items_Bundling_Helper.addAllItemsToStore, delay);
		setTimeout(Composite_Items_Bundling_Helper.validateSaveButton, delay);
	},

	addAllItemsToStore: () => {
		let items = Composite_Items_Bundling_Helper.getAllItems();
		items.forEach((item) => {
			Items_Store.addItem(item.sku);
		})
	},

	getAllItems: () => {
		let items = [];
		$("table.line-item-table").eq(0).find('tbody tr').each(function(index, element) {
			let skuElement = $(element).find('td').eq(1).find('div.name label.sku');
			if (skuElement.length == 0) { return; }
			let sku = skuElement.text().trim().split(':')[1].trim();
			if (sku == undefined && sku == null && sku.length == 0) return;
			
			let quantity = parseInt($(element).find('td').eq(3).find('div.text-muted').eq(0).text().trim().replace('pcs', ''));  
			
			items.push({
				sku,
				quantity
			});
		})
		return items;
	},

	validateSaveButton: () => {
		
		Composite_Items_Bundling_Helper.disableSaveButtons();

		let items = Composite_Items_Bundling_Helper.getAllItems();
		if (!Composite_Items_Bundling_Helper.storeHasAllItems(items)) {
			setTimeout(Composite_Items_Bundling_Helper.validateSaveButton, 300);
			return;
		}
		
		let itemsTable = $(".line-item-table.composite-table").eq(0);

		let errorFound = false;
		
		items.forEach((item, index) => {
			let saneuxWareHouse = Items_Store.items[item.sku].saneuxWareHouse;
			if (saneuxWareHouse == undefined) {
				errorFound = true;
				return;
			}

			// Set physical stock row value
			if (itemsTable.length > 0) {
				itemsTable.find('tbody tr').eq(index).find('div.physical-stock-value').html(saneuxWareHouse.warehouse_stock_on_hand);
			}

			if (item.quantity > saneuxWareHouse.warehouse_stock_on_hand) {
				errorFound = true;
				return;
			}
		})

		if (errorFound) {
			Composite_Items_Bundling_Helper.disableSaveButtons();
		} else {
			Composite_Items_Bundling_Helper.enableSaveButtons();
		}
	},

	storeHasAllItems: (items) => {
		for (let i = 0; i < items.length; i++) {
			if (Items_Store.items[items[i].sku] == undefined 
				|| Items_Store.items[items[i].sku] == false 
				|| Items_Store.items[items[i].sku] == null) {
				return false;
			}
		}
		return true;
	},

	disableSaveButtons: () => {
		$(".btn-toolbar.fixed-actions button").eq(0).addClass('disabled').attr('disabled', 'disabled');
	},

	enableSaveButtons: () => {
		$(".btn-toolbar.fixed-actions button").eq(0).removeClass('disabled').removeAttr('disabled');
	},

	addPhysicalStoreColumnToItemsTable: () => {
		let itemsTable = $(".line-item-table.composite-table").eq(0);
		if (itemsTable.length == 0) return;
		if (itemsTable.find(".physical-stock-value").length == 0) {
			itemsTable.find('thead tr').find('th').eq(3).before(`<th class="line-item-column over-flow item-rate text-right"> Physical Quantity Available</th>`);
			itemsTable.find('tbody tr').each(function(index, row) {
				$(row).find('td').eq(4).before(`<td id="ember417" class="line-item-column item-amount text-right ember-view"><div class="physical-stock-value"></div></td>`);
			})
		}
	}
}

var Bundle_Items_Modal_Helper = {
	items: [],

	startValidationProcess: async (bundleItemLink) => {
		if (! Bundle_Items_Modal_Helper.isBundleItemModalVisible()) return;

		let skuElement = $(bundleItemLink).closest('tr').find('td').eq(1).find('div.name label.sku');
		if (skuElement.length == 0) { return; }
		let sku = skuElement.text().trim().split(':')[1].trim();
		if (sku == undefined || sku == null || sku.length == 0) { return; }

		Bundle_Items_Modal_Helper.disableSaveButton();
		Bundle_Items_Modal_Helper.removeOriginalHelpText();

		let response = await Zoho_Inventory_API.call({
			action: 'get_bundle_item_components_details_by_sku',
			sku
		});

		Bundle_Items_Modal_Helper.items = response.items;
		Bundle_Items_Modal_Helper.setHelpTexts();

		Bundle_Items_Modal_Helper.validateSaveButton();
	},

	validateSaveButton : () => {
		if (! Bundle_Items_Modal_Helper.isBundleItemModalVisible()) return;

		let bundleQuantity = Bundle_Items_Modal_Helper.getBundleQuantity();

		let errorFound = false;
		Bundle_Items_Modal_Helper.items.forEach((itemDetails) => {
			if (itemDetails.saneuxWareHouseSotockOnHand < itemDetails.total_quantity_consumed * bundleQuantity) {
				errorFound = true;
				return;
			}
		})

		if (errorFound) {
			Bundle_Items_Modal_Helper.disableSaveButton();
		} else {
			Bundle_Items_Modal_Helper.enableSaveButton();
		}
	},

	getBundleQuantity: () => {
		let quantityInput = $(".modal-body:visible input.form-control").eq(2);
		if (quantityInput.length == 0) return 0;

		quantity = $(".modal-body:visible input.form-control").eq(2).val().trim();

		return quantity == "" ? 1 : parseInt(quantity);
	},

	isBundleItemModalVisible: () => {
		return $(".modal-body:visible table.zi-table").length > 0;
	},

	disableSaveButton: () => {
		$(".modal-footer:visible button.btn.btn-primary").addClass('disabled').attr('disabled', 'disabled');
	},

	enableSaveButton: () => {
		$(".modal-footer:visible button.btn.btn-primary").removeClass('disabled').removeAttr('disabled');
	},

	removeOriginalHelpText: () => {
		$(".modal-body:visible input.form-control").eq(2).next().remove();
	},

	setHelpTexts: () => {

		// Set bundle available quantity help text
		maximumQuantity = false;
		Bundle_Items_Modal_Helper.items.forEach((itemDetails) => {
			let itemMaximumQuantity = Math.floor(itemDetails.saneuxWareHouseSotockOnHand / itemDetails.total_quantity_consumed)
			if (maximumQuantity === false || maximumQuantity > itemMaximumQuantity) {
				maximumQuantity = itemMaximumQuantity;
			}
		})
		let helpTextTemplate = `<div id="available-quantity-to-bundle-text" class="font-small text-muted">You can bundle <strong>${maximumQuantity}</strong> unit(s) from the available physical stock.</div>`;

		if ($("#available-quantity-to-bundle-text").length > 0) {
			$("#available-quantity-to-bundle-text").remove();
		}
		$(".modal-body:visible input.form-control").eq(2).closest('div').append(helpTextTemplate);

		// Add physical stocks to the table
		$(".modal-body:visible table.zi-table tbody tr").each(function(rowIndex, row) {
			let stockElement = $(row).find("td").eq(0).find("small").eq(0);
			stockElement.html(stockElement.html() + ", Physical Stock: " + Bundle_Items_Modal_Helper.items[rowIndex].saneuxWareHouseSotockOnHand);
		})
	}
};

var New_Sales_Orders_Page_Helper = {
	deliveryRoutes: {},
	expectedShipmentDaysForCompany: false,

	getDeliveryRoutes: async () => {
		New_Sales_Orders_Page_Helper.deliveryRoutes = {};
		let response = await Zoho_Inventory_API.call({
			action: 'get_delivery_routes'
		});

		response.deliveryRoutes.forEach((deliveryRoute) => {
			deliveryRoute.postcodes.forEach((postCode) => {
				New_Sales_Orders_Page_Helper.deliveryRoutes[postCode] = deliveryRoute;
			})
		})
	},

	getExpectedShipmentDaysForCompany: () => {
		let deliveryRouteNewInput = Dom_Helper.findInputByLabel('Delivery Route_new');
		if (deliveryRouteNewInput != false) {
			deliveryRouteNewInput.val('');
		}

		let deliveryRoute = New_Sales_Orders_Page_Helper.setExpectedShipmentDaysForCompany();
		if (deliveryRoute != false) {
			deliveryRouteNewInput.val(deliveryRoute.name);
		}
	},

	setExpectedShipmentDaysForCompany: () => {
		New_Sales_Orders_Page_Helper.expectedShipmentDaysForCompany = false;

		let shippingAddressElement = $('.address-group').eq(1).find('address').eq(0);
		if (shippingAddressElement.length == 0) {
			return false;
		}
		let addressPieces = shippingAddressElement.text().trim().split(/[, ]+/);
		for (let i = 0; i < addressPieces.length; i++) {
			let piece = addressPieces[i].trim();
			if (New_Sales_Orders_Page_Helper.deliveryRoutes[piece] == undefined && New_Sales_Orders_Page_Helper.deliveryRoutes[piece] == null) {
				continue;
			}
			let deliveryRoute = New_Sales_Orders_Page_Helper.deliveryRoutes[piece];
			let dayIndexes = {
				"Monday" : 0,
				"Tuesday" : 1, 
				"Wednesday" : 2,
				"Thursday" : 3,
				"Friday" : 4,
				"Saturday" : 5,
				"Sunday" : 6
			};
			New_Sales_Orders_Page_Helper.expectedShipmentDaysForCompany = deliveryRoute.days.map(day => dayIndexes[day]);
			return deliveryRoute;
		};
		return false;
	},

	isExpectedShipmentInput: (input) => {
		return $(".zb-txn-form").eq(1).find('.form-group').eq(3).find('input').eq(0)[0] === input;
	},

	validateDaysForExpectedShipmentDatePopup: async () => {
		if ($(".datepicker-days:visible").length == 0) return;
		let datePicker = $(".datepicker-days:visible").eq(0);
		datePicker.addClass('expected-shipment-date-widget');
		datePicker.find('td.customly-disabled').removeClass('disabled').removeClass('customly-disabled');

		if (New_Sales_Orders_Page_Helper.expectedShipmentDaysForCompany == false) return;

		datePicker.find('td.day').each(function(index, element){
			if (!New_Sales_Orders_Page_Helper.expectedShipmentDaysForCompany.includes(index % 7)) {
				if (!$(element).hasClass('disabled')) {
					$(element).addClass('disabled').addClass('customly-disabled');
				}
			}
		})
	}
}

var Contact_Edit_Page_Helper = {
	validateSaveButton : () => {
		if (Contact_Edit_Page_Helper.hasValidEmailSet()) {
			Contact_Edit_Page_Helper.enableSaveButton();
		} else {
			Contact_Edit_Page_Helper.disableSaveButton();
		}
	},

	hasValidEmailSet : () => {
		let customerEmail = Dom_Helper.findInputByLabel('Customer Email').val().trim();
		let designation = Dom_Helper.findInputByLabel('Designation') ? Dom_Helper.findInputByLabel('Designation').val().trim() : '';

		if (customerEmail.length == 0 && designation.length > 0) {
			return false;
		}

		if (Zoho_Inventory_Helper.pageName == 'contact_new') {
			return true;
		}
		let errorFound = false;
		$(".tab-pane").eq(2).find('table.line-item-table tbody tr').each(function(index, contactRow) {
			let customerEmail = $(contactRow).find('td').eq(3).find('input').val().trim();
			let designation = $(contactRow).find('td').eq(7).find('input').val().trim();
			if (customerEmail.length == 0 && designation.length > 0) {
				errorFound = true;
			}
		})

		return !errorFound;
	},

	disableSaveButton : () => {
		$(".btn-toolbar.fixed-actions button").eq(0).addClass('disabled').attr('disabled', 'disabled');
		if ($("#email-required-warning").length == 0) {
			$(".btn-toolbar.fixed-actions").append(`<label id="email-required-warning" class="text-danger text-bold" style="margin: 0;padding-top: 7px;padding-left: 15px;">Please enter Email address for the contact</label>`);
		}
	},

	enableSaveButton : () => {
		$(".btn-toolbar.fixed-actions button").eq(0).removeClass('disabled').removeAttr('disabled');
		$("#email-required-warning").remove();
	}
}

var Inventory_Transfer_Orders_List_Page_Helper = {

	addUpdateReportButton: () => {
		if ($("#update-report-button").length == 0) {
			$(".list-filter .btn-toolbar").eq(0).prepend(`<button type="button" id="update-report-button" class="btn btn-info">Update Report</button>`);
		}
	},

	openUpdateReportWindow: async () => {
		$("#update-report-button").addClass('disabled').attr('disabled', 'disabled');
		
		let response = await Zoho_Inventory_API.call({
			action: 'execute_zoho_report_exe_file'
		});

		Lobibox.notify('success', {
			icon: false,
			size: 'mini',
			title: false,
			rounded: true,
			delayIndicator: false,
			msg: 'The reporting is updated successfully.'
		});
		
		$("#update-report-button").removeClass('disabled').removeAttr('disabled');
	}
}

var Items_Store = {
	Saneux_Croydon_Warehous_ID: "112341000000040026",

	items : {},

	addItem : (sku) => {
		if (Items_Store.items[sku] == undefined) {
			Items_Store.items[sku] = false;
			Items_Store.syncItem(sku);
		}
	},

	syncItem : async (sku) => {
		let response = await Zoho_Inventory_API.call({
			action: 'get_item_details_by_sku',
			sku
		});

		let item = response.item;
		item.saneuxWareHouse = item.warehouses.find((warehouse) => {
			return warehouse.warehouse_id == Items_Store.Saneux_Croydon_Warehous_ID;
		})
		Items_Store.items[sku] = item;
	}
}

var Zoho_Inventory_API = {
	appToken: 'neB5W3LjQK4zRjm0YudEX7lBc3D3hQ7Fbto2CYuKm20=',
	apiUrl: 'https://wemteq.com/zoho/index.php',

	call: async (data) => {
		data.app_token = Zoho_Inventory_API.appToken;
		return new Promise((resolve, reject) => {
			$.ajax({
				type: "POST",
				url: Zoho_Inventory_API.apiUrl,
				data,
				success: function(response) {
					if (response.code == 0) {
						resolve(response);
					}
				}
			})
		})
	}
}

var Dom_Helper = {
	findInputByLabel : (label) => {

		let inputFound = false;
		$("label.col-form-label").each(function(index, element){
			if ($(element).text().trim() == label.trim()){
				return inputFound = $(element).closest('.row').find('input').eq(0);
			}
		})
		return inputFound;
	}
}

window.addEventListener ("load", function load () {
    Zoho_Inventory_Helper.init();
} );

window.addEventListener('hashchange', function() {
	Zoho_Inventory_Helper.performPageChangeActions();
}, false);

const delay = t => new Promise(resolve => setTimeout(resolve, t));

function parsePrettyFloat(val)
{
	if (typeof val === 'string' || val instanceof String) {
		val = val.trim().replace(',', '');
	} else {
		val = 0;
	}
	return parseFloat(val);
}
