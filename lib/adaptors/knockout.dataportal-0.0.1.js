//	Knockout dataportal integration
//	Requires the mapping plugin: http://knockoutjs.com/documentation/plugins-mapping.html
ko.dataPortal = function(root, topic, mappingOptions) {
	mappingOptions = mappingOptions || {};
	var watchObj = ko.unwrap(root);
	delete watchObj["__ko_mapping__"];
	delete watchObj["__dataPortal"];

	var _initialized,
		_fromPatch = false,
    	dp = dataPortal(watchObj, topic, {
    		//	Set the model
    		onValue: function(object) {
    			_fromPatch = true;
				ko.mapping.fromJS(object, mappingOptions, root);
    			_fromPatch = false;
    		},
    		//	Update the model
			onpatch: function(object, message){
				_fromPatch = true;
				//	Use our root object, ie: ignore object.
				var rObj = ko.toJS(ko.unwrap(root));

				delete rObj["__ko_mapping__"];
				delete rObj["__dataPortal"];

				jsondiffpatch.patch(rObj, message.diff);

				object = JSON.parse(JSON.stringify(rObj));

				ko.mapping.fromJS(rObj, mappingOptions, root);
				_fromPatch = false;
				return object;
			}
		});

   var result = ko.computed(function () {
		if (!_initialized || _fromPatch) {
			ko.toJS(root);
			_initialized = true;
			return false;
		}

		var pvalue = JSON.parse(ko.toJSON(root));
		delete pvalue["__ko_mapping__"];
		delete pvalue["__dataPortal"];

		//	Sync the value, (only happens when not from patch)
		dp.publish(pvalue);

		return true;
	});

	return result;
};

//	Passthough for making this a dataPortalised view model
ko.applyPortalBindings = function(args){
	args.model.__dataPortal = new ko.dataPortal(args.model, args.topic, args.mappingOptions);
	ko.applyBindings(args.model, args.element);
};

//	Always ignore the dataPortal and KO mapping attributes
ko.mapping.defaultOptions().ignore = ["__dataPortal", "__ko_mapping__"];