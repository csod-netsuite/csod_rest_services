define(['N/search'], function (search) {

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

    exports.getSalesForceID = getSalesForceID;

    return exports;
});
