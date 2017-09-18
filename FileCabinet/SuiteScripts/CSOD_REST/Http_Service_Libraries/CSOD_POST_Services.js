define(['N/https'], function (https) {

    /**
     * Module Description...
     *
     * @exports Javascript Arrays
     *
     * @copyright 2017 Cornerstone OnDemand
     * @author Chan cyi@csod.com
     *
     * @NApiVersion 2.x
     * @NModuleScope SameAccount
     */
    var exports = {};

    // parses and restructures JSON
    var mavenlinkDataProcess = function(data) {
        var output = [];

        var stories = data.stories;
        var workspaces = data.workspaces;

        // the call is to transform stories
        if(stories !== undefined) {
            for(var prop in stories) {
                var tempObj = {};
                var story = stories[prop];

                for(var storyProp in story) {
                    tempObj[storyProp] = story[storyProp];
                }

                output.push(tempObj);
            }
        }

        // the call is to parse workspaces
        if(workspaces !== undefined) {
            for(var prop in workspaces) {
                var tempObj = {};
                var workspace = workspaces[prop];

                for(var workspaceProp in workspace) {
                    tempObj[workspaceProp] = workspace[workspaceProp];
                }

                attachCustomFields(tempObj, 'Workspace');

                output.push(tempObj);
            }
        }

        return output;
    };

    var attachCustomFields = function(obj, rec) {
        var url = "https://api.mavenlink.com/api/v1/custom_field_values.json?subject_type=" + rec
            + "&with_subject_id=" + obj.id;
        var headers = {
            Authorization: 'bearer 3e5d1d56e12c84391d8e3e01aca89fec057d122870d92e394a2dc13ad29a1e69'
        };
        var response = https.get({
            url: url,
            headers: headers
        });

        log.debug({
            title: "Response Type",
            details: response
        });

        if(response.code == 200 || response.code == '200') {
            var body = response.body;
            var customFields = body.custom_field_values;

            log.debug({
                title: 'Response from MavenLink',
                details: customFields
            });
        }

    };

    exports.mavenlinkDataProcess = mavenlinkDataProcess;
    return exports;
});
