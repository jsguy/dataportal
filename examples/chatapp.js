var dataportalServer = require('../lib/dataportal.server.js'),
	jdp = require('jsondiffpatch'),
	chatTopic = "chatTopic",
	chats = {};

dataportalServer({
	createResponse: function(response) {
		//	Make sure it is a topic we care about
		if(! (response && response.topic && response.topic == chatTopic)) {
			return response;
		}

		//	You could do something here with the chat data
		console.log('respond', JSON.stringify(response.diff.chats));

		return response;
	},
	handler: {
		log: function(severity, line) {
			//	Skip info
			return severity !== "info"? console.log(severity, line): null;
		}
	}
});