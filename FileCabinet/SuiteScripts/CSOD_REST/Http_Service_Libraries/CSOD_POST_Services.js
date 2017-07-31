define([], function () {

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

        for(var prop in stories) {
            var tempObj = {};
            var story = stories[prop];

            for(var storyProp in story) {
                tempObj[storyProp] = story[storyProp];
            }

            output.push(tempObj);
        }


        return output;
    };

    exports.mavenlinkDataProcess = mavenlinkDataProcess;
    return exports;
});
