var hash = function(obj) {
	var string = JSON.stringify(obj),
		hash = 0,
		i;
	for (i = 0; i < string.length; i+=1) {
		hash = (((hash << 5) - hash) + string.charCodeAt(i)) & 0xFFFFFFFF;
	}

	return hash;
};
