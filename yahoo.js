/*
	This file is a node.js module.

	This is a sample implementation of UDF-compatible datafeed wrapper for yahoo.finance.
	Some algorithms may be icorrect because it's rather an UDF implementation sample
	then a proper datafeed implementation.
*/

var http = require("http"),
	url = require("url"),
	symbolsDatabase = require("./symbols_database");

var datafeedHost = "chartapi.finance.yahoo.com";
var defaultResponseHeader = {"Content-Type": "text/plain", 'Access-Control-Allow-Origin': '*'};
var MockupHistoryProvider = require("./mockup_history.js");


function httpGet(path, callback)
{
	var options = {
		host: datafeedHost,
		path: path
	};

	onDataCallback = function(response) {
		var result = '';

		response.on('data', function (chunk) {
			result += chunk
		});

		response.on('end', function () {
			callback(result)
		});
	}

	var req = http.request(options, onDataCallback);
	
	req.on('socket', function (socket) {
		socket.setTimeout(5000);  
		socket.on('timeout', function() {
			console.log('timeout');
			req.abort();
		});
	});
	
	req.on('error', function(e) {
		console.log('Problem with request: ' + e.message);
		callback('');
	});
	
	req.end();
}


function convertYahooHistoryToUDFFormat(data) {

	// input: string "yyyy-mm-dd" (UTC)
	// output: milliseconds from 01.01.1970 00:00:00.000 UTC
	function parseDate(input) {
		var parts = input.split('-');
		return Date.UTC(parts[0], parts[1]-1, parts[2]);
	}

	var result = {
		t: [], c: [], o: [], h: [], l: [], v: [],
		s: "ok"
	};

	var lines = data.split('\n');

	for (var i = lines.length - 2; i > 0; --i) {
		var items = lines[i].split(",");

		var time = parseDate(items[0]) / 1000;

		result.t.push(time);
		result.o.push(parseFloat(items[1]));
		result.h.push(parseFloat(items[2]));
		result.l.push(parseFloat(items[3]));
		result.c.push(parseFloat(items[4]));
		result.v.push(parseFloat(items[5]));
	}

	return result;
}

function convertYahooQuotesToUDFFormat(tickersMap, data) {
	if (!data.query || !data.query.results) {
		var errmsg = "ERROR: empty quotes response: " + JSON.stringify(data);
		console.log(errmsg);
		return { s: "error", errmsg: errmsg };
	}

	var result = { s: "ok", d: [] };
	[].concat(data.query.results.quote).forEach(function(quote) {
		var ticker = tickersMap[quote.symbol];

		// this field is an error token
		if (quote["ErrorIndicationreturnedforsymbolchangedinvalid"] || !quote.StockExchange) {
			result.d.push({ s: "error", n: ticker, v: {} });
			return;
		}

		result.d.push({
		   	s: "ok",
			n: ticker,
			v: {
				ch: quote.ChangeRealtime || quote.Change,
				chp: (quote.PercentChange || quote.ChangeinPercent) && (quote.PercentChange || quote.ChangeinPercent).replace(/[+-]?(.*)%/, "$1"),

				short_name: quote.Symbol,
				exchange: quote.StockExchange,
				original_name: quote.StockExchange + ":" + quote.Symbol,
				description: quote.Name,

				lp: quote.LastTradePriceOnly,
				ask: quote.AskRealtime,
				bid: quote.BidRealtime,

				open_price: quote.Open,
				high_price: quote.DaysHigh,
				low_price: quote.DaysLow,
				prev_close_price: quote.PreviousClose,
				volume: quote.Volume,
			}
	   	});
	});
	return result;
}

RequestProcessor = function(action, query, response) {

	this.sendError = function(error, response) {
		response.writeHead(200, defaultResponseHeader);
		response.write("{\"s\":\"error\",\"errmsg\":\"" + error + "\"}");
		response.end();

		console.log(error);
	};

	this.sendConfig = function(response) {

		var config = {
			supports_search: true,
			supports_group_request: false,
			supports_marks: true,
			supports_timescale_marks: true,
			exchanges: [
				{value: "", name: "All Exchanges", desc: ""},
				{value: "XETRA", name: "XETRA", desc: "XETRA"},
				{value: "NSE", name: "NSE", desc: "NSE"},
				{value: "NasdaqNM", name: "NasdaqNM", desc: "NasdaqNM"},
				{value: "NYSE", name: "NYSE", desc: "NYSE"},
				{value: "CDNX", name: "CDNX", desc: "CDNX"},
				{value: "Stuttgart", name: "Stuttgart", desc: "Stuttgart"},
			],
			symbolsTypes: [
				{name: "All types", value: ""},
				{name: "Stock", value: "stock"},
				{name: "Index", value: "index"}
			],
			supportedResolutions: [ "1", "5", "15", "30", "60", "D", "2D", "3D", "W", "3W", "M", '6M' ]
		};

		response.writeHead(200, defaultResponseHeader);
		response.write(JSON.stringify(config));
		response.end();
	};


	this.sendMarks = function(response) {
		var now = new Date();
		now = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate())) / 1000;
		var day = 60 * 60 * 24;

		var marks = {
			id: [0, 1, 2, 3, 4, 5],
			time: [now, now - day * 4, now - day * 7, now - day * 7, now - day * 15, now - day * 30],
			color: ["red", "blue", "green", "red", "blue", "green"],
			text: ["Today", "4 days back", "7 days back + Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.", "7 days back once again", "15 days back", "30 days back"],
			label: ["A", "B", "CORE", "D", "EURO", "F"],
			labelFontColor: ["white", "white", "red", "#FFFFFF", "white", "#000"],
			minSize: [14, 28, 7, 40, 7, 14]
		};

		response.writeHead(200, defaultResponseHeader);
		response.write(JSON.stringify(marks));
		response.end();
	};
	
	this.sendTimescaleMarks = function(response) {
		var now = new Date();
		now = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate())) / 1000;
		var day = 60 * 60 * 24;
		
		var marks = [
		{id: "tsm1", time: now - day * 0, color: "red", label: "A", tooltip: ""},
		{id: "tsm2", time: now - day * 4, color: "blue", label: "D", tooltip: ["Dividends: $0.56", "Date: " + new Date((now - day * 4) * 1000).toDateString()]},
		{id: "tsm3", time: now - day * 7, color: "green", label: "D", tooltip: ["Dividends: $3.46", "Date: " + new Date((now - day * 7) * 1000).toDateString()]},
		{id: "tsm4", time: now - day * 15, color: "#999999", label: "E", tooltip: ["Earnings: $3.44", "Estimate: $3.60"]},		
		{id: "tsm7", time: now - day * 30, color: "red", label: "E", tooltip: ["Earnings: $5.40", "Estimate: $5.00"]},
		];

		response.writeHead(200, defaultResponseHeader);
		response.write(JSON.stringify(marks));
		response.end();
	};


	this.sendSymbolSearchResults = function(query, type, exchange, maxRecords, response) {
		if (!maxRecords) {
			throw "wrong_query";
		}

		var result = symbolsDatabase.search(query, type, exchange, maxRecords);

		response.writeHead(200, defaultResponseHeader);
		response.write(JSON.stringify(result));
		response.end();
	};


	this._pendingRequestType = "";
	this._lastYahooResponse = null;

	this.finance_charts_json_callback = function(data) {
		if (_pendingRequestType == "data") {
			_lastYahooResponse = data.series;
		}
		else if (_pendingRequestType == "meta") {
			_lastYahooResponse = data.meta;
		}
	};


	this.sendSymbolInfo = function(symbolName, response) {
		console.log("sendSymbolInfo: " + symbolName);
		if (MockupHistoryProvider.isMockupSymbolName(symbolName)) {
			console.log("is's a mockup");
			var result = MockupHistoryProvider.symbolInfo(symbolName);

			response.writeHead(200, defaultResponseHeader);
			response.write(JSON.stringify(result));
			response.end();
			return;
		}

		var symbolInfo = symbolsDatabase.symbolInfo(symbolName);

		if (symbolInfo === null) {
			throw "unknown_symbol " + symbolName;
		}

		var address = "/instrument/1.0/" + encodeURIComponent(symbolInfo.name) + "/chartdata;type=quote;/json";
		var that = this;

		console.log("Requesting symbol info: " + datafeedHost + address);

		httpGet(address, function(result) {
			_pendingRequestType = "meta";

			try {
				with (that) {
					eval(result);
				}
			}
			catch (error) {
				that.sendError("invalid symbol", response);
				return;
			}

			var lastPrice = _lastYahooResponse["previous_close"] + "";

			//	BEWARE: this `pricescale` parameter computation algorithm is wrong and works
			//	for symbols with 10-based minimal movement value only
			var pricescale = lastPrice.indexOf('.') > 0
				? Math.pow(10, lastPrice.split('.')[1].length)
				: 10;

			var info = {
				"name": symbolInfo.name + "*",
				"exchange-traded": symbolInfo.exchange,
				"exchange-listed": symbolInfo.exchange,
				"timezone": "America/New_York",
				"minmov": 1,
				"minmov2": 0,
				"pricescale": pricescale,
				"pointvalue": 1,
				"session": "0930-1630",
				"has_intraday": false,
				"has_no_volume": symbolInfo.type != "stock",
				"ticker": _lastYahooResponse["ticker"].toUpperCase(),
				"description": symbolInfo.description.length > 0 ? symbolInfo.description : symbolInfo.name,
				"type": symbolInfo.type,
				"supported_resolutions" : ["D","2D","3D","W","3W","M","6M"]
			};

			response.writeHead(200, defaultResponseHeader);
			response.write(JSON.stringify(info));
			response.end();
		});
	};

	this.sendSymbolHistory = function(symbol, startDateTimestamp, endDateTimestamp, resolution, response) {

		console.log("History request: " + symbol + ", " + resolution);

		if (MockupHistoryProvider.isMockupSymbolName(symbol)) {
			console.log("It's a mockup symbol");
			var originalResolution = resolution;
			if (resolution.toLowerCase() == 'd') {
				resolution = 1440;
			}

			var result = MockupHistoryProvider.history(symbol, resolution, startDateTimestamp, endDateTimestamp, originalResolution);

			response.writeHead(200, defaultResponseHeader);
			response.write(JSON.stringify(result));
			response.end();
			return;
		}

		var symbolInfo = symbolsDatabase.symbolInfo(symbol);

		if (symbolInfo === null) {
			throw "unknown_symbol";
		}

		var requestLeftDate = new Date(startDateTimestamp * 1000);

		var year = requestLeftDate.getFullYear();
		var month = requestLeftDate.getMonth();
		var day = requestLeftDate.getDate();

		if (resolution != "d" && resolution != "w" && resolution != "m") {
			throw "Unsupported resolution: " + resolution;
		}

		var address = "ichart.finance.yahoo.com/table.csv?s=" + symbolInfo.name +
			"&a=" + month +
			"&b=" + day  +
			"&c=" + year +
			"&g=" + resolution +
			"&ignore=.csv";

		console.log("Requesting data: " + address);

		var that = this;

		httpGet(address, function(result) {
			response.writeHead(200, defaultResponseHeader);
			response.write(JSON.stringify(convertYahooHistoryToUDFFormat(result)));
			response.end();
		});
	};

	this.sendQuotes = function(tickersString, response) {
		var tickersMap = {}; // maps YQL symbol to ticker

		var tickers = tickersString.split(",");
		[].concat(tickers).forEach(function(ticker) {
			var yqlSymbol = ticker.replace(/.*:(.*)/, "$1");
			tickersMap[yqlSymbol] = ticker;
		});

		var yql = "select * from yahoo.finance.quotes where symbol in ('" + Object.keys(tickersMap).join("','") + "')";
		console.log("Quotes query: " + yql);

		var options = {
			host: "query.yahooapis.com",
			path: "/v1/public/yql?q=" + encodeURIComponent(yql)
			   	+ "&format=json"
				+ "&env=store://datatables.org/alltableswithkeys",
		};
		// for debug purposes
		// console.log(options.host + options.path);

		http.request(options, function(res) {
			var result = '';

			res.on('data', function (chunk) {
				result += chunk;
			});

			res.on('end', function () {
				response.writeHead(200, defaultResponseHeader);
				response.write(JSON.stringify(convertYahooQuotesToUDFFormat(
						tickersMap, JSON.parse(result))));
				response.end();
			});
		}).end();
	};

	try
	{
		if (action == "/config") {
			this.sendConfig(response);
		}
		else if (action == "/symbols" && !!query["symbol"]) {
			this.sendSymbolInfo(query["symbol"], response);
		}
		else if (action == "/search") {
			this.sendSymbolSearchResults(query["query"], query["type"], query["exchange"], query["limit"], response);
		}
		else if (action == "/history") {
			this.sendSymbolHistory(query["symbol"], query["from"], query["to"], query["resolution"].toLowerCase(), response);
		}
		else if (action == "/quotes") {
			this.sendQuotes(query["symbols"], response);
		}
		else if (action == "/marks") {
			this.sendMarks(response);
		}
		else if (action == "/timescale_marks") {
			this.sendTimescaleMarks(response);
		}
	}
	catch (error) {
		this.sendError(error, response);
	}
};


//	Usage:
//		/config
//		/symbols?symbol=A
//		/search?query=B&limit=10
//		/history?symbol=C&from=DATE&resolution=E

var port = 8888;
http.createServer(function(request, response) {
	var uri = url.parse(request.url, true);
	var action = uri.pathname;
	new RequestProcessor(action, uri.query, response);
}).listen(port);

console.log("Datafeed running at\n => http://localhost:" + 8888 + "/\nCTRL + C to shutdown");