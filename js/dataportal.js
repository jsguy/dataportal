/*
	We need a data portal factory that knows when the socket is ready, and can call the 'ready' methods on each data portal.

	TODO: For now we assume the user assuers that topics are globally unique - we probably 
		need to handle that in a different way.

*/
(function(win, sock){
	var scripts = document.getElementsByTagName('script'),
		script = scripts[scripts.length - 1],
		getParameterByName = function(name, url) {
		    if (!url) url = window.location.href;
		    name = name.replace(/[\[\]]/g, "\\$&");
		    var regex = new RegExp("[?&]" + name + "(=([^&#]*)|&|#|$)"),
		        results = regex.exec(url);
		    if (!results) return null;
		    if (!results[2]) return '';
		    return decodeURIComponent(results[2].replace(/\+/g, " "));
		},
		//	script tag src: "./js/dataportal.js?url=http://local.mac:9999/dataPortal"
		sock = new SockJS(getParameterByName("url", script.src)),
		subscriptions = {},
		portals = [],
		isReady = false,
		getPortals = function(){
			return portals;
		},
		getSubscribedPortals = function(topic){
			return subscriptions[topic] || [];
		},
		//	ref: http://stackoverflow.com/a/2117523
		generateGuid = function() {
			return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
				var r = Math.random()*16|0, v = c == 'x' ? r : (r&0x3|0x8);
				return v.toString(16);
			});
		};

	//	obj and topic are required
	//	Use of callback is recommended, so you can be sure the socket is ready.
	var DataPortal = function(obj, topic, args){
//, callback, onclose
		topic = topic || "TOPIC-NOT-SET";
		args = args || {};

		var self = this,
			guid = generateGuid(),
			objectValue = obj,
			originalObj = JSON.parse(JSON.stringify(obj));

		self.readyFunctions = [];
		self.closeFunctions = [];

		self.value = function(newObj){
			if(typeof newObj !== "undefined") {
				objectValue = newObj;
			}
			return objectValue;
		};

		self.publish = function(newObj){
			var delta = jsondiffpatch.diff(originalObj, newObj);
			//	Send it
			sock.send(JSON.stringify({
				type: "publish",
				topic: topic,
				id: name,
				message: {
					diff: delta,
					hash: hash(newObj)
				}
			}));
		};

		//	Subscribe to messages
		//	TODO: cache the last message, so we can always 
		//	give new subscribers the JSON object.
		self.subscribe = function(func){
			subscriptions[topic] = subscriptions[topic] || [];
			subscriptions[topic].push({
				notify: func,
				portal: self
			});

			//	Send it
			sock.send(JSON.stringify({
				type: "subscribe",
				topic: topic,
				id: name
			}));
		};

		self.patch = function(message) {
			if(args.onpatch) {
				args.onpatch(message);
			} else {
				//	Here we pacth the object
				jsondiffpatch.patch(objectValue, message.diff);
			}
			//	Tell subscribers
			if(subscriptions[topic]) {
				for(var i = 0; i < subscriptions[topic].length; i += 1) {
					subscriptions[topic][i].notify(objectValue);
				}
			}
		};

		//	When the socket is ready
		self.ready = function(cb){
			if(isReady) {
				cb(self);
			} else {
				self.readyFunctions.push({cb: cb, self: self});
			}
		};

		self.close = function(cb){
			self.closeFunctions.push({cb: cb, self: self});
		}

		if(args.onready) {
			self.ready(args.onready);
		}

		if(args.onclose) {
			self.close(args.onclose);
		}

		return self;
	};

	//	Handle sock open
	sock.onopen = function() {
		var portals = getPortals();
		isReady = true;
		//	Loop on portals and call each ready method
		for(var i = 0; i < portals.length; i += 1) {
			for(var j = 0; j < portals[i].readyFunctions.length; j += 1){
				portals[i].readyFunctions[j].cb(portals[i]);
			}
		}
	};


	//	Handle messages
	//	Note: the server holds the subscriptions, so assume that we only get messages that we care about.
	sock.onmessage = function(e){
		var message = JSON.parse(e.data),
			subs, i;
		if(message.type == "data") {
			subs = getSubscribedPortals(message.topic);
			//	Set the data
			for(i = 0; i < subs.length; i += 1) {
				subs[i].value(message.data);
			}
		} else if(message.type == "diff") {
			subs = getSubscribedPortals(message.topic);
			//	Allow the portal to patch the data
			for(i = 0; i < subs.length; i += 1) {
				if(subs[i] && subs[i].portal){
					subs[i].portal.patch(message);
				}
			}
		} else {
			console.log("unrecognised message", message);
		}
	};

	sock.onclose = function() {
		console.log('close');
		var portals = getPortals();
		//	Loop on portals and call each ready method
		for(var i = 0; i < portals.length; i += 1) {
			for(var j = 0; j < portals[i].closeFunctions.length; j += 1){
				portals[i].closeFunctions[j].cb(portals[i]);
			}
		}
	};

	win.dataPortal = function(object, topic, callback, onclose){
		var myPortal = new DataPortal(object, topic, callback, onclose);
		portals.push(myPortal);
		return myPortal;
	};

//	NOTE: We can only have 1 connection to sockjs per browser.
}(window));