/*
	Sockjs server that can:

	* Syncronise object accross various connections using diffs
	* Ability to call methods on the backend
	* Pub/Sub for changes, so we can create adaptors for projects such as knockout.js models, etc...

*/
var http = require('http'),
	sockjs = require('sockjs');

module.exports = function(args){
	args = args || {};
	args.port = args.port || 9999;
	args.handler = args.handler || {};
	args.handler.prefix = args.handler.prefix || "/dataPortal";
	args.handler.log = args.handler.log || function(severity, line) {
		return console.log(severity, line);
	};
	args.server = args.server || {};
	args.server.sockjs_url = args.server.sockjs_url || "http://cdn.jsdelivr.net/sockjs/1.0.3/sockjs.min.js";

	var dataPortal = sockjs.createServer(args.server),
		subscriptions = {},
		clients = [],

		//	Create a response.
		//	TODO: define a standard for this - also we probably shouldn't trust the clients!.
		createResponse = function(type, topic, data){
			var response = {
				type: type,
				topic: topic
			};
			if(type == "diff") {
		        response.diff = data.diff;
		        response.hash = data.hash;
		    } else if(type == "data") {
				response.data = data.data;
		        response.hash = data.hash;
		    }
		    if(args.createResponse) {
		    	response = args.createResponse(response);
		    }
		    return JSON.stringify(response);
		},

		hasSubscription = function(topic, index){
			var hasSub = false;
			if(subscriptions[topic]) {
				for(var i = 0; i < subscriptions[topic].length; i += 1) {
					if(subscriptions[topic][i] === index) {
						hasSub = true;
					}
				}
			}
			return hasSub;
		},

		//	Subscribe a client index to a topic
		subscribe = function(topic, index){
			subscriptions[topic] = subscriptions[topic] || [];
			if(!hasSubscription(topic, index)){
				subscriptions[topic].push(index);
			}
		},

		//	Send notifications to subscribers
		publish = function (topic, message, fromClientIndex) {
			for (var key in subscriptions) {
				for(var j = 0; j < subscriptions[key].length; j += 1) {
					//	Only send to clients that didn't publish.
					if(fromClientIndex !== j) {
						sendMessage(clients[subscriptions[key][j]], createResponse("diff", topic, message));
					}
				}
			}
		},

		//	Sens a message to a client
		sendMessage = function(client, message){
			if(client && client.connection){
				client.connection.write(message);
			} else {
				args.handler.log("error", "Could not send message to client", client);
			}
		};

	//	Monitor connections
	dataPortal.on('connection', function(connection) {
		clients.push({
			connection: connection
		});

		var index = clients.length - 1;

		//	Check our message types
	    connection.on('data', function(message) {
	    	var result = JSON.parse(message);
	    	//	Check the type and act accordingly
	    	//	Note: the client is responsible for pushing the diff for an object.
	    	if(result.type == "subscribe") {
	    		subscribe(result.topic, index);
	    	} else if(result.type == "publish") {
	    		publish(result.topic, result.message, index);
	    	} else {
		    	//	Create a response.
		        var response = createResponse("diff", result.topic, {
		        	diff: result.diff,
		        	hash: result.hash
		        });

		        //	Broadcast to all clients
		        for(var i = 0; i < clients.length; i += 1) {
		        	sendMessage(clients[i], response);
		        }
			}
	    });

	    connection.on('close', function() {
	    	//	TODO: Need a better way to remove a client
	    	//	- subscriptions, etc...
	    	//clients.splice(index,1);
	    	args.handler.log("info", "Disconnect client", index);
	    });
	});

	var server = http.createServer();
	dataPortal.installHandlers(server, args.handler);

	server.listen(args.port, '0.0.0.0');
};