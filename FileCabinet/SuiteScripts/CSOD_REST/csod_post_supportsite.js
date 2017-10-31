define(['N/error', './Http_Service_Libraries/CSOD_POST_Services', './Http_Service_Libraries/CSOD_GET_Services'
        ,'./Http_Service_Libraries/CSOD_GET_Exchange_Rate_Service', './Http_Service_Libraries/lodash', 'N/file'],
    function (error, CSOD_POST, CSOD_GET, CSOD_EX_RATE, _, file) {

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
        };

        var processData = function(body) {
            var projects = body.workspaces;
            var clients = body.workspace_groups;
            var participants = body.users;

            var projectArr = [];
            var clientArr = [];
            var users = [];
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
                    project = projects[id];

                    var statusObj = project["status"];
                    var status = statusObj["message"];

                    // get status
                    tempObj.status = status;

                    // get clinent
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

                            var getCustomFieldValues = callMavenLink(customFieldsURL);

                        }

                    }

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
                                participants.push(participantObj);
                            }
                        }
                    }




                    // Append for output
                    responseArr.push(tempObj);
                }
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

        exports.post = _post;
        return exports;
    });
