"use strict";

/* global console */
/* global require */
/* global exports */

var RequestProcessor = require("./request-processor").RequestProcessor;
var MockupHistoryProvider = require("./mockup-history-provider").MockupHistoryProvider;

var rates = {
	USD: 1,
	GBP: 0.795,
	RUB: 74.494,
	EUR: 0.915,
};

function convertToCurrency(values, currencyCode) {
	const rate = rates[currencyCode];
	return values.map((val) => val == null ? val : val * rate);
}

function inherit(child, base) {
	var baseP = base.prototype,	childP;

	childP = child.prototype = Object.create(baseP);
	childP.constructor = child;
	childP._super = baseP;
}

function MockupProcessor(symbolsDatabase) {
	symbolsDatabase.addSymbols(MockupHistoryProvider.symbols());
	this._super.constructor(symbolsDatabase);
}

inherit(MockupProcessor, RequestProcessor);

MockupProcessor.prototype._sendSymbolInfo = function(symbolName, currencyCode, response) {
	if (symbolName.length && symbolName[symbolName.length - 1] === '*') {
		symbolName = symbolName.slice(0, symbolName.length - 1);
	}
	if (MockupHistoryProvider.isMockupSymbolName(symbolName)) {
		console.log(symbolName + " is a mockup");
		var result = MockupHistoryProvider.symbolInfo(symbolName);
		if (currencyCode !== undefined) {
			result = Object.assign({}, result, { currency_code: currencyCode });
		}

		response.writeHead(200, this._defaultResponseHeader());
		response.write(JSON.stringify(result));
		response.end();
		return;
	}

	return this._super._sendSymbolInfo.apply(this, arguments);
};

MockupProcessor.prototype._sendSymbolHistory = function(symbol, startDateTimestamp, endDateTimestamp, resolution, currencyCode, response) {
	if (MockupHistoryProvider.isMockupSymbolName(symbol)) {
		console.log("History request: MOCKUP " + symbol + ", " + resolution);

		var result = MockupHistoryProvider.history(symbol, resolution, startDateTimestamp, endDateTimestamp, currencyCode);

		if (result.t.length === 0) {
			result.s = "no_data";
		}

		if (currencyCode !== undefined) {
			result.o = convertToCurrency(result.o, currencyCode);
			result.h = convertToCurrency(result.h, currencyCode);
			result.l = convertToCurrency(result.l, currencyCode);
			result.c = convertToCurrency(result.c, currencyCode);
		}

		response.writeHead(200, this._defaultResponseHeader());
		response.write(JSON.stringify(result));
		response.end();
		return;
	}

	return this._super._sendSymbolHistory.apply(this, arguments);
};

MockupProcessor.prototype._prepareSymbolInfo = function(symbolName) {
	var result = this._super._prepareSymbolInfo(symbolName);
	result.name = result.name + "*";
	return result;
};

exports.RequestProcessor = MockupProcessor;