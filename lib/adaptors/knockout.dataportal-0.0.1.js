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
				ko.mapping.fromJS(object, mappingOptions, root);
    		},
    		//	Update the model
			onpatch: function(object, message){
				_fromPatch = true;
				var rObj = ko.toJS(ko.unwrap(root));

				delete rObj["__ko_mapping__"];
				delete rObj["__dataPortal"];

				jsondiffpatch.patch(rObj, message.diff);
				ko.mapping.fromJS(rObj, mappingOptions, root);
				_fromPatch = false;
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

		//	Sync the value...?
		dp.publish(pvalue);

		return true;
	});

	return result;
};

//	Passthough for making this a dataPortalised view model
//ko.applyPortalBindings = function(topic, model, el, mappingOptions){
ko.applyPortalBindings = function(args){
	//	Setup data portal functionality
	args.model.__dataPortal = new ko.dataPortal(args.model, args.topic, args.mappingOptions);

	ko.applyBindings(args.model, args.element);
}

//	Always ignore the dataPortal and KO mapping
ko.mapping.defaultOptions().ignore = ["__dataPortal", "__ko_mapping__"];