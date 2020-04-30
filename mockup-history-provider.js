/* global exports */
/* global require */
/* global console */

"use strict";

var _symbols = require("./mockup-symbols").symbols;

var RESOLUTION_WITH_KIND_CHAR_REGEX = /^(\d*)([SHDWMR])$/;
var MINUTES_RESOLUTION_REGEX = /^(\d+)$/;

var KIND_TO_SECONDS = {};
KIND_TO_SECONDS.s = 1;
KIND_TO_SECONDS.m = 60 * KIND_TO_SECONDS.s;
KIND_TO_SECONDS.h = 60 * KIND_TO_SECONDS.m;
KIND_TO_SECONDS.d = 24 * KIND_TO_SECONDS.h;
KIND_TO_SECONDS.w = 7 * KIND_TO_SECONDS.d;

function getMultiplier(s) {
	if (s.length === 0) {
		return 1;
	}

	return parseInt(s, 10);
}

function getSeconds(s) {
	s = (s + '').toUpperCase().split(',')[0];

	let match = RESOLUTION_WITH_KIND_CHAR_REGEX.exec(s);
	if (match !== null) {
		return KIND_TO_SECONDS[match[2]] * getMultiplier(match[1]);
	}

	match = MINUTES_RESOLUTION_REGEX.exec(s);
	if (match !== null) {
		return KIND_TO_SECONDS.m * getMultiplier(match[1]);
	}

	throw new Error('Cannot parse resolution');
}

var MockupHistoryProvider = (function() {
	var that = {};
	
	var fs = require("fs");
	
	var filesHistory = {};
	
	function loadSymbolFile(filename) {
		var fileContent = fs.readFileSync("./sym/" + filename, 'utf8');
		var content = JSON.parse(fileContent.replace(/^\uFEFF/, ''));
		var symbolInfo = content.symbol;
		var history = content.history;
		var symbolName = symbolInfo.name;
		filesHistory[symbolName] = ({ info: symbolInfo, history: history });
		_symbols.push({ name: symbolName, symbolInfoPatch: symbolInfo, fromFile: true });
		console.log('Loaded symbol file: ' + symbolName);
	}

	that.symbols = function() {
		return _symbols.map(function(x) {
			return {
				name: x.name,
				description: x.name,
				exchange:"MOCK",
				type:"stock"
			};
		});
	};


	that.isMockupSymbolName = function(name) {
		name = trimName(name);
		return _symbols.filter(function(x) {return x.name === name || x.symbolInfoPatch.ticker === name; } ).length > 0;
	};

	function trimName(name) {
		return name.indexOf("MOCK:") === 0 ?
			name.split(':')[1] :
			name;
	}


	that.symbolInfo = function(name) {
		name = trimName(name);
		var symbolRecords = _symbols.filter(function(x) {return x.name == name || x.symbolInfoPatch.ticker === name; } );
		if (symbolRecords.length === 0) {
			throw name + " is not a mockup symbol name";
		}
		var symbolRecord = symbolRecords[0];

		var symbolInfo = applyPatch({}, _mockupSymbolInfo);
		symbolInfo.name = symbolInfo.ticker = name;
		symbolInfo.description = symbolInfo.description || name;

		var result = applyPatch(symbolInfo, symbolRecord.symbolInfoPatch);
		console.log(result);
		return result;
	};

	that.history = function(name, resolution, leftDate, rightDate, currencyCode) {
		name = trimName(name);
		return mockupSymbolHistory(name, resolution, leftDate, rightDate, currencyCode);
	};
	
	var files = fs.readdirSync("./sym");
	
	Object.keys(files).forEach(function(i) {
		var filename = files[i];
		if (filename.indexOf(".sym") !== -1) {
			console.log('Found symbol file: ' + filename);
			loadSymbolFile(filename);
		}		
	});
	

	var _mockupSymbolInfo = {
		"exchange-traded": "MOCK",
		"exchange-listed": "MOCK",
		"timezone": "UTC",
		"minmov": 1,
		"minmov2": 0,
		"pricescale": 100,
		"pointvalue": 1,
		"session": "24x7",
		"intraday_multipliers": ["0.5", "5", "10", "15"],
		"supported_resolutions": ["5", "10", "15", "W"],
		"has_weekly_and_monthly": false,
		"has_dwm": false,
		"has_intraday": true,
		"has_no_volume": true,
		"type": "stock"
	};


	function applyPatch(subject, patch) {
		Object.keys(patch).forEach(function(p) {
			subject[p] = patch[p];
		});
		return subject;
	}


	function mockupSymbolHistory(symbol, resolution, startDateTimestamp, endDateTimestamp, currencyCode) {
		var history = createHistory(symbol, resolution, currencyCode);
		
		var current = new Date() / 1000;
		
		if (endDateTimestamp > current) {
			endDateTimestamp = current;
		}

		var leftBarIndex;
		var rightBarIndex;

		for (var i = history.t.length - 1; i >= 0; --i ) {
			if (history.t[i] <= endDateTimestamp && !rightBarIndex) {
				rightBarIndex = i;
			}

			if (history.t[i] < startDateTimestamp && !leftBarIndex) {
				leftBarIndex = i + 1;
				break;
			}
		}		

		if ((rightBarIndex === undefined && leftBarIndex === undefined)) {
			return {
				t: [], c: [], o: [], h: [], l: [], v: [],
				s: "no_data"
			};
		}
		
		if (leftBarIndex > rightBarIndex) {
			return {
				t: [], c: [], o: [], h: [], l: [], v: [],
				s: "no_data",
				nextTime: history.t[rightBarIndex],
				
			};
		}

		if (rightBarIndex < history.t.length) {
			// should increase rightBarIndex for slice to include it
			rightBarIndex++;
		}
		return {
			s: "ok",
			t: history.t.slice(leftBarIndex, rightBarIndex),
			o: history.o.slice(leftBarIndex, rightBarIndex),
			h: history.h.slice(leftBarIndex, rightBarIndex),
			l: history.l.slice(leftBarIndex, rightBarIndex),
			c: history.c.slice(leftBarIndex, rightBarIndex)
		};
	}


	var _historyCache = {};

	function seriesKey(symbol, resolution) {
		return symbol + "," + resolution;
	}

	function createHistory(symbol, resolution, currencyCode) {
		var symbolRecords = _symbols.filter(function(x) {return x.name === symbol || x.symbolInfoPatch.ticker === symbol; } );
		if (symbolRecords.length === 0) {
			throw symbol + " is not a mockup symbol name";
		}

		var symbolKey = seriesKey(symbol, resolution);

		if (_historyCache[symbolKey]) {
			return _historyCache[symbolKey];
		}
		
		var result = {
			t: [], c: [], o: [], h: [], l: [], v: [],
			s: "ok"
		};
		
		if (symbolRecords[0].fromFile) {
			var fileResolution = resolution.toLowerCase() === '1d' ? 'd' : resolution;
			result = filesHistory[symbolRecords[0].name].history[fileResolution] || result;
			_historyCache[symbolKey] = result;
			return result;
		}		

		var sessions = symbolRecords[0].tradingSessions;

		var today = new Date();
		today.setUTCHours(0, 0, 0, 0);

		var resolutionsInSeconds = getSeconds(resolution);

		var daysCount = Math.max(700 * resolutionsInSeconds / 60 / 24 / 60, 1);
		var median = 40;

		for (var day = daysCount; day > -10; day--) {
			var date = new Date(today.valueOf() - day * 24 * 60 * 60 * 1000);
			var dayIndex = date.getDay() + 1;

			if (!sessions.tradesOnWeekends && (dayIndex === 1 || dayIndex === 7)) {
				continue;
			}

			var daySessions = sessions.hasOwnProperty(dayIndex) ?
				sessions[dayIndex] :
				sessions.default;

			for (var i = 0; i < daySessions.length; ++i) {
				var session = daySessions[i];
				var barsCount = (session.end - session.start) * 60 / resolutionsInSeconds;

				for (var barIndex = 0; barIndex < barsCount; barIndex++) {

					var barTime = date.valueOf() / 1000 + session.start * 60 + barIndex * resolutionsInSeconds;

					//console.log(barTime + ": " + new Date(barTime * 1000));

					result.t.push(barTime);

					var open = median + Math.random() * 4 - Math.random() * 4;
					var close = median + Math.random() * 4 - Math.random() * 4;

					result.o.push(open);
					result.h.push(Math.max(open, close) + Math.random() * 4);
					result.l.push(Math.min(open, close) - Math.random() * 4);
					result.c.push(close);

					median = close;

					if (median < 10) {
						median = 10;
					}
				}
			}
		}

		_historyCache[symbolKey] = result;
		return result;
	}

	return that;
})();


exports.MockupHistoryProvider = MockupHistoryProvider;