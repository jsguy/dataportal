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
	args.port = args.port || 32827; //	"datap" when typed on a keypad
	args.handler = args.handler || {};
	args.handler.prefix = args.handler.prefix || "/dataPortal";
	args.handler.log = args.handler.log || function(severity, line) {
		return console.log(severity, line);
	};
	args.server = args.server || {};
	args.server.sockjs_url = args.server.sockjs_url || "http://cdn.jsdelivr.net/sockjs/1.1.1/sockjs.min.js";

	var dataPortal = sockjs.createServer(args.server),
		subscriptions = {},
		connections = {},

		//	Create a response.
		//	TODO: define a standard for this - also we probably shouldn't trust the data!.
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
		    return response;
		},

		//	Check if a particular ID already has a subscription
		hasSubscription = function(topic, id){
			var hasSub = false;
			if(subscriptions[topic]) {
				for(var i = 0; i < subscriptions[topic].length; i += 1) {
					if(subscriptions[topic][i] === id) {
						hasSub = true;
						break;
					}
				}
			}
			return hasSub;
		},

		//	Remove all subscriptions for a particular connection id
		removeSubscriptions = function(id){
			for(var topic in subscriptions) {if(subscriptions.hasOwnProperty(topic)) {
				for(var i = 0; i < subscriptions[topic].length; i += 1) {
					if(subscriptions[topic][i] === id) {
						subscriptions[topic][i] = null;
					}
				}
			}}
		},

		//	Subscribe a connection id to a topic
		subscribe = function(topic, id){
			subscriptions[topic] = subscriptions[topic] || [];
			if(!hasSubscription(topic, id)){
				subscriptions[topic].push(id);
			}
		},

		//	Send notifications to subscribers
		publish = function (topic, message, cId) {
			for (var key in subscriptions) {
				for(var j = 0; j < subscriptions[key].length; j += 1) {
					//	Only send to connection that didn't publish.
					if(cId !== subscriptions[key][j] && connections[subscriptions[key][j]]) {
					//if(connections[subscriptions[key][j]]) {
						//console.log('publish', subscriptions[key][j]);
						sendMessage(connections[subscriptions[key][j]], createResponse("diff", topic, message));
					}
				}
			}
		},

		//	Sends a message to a connection
		sendMessage = function(connection, message){
			if(connection){
				connection.write(JSON.stringify(message));
			} else {
				args.handler.log("error", "Could not send message to connection", connection);
			}
		};

	//	Hack to remove dead clients, runs once a minute
	//	ref: https://github.com/sockjs/sockjs-node/issues/127
	setInterval(function() {
		var list = Object.keys(connections);
		if(list && list.length > 0) {
			list.forEach(function(id){
				if(connections[id]) {
					if (connections[id].readyState === 3) {
						connections[id].close();
						removeSubscriptions(id);
						delete connections[id];
					}
				}
			});
		}
	}, 60 * 1000);


	//	Monitor connections
	dataPortal.on('connection', function(connection) {
		connections[connection.id] = connection;

		var cId = connection.id;

		//	Check our message types
	    connection.on('data', function(message) {
	    	var result = JSON.parse(message);
	    	//	Check the type and act accordingly
	    	//	Note: the connection is responsible for pushing the diff for an object.
	    	if(result.type == "subscribe") {
	    		subscribe(result.topic, cId);
	    	} else if(result.type == "publish") {
	    		publish(result.topic, result.message, cId);
	    	} else  if(result.type == "publish") {
		    	//	Create a diff response.
		        var response = createResponse("diff", result.topic, {
		        	diff: result.diff,
		        	hash: result.hash
		        });

				Object.keys(connections).forEach(function(id){
					if(connections[id]) {
						sendMessage(connections[id], response);
					}
				});
			} else {
	    		args.handler.log("warn", "Unknown data type", result.type);
	    	}
	    });

	    connection.on('close', function() {
	    	removeSubscriptions(cId);
	    	connections[cId].close();
	    	delete connections[cId];
	    	args.handler.log("info", "Disconnected", cId);
	    });

		//	Allow app to handle onConnect
	    if(args.onConnect) {
			args.onConnect(connections[cId]);
	    }
	});

	var server = http.createServer();
	dataPortal.installHandlers(server, args.handler);

	server.listen(args.port, '0.0.0.0');

	return {
		publish: publish,
		createResponse: createResponse,
		hasSubscription: hasSubscription,
		sendMessage: sendMessage
	};
};