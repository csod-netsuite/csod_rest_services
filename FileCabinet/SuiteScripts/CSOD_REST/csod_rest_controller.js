define(['N/error', './Http_Service_Libraries/CSOD_POST_Services', './Http_Service_Libraries/CSOD_GET_Services'
    ,'./Http_Service_Libraries/CSOD_GET_Exchange_Rate_Service', './Http_Service_Libraries/lodash', 'N/file'],
    function (error, CSOD_POST, CSOD_GET, CSOD_EX_RATE, _, file) {

    /**
     * Module Description...
     *
     * @exports JSON structured data
     *
     * @copyright 2017 Cornerstone OnDemand
     * @author Chan cyi@csod.com
     *
     * @NApiVersion 2.x
     * @NModuleScope Public
     * @NScriptType RESTlet
     */
    var exports = {};

    // Action reference table
    const ACTIONS = {
        MAVENLINK : '1',
        CHECK_CUSTOMER_ID: '2',
        EXCHANGE_RATE: '3',
        POST_CSV: '4',
        UPDATE_PPDATE: '5',
        UPDATE_SO_LINE: '6',
        EX_RATE_ANAPLAN: '7',
        CHECK_EMP_ID: '8'
    };

    function _get(context) {
        if(!context.hasOwnProperty('action')) {
            return error.create({
                name: 'MISSING_REQ_ARG',
                message: 'Missing a required argument'
            });
        }

        var output;

        if(context.action == ACTIONS.CHECK_CUSTOMER_ID) {
            log.debug({
                title: "RESTlet Action 2 Called",
                details: context.internalId
            });

            var customerId = context.internalId || '';

            //return Salesforce ID in return
            if(customerId !== ''){
                output = CSOD_GET.getSalesForceID(customerId);
            } else {
                output = { message: "Empty" }
            }


        } else if(context.action == ACTIONS.EXCHANGE_RATE) {
            var effectiveDateStart = context.startDate || context.startdate;
            var effectiveDateEnd = context.endDate || context.enddate;
            var currencySymbol = context.currency;

            if(!currencySymbol) {
                output = { success: false, message: "Currency Symbol is required" };

            } else {
                output = CSOD_EX_RATE.getExchangeRate(currencySymbol, effectiveDateStart, effectiveDateEnd);
            }

        } else if(context.action == ACTIONS.UPDATE_PPDATE) {
        	log.debug({
                title: "RESTlet Action 5 Called",
                details: context.internalId
            });
        	
        	const deployId = '8331';
        	output = CSOD_GET.setNewPPDate(context.ppdate, deployId);

        } else if(context.action == ACTIONS.UPDATE_SO_LINE) {
            // Get Sales Order lines to update
            log.debug({
                title: "RESTlet Action 6 Called",
                details: context.ppdate
            });
            output = CSOD_GET.getUpdatedLinesFromSalesOrder(context.ppdate);
        } else if(context.action == ACTIONS.EX_RATE_ANAPLAN) {
        	// Get Exchange Rate CSV for Anaplan
        	log.debug({
        		title: "RESTlet Action 7 - EX_RATE_ANAPLAN Called",
        		details: context.action
        	});
        	output = CSOD_GET.getExchangeRateTable();
        } else if(context.action == ACTIONS.CHECK_EMP_ID) {
        	log.debug({
        		title: "RESTlet Action 8 - CHECK EMP ID Called",
        		details: context.email
        	});
        	if(context.email && context.externalid){
        		output = CSOD_GET.getEmployee(context.email,context.externalid);
        	}
        	else{
                return error.create({
                    name: 'MISSING_REQ_ARG',
                    message: 'Missing a required argument'
                });
        	}
        }

        // route to different method

        log.debug({
            title: "Output check",
            details: output
        });
        return JSON.stringify(output);
    }

    function _post(requestBody) {

        var response = {};
        
        // log.debug({
        //     title: 'resquestBody',
        //     details: requestBody
        // });
        //@TODO validate action id
        // Routing to different services
        response = CSOD_POST.mavenlinkDataProcess(requestBody);

        // log.debug({
        //     title: 'response',
        //     details: response
        // });

        return response;
    }

    exports.get = _get;
    exports.post = _post;
    return exports;
});
