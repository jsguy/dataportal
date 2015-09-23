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
	};

//	Monitor connections
dataPortal.on('connection', function(conn) {
	var index = clients.push(conn);
	console.log("Connected", index, clients.length);

	//	Send the test data
	conn.write(createResponse("data", {
		data: testData,
		hash: hash(testData)
	}));

	//	When we get a message
    conn.on('data', function(message) {
    	var result = JSON.parse(message);

    	//	Create a response.
        var response = createResponse("diff", {
        	diff: result.diff,
        	hash: result.hash
        });

        //	Broadcast to all clients
        for(var i = 0; i < clients.length; i += 1) {
        	if(clients[i]){
				clients[i].write(response);
			} else {
				console.log("lost client", i);
				clients.splice(i);
			}
        }
    });

    conn.on('close', function() {
    	clients.splice(index);
    });
});

var server = http.createServer();
dataPortal.installHandlers(server, {prefix:'/dataPortal'});
server.listen(9999, '0.0.0.0');