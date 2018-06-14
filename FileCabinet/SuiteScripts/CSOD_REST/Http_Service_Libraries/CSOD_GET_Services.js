define(['N/search', 'N/record', 'N/runtime'], function (search, record, runtime) {

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
                "custentity_salesforce_name",
                "stage"
            ]
        });
        var searchResultCount = customerSearchObj.runPaged().count;

        if(searchResultCount > 0) {
            customerSearchObj.run().each(function(result){

                if(result.getValue({name: 'stage'}) == 'CUSTOMER') {
                    output['salesForceId'] = result.getValue({
                        name: 'custentitysales_force_id'
                    });

                    output['salesForceName'] = result.getValue({
                        name: 'custentity_salesforce_name'
                    });
                }
            });
        }

        return output;
    };
    
    var getEmployee = function(email,externalid) {
    	
    	var output = {};
    	
    	var employeeSearchObj = search.create({
    		type: "employee",
    		filters: [
    			["email", "is", email]
    		],
    		columns: [
    			"email",
    			"entityid",
    			"externalid"
    		]
    	});
    	var searchResultCount = employeeSearchObj.runPaged().count;
    	
    	if(searchResultCount > 0){
    		employeeSearchObj.run().each(function(result){
    			var empExternalid = result.getValue({
    				name: 'externalid'
    			});
    			
    			if(externalid != empExternalid){
    				record.submitFields({
    					type: record.Type.EMPLOYEE,
    					id: result.id,
    					values: {
    						externalid: externalid
    					},
    				    options: {
    				        enableSourcing: false,
    				        ignoreMandatoryFields : true
    				    }
    				});
    				
    			}
    			output['externalid'] = externalid;
    			output['employeename'] = result.getValue({
    				name: 'entityid'
    			});
    			output['email'] = result.getValue({
    				name: 'email'
    			});
    		});		
    	}
    	
    	return output;
    }
    
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
    	
    	
    };

    var getUpdatedLinesFromSalesOrder = function(lastModifiedDate) {
        var searchId = runtime.getCurrentScript().getParameter({name: 'custscript_csod_so_line_sync_src'});
        var searchObject = search.load({id: searchId});

        var error = {
            error: 'Error occurred',
            message: ''
        };

        if(lastModifiedDate === null || lastModifiedDate === undefined) {
            error.message = 'Missing parameter';
            return error;
        }

        var dataOut = [];

        searchObject.filters.push(search.createFilter({
            name: 'lastmodifieddate',
            operator: search.Operator.ONORAFTER,
            values: lastModifiedDate
        }));

        // run paginated search
        var pagedSearch = searchObject.runPaged({
            pageSize: 500
        });

        var searchResultCount = pagedSearch.count;

        // push data to dataOut array
        if(searchResultCount > 0) {
            pagedSearch.pageRanges.forEach(function(pageRange) {
                var fetchedData = pagedSearch.fetch({ index: pageRange.index });

                fetchedData.data.forEach(function(result) {
                    var tempObj = {};
                    result.columns.forEach(function(col) {
                        if(col.join) {
                            tempObj[col.join + '_' + col.name] = result.getValue({ name: col.name, join: col.join });
                        } else {
                            tempObj[col.name] = result.getValue({ name: col.name, join: col.join });
                        }
                    });

                    dataOut.push(tempObj);
                });

            });
        }

        return dataOut;

    } ;

    var getExchangeRateTable = function() {
        var output = [];
        var currencyrateSearchObj = search.create({
            type: "currencyrate",
            filters:
                [
                    ["basecurrency","anyof","1"],
                    "AND",
                    ["effectivedate","onorafter","daysago6"],
                    "AND",
                    ["formulanumeric: {transactioncurrency.id}","lessthanorequalto","26"]
                ],
            columns:
                [
                    search.createColumn({name: "basecurrency", label: "Base Currency"}),
                    search.createColumn({
                        name: "transactioncurrency",
                        sort: search.Sort.ASC,
                        label: "Transaction Currency"
                    }),
                    search.createColumn({name: "exchangerate", label: "Exchange Rate"}),
                    search.createColumn({
                        name: "effectivedate",
                        sort: search.Sort.ASC,
                        label: "Effective Date"
                    })
                ]
        });
        var searchResultCount = currencyrateSearchObj.runPaged().count;
        log.debug("currencyrateSearchObj result count",searchResultCount);
        currencyrateSearchObj.run().each(function(result){
            var tempObj = {};
            for(var i = 0; i < result.columns.length; i++) {
                tempObj[result.columns[i].name] = result.getValue(result.columns[i]);
            }

            log.debug({
                title: 'tempObj in searchResult',
                details: tempObj
            });

            if(tempObj) {
                output.push(tempObj);
            }

            return true;
        });


        return output;
    };


    exports.getSalesForceID = getSalesForceID;
    exports.setNewPPDate = setNewPPDate;
    exports.getUpdatedLinesFromSalesOrder = getUpdatedLinesFromSalesOrder;
    exports.getExchangeRateTable = getExchangeRateTable;
    exports.getEmployee = getEmployee;

    return exports;
});
