define(['N/https', './lodash'], function (https, _) {

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
    
    var MAVENLINK_AUTH = 'bearer 6db0e0bc77ecaa427697d0845692395d822f56d057fe22ea30ec184f79b7887c';

    // parses and restructures JSON
    var mavenlinkDataProcess = function(data) {
        var output = [];

        // TODO this is hardcoded CustomFieldSet
        var WORKSPACE_CF_SETS = ["9855", "9885", "122315", "6005"];
        
        var stories = data.stories;
        var workspaces = data.workspaces;
        
        var customFieldObj = getAllCustomFields(WORKSPACE_CF_SETS);

        log.debug({
            title: 'customFieldObj',
            details: customFieldObj
        });

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

                tempObj = attachCustomFields(tempObj, customFieldObj, 'Workspace');
                
                var storyObj = getDataFromStory(prop);
                
                log.debug({
                	title: 'storyObj',
                	details: storyObj
                });

                output.push(tempObj);
            }
        }

        return output;
    };
    
    var getDataFromStory = function(workspaceId) {
    	var url = "https://api.mavenlink.com/api/v1/stories.json?all_on_account=true&workspace_id=" + 
    		workspaceId + "&page=1&per_page=200";
    	
    	var storyObj = callMavenLink(url);
    	
    	
    	log.debug({
    		title: 'StoryObj count',
    		details: storyObj.count
    	});
    	
    	return storyObj;
    	
    };

    var attachCustomFields = function(obj, custObj, rec) {
        var url = "https://api.mavenlink.com/api/v1/custom_field_values.json?subject_type=" + rec
            + "&with_subject_id=" + obj.id;

        var newObj = _.assign(obj, custObj)

        var response = callMavenLink(url);

        // log.debug({
        //     title: "Response code",
        //     details: response.code
        // });

        if(response.code == 200 || response.code == '200') {
            var body = JSON.parse(response.body);
            var customFields = body.custom_field_values;

            // log.debug({
            //     title: 'Response from MavenLink',
            //     details: customFields
            // });
            
            for(var workspaceId in customFields) {
            	// log.debug({
            	// 	title: 'In customFields ' + workspaceId,
            	// 	details: customFields[workspaceId]
            	// });
            	
            	var customField = customFields[workspaceId];

                newObj[customField['custom_field_name']] = customField['display_value'];

            }
            
            return newObj;
        }

    };

    var callMavenLink = function(url) {

        var headers = {
            Authorization: MAVENLINK_AUTH
        };

        var response = https.get({
            url: url,
            headers: headers
        });

        return response;
    };
    
    var getAllCustomFields = function(validSets) {
    	
    	var customFieldsKeys = [];
    	var output = {};
        var url = "https://api.mavenlink.com/api/v1/custom_fields.json";
    	var response = callMavenLink(url);

    	if(response.code == 200 || response.code == "200") {
    		var responseBody = JSON.parse(response.body);
            var customFieldsNum = responseBody.count;

            var newURL = url + '?per_page=' + customFieldsNum;

            var pagedResponse = callMavenLink(newURL);
            var newResponseBody = JSON.parse(pagedResponse.body);

    		var customFields = newResponseBody.custom_fields;
    		for (var i in customFields) {
    			if(validSets.indexOf(customFields[i].custom_field_set_id) > -1) {
    				customFieldsKeys.push(customFields[i].name);
    			}
    		}
    	}
    	
    	if(customFieldsKeys.length > 0) {
    		for(var i = 0; i < customFieldsKeys.length; i++) {
    			output[customFieldsKeys[i]] = "";
    		}
    	}
    	
    	log.debug({
    		title: "New Custom Fields Object",
    		details: output
    	});

    	return output;

    };

    exports.mavenlinkDataProcess = mavenlinkDataProcess;
    return exports;
});
