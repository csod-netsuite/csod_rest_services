define(['N/https'],
    function (https) {

        /**
         * Module Description...
         *
         * @exports JSON structured data
         *
         * @copyright 2017 Cornerstone OnDemand
         * @author Chan cyi@csod.com
         *
         * @NApiVersion 2.x
         * @NModuleScope Public
         * @NScriptType RESTlet
         */
        var exports = {};

        const logEnable = true;
        const MAVENLINK_AUTH = 'bearer 6db0e0bc77ecaa427697d0845692395d822f56d057fe22ea30ec184f79b7887c';
        const customFieldIds = [23665, 23675];

        var _post = function(requestBody) {
            if(logEnable) {
                log.debug({
                    title: 'Data In',
                    details: requestBody
                });
            }
            var output = processData(requestBody);

            return output;

        };

        var processData = function(body) {
            var projects = body.workspaces;
            var clients = body.workspace_groups;
            var participants = body.users;

            var responseArr = [];
            if(projects) {
                for (id in projects) {

                    // temporary object will be appended to responseArr
                    var tempObj = {
                        projectId: "",
                        status: "",
                        salesforceId: "",
                        salesforceId18: "",
                        client: "",
                        users: []
                    };
                    // get project id
                    tempObj.projectId = id;
                    var project = projects[id];

                    var statusObj = project["status"];
                    var status = statusObj["message"];

                    // get status
                    tempObj.status = status;

                    // get client
                    var clientArr = project["workspace_group_ids"];


                    if(clientArr.length > 0) {
                        var clientId = clientArr[0];
                        var workspace_group = clients[clientId];

                        if(workspace_group !== undefined) {
                            tempObj.client = workspace_group["name"];

                            // TODO get Custom Field for SalesForce Ids
                            var customFieldsURL = "https://api.mavenlink.com/api/v1/custom_field_values.json?"+
                                "subject_type=Workspace_group&"+
                                "with_subject_id="+ clientId +"&per_page=200";

                            var response = callMavenLink(customFieldsURL);
                            if(logEnable){
                                log.debug({
                                    title: "Response from Mavenlink",
                                    details: response
                                })
                            };

                            if(response.code === 200 || response.code === "200") {
                                var salesforceIDObj = extractSFIDs(JSON.parse(response.body));

                                if(salesforceIDObj.salesforceId !== undefined ||
                                    salesforceIDObj.salesforceId !== '') {

                                    tempObj.salesforceId = salesforceIDObj.salesforceId;
                                    tempObj.salesforceId18 = salesforceIDObj.salesforceId18;

                                    log.debug({
                                        title: "salesforceID Obj",
                                        details: salesforceIDObj
                                    });
                                }

                            } else {
                                log.error({
                                    title: "Mavenlink Response for Getting Custom Field Values",
                                    details: "Response Code: " + response.code
                                })
                            }
                        }

                    }  // END Getting Client and SalesForce ID

                    // get users
                    var users = project["participant_ids"];
                    if(users.length > 0) {
                        for(var i = 0; i < users.length; i++) {
                            var participant = participants[users[i]];
                            if(participant !== undefined) {
                                var participantObj = {
                                    fullName: '',
                                    email: ''
                                };
                                participantObj.fullName = participant["full_name"];
                                participantObj.email = participant["email_address"];
                                tempObj.users.push(participantObj);
                            }
                        }
                    }

                    // Append for output
                    responseArr.push(tempObj);
                }
            }
            return responseArr;
        };

        var extractSFIDs = function(body) {
            var custonFieldValues = body.custom_field_values;
            var outputObj = {
                salesforceId: "",
                salesforceId18: ""
            };

            if(logEnable) {
                log.debug({
                    title: "Custom Field Values",
                    details: custonFieldValues
                });
            };

            for (id in custonFieldValues) {
                var customFieldValue = custonFieldValues[id];
                var customFieldId = parseInt(customFieldValue["custom_field_id"]);
                if(customFieldIds.indexOf(customFieldId) > -1) {
                    if(customFieldId == 23665) {
                        outputObj.salesforceId = customFieldValue["value"];

                    } else if(customFieldId == 23675) {
                        outputObj.salesforceId18 = customFieldValue["value"];

                    }
                }
            };

            if(logEnable) {
                log.debug({
                   title: "SalesForce ID Object",
                   details: outputObj
                });
            }

            return outputObj;
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

        exports.post = _post;
        return exports;
    });
