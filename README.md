![alt text](https://github.com/jsguy/dataportal/raw/master/logo.png "Dataportal logo")

Share JSON across websockets to multiple clients

## Um, why?

Curiosity - I've seen many other implementations - including what they do in Meteor - they all seem unnessecarily complex for something as simple as syncing JSON across a websocket, so this is just an experiement to see if it can be done a little simpler.

## How does it work?

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

## Example:

```javascript
var obj = {a: "b", c: [1, 2, 3]};

dataPortal(obj, "objtopic", function(portal){
	//	Subscribe to changes in the object
	portal.subscribe(function(newObjectValue){ /* act on object change */ });
});
```

Any browser subscribed to your "objtopic" should now get a copy of the same object, inside the `subscribe` function.
When you change your object, simply publish it, eg:

```javascript
//	Modify our object and publish the change
obj.d = (new Date()).getTime();
portal.publish(obj);
```

This will notify the server (and all browsers, including the one that changed) that the object has changed, and update it accordingly.