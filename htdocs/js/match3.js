/*
	Well this file was intended to be reusable by the client and server if I ever got around to doing multiplayer.
	But I lost interest in this project a while back :( Oh well.
*/
if (typeof(exports) == 'undefined') exports = {};

/**
 * Provides the client/server logic for a match-3 playing board.
 * @class exports.match3
 */
exports.match3 = (function() {

	var conf = {
		getNewPiece : function() {
			throw('match3.js: conf.getNewPiece must be set.');
		},
		piecesX : 8,
		piecesY : 8
	};
	var fns = {};
	var pieces = [];

	/**
	 * Formats match meta-data into an easily usable JSON object.
	 * @param {Object} type
	 * @param {Object} x1
	 * @param {Object} y1
	 * @param {Object} x2
	 * @param {Object} y2
	 * @return {Object} The JSON object.
	 * @method formatMatch
	 */
	function formatMatch(type, x1, y1, x2, y2) {
		return {
			type : type,
			fromX : x1,
			fromY : y1,
			toX : x2,
			toY : y2
		};
	};

	/**
	 * Fetches a configuration setting.
	 * @param {String} key The key of the configuration setting to fetch.
	 * @return {Object} The value of the configuration setting requested.
	 * @method get
	 */
	function get(key) {
		return conf[key];
	};

	/**
	 * Sets a configuration setting.
	 * @param {String} key The key of the configuration setting to set.
	 * @param {Object} The value of the configuration key to set.
	 * @method set
	 */
	function set(key, value) {
		conf[key] = value;
	};

	/**
	 * Fetches the pieces array.
	 * @return {Array} The pieces array.
	 * @method getPieces
	 */
	function getPieces() {
		return pieces;
	};

	/**
	 * Sets the pieces array.
	 * @param {Array} newPieces The pieces array to set.
	 * @method setPieces
	 */
	function setPieces(newPieces) {
		pieces = newPieces;
	};

	/**
	 * Swaps two pieces.
	 * @param {Number} x1 The first x coordinate.
	 * @param {Number} y1 The first y coordinate.
	 * @param {Number} x2 The second x coordinate.
	 * @param {Number} y2 The second y coordinate.
	 * @return {Array} The pieces array.
	 * @method swapPieces
	 */
	function swapPieces(x1, y1, x2, y2) {

		var tmp1 = pieces[y1][x1];
		var tmp2 = pieces[y2][x2];

		pieces[y1][x1] = tmp2;
		pieces[y2][x2] = tmp1;

		return pieces;

	};

	/**
	 * Gets the current matches.
	 * @param {Boolean} justBool True to simply return true if there are matches, false if not.
	 * @return {Array | Boolean} An array of the coordinates of the current matches. Or true/false if justBool is set to true. 
	 * @method getMatches
	 */
	function getMatches(justBool) {

		var matches = [];

		for (var y = 0; y < conf.piecesY; y++) {
			for (var x = 0; x < (conf.piecesX - 2); x++) {

				var type = pieces[y][x];
				var match = [];

				for (var i = x; i < conf.piecesX; i++) {
					if (pieces[y][i] === type) {
						match.push({
							type : type,
							x : i,
							y : y
						});
					} else {
						break;
					}
				}

				if (match.length >= 3) {
					x = (i - 1);
					matches.push(match);
				}

			}
		}

		for (var x = 0; x < conf.piecesX; x++) {
			for (var y = 0; y < (conf.piecesY - 2); y++) {

				var type = pieces[y][x];
				var match = [];

				for (var i = y; i < conf.piecesY; i++) {
					if (pieces[i][x] === type) {
						match.push({
							type : type,
							x : x,
							y : i
						});
					} else {
						break;
					}
				}

				if (match.length >= 3) {
					y = (i - 1);
					matches.push(match);
				}

			}
		}

		return (justBool ? !!matches.length : matches);

	};

	/**
	 * Indicates if the board has any matches.
	 * @return {Boolean} true if there are current matches, otherwise false. 
	 * @method hasMatches
	 */
	function hasMatches() {
		return getMatches(true);
	};

	/**
	 * Fetches the possible matches.
	 * @param {Boolean} justBool If true, will return true/false indicating whether there are any matches or not.
	 * If set to false, will return an array of all possible matches.
	 * @return {Array || Boolean} An array of the coordinates of the possible matches. Or true/false if justBool is set to true. 
	 * @method getPossibleMatches
	 */
	function getPossibleMatches(justBool) {

		var coords = [];

		for (var y = 0; y < conf.piecesY; y++) {
			for (var x = 0; x < conf.piecesX; x++) {

				var piece = pieces[y][x];

				// Check to the right
				if (x < (conf.piecesX - 2)) {

					// Right straight
					if (x < (conf.piecesX - 3)) {
						// XX X
						if ((pieces[y][x+1] == piece) && (pieces[y][x+3] == piece)) {
							if (justBool) {
								return true;
							} else {
								coords.push(formatMatch(piece, x+3, y, x+2, y));
							}
						}
						// X XX
						if ((pieces[y][x+2] == piece) && (pieces[y][x+3] == piece)) {
							if (justBool) {
								return true;
							} else {
								coords.push(formatMatch(piece, x, y, x+1, y));
							}
						}
					}

					// Right up
					if (y > 0) {
						//	XX
						// X
						if ((pieces[y-1][x+1] == piece) && (pieces[y-1][x+2] == piece)) {
							if (justBool) {
								return true;
							} else {
								coords.push(formatMatch(piece, x, y, x, y-1));
							}
						}
						//	X
						// X X
						if ((pieces[y-1][x+1] == piece) && (pieces[y][x+2] == piece)) {
							if (justBool) {
								return true;
							} else {
								coords.push(formatMatch(piece, x+1, y-1, x+1, y));
							}
						}
						//	 X
						// XX
						if ((pieces[y][x+1] == piece) && (pieces[y-1][x+2] == piece)) {
							if (justBool) {
								return true;
							} else {
								coords.push(formatMatch(piece, x+2, y-1, x+2, y));
							}
						}
					}

					// Right down
					if (y < (conf.piecesY - 1)) {
						// X
						//	XX
						if ((pieces[y+1][x+1] == piece) && (pieces[y+1][x+2] == piece)) {
							if (justBool) {
								return true;
							} else {
								coords.push(formatMatch(piece, x, y, x, y+1));
							}
						}
						// X X
						//	X
						if ((pieces[y+1][x+1] == piece) && (pieces[y][x+2] == piece)) {
							if (justBool) {
								return true;
							} else {
								coords.push(formatMatch(piece, x+1, y+1, x+1, y));
							}
						}
						// XX
						//	 X
						if ((pieces[y][x+1] == piece) && (pieces[y+1][x+2] == piece)) {
							if (justBool) {
								return true;
							} else {
								coords.push(formatMatch(piece, x+2, y+1, x+2, y));
							}
						}
					}

				}

				// Check down
				if (y < (conf.piecesY - 2)) {

					// Down straight
					if (y < (conf.piecesY - 3)) {
						// X
						// X
						// 
						// X
						if ((pieces[y+1][x] == piece) && (pieces[y+3][x] == piece)) {
							if (justBool) {
								return true;
							} else {
								coords.push(formatMatch(piece, x, y+3, x, y+2));
							}
						}
						// X
						// 
						// X
						// X
						if ((pieces[y+2][x] == piece) && (pieces[y+3][x] == piece)) {
							if (justBool) {
								return true;
							} else {
								coords.push(formatMatch(piece, x, y, x, y+1));
							}
						}
					}

					// Down left
					if (x > 0) {
						//	X
						// X
						// X
						if ((pieces[y+1][x-1] == piece) && (pieces[y+2][x-1] == piece)) {
							if (justBool) {
								return true;
							} else {
								coords.push(formatMatch(piece, x, y, x-1, y));
							}
						}
						//	X
						// X
						//	X
						if ((pieces[y+1][x-1] == piece) && (pieces[y+2][x] == piece)) {
							if (justBool) {
								return true;
							} else {
								coords.push(formatMatch(piece, x-1, y+1, x, y+1));
							}
						}
						//	X
						//	X
						// X
						if ((pieces[y+1][x] == piece) && (pieces[y+2][x-1] == piece)) {
							if (justBool) {
								return true;
							} else {
								coords.push(formatMatch(piece, x-1, y+2, x, y+2));
							}
						}
					}

					// Down right
					if (x < (conf.piecesX - 1)) {
						// X
						//	X
						//	X
						if ((pieces[y+1][x+1] == piece) && (pieces[y+2][x+1] == piece)) {
							if (justBool) {
								return true;
							} else {
								coords.push(formatMatch(piece, x, y, x+1, y));
							}
						}
						// X
						//	X
						// X
						if ((pieces[y+1][x+1] == piece) && (pieces[y+2][x] == piece)) {
							if (justBool) {
								return true;
							} else {
								coords.push(formatMatch(piece, x+1, y+1, x, y+1));
							}
						}
						// X
						// X
						//	X
						if ((pieces[y+1][x] == piece) && (pieces[y+2][x+1] == piece)) {
							if (justBool) {
								return true;
							} else {
								coords.push(formatMatch(piece, x+1, y+2, x, y+2));
							}
						}
					}

				}

			} // for x
		} // for y

		return (justBool ? false : coords);

	};

	/**
	 * Indicates if the board has any possible matches.
	 * @return {Boolean} true if there are possible matches, otherwise false. 
	 * @method hasPossibleMatches
	 */
	function hasPossibleMatches() {
		return getPossibleMatches(true);
	};

	/**
	 * Indicates if two coordinates are adjacent to each other.
	 * @param {Number} x1 The first x coordinate.
	 * @param {Number} y1 The first y coordinate.
	 * @param {Number} x2 The second x coordinate.
	 * @param {Number} y2 The second y coordinate.
	 * @return {Boolean} true if the coordinate are adjacent to each other.
	 * @method isAdjacent
	 */
	function isAdjacent(x1, y1, x2, y2) {

		return (
			( // Up or down.
				(x1 == x2)
				&& (
					(y1 == y2-1)
					|| (y1 == y2+1)
				)
			)
			|| ( // Left or right.
				(y1 == y2)
				&& (
					(x1 == x2-1)
					|| (x1 == x2+1)
				)
			)

		);

	};

	/**
	 * Resets the board, ensuring there are valid matches.
	 * @return {Number} The number of attempts (for debugging).
	 * @method reset
	 */
	function reset() {

		var attempts = 0;

		do {

			pieces = [];

			for (var y = 0; y < conf.piecesY; y++) {

				pieces[y] = [];

				for (var x = 0; x < conf.piecesX; x++) {
					pieces[y].push(conf.getNewPiece());
				}

			}

			attempts++;

		} while (hasMatches() || !hasPossibleMatches());

		return attempts;

	};

	return {
		get : get,
		set : set,
		getPieces : getPieces,
		setPieces : setPieces,
		getMatches : getMatches,
		hasMatches : hasMatches,
		getPossibleMatches : getPossibleMatches,
		hasPossibleMatches : hasPossibleMatches,
		isAdjacent : isAdjacent,
		reset : reset,
		swapPieces : swapPieces
	};

})();
