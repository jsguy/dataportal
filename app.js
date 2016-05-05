/*
	Sockjs server that can:

	* Syncronise object accross various connections using diffs
	* Publish the hash of the object so the client knows if it needs to update/merge
	* Ability to call methods on the backend
	* Pub/Sub for changes, so we can create adaptors for projects such as knockout.js models, etc...

*/
var http = require('http'),
	sockjs = require('sockjs'),
	//jsondiffpatch = require('jsondiffpatch'),
	//	Testing hash
	hash = function(obj) {
	    var string = JSON.stringify(obj),
	        hash = 0,
	        i;
	    for (i = 0; i < string.length; i+=1) {
	        hash = (((hash << 5) - hash) + string.charCodeAt(i)) & 0xFFFFFFFF;
	    }

	    return hash;
	},
	dataPortal = sockjs.createServer({
		sockjs_url: 'http://cdn.jsdelivr.net/sockjs/1.0.3/sockjs.min.js' 
	}),
	subscriptions = {},
	clients = [],
	testData = {a:"1", b:"2"},

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
	publish = function (topic, message) {
		for (var key in subscriptions) {
			for(var j = 0; j < subscriptions[key].length; j += 1) {
				sendMessage(clients[subscriptions[key][j]], createResponse("diff", topic, message));
			}
		}
	},

	//	Sens a message to a client
	sendMessage = function(client, message){
		if(client && client.connection){
			client.connection.write(message);
		} else {
			console.error("ERROR - could not send message", client);
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
    		publish(result.topic, result.message);
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
    	console.log('disconnect', index);
    });
});

var server = http.createServer();
dataPortal.installHandlers(server, {prefix:'/dataPortal'});
server.listen(9999, '0.0.0.0');