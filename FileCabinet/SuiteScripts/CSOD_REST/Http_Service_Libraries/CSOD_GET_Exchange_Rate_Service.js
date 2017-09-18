define(['N/search'], function (search) {

    /**
     * Service Used to search exchange rate
     *
     * @exports [] array of custom object
     *
     * @copyright 2017 Cornerstone OnDemand
     * @author Chan - cyi@csod.com
     *
     * @NApiVersion 2.x
     * @NModuleScope SameAccount
     */
    var exports = {};

    var getSymbolId = function(symbol) {
        var currencySearchObj = search.create({
            type: "currency",
            filters: [
                ["symbol","is",symbol]
            ],
            columns: [
                "internalid"
            ]
        });

        var symbolId;

        currencySearchObj.run().each(function(result){
            // .run().each has a limit of 4,000 results
            symbolId = result.getValue({name: 'internalid'});
        });

        if(symbolId === undefined) {
            symbolId = 'Not Found';
        }

        return symbolId;
    };

    var getLatestExchangeRates = function(symbol) {
        var currencySearchObj = search.create({
            type: "currency",
            filters: [
                ["symbol","is",symbol]
            ],
            columns: [
                search.createColumn({
                    name: "name",
                    sort: search.Sort.ASC
                }),
                "symbol",
                "exchangerate"
            ]
        });

        var output = {};

        currencySearchObj.run().each(function(result){
            // .run().each has a limit of 4,000 results
            output['name'] = result.getValue({name: 'name'});
            output['rate'] = 1.0 / parseFloat(result.getValue({name: 'exchangerate'}));
        });
        return output;
    };

    var getExchangeRateWithDates = function(symbol, startDate, endDate) {

        var output = [];

        var symbolId = getSymbolId(symbol);
        if(symbolId === 'Not Found') {
            output['success'] = false;
            output['message'] = 'Currency Symbol '+ symbol +' is not found';
        } else {
            var currencyrateSearchObj = search.create({
                type: "currencyrate",
                filters: [
                    ["basecurrency","anyof","1"],
                    "AND",
                    ["transactioncurrency","anyof",symbolId]
                ],
                columns: [
                    search.createColumn({
                        name: "basecurrency",
                        sort: search.Sort.ASC
                    }),
                    "transactioncurrency",
                    "exchangerate",
                    "effectivedate"
                ]
            });
            if(endDate && startDate) {
                var filterToAdd = search.createFilter({
                    name: 'effectivedate',
                    operator: search.Operator.WITHIN,
                    values: [startDate, endDate]
                });

                currencyrateSearchObj.filters.push(filterToAdd);
            }
            if(startDate && !endDate) {
                var filterToAdd2 = search.createFilter({
                    name: 'effectivedate',
                    operator: search.Operator.ON,
                    values: startDate
                });

                currencyrateSearchObj.filters.push(filterToAdd2);
            }

            var searchResultCount = currencyrateSearchObj.runPaged().count;
            currencyrateSearchObj.run().each(function(result){
                // .run().each has a limit of 4,000 results
                var tempObj = {};
                tempObj['currency'] = symbol;
                tempObj['rate'] = 1 / parseFloat(result.getValue({ name: 'exchangerate' }));
                tempObj['effectivedate'] = result.getValue({ name: 'effectivedate' });

                output.push(tempObj);

                return true;
            });

            return output;
        }

    };

    var getExchangeRate = function(symbol, startDate, endDate) {
        var output;
        if(!startDate && !endDate){
            output = getLatestExchangeRates(symbol);
            if(output.rate === undefined) {
                output = { success: false, message: 'Could not find rate for ' + symbol};
            }
        } else {
            output = getExchangeRateWithDates(symbol, startDate, endDate)
        }

        return output;
    };

    exports.getExchangeRate = getExchangeRate;

    return exports;
});
