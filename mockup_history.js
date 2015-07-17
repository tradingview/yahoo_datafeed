MockupHistoryProvider = (function() {
	var that = {};

	that.symbols = function() {
		return _symbols.map(function(x) {return x.name; } );
	};


	that.isMockupSymbolName = function(name) {
		name = trimName(name);
		return _symbols.filter(function(x) {return x.name == name; } ).length > 0;
	};

	function trimName(name) {
		return name.indexOf("MOCK:") === 0
			? name.split(':')[1]
			: name;
	}


	that.symbolInfo = function(name) {
		name = trimName(name);
		var symbolRecords = _symbols.filter(function(x) {return x.name == name; } );
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

	that.history = function(name, resolution, leftDate, rightDate) {
		name = trimName(name);
		return mockupSymbolHistory(name, resolution, leftDate, rightDate);
	};


	var _symbols = [
		{
			name: "M-COMPLEX",
			symbolInfoPatch: {
				session: "0900-1630|1000-1400,1600-1900:2|1300-1700:3",
				has_no_volume: true
			},
			tradingSessions:  {
				tradesOnWeekends: false,

				'default': [{
						start: 9 * 60,
						end: 16 * 60 + 30
					}
				],

				//	Monday
				2:  [{
						start: 10 * 60,
						end: 14 * 60
					}, {
						start: 16 * 60,
						end: 19 * 60
					}
				],

				//	Tuesday
				3: [{
						start: 13 * 60,
						end: 17 * 60
					}
				]
			}
		}, {
			name: "M-24X7",
			symbolInfoPatch: {
				session: "24x7",
				timezone: "Europe/Moscow",
				supported_resolutions: ["1", "15", "60", "D"],
				intraday_multipliers: ["1", "15", "60"],
				has_empty_bars: true,
				description: "Europe/Moscow 24x7"
			},
			tradingSessions:  {
				tradesOnWeekends: true,
				'default': [{
						start: 0,
						end: 24 * 60
					}
				],
			}
		}, {
			name: "M-0930-1900",
			symbolInfoPatch: {
				session: "0930-1900",
				timezone: "Europe/Moscow",
				supported_resolutions: ["1", "15", "60", "D"],
				intraday_multipliers: ["1", "15", "60"],
				has_empty_bars: true,
				description: "Europe/Moscow 0930-1900"
			},
			tradingSessions:  {
				tradesOnWeekends: true,
				'default': [{
						start: 9 * 60 + 30,
						end: 19 * 60
					}
				],
			}
		}, {
			name: "M-1100-1700",
			symbolInfoPatch: {
				session: "1100-1700",
				timezone: "America/Argentina/Buenos_Aires",
				supported_resolutions: ["1", "15", "60", "D"],
				intraday_multipliers: ["1", "15", "60"],
				has_empty_bars: false,
				description: "Buenos Aires 0930-1900"
			},
			tradingSessions:  {
				tradesOnWeekends: false,
				'default': [{
						start: 11*60,
						end: 17 * 60
					}
				],
			}
		}, {
			name: "M-2200-2200",
			symbolInfoPatch: {
				session: "2200-2200",
				timezone: "UTC",
				supported_resolutions: ["1", "15", "60", "1440"],
				intraday_multipliers: ["1", "15", "60", "1440"],
				has_empty_bars: true,
				description: "UTC 2200-2200"
			},
			tradingSessions:  {
				tradesOnWeekends: true,
				'default': [{
						start: 0,
						end: 24 * 60
					}
				],
			}
		}, {
			name: "M-ASIA-KOLKATA",
			symbolInfoPatch: {
				session: '0900-1600',
				timezone: 'Asia/Kolkata',
				supported_resolutions: ["15"],
				intraday_multipliers: ["15"],
				force_session_rebuild: false,
				has_empty_bars: false,
				has_fractional_volume: false,
				has_weekly_and_monthly: false,
				minmov: 0.05,
				minmove2: 0,
				pointvalue: 1,
				pricescale: 100,
				type: "Cash",
			},
			tradingSessions:  {
				tradesOnWeekends: true,
				'default': [{
						start: 9 * 60,
						end: 16 * 60
					}
				],
			}
		}, {
			name: "M-EXPIRED",
			symbolInfoPatch: {
				session: "24x7",
				timezone: "Europe/Moscow",
				supported_resolutions: ["1", "15", "60"],
				intraday_multipliers: ["1", "15", "60"],
				description: "Europe/Moscow 24x7 expired @ 1 July 2014",
				expired: true,
				expiration_date: new Date("1 July 2014").valueOf() / 1000
			},
			tradingSessions:  {
				tradesOnWeekends: true,
				'default': [{
						start: 0,
						end: 24 * 60
					}
				],
			}
		},{
			name: "M-WITH-FIRST-DAY",
			symbolInfoPatch: {
				session: "0930-1230;1",
				timezone: "UTC",
				supported_resolutions: ["1", "15", "60"],
				intraday_multipliers: ["1", "15", "60"],
				description: "UTC 0930-1230;1"
			},
			tradingSessions:  {
				tradesOnWeekends: true,
				'default': [{
						start: 9 * 60 + 30,
						end: 12 * 60 + 30
					}
				],
			}
		},{
			name: "SUBMINUTE",
			symbolInfoPatch: {
				session: "24x7",
				timezone: "UTC",
				supported_resolutions: ["0.5"],
				intraday_multipliers: ["0.5"],
				description: "24x7"
			},
			tradingSessions:  {
				tradesOnWeekends: true,
				'default': [{
						start: 0,
						end: 1440
					}
				],
			}
		},
	];

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
		for (var p in patch) {
			subject[p] = patch[p];
		}
		return subject;
	}


	function mockupSymbolHistory(symbol, resolution, startDateTimestamp, endDateTimestamp) {
		var history = createHistory(symbol, resolution);
		
		var current = new Date() / 1000;
		
		if (endDateTimestamp > current) {
			endDateTimestamp = current;
		}

		var leftBarIndex;
		var rightBarIndex;

		for (var i = history.t.length - 1; i >= 0; --i ) {
			if (history.t[i] < endDateTimestamp && !rightBarIndex) {
				rightBarIndex = i;
			}

			if (history.t[i] < startDateTimestamp && !leftBarIndex) {
				leftBarIndex = i + 1;
				break;
			}
		}		

		if ((rightBarIndex == undefined && leftBarIndex == undefined) || (leftBarIndex > rightBarIndex)) {
			return {
				t: [], c: [], o: [], h: [], l: [], v: [],
				s: "no_data"
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

	function createHistory(symbol, resolution) {
		var symbolRecords = _symbols.filter(function(x) {return x.name == symbol; } );
		if (symbolRecords.length === 0) {
			throw symbol + " is not a mockup symbol name";
		}

		var symbolKey = seriesKey(symbol, resolution);

		if (_historyCache[symbolKey]) {
			return _historyCache[symbolKey];
		}

		var sessions = symbolRecords[0].tradingSessions;

		var result = {
			t: [], c: [], o: [], h: [], l: [], v: [],
			s: "ok"
		};

		var today = new Date();
		today.setHours(0, 0, 0, 0);

		var daysCount = 365 * 2;
		var median = 40;

		for (var day = daysCount; day > -10; day--) {
			var date = new Date(today.valueOf() - day * 24 * 60 * 60 * 1000);
			var dayIndex = date.getDay() + 1;

			if (!sessions.tradesOnWeekends && (dayIndex == 1 || dayIndex == 7)) {
				continue;
			}

			var daySessions = sessions.hasOwnProperty(dayIndex)
				? sessions[dayIndex]
				: sessions.default;

			for (var i = 0; i < daySessions.length; ++i) {
				var session = daySessions[i];
				var barsCount = (session.end - session.start) / resolution;

				for (var barIndex = 0; barIndex < barsCount; barIndex++) {

					var barTime = date.valueOf() / 1000 + session.start * 60 + barIndex * resolution * 60 + date.getTimezoneOffset() * 60;

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


module.exports = MockupHistoryProvider;