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

            var creator = data.users;
            var projectGroup = data.workspace_groups;

            for(var prop in workspaces) {

                log.debug({
                   title: "Check Workspace ID",
                   details: "ID: " + prop
                });

                var tempObj = {};
                tempObj["creator_name"] = "";
                tempObj["group_name"] = "";

                var workspace = workspaces[prop];

                for(var workspaceProp in workspace) {
                    tempObj[workspaceProp] = workspace[workspaceProp];
                    if(workspaceProp == 'creator_id' &&
                        creator['creator_id'] !== undefined) {
                        tempObj["creator_name"] = creator[workspace[workspaceProp]]["full_name"];
                    }
                    if(workspaceProp == 'workspace_group_ids' &&
                        projectGroup['workspace_group_ids'] !== undefined) {
                        tempObj["group_name"] = projectGroup[workspace[workspaceProp][0]]["name"];
                    }
                }

                tempObj = attachCustomFields(tempObj, customFieldObj, 'Workspace');
                
                var storyObj = getDataFromStory(prop);

                log.debug({
                    title: 'tempObj',
                    details: tempObj
                });

                log.debug({
                	title: 'storyObj',
                	details: storyObj
                });
                tempObj = _.assign(tempObj, storyObj);
                output.push(tempObj);
            }
        }

        return output;
    };

    /**
     * Gets rollup data for Stories and Time Entries
     * @param workspaceId
     * @returns {{total_tasks_count: number, completed_tasks_count: number, milestone_weight_complete_percent: number, total_time_logged: number, total_cost: number}}
     */
    var getDataFromStory = function(workspaceId) {
    	var page = 1;
    	var url = "https://api.mavenlink.com/api/v1/stories.json?all_on_account=true&workspace_id=" + 
    		workspaceId + "&page=" + page + "&per_page=200";
    	
    	var response = callMavenLink(url);

    	// object to return
    	var tempObj = {
    	    total_tasks_count: 0,
            completed_tasks_count: 0,
            milestone_weight_complete_percent: 0,
            total_time_logged: 0,
            total_cost: 0
        };
    	
    	if(response.code == 200 || response.code == '200') {
    		var data = [JSON.parse(response.body)];
    		var count = data[0].count;
    		
    		// check if count is bigger than 200
    		var dataSize = Math.ceil(count / 200);

            log.debug({
                title: "dataSize in getDataFromStory",
                details: dataSize
            });

    		if(dataSize > 1) {
    			
    			for(page = 2; page <= dataSize; page++) {

    				url = "https://api.mavenlink.com/api/v1/stories.json?all_on_account=true&workspace_id=" + 
    	    		workspaceId + "&page=" + page + "&per_page=200";
    				response = callMavenLink(url);
    				var parsedResponse = JSON.parse(response.body);
    				data.push(parsedResponse);
    				count += parsedResponse.count;
    			}
    			
    		}
    		
    		// setting total count
    		tempObj.total_tasks_count = count;

    		//TODO sort and count milestone and task (story_type)
            var milestoneCount = 0;
            var taskCount = 0;
            var milestones = [];
            var storiesArr = [];
            
            for(var x = 0; x < data.length; x++) {
            	
            	var stories = data[x].stories;

            	log.debug({
                    title: "check stories obj in line 162",
                    details: stories
                });

            	for(id in stories) {
                    var story = stories[id];
                    storiesArr.push(story);

                    for(key in story){
                        if(key == 'story_type') {
                            if(story[key] == 'milestone') {
                                milestoneCount += 1;
                            } else {
                                taskCount += 1;
                            }
                        }
                    }
                }
            }

            var completedTasks = storiesArr.filter(function(story) {
               return story['state'] == 'completed';
            });

            var completedMilestones = completedTasks.filter(function(story) {
               return story['story_type'] == 'milestone';
            });

            if(completedMilestones.length > 0 && milestoneCount > 0) {
                var myLove = +(completedMilestones.length/milestoneCount).toFixed(2);
            }


            tempObj.completed_tasks_count = completedTasks.length;
            tempObj.milestone_weight_complete_percent = myLove;

            // get Total Time Logged by calling another URL
            var timeEntryOutput = getTotalTimeLogged(workspaceId);

            tempObj.total_time_logged = timeEntryOutput.total_hours;
            tempObj.total_cost = timeEntryOutput.total_cost_rate;

    	}

    	log.debug({
            title: "check tempObj in getDataFromStory",
            details: tempObj
        })
    	return tempObj;

    };

    /**
     * Calling Time Entries endpoint to get Total Time Logged
     * @param workspaceId
     * @returns {{total_hours: number, total_cost_rate: number}}
     */
    var getTotalTimeLogged = function(workspaceId) {
        var page = 1;
        var url = "https://api.mavenlink.com/api/v1/time_entries.json?workspace_id="
            + workspaceId +"&page=" + page + "&per_page=200";

        var response = callMavenLink(url);

        if(response.code === 200 || response.code === "200") {
            var data = [JSON.parse(response.body)];
            var count = data[0].count;


            // Stop and return
            // Data is too large to process
            if(count > 2000) {
                return {
                    total_hours: 0,
                    total_cost_rate: 0
                }
            }

            var dataSize = +Math.ceil(count/200);

            if(dataSize > 1) {
                for(page = 2; page <= dataSize; page++) {
                    url = "https://api.mavenlink.com/api/v1/time_entries.json?workspace_id="
                        + workspaceId +"&page=" + page + "&per_page=200";

                    response = callMavenLink(url);

                    if(response.code === 200 || response.code === '200'){
                        data.push(JSON.parse(response.body));
                    } else {
                        log.error({
                            title: 'Error during ' + url,
                            details: response
                        });
                    }

                }
            }

            var entries = [];
            var output = {
                total_hours: 0,
                total_cost_rate: 0
            };

            // push all entries to entries array
            for(var i = 0; i < data.length; i++) {
                var objs = data[i];
                var entryObj = objs['time_entries'];

                for(id in entryObj) {
                    entries.push(entryObj[id]);
                }
            }


            if(entries.length > 0) {
                var myObj = _.reduce(entries, function(obj, entry) {
                    obj.total_minutes += entry['time_in_minutes'];
                    obj.total_cost_cents += entry['cost_rate_in_cents'];
                    return obj;
                }, {
                    total_minutes: 0,
                    total_cost_cents: 0
                });

                output.total_hours = +(myObj.total_minutes/60).toFixed(2);
                output.total_cost_rate = +(myObj.total_cost_cents/100).toFixed(2);
            }

            log.debug({
                title: 'getTotalTimeLogged func, output check',
                details: output
            })
            return output;
        }
    };

    var attachCustomFields = function(obj, custObj, rec) {
        var url = "https://api.mavenlink.com/api/v1/custom_field_values.json?subject_type=" + rec
            + "&with_subject_id=" + obj.id;

        var newObj = _.assign(obj, custObj);

        var response = callMavenLink(url);

        log.debug({
            title: "Response code in attachCustomFields",
            details: response.code
        });

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

        try {
            var response = https.get({
                url: url,
                headers: headers
            });
        } catch(e) {
            response = e.toString();
        }

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
