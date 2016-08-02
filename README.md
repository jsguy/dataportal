![alt text](https://github.com/jsguy/dataportal/raw/master/logo.png "Dataportal logo")

Share JSON across websockets

## Installation

```javascript
npm install dataportal
```

## Getting started

Create a dataportal server in node, eg:

```javascript
require('dataportal')();
```

And run it with node - it should now be running on port 32827 - to use the client side:

```javascript
<script type="text/javascript" src="node_modules/dataportal/build/dataportal.js?url=http://local.mac:32827/dataPortal"></script>
<script>
var obj = {"hello": "world"};

//	Create a portal for this topic
mp = dataPortal(obj, "myobject", {
	onready: function(portal){
		//	Modify our object and publish it
		obj.time = (new Date()).getTime();
		portal.subscribe(function(value){console.log(value);});
		portal.publish(obj);
	}
});
</script>

</body>
</html>
```

**Note:** Change "http://local.mac:32827/dataPortal" to the IP address or URL of where you're running your dataportal server.
This example should log out a message each time the object is published for the "myobject" topic - it should show the same value on the last console.log line in each browser.

## Um, why?

Curiosity - I've seen many other implementations - including what they do in MeteorJS - they all seem unnecessarily complex for something as simple as syncing JSON across a websocket, so this is just an experiment to see if it can be done a little simpler. Obviously this means we haven't implemented any protocols (such as [DDP](https://en.wikipedia.org/wiki/Distributed_Data_Protocol)), but rather just allow object to be synchronized, using [https://github.com/benjamine/jsondiffpatch](jsondiffpatch) for efficiency.
As I said, this is an experiment, and so is not meant for production code.

## Usage

### Server

In node.js, create a dataportal server to allow sharing of data:

```javascript
var dataportalServer = require('dataportal');
dataportalServer(args);
```

* **port** {string}: What port to listen in, default is 32827 which is "datap" when typed on a keypad
* **handler** {object}: A configuration object for the request handler
* **handler.prefix** {string}: The prefix for the dataportal, default is "/dataPortal", it must match what the client uses
* **args.handler.log** {function(severity, line)}: log handeling function, by default logs serevrity and line. Severity can be "info", "debug", "error", and the line contains the message.
* **args.server** {object}: A configuration object for the server
* **args.server.sockjs_url** {string}: The URL used for sockjs when the libarry , default is "http://cdn.jsdelivr.net/sockjs/1.0.3/sockjs.min.js";


### Client

You create an object you want to share, and then a data portal with a topic:

```javascript
dataPortal(Object, Topic, [Arguments]);
```

* **Object** {object}: The object you want to track
* **Topic** {string}: The name of the topic - make sure this is unique per data portal server
* **Arguments** {object}: Optional arguments

### Arguments include:

* **onready** {function(portal)}: Callback function for when the portal has been initialised and is connected - passes back the `portal` object
* **onpatch** {function(object, diff)}: Manually handle the patching process - the difference has what the new object changes are as per the diffs used in [https://github.com/benjamine/jsondiffpatch](jsondiffpatch).
* **onclose** {function(portal)}: Callback for when the server closes the connection, you can try to re-establish the connection by reloading the page, or the portal.

### Portal object

The portal object controls how your data is shared with the server, you 

* **publish** {function(newObjectValue)}: If you change the object, use this to publish the new object value
* **subscribe** {function(func{function(object)})}: Callback function that receives the object when it is changed
* **close** {function(func{function(object)})}: Subscribe a callback for when the server closes the connection, you can try to re-establish the connection by reloading the page, or the portal.

## Examples:

See the `examples` folder in this repository.

**Note:** The examples included with Dataportal have the URL of the server set to "http://local.mac:32827/dataPortal", be sure to adjust that to it uses the IP address or URL of where you're running your dataportal server, for when you test on separate machines.