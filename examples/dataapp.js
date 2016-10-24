/*
	A JSON diffing server that allows arbitrary JSON to be synced between multiple users.

	TODO:

	* Implememnt versioning for patches, so the client can see if they're out of sync, and request the original value again.
	* Ensure we do as little processing on the server as possible.
*/
var dataportalServer = require('../lib/dataportal.server.js'),
	jdp = require('jsondiffpatch'),
	myTopic = "dataTopic",
	_fromPatch = false,
	prevResponse,
	prevCId;

//	Setup a portal
var dp = dataportalServer({
	createResponse: function(response, cId) {
		//	Make sure it is a topic we care about, otherwise simply pass it through
		if(! (response && response.topic && response.topic == myTopic)) {
			return response;
		}

		//	Debounce - we get multiple responses, one for every client, so don't patch if it is a repeat
		if(prevResponse && prevCId == cId && response.type == prevResponse.type && prevResponse.hash == response.hash) {
			return response;
		}

		//	Patch our data
		if(!_fromPatch && response.type == "diff") {
			jdp.patch(data, response.diff);
			prevResponse = response;
			prevCId = cId;
		}

		//	Pass on the response
		return response;
	},
	//	When they connect, we create a data response to send the current data.
	onConnect: function(client) {
		dp.sendMessage(client, dp.createResponse("data", myTopic, {
			data: data
		}));
	},
	handler: {
		log: function(severity, line) {
			//	Skip info
			return severity !== "info"? console.log(severity, line): null;
		}
	}
});

//	The below creates random names and publishes them at randomish times.
var rnd = function(list) {
	var i = Math.floor(Math.random() * list.length);
		return list[i];
	},
	adjectives = ["adamant", "adroit", "amatory", "animistic", "antic", "arcadian", "baleful", "bellicose", "bilious", "boorish", "calamitous", "caustic", "cerulean", "comely", "concomitant", "contumacious", "corpulent", "crapulous", "defamatory", "didactic", "dilatory", "dowdy", "efficacious", "effulgent", "egregious", "endemic", "equanimous", "execrable", "fastidious", "feckless", "fecund", "friable", "fulsome", "garrulous", "guileless", "gustatory", "heuristic", "histrionic", "hubristic", "incendiary", "insidious", "insolent", "intransigent", "inveterate", "invidious", "irksome", "jejune", "jocular", "judicious", "lachrymose", "limpid", "loquacious", "luminous", "mannered", "mendacious", "meretricious", "minatory", "mordant", "munificent", "nefarious", "noxious", "obtuse", "parsimonious", "pendulous", "pernicious", "pervasive", "petulant", "platitudinous", "precipitate", "propitious", "puckish", "querulous", "quiescent", "rebarbative", "recalcitant", "redolent", "rhadamanthine", "risible", "ruminative", "sagacious", "salubrious", "sartorial", "sclerotic", "serpentine", "spasmodic", "strident", "taciturn", "tenacious", "tremulous", "trenchant", "turbulent", "turgid", "ubiquitous", "uxorious", "verdant", "voluble", "voracious", "wheedling", "withering", "zealous"];
	nouns = ["ninja", "chair", "pancake", "statue", "unicorn", "rainbows", "laser", "senor", "bunny", "captain", "nibblets", "cupcake", "carrot", "gnomes", "glitter", "potato", "salad", "toejam", "curtains", "beets", "toilet", "exorcism", "stick figures", "mermaid eggs", "sea barnacles", "dragons", "jellybeans", "snakes", "dolls", "bushes", "cookies", "apples", "ice cream", "ukulele", "kazoo", "banjo", "opera singer", "circus", "trampoline", "carousel", "carnival", "locomotive", "hot air balloon", "praying mantis", "animator", "artisan", "artist", "colorist", "inker", "coppersmith", "director", "designer", "flatter", "stylist", "leadman", "limner", "make-up artist", "model", "musician", "penciller", "producer", "scenographer", "set decorator", "silversmith", "teacher", "auto mechanic", "beader", "bobbin boy", "clerk of the chapel", "filling station attendant", "foreman", "maintenance engineering", "mechanic", "miller", "moldmaker", "panel beater", "patternmaker", "plant operator", "plumber", "sawfiler", "shop foreman", "soaper", "stationary engineer", "wheelwright", "woodworkers"],
	minTime = 750,
	maxTime = 5000,
	rndTime = function(){
		return Math.floor(Math.random() * maxTime) + minTime;
	},
	//	The server must have the initial data
	createRow = function(name){
		name = name || rnd(adjectives) + " " + rnd(nouns);
		var timeObj = new Date(),
			dataRow = {
				name: name,
				colour: rnd(["red", "green", "blue"]),
				time: (
					timeObj.getHours() + ":" + 
					(timeObj.getMinutes()<10?'0':'') + timeObj.getMinutes() + ":" + 
					(timeObj.getSeconds()<10?'0':'') + timeObj.getSeconds()
				)
			};
		return dataRow;
	},
	//	Our initial data
	data = {
		rows: [
			createRow("Billy"),
			createRow("Bob"),
			createRow("Sarah"),
			createRow(),
			createRow()
		]
	};


//	Randomly change the data
var modifyData = function(){
	var rowLength = data.rows.length,
		removeData = rowLength > 1 && Math.random() >= 0.5,
		oData = JSON.parse(JSON.stringify(data)),
		removeIndex = Math.round(Math.random() * (rowLength - 1));

	if(removeData) {
		data.rows.splice(removeIndex, 1);
	} else {
		data.rows.push(createRow());
	}

	var diff = jdp.diff(oData, data);

	if(diff) {
		_fromPatch = true;
		dp.publish(myTopic, {diff: diff}, "DATAAPP");
		_fromPatch = false;
		//	Update oData
		oData = JSON.parse(JSON.stringify(data));
	}

	setTimeout(modifyData, rndTime());
};

setTimeout(modifyData, rndTime());