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

        var output = {
            salesForceId: '',
            salesForceName: ''
        };

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

    	var output = {
            externalid: '',
            employeename: '',
            email: ''
        };

    	var preOutput = checkExternaldId(externalid, email);

    	// externalId was found stop process and return
    	if(preOutput.email) {
    		return preOutput;
    	}

    	var employeeSearchObj = search.create({
    		type: "employee",
    		filters: [
                ["isinactive","is","F"],
                "AND",
                ["email", "is", email]
    		],
    		columns: [
                search.createColumn({name: "email", label: "Email"}),
                search.createColumn({name: "entityid", label: "Name"}),
                search.createColumn({name: "externalid", label: "External ID"}),
                search.createColumn({name: "issalesrep", label: "Sales Rep"}),
                search.createColumn({
                    name: "datecreated",
                    sort: search.Sort.DESC,
                    label: "Date Created"
                })
            ]
    	});
    	var searchResultCount = employeeSearchObj.runPaged().count;

    	if(searchResultCount > 0){
    		employeeSearchObj.run().each(function(result) {

    		    var updateRecord = false;

    			var empExternalid = result.getValue({
    				name: 'externalid'
    			});

    			var empRec = record.load({
                    type: record.Type.EMPLOYEE,
                    id: result.id
                });

    			if(!result.getValue({ name: 'issalesrep' })) {
                    empRec.setValue({
                        fieldId: 'issalesrep',
                        value: true
                    });

                    updateRecord = true;
                }

    			if(externalid != empExternalid){
                    empRec.setValue({
                        fieldId: 'externalid',
                        value: externalid
                    });

                    updateRecord = true;
    			}

    			if(updateRecord) {
    			    empRec.save();
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
    };

    var getTranId = function(internalId) {
        var tranId = search.lookupFields({
            type: search.Type.SALES_ORDER,
            id: internalId,
            columns: 'tranid'
        }).tranid;

        return {
        	tranId: tranId,
        	internalId: internalId
        }
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


    var getSalesOrderToUpdate = function() {

    	var output = [];

    	var salesorderSearchObj = search.create({
    		   type: "salesorder",
    		   filters:
    		   [
    		      ["type","anyof","SalesOrd"],
    		      "AND",
    		      ["mainline","is","T"],
    		      "AND",
    		      ["custbody_csod_created_by_webservice","is","F"],
    		      "AND",
    		      ["trandate","onorafter","7/1/2018"],
    		      "AND",
    		      ["custbody_csod_salesforce_is_updated","is","F"],
    		      "AND",
    		      [["custbody_salesforce_18_opp_id","isnotempty",""],"OR",["custbody7","isnotempty",""]],
    		      "AND",
    		      ["custbody7","isnot","n/a"]
    		   ],
    		   columns:
    		   [
    		      search.createColumn({name: "transactionnumber", label: "Transaction Number"}),
    		      search.createColumn({name: "internalid", label: "Internal ID"}),
    		      search.createColumn({name: "custbody_csod_created_by_webservice", label: "Created by Web Services"}),
    		      search.createColumn({name: "custbody_salesforce_18_opp_id", label: "Salesforce 18-Ch. Opportunity ID"}),
    		      search.createColumn({name: "custbody7", label: "Salesforce Incremental Opportunity ID (2)"})
    		   ]
    		});
    		var searchResultCount = salesorderSearchObj.runPaged().count;
    		log.debug("salesorderSearchObj result count",searchResultCount);
    		salesorderSearchObj.run().each(function(result){
    		   // .run().each has a limit of 4,000 results

           var tempObj = {};
           tempObj.SF_Opp_Id = result.getValue({name: "custbody7"});
           tempObj.NS_Tran_Id = result.getValue({name: "transactionnumber"});
           tempObj.NS_Internal_Id = result.getValue({name: "internalid"});

           output.push(tempObj);

    		   return true;
    		});

        return output;
    }


    /**
     * UTILS
     */

    var checkExternaldId = function(externalId, email) {
    	var employeeSearchObj = search.create({
    		type: "employee",
    		filters: [
                ["externalid", "is", externalId]
    		],
    		columns: [
                search.createColumn({name: "email", label: "Email"}),
                search.createColumn({name: "entityid", label: "Name"}),
                search.createColumn({name: "externalid", label: "External ID"}),
                search.createColumn({name: "issalesrep", label: "Sales Rep"}),

            ]
    	});
    	var searchResultCount = employeeSearchObj.runPaged().count;
        var output = {
            externalid: '',
            employeename: '',
            email: ''
        };


        if(searchResultCount > 0) {
    		employeeSearchObj.run().each(function(result){

				log.audit("External ID Detected", "Employee ID = " + result.id);

				if(!result.getValue({name: 'issalesrep'})) {
					record.submitFields({
						type: record.Type.EMPLOYEE,
						id: result.id,
						values: {
							issalesrep: true
						}
					});
				}

				if(!result.getValue({name: 'email'})) {
					record.submitFields({
						type: record.Type.EMPLOYEE,
						id: result.id,
						values: {
							email: email
						}
					});
				}

				output['externalid'] = result.getValue({
					name: 'externalid'
				});
    			output['employeename'] = result.getValue({
    				name: 'entityid'
    			});
    			output['email'] = email;

    		});
    	}

    	return output;
    }

    exports.getSalesForceID = getSalesForceID;
    exports.setNewPPDate = setNewPPDate;
    exports.getUpdatedLinesFromSalesOrder = getUpdatedLinesFromSalesOrder;
    exports.getExchangeRateTable = getExchangeRateTable;
    exports.getEmployee = getEmployee;
    exports.getTranId = getTranId;
    exports.getSalesOrderToUpdate = getSalesOrderToUpdate;

    return exports;
});
