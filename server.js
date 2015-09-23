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
	createResponse = function(type, data){
		var response = {};
		if(type == "diff") {
	        response = {
	        	type: type,
	        	diff: data.diff,
	        	hash: data.hash
	        };
	    } else if(type == "data") {
			response = {
	        	type: type,
	        	data: data.data,
	        	hash: data.hash
	        };
	    }
	    return JSON.stringify(response);
	},

	hasSubscription = function(topic, client){
		var hasSub = false;
		if(subscriptions[topic]) {}
		for(var i = 0; i < subscriptions[topic].length; i += 1) {
			if(subscriptions[topic][i] === client) {
				hasSub = true;
			}
		}
		return hasSub;
	},

	//	Subscribe a client to a topic
	subscribe = function(topic, client){
		console.log("subscribe", topic, client);
		subscriptions[topic] = subscriptions[topic] || [];
		if(!hasSubscription(topic, client)){
			subscriptions[topic].push(client);
		}
	},

	//	Send notifications to subscribers
	publish = function (topic, message) {
		console.log("publish", topic, message);
		for (var key in subscriptions) {
			for(var j = 0; j < subscriptions[key].length; j += 1) {
				sendMessage(subscriptions[key][j], createResponse("diff", message));
			}
		}
	},

	//	Sens a message to a client
	sendMessage = function(client, message){
		if(client && client.connection){
			client.connection.write(message);
		}
	};


/*
	Message format

	{
		type,

	}

*/


//	Monitor connections
dataPortal.on('connection', function(connection) {
	var index = clients.push({
		connection: connection
	});
	console.log("Connected", index, clients.length);

	//	Send the test data
	connection.write(createResponse("data", {
		data: testData,
		hash: hash(testData)
	}));

	//	When we get a message
    connection.on('data', function(message) {
    	var result = JSON.parse(message);


    	if(result.type == "subscribe") {
    		subscribe(result.topic, clients[index]);
    	} else if(result.type == "publish") {
    		publish(result.topic, result.message);
    	} else {

	    	//	Create a response.
	        var response = createResponse("diff", {
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
    	clients.splice(index);
    });
});

var server = http.createServer();
dataPortal.installHandlers(server, {prefix:'/dataPortal'});
server.listen(9999, '0.0.0.0');