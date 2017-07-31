define(['N/error', './Http_Service_Libraries/CSOD_POST_Services'], function (error, CSOD_POST) {

    /**
     * Module Description...
     *
     * @exports JSON structured data
     *
     * @copyright 2017 Cornerstone OnDemand
     * @author Chan cyi@csod.com
     *
     * @NApiVersion 2.x
     * @NModuleScope SameAccount
     * @NScriptType RESTlet
     */
    var exports = {};

    // Action reference table
    const ACTIONS = {
        MAVENLINK : '1'
    }

    function _get(context) {
        if(!context.hasOwnProperty('action')) {
            return error.create({
                name: 'MISSING_REQ_ARG',
                message: 'Missing a required argument'
            });
        }

        var output = {};
        // route to different method

    }

    function _post(requestBody) {

        var response = {};

        log.debug({
            title: 'resquestBody',
            details: requestBody
        });

        // Routing to different services
        response = CSOD_POST.mavenlinkDataProcess(requestBody);

        log.debug({
            title: 'response',
            details: response
        });

        return response;
    }

    exports.get = _get;
    exports.post = _post;
    return exports;
});
