# Dataportal

Transfer JSON efficiently across websockets to multiple clients

## Um, why?

Curiosity - I've seen many other implementations - including what they do in Meteor - they all seem unnessecarily complex for something as simple as syncing JSON across a websocket, so this is just an experiement to see if it can be done a little simpler.

## How does it work?

You create an object you want to share, and then a data portal with a topic, for example:

```javascript
var obj = {a: "b", c: [1,2,3]};

dataPortal(obj, "objtopic", function(portal){
	//	Subscribe to changes in the object
	portal.subscribe(function(value){
		// Our object changed, either ourselves or the server
	});
});
```

Any browser subscribed to your "objtopic" should now get a copy of the same object, inside the `subscribe` function.
When you change your object, simply publish it, eg:

```javascript
//	Modify our object and publish the change
obj.d = (new Date()).getTime();
portal.publish(obj);
```

This will notify the server (and all browsers) that the object has changed, and update it accordingly.