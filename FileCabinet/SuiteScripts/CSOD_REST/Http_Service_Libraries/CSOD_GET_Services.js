define(['N/search', 'N/record'], function (search, record) {

    /**
     * Module Description...
     *
     * @exports {object} SalesforceID : 18chars
     *
     * @copyright 2017 ${organization}
     * @author ${author} <${email}>
     *
     * @NApiVersion 2.x
     * @NModuleScope SameAccount
     */
    var exports = {};

    var getSalesForceID = function(internalId) {

        var output = {};

        var customerSearchObj = search.create({
            type: "customer",
            filters: [
                ["internalidnumber","equalto", internalId]
            ],
            columns: [
                "custentitysales_force_id",
                "custentity_salesforce_name"
            ]
        });
        var searchResultCount = customerSearchObj.runPaged().count;

        if(searchResultCount > 0) {
            customerSearchObj.run().each(function(result){
                // .run().each has a limit of 4,000 results
                output['salesForceId'] = result.getValue({
                    name: 'custentitysales_force_id'
                });

                output['salesForceName'] = result.getValue({
                    name: 'custentity_salesforce_name'
                });
            });
        }

        return output;
    };
    
    var setNewPPDate = function(ppDate, deployId) {
    	
    	if(ppDate === undefined || ppDate === null || ppDate === '') {
    		return {
    			success: false,
    			message: "Missing PPDATE"
    		};
    	} 
    	
    	var recordId = record.submitFields({
    		type: record.Type.SCRIPT_DEPLOYMENT,
    		id: deployId,
    		values: {
    			custscript_csod_ml_lastest_updated_at: ppDate
    		}
    	});
    	
    	log.debug({
    		title: "PPDATE Updated",
    		details: recordId
    	});
    	
    	if(recordId) {
    		return {
    			success: true,
    			message: 'PPDATE Updated'
    		}
    	}
    	
    	
    }

    exports.getSalesForceID = getSalesForceID;
    exports.setNewPPDate = setNewPPDate;

    return exports;
});
