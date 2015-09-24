/*
	Sockjs server that can:

	* Syncronise object accross various connections using diffs
	* Publish the hash of the object so the client knows if it needs to update/merge
	* Ability to call methods on the backend
	* Pub/Sub for changes, so we can create adaptors for projects such as knockout.js models, etc...

	NOTE: You might be asking why we're not using DDP (Meteor), well, we would always be 1 step behind - and the reality is: we don't actually want to maintain an alternative to meteor for DDP, as people might actually start using it for that, which is outside the scope of what we want to do. Also, the available npm/ddp.js and npm/ddp-server libraries don't seem to be trivial to get to work in various older browsers - we'd like to at least support what sockjs supports.
*/
var http = require('http'),
	sockjs = require('sockjs'),
	jsondiffpatch = require('jsondiffpatch'),
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
	//	TODO: define a standard for this - also don't trust the clients!.
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
		console.log("subscribe", topic);
		subscriptions[topic] = subscriptions[topic] || [];
		if(!hasSubscription(topic, index)){
			subscriptions[topic].push(index);
		} else {
			console.log("Didn't subscribe", topic, index);
		}
	},

	//	Send notifications to subscribers
	publish = function (topic, message) {
		console.log("publish", topic, message);
		for (var key in subscriptions) {
			console.log(key);
			for(var j = 0; j < subscriptions[key].length; j += 1) {
				console.log("found client index", subscriptions[key][j]);
				sendMessage(clients[subscriptions[key][j]], createResponse("diff", topic, message));
			}
		}
	},

	//	Sens a message to a client
	sendMessage = function(client, message){
		if(client && client.connection){
			client.connection.write(message);
		} else {
			console.log("ERROR - could not send message", client);
		}
	};

//	Monitor connections
dataPortal.on('connection', function(connection) {
	clients.push({
		connection: connection
	});

	var index = clients.length - 1;

	console.log("Connected", index);

	//	Send the test data
	connection.write(createResponse("data", "testData", {
		data: testData,
		hash: hash(testData)
	}));

	//	When we get a message
    connection.on('data', function(message) {
    	var result = JSON.parse(message);


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
    	//clients.splice(index);
    });
});

var server = http.createServer();
dataPortal.installHandlers(server, {prefix:'/dataPortal'});
server.listen(9999, '0.0.0.0');