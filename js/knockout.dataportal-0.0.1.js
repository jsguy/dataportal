//	Knockout dataportal integration
//	Requires the mapping plugin: http://knockoutjs.com/documentation/plugins-mapping.html
ko.dataPortal = function(root, topic) {
	var _initialized,
		_fromPatch = false,
    	mp = dataPortal(root, topic, {
			onpatch: function(object, message){
				_fromPatch = true;
				var myObj = ko.toJS(object);
				jsondiffpatch.patch(myObj, message.diff);
				ko.mapping.fromJS(myObj, {}, root);
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

		mp.publish(pvalue);

		return true;
	});

	return result;
};

//	Passthough for making this a dataPortalised view model
ko.applyPortalBindings = function(topic, vm){
	//	Setup data portal functionality
	vm.__dataPortal = new ko.dataPortal(vm, topic);

	//	Don't need the topic
    var args = Array.prototype.slice.call(arguments, 1);

	ko.applyBindings.apply(ko, args);
}

//	Always ignore the dataPortal and KO mapping
ko.mapping.defaultOptions().ignore = ["__dataPortal", "__ko_mapping__"];