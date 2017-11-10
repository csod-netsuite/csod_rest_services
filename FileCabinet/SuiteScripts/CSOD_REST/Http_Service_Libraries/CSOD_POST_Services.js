define(['N/https', './lodash', 'N/runtime', './moment', 'N/email'],
    function (https, _, runtime, moment, email) {

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
    
    const logEnable = false;
    const countThreshold = 8000;
    
    const MAVENLINK_AUTH = 'bearer 6db0e0bc77ecaa427697d0845692395d822f56d057fe22ea30ec184f79b7887c';
    var dateString = runtime.getCurrentScript().getParameter({name: 'custscript_csod_ml_lastest_updated_at'});
    var processUnixTime = moment(dateString).valueOf();
    var newLatestISOTime = 0;

    // parses and restructures JSON
    var mavenlinkDataProcess = function(data) {
        var output = [];

        // TODO this is hardcoded CustomFieldSet
        var WORKSPACE_CF_SETS = ["9855", "9885", "122315", "6005"];
        
        var stories = data.stories;
        var workspaces = data.workspaces;
        
        var customFieldObj = getAllCustomFields(WORKSPACE_CF_SETS);
        
        if(logEnable) {
        	log.debug({
                title: 'customFieldObj',
                details: customFieldObj
            });
        }
        
        // call to transform stories
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

        // call to parse/transform workspaces
        if(workspaces !== undefined) {

            var users = data.users;
            var projectGroup = data.workspace_groups;

            for(var prop in workspaces) {

                if(logEnable){
                    log.debug({
                        title: "Check Workspace ID",
                        details: "ID: " + prop
                    });
                }

                // create object that will be added to output arrays
                var tempObj = {};
                tempObj["consultant_lead"] = "";
                tempObj["creator_name"] = "";
                tempObj["group_name"] = "";
                tempObj["group_id"] = "";
                

                var workspace = workspaces[prop];

                // check updated_at value and compare
                var currUpdatedAtStr = workspace['updated_at'];
                var currUpdatedAtUnix = moment(currUpdatedAtStr).valueOf();

                if(!logEnable) {
                    log.audit({
                        title: "Time Value Check " + prop,
                        details: "Workspace last modified: " + currUpdatedAtStr +
                        ", Object Unix Time: " + currUpdatedAtUnix + ", processUnixTime: " + processUnixTime
                    });
                }

                // add to output only date is equal or greater
                if(currUpdatedAtUnix >= processUnixTime) {
                	
                    if(currUpdatedAtUnix > moment(newLatestISOTime).valueOf()) {
                    	// write latest updated_at
                        newLatestISOTime = moment(currUpdatedAtUnix).format();
                    }
                    for(var workspaceProp in workspace) {

                        // skip participant_ids
                        if(workspaceProp != "participant_ids") {
                            tempObj[workspaceProp] = workspace[workspaceProp];
                        }

                        // adding consultant lead
                        if(workspaceProp == 'primary_maven_id' &&
                            workspace['primary_maven_id']) {
                            tempObj["consultant_lead"] = users[workspace[workspaceProp]]["full_name"];

                        }

                        // adding creator name
                        if(workspaceProp == 'creator_id' &&
                            workspace['creator_id'] !== undefined) {
                            tempObj["creator_name"] = users[workspace[workspaceProp]]["full_name"];
                        }

                        // workspace group name and id
                        if(workspaceProp == 'workspace_group_ids' &&
                            workspace['workspace_group_ids'].length > 0) {
                            tempObj["group_name"] = projectGroup[workspace[workspaceProp][0]]["name"];
                            tempObj["group_id"] = projectGroup[workspace[workspaceProp][0]]["id"];
                        }
                    }


                    tempObj = attachCustomFields(tempObj, customFieldObj, 'Workspace');

                    var storyObj = getDataFromStory(prop);

                    if(logEnable) {
                        log.debug({
                            title: 'tempObj',
                            details: tempObj
                        });

                        log.debug({
                            title: 'storyObj',
                            details: storyObj
                        });
                    }

                    // append data from stories/tasks
                    tempObj = _.assign(tempObj, storyObj);
                    // append latest date
                    tempObj['New_Latest_Updated_at'] = newLatestISOTime;
                    output.push(tempObj);

                }

            }
        }

        log.audit({
            title: 'Output Length Check',
            details: 'OUTPUT = ' + output.length
        });

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
            total_cost: 0,
            approved_hours: 0
        };
    	
    	if(response.code == 200 || response.code == '200') {
    		var data = [JSON.parse(response.body)];
    		var count = data[0].count;
    		
    		// check if count is bigger than 200
    		var dataSize = Math.ceil(count / 200);

    		if(!logEnable) {
                log.debug({
                    title: "dataSize in getDataFromStory",
                    details: dataSize
                });
            }

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

            	if(logEnable) {
                    log.debug({
                        title: "check stories obj in line 212",
                        details: stories
                    });
                }

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

            var totalWeight = completedMilestones.reduce(function(sum, obj) {
                return sum + (obj["weight"] || 0);
            }, 0);
            
            if(logEnable) {
            	log.audit({
                    title: "Total Weight Check",
                    details: totalWeight
                });
            }
            

            tempObj.completed_tasks_count = completedTasks.length;
            tempObj.milestone_weight_complete_percent = totalWeight;

            // get Total Time Logged by calling another URL
            var timeEntryOutput = getTotalTimeLogged(workspaceId);

            tempObj.total_time_logged = timeEntryOutput.total_hours;
            tempObj.total_cost = timeEntryOutput.total_cost_rate;
            tempObj.approved_hours = timeEntryOutput.apporved_hours;

    	}

    	if(logEnable) {
            log.debug({
                title: "check tempObj in getDataFromStory",
                details: tempObj
            });
        }
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

            var output = {
                    total_hours: 0,
                    total_cost_rate: 0,
                    apporved_hours: 0
                };
            
            // Stop and return
            // Data is too large to process
            // Send Email Notification
            if(count > countThreshold) {
                var emailBody = "Workspace ID : " + workspaceId +
                    " has more than " + countThreshold + " time entries. <br/>" +
                    "It is skipped for the process to calculate total hours and costs.";
                email.send({
                    author: 117473,
                    recipients: ['cyi@csod.com','wshawhughes@csod.com'],
                    subject: "Workspace with Large Time Entries",
                    body: emailBody
                });
            	return output;
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
                    if(entry['approved'] == true) {
                    	obj.approved_hours += entry['time_in_minutes'];
                    }
                    return obj;
                }, {
                    total_minutes: 0,
                    total_cost_cents: 0,
                    approved_hours: 0
                });

                output.total_hours = +(myObj.total_minutes/60).toFixed(2);
                output.apporved_hours = +(myObj.approved_hours/60).toFixed(2);
                output.total_cost_rate = +(myObj.total_cost_cents/100).toFixed(2);
            }
            
            if(logEnable) {
                log.debug({
                    title: 'getTotalTimeLogged func, output check',
                    details: output
                });
            }

            return output;
        }
    };

    var attachCustomFields = function(obj, custObj, rec) {
        var url = "https://api.mavenlink.com/api/v1/custom_field_values.json?subject_type=" + rec
            + "&with_subject_id=" + obj.id + "&per_page=200";

        var newObj = _.assign(obj, custObj);

        var response = callMavenLink(url);
        if(logEnable) {
            log.debug({
                title: "Response code in attachCustomFields",
                details: response.code
            });
        }

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

        /**
         *
         * @param validSets
         * @returns {{}}
         */
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
    	if(logEnable) {
            log.debug({
                title: "New Custom Fields Object",
                details: output
            });
        }

    	return output;

    };

    exports.mavenlinkDataProcess = mavenlinkDataProcess;
    return exports;
});
