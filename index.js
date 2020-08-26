// WeatherAPI.com interface

var rest_client 	= require('node-rest-client').Client;
var instance_skel 	= require('../../instance_skel');
var sharp			= require('sharp');
var rgb 			= require('../../image').rgb;
var debug;
var log;

// 1 day forecast (today) includes projected hi/low temps as well as current forecast
instance.prototype.base = "https://api.weatherapi.com/v1/forecast.json?days=1";

instance.prototype.C_DEGREE = String.fromCharCode(176);

instance.prototype.VARIABLE_LIST = {
	l_name: { description: 'Location Name', section: 'location', data: 'name' },
	l_region: { description: 'Region or State (if available)', section: 'location', data: 'region' },
	l_country: { description: 'Country', section: 'location', data: 'country' },
	l_localtime: { description: 'Local Time', section: 'location', data: 'localtime' },
	c_time: { description: 'Time last updated', section: 'current', data: 'last_updated' },
	c_temp: { description: 'Temperature', section: 'current', data: 'temp', unit: ['f','c'] },
	c_feels: { description: 'Feels like', section: 'current', data: 'feelslike', unit: ['f','c'] },
	c_day: { description: 'Is it daytime?', section: 'current', data: 'is_day' },
	c_text: { description: 'Condition description', section: 'condition', data: 'text' },
	c_wind: { description: 'Wind speed', section: 'current', data: 'wind', unit: ['mph','kph'] },
	c_winddeg: { description: 'Wind degrees', section: 'current', data: 'wind_deg' },
	c_winddir: { description: 'Wind direction', section: 'current', data: 'wind_dir' }

};


function instance(system, id, config) {
	var self = this;

	// super-constructor
	instance_skel.apply(this, arguments);

	// addUpdateScript would go here

	return self;
}

instance.prototype.init = function () {
	var self = this;

	// init vars
	debug = self.debug;
	log = self.log;

	self.init_vars();

	// other init methods
	self.init_feedbacks();
	self.init_connection();
	//self.init_presets();
};

instance.prototype.updateConfig = function (config) {
	var self = this;

	debug = self.debug;
	log = self.log;

	// save passed config
	self.config = config;

	// tear everything down
	self.destroy();

	// ... and start again
	self.init_feedbacks();
	self.init_connection();
	//self.init_presets();
};

instance.prototype.destroy = function () {
	var self = this;

	self.init_vars();
	self.client = null;
};


/* --- init --- */

instance.prototype.config_fields = function () {

	var self = this;

	self.defineConst('REGEX_HEX','/^[0-9A-Fa-f]+$/');

	var configs = [
		{
			type: 	'text',
			id: 	'info',
			width: 	12,
			label: 	'Information',
			value: 	'This module retrieves weather information from WeatherAPI.com.<br>It requires an active internet connection.'
		},
		{
			type: 'textinput',
			id: 'apikey',
			label: 'API Key',
			width: 12,
			tooltip: 'Enter your API Key from WeatherAPI.com.',
			regex: self.REGEX_HEX
		},
		{
			type: 'textinput',
			id: 'location',
			label: 'Location',
			tooltip: 'Weather Location to Display',
			width: 12
		},
		{
			type: 'dropdown',
			id:	 'units',
			label: 'Measurement Units',
			width: 6,
			default: 'i',
			choices: [
				{ id: 'i', label: 'Fahrenheit and MPH' },
				{ id: 'm', label: 'Celsius and kPH' }
			]
		}
	];
	return configs;
};

instance.prototype.init_actions = function () {

	var self = this;

	self.system.emit('instance_actions', self.id, {
		'refresh': { label: 'Refresh weather display' }
	});
};

instance.prototype.init_feedbacks = function () {

	var self = this;

	// feedbacks
	var feedbacks = {
		'icon': {
			label: 'Current Condition Icon',
			description: 'Change background to icon of current weather',
			options: [],
			callback: function(feedback, bank) {
				var ret;
				if (self.icons[self.iconID]) {
					ret = { png64: self.icons[self.iconID] };
					ret.bgcolor = (self.isDay ? rgb(200,200,200): rgb(32,32,32));
					ret.color = (self.isDay ? rgb(32,32,32) : rgb(200,200,200));
				}
				if (ret) {
					return ret;
				}
			}
		}
	};
	self.setFeedbackDefinitions(feedbacks);
};

instance.prototype.init_vars = function () {
	var self = this;
	var vars = [];

	self.weather = {
		location: {},
		current: {},
		forecast: {}
	};
	self.lastPolled = 0;
	self.icons = {};
	self.iconID = '';
	self.mph = ('i' != self.config.units);
	self.hasError = false;
	for (var i in self.VARIABLE_LIST) {
		vars.push( { name: i, label: self.VARIABLE_LIST[i].description});
	}
	self.setVariableDefinitions(vars);
};

instance.prototype.init_presets = function () {
	var self = this;

	var presets = [
		{
			category: 'Example',
			label: 'Condition Graphic & Current Temp',
			bank: {
				style: 'png',
				text: '$(wapi:c_temp)',
				size: '18',
				color: rgb(255,255,255),
				bgcolor: 0
			},
			actions: [
				{
					action: 'refresh',
					options: {}
				}
			],
			feedbacks: [
				{
					type: 'icon',
					options: {}
				}
			]
		}
	];
	self.setPresetDefinitions(presets);
};


instance.prototype.init_connection = function () {
	var self = this;
	var base = self.base;

	if (self.client) {
		delete self.client;
	}
	if (self.heartbeat) {
		clearInterval(self.heartbeat);
		delete self.heartbeat;
	}
	self.client = new rest_client();

	// only connect when API key is defined
	if (self.config.apikey === undefined || self.config.apikey == "") {
		return false;
	}

	self.status(self.STATUS_UNKNOWN, 'Connecting');

	self.client.on('error', function(err) {
		self.status(self.STATUS_ERROR, err);
		self.hasError = true;
	});

	// check every minute
	self.heartbeat = setInterval(function() { self.pulse(); }, 60000);
	self.refresh();
};

/* --- update current weather --- */

instance.prototype.pulse = function () {
	var self = this;

	// if over 20 minutes then refresh
	if (self.lastPolled + 20 * 60000 < Date.now() ) {
		self.refresh();
	}
};

instance.prototype.refresh = function () {
	var self = this;

	// Only query if more than 1 minute since last poll
	if (!self.hasError && self.lastPolled + 60000 < Date.now()) {
		self.lastPolled = Date.now();
		var url = self.base + "&key=" + self.config.apikey + "&q=" + self.config.location;
		self.client.get(url, function (data, response) {
			if (data.error) {
				self.log('error', data.error.message);
				self.status(self.STATUS_ERROR, data.error.message);
				self.hasError = true;
			} else {
				self.status(self.STATUS_OK);
				self.update_variables(data);
			}
		});
	}
};

instance.prototype.update_variables = function(data) {
	var self = this;
	var k;
	var v = self.VARIABLE_LIST;
	var dv;
	var u;

	self.weather.location = data.location;
	self.weather.current = data.current;
	self.weather.forecast = data.forecast;
	self.isDay = (data.current.is_day == 1);

	for (var i in v) {
		switch (v[i].section) {
		case 'location':
			dv = data.location[v[i].data];
			break;
		case 'current':
			u = '';
			if (v[i].unit) {
				u = '_' + v[i].unit[self.config.units == 'i' ? 0 : 1];
			}
			dv = data.current[v[i].data + u];
			if (['_f','_c'].includes(u)) {
				dv += self.C_DEGREE;
			}
			break;
		case 'condition':
			// text is the only condition variable
			dv = data.current.condition.text;
			// get/update the corresponding graphic
			self.update_graphic(data.current.condition);
			break;
		case 'forecast':
			break;
		}
		self.setVariable(i, dv);
	}
};

instance.prototype.update_graphic = function(cond) {
	var self = this;
	var code = cond.code + '_' + (self.isDay ? '1' : '0')

	if (code != self.iconID) {
		self.iconID = code;
		// cached?
		if (self.icons[code]) {
			self.checkFeedbacks('icon');
		} else {
			self.client.get("https:" + cond.icon, function (data, response) {
				// source images are 64x64
				sharp(new Buffer(data)).resize(96,96).png().toBuffer(function (err, buffer) {
					self.icons[code] = buffer;
					self.checkFeedbacks('icon');
				  });
				// self.icons[code] = data.toString('base64');
				// self.checkFeedbacks('icon');
			});
		}
	}
};

instance.prototype.action = function (action) {

	var self = this;
	var cmd;

	switch (action.action) {

	case "refresh":
		self.refresh();
		break;

	}
};

instance_skel.extendedBy(instance);
exports = module.exports = instance;