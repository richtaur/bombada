/*

TODO:

- optimize everything to use a single sprite (sigh)
- realphabetize function order
- audit all sprite and layer usage -- might be stuff not using
- get into bombada.js and get rid of extraneous shit
- fix centerOn bug when board first initializes
- make is so that board/stats are switchable and/or rotatable
- way down the road, OPTIMIZE! probably make a single asset/SpriteSheet

*/

var puzzleGame = (function() {

var board = exports.board;

// Constants kinda
var GROUP_PIECE = 'piece';

var INTERVAL_MATCH = 250;

var PIECE_BUFFER = 3;
var PIECE_SIZE = 48;
var PIECES_X = 8;
var PIECES_Y = 8;

var SPEED_PIECE = 10;

var Z_INDEX_DEBUG = 100; // Highest, for debugging
var Z_INDEX_HUD = 90; // Stuff like mute button: always on top on all game UI
var Z_INDEX_MODAL = 80; // Just above the overlay
var Z_INDEX_OVERLAY = 70; // Covers up everything except the HUD and overlay
var Z_INDEX_PIECE = 60; // Above the board
var Z_INDEX_CURSOR = 50; // Below the pieces

var busy;
var gameData;
var layers;
var options = {
	soundOn : true
};
var player = {
	selected : {}
};
var sprites;

var init = function(data) {

	gameData = data;

	DGE.init({
		baseURL : (gameData.core.baseURL + gameData.theme + '/'),
		interval : gameData.core.interval,
		stage : gameData.stage
	});

	// TODO this should probably come from bombada.js or whatnot
	DGE.Text.defaults.color = gameData.design.color;
	DGE.Text.defaults.font = gameData.design.font;

	board.set('getRandomPiece', function() {

		if (DGE.rand(1, 10) == 1) { // 10% chance of a diamond
			return 0;
		} else {
			return DGE.rand(1, (gameData.pieceTypes.length - 1));
		}

	});

	layers = DGE.layers.set({

		loading : {
			init : function() {

/*
				var progress = new DGE.Text({
					addTo : this,
					color : '#FFF',
				}).setXY(300, 200);
*/

				new DGE.Loader([
// TODO: this isn't everything!
					gameData.assets[gameData.theme].soundOn,
					gameData.assets[gameData.theme].soundOff,
					gameData.assets[gameData.theme].title
				], {
					change : function(percentage) {
						//progress.text(percentage + '%');
					},
					complete : function() {
						//progress.remove();
						layers.play.showOnly();
					},
					error : function(e) {
// TODO
						//error("Sorry, couldn't find a file.", e);
					}
				});
			}

		},

		play : {
			init : function() {

				this.image(gameData.assets[gameData.theme].background);
// TODO why's this CSS here?
				this.setCSS('background-position', 'right top');

				new DGE.Sprite({
					addTo : this,
					image: gameData.assets[gameData.theme].title,
					width : 175,
					height : 60,
					x : 32,
					y : 22
				});

				this.board = new DGE.Sprite({
					addTo : this,
					width : ((PIECE_SIZE + PIECE_BUFFER) * PIECES_X),
					height : ((PIECE_SIZE + PIECE_BUFFER) * PIECES_Y)
				});

				this.counts = {};
				this.pieces = {};

				this.stats = new DGE.Sprite({
					addTo : this,
					width : 300,
					height : 360,
					x : 30,
					y : 96
				});

				// Money
				this.moneyIcon = new DGE.Sprite({
					addTo : this.stats,
					image : gameData.pieceTypes[1],
					width : PIECE_SIZE,
					height : PIECE_SIZE,
					x : 0,
					y : 0
				});

				this.moneyText = new DGE.Text({
					addTo : this.stats,
					color : '#449F24',
					size : 36,
					text : 0,
					x : (PIECE_SIZE + PIECE_BUFFER),
					y : 0
				});

				// Bombs
				this.bombsIcon = new DGE.Sprite({
					addTo : this.stats,
					image : gameData.pieceTypes[3],
					width : PIECE_SIZE,
					height : PIECE_SIZE,
					x : 0,
					y : (PIECE_SIZE + PIECE_BUFFER)
				});

				this.bombsText = new DGE.Text({
					addTo : this.stats,
					color : gameData.design.bombsTextColor,
					size : 36,
					text : 0,
					x : (PIECE_SIZE + PIECE_BUFFER),
					y : (PIECE_SIZE + PIECE_BUFFER)
				});

				new DGE.Text({
					addTo : this.stats,
					size : 20,
					text : gameData.copy.movesLeft,
					x : 0,
					y : (((PIECE_SIZE + PIECE_BUFFER) * 2) + 20)
				});

				this.movesIcon = new DGE.Sprite({
					addTo : this.stats,
					image : gameData.pieceTypes[4],
					width : PIECE_SIZE,
					height : PIECE_SIZE,
					x : 110,
					y : ((PIECE_SIZE + PIECE_BUFFER) * 2)
				});

				this.movesText = new DGE.Text({
					addTo : this.stats,
					size : 64,
					text : 10,
					x : 170,
					y : (((PIECE_SIZE + PIECE_BUFFER) * 2) - 2)
				});

			},
			show : function() {

DGE.debug('play.show');
				newGame();

				this.board.setXY(356, 36);
				clickPiece(0, 1);

			}
		}

	});

	// Persistent UI, onesies, etc.
	sprites = {

		cursor : new DGE.Sprite({
			cursor : true,
			image : gameData.assets[gameData.theme].boardCursor,
			width : 60,
			height : 60,
			x : 53,
			y : 2,
			zIndex : Z_INDEX_CURSOR
		}),

/*
		overlay : new DGE.Sprite({
fill : '#000',
			opacity : 0.8,
			zIndex : Z_INDEX_OVERLAY,
			width : DGE.STAGE_WIDTH,
			height : DGE.STAGE_HEIGHT
		}).hide(),
*/

		pieces : [],

		speaker : new DGE.Sprite({
			click : function() {

				if (options.soundOn) {
					options.soundOn = false;
					this.image(gameData.assets[gameData.theme].soundOff);
				} else {
					options.soundOn = true;
					this.image(gameData.assets[gameData.theme].soundOn);
				}

			},
			cursor : true,
			image : gameData.assets[gameData.theme].soundOn,
			width : 64,
			height : 53,
			x : 262,
			y : 30,
			zIndex : Z_INDEX_HUD
		}),

		version : new DGE.Text({
			color : '#FFF',
			size : 12,
			text : gameData.copy.version,
			wrap : false
		}).alignRight(-6).alignBottom(-6)

	};

	DGE.start();
	layers.loading.showOnly();

};

function error(e, debug) {
	// TODO: modal? or get rid of this
//console.log('an error occurred: ', e, debug);
};

function newGame() {
	board.reset();
	setBoard();
};

function clickPiece(px, py) {

	if (busy) return;

	var pieceClicked = getPieceByPXY(px, py);
	sprites.cursor.centerOn(pieceClicked);

	var psx = player.selected.px;
	var psy = player.selected.py;

	player.selected = {
		px : px,
		py : py
	};
//console.log('selected:', player.selected);

	if (!board.isAdjacent(psx, psy, px, py)) {
//console.log('not a m, its a selection');
		return;
	}
//console.log('that was a move, off we go');

	var numToMove = 2;
	var pieceCursor = getPieceByPXY(psx, psy);
	busy = true;

	board.swapPieces(px, py, psx, psy);

	var callbacks = {
		complete : function() {

			busy = !!(--numToMove);

			if (busy) return;

			if (board.hasMatches()) {

DGE.debug('we got a valid move, lez try it out');

				execMatches();

			} else {
DGE.debug('damn son, that move was not valid!');
			}

		}
	};

	pieceCursor.animate({
		x : {
			from : pieceCursor._x,
			to : pieceClicked._x
		},
		y : {
			from : pieceCursor._y,
			to : pieceClicked._y
		},
	}, INTERVAL_MATCH, callbacks);

	pieceClicked.animate({
		x : {
			from : pieceClicked._x,
			to : pieceCursor._x
		},
		y : {
			from : pieceClicked._y,
			to : pieceCursor._y
		},
	}, INTERVAL_MATCH, callbacks);

};

function clickPieceByCoords(x, y) {

	var px = ((x - 2) / (PIECE_SIZE + PIECE_BUFFER));
	var py = ((y - 1) / (PIECE_SIZE + PIECE_BUFFER));

	clickPiece(px, py);

};

function getPieceByPXY(px, py) {

	var found = DGE.Sprite.getByGroup(GROUP_PIECE);

	if (found) {

		for (var i = 0; i < found.length; i++) {

			var x = ((PIECE_SIZE + PIECE_BUFFER) * px + 2);
			var y = ((PIECE_SIZE + PIECE_BUFFER) * py + 1);

			if (
				(found[i]._x == x)
				&& (found[i]._y == y)
			) return found[i];

		}

	}

	throw("Couldn't find a piece at " + px + ", " + py);

};

function execMatches() {

	var matches = board.getPiecesMatched();

DGE.debug('matches:', matches);

	for (var i = 0; i < matches.length; i++) {

		var coords = matches[i];
		var piece = getPieceByPXY(coords.x, coords.y);

		piece.anchorToStage();

		switch (piece._piece) {
			case 0: // diamond
			case 1: // money
			case 2: // coin
				var pieceTo = layers.play.moneyIcon;
				break;
			case 3: // bomb
				var pieceTo = layers.play.bombsIcon;
				break;
			case 4: // clock
				var pieceTo = layers.play.movesIcon;
				break;
		}

		if (pieceTo) {
			piece.angleTo(pieceTo, true);
		} else {
			piece.angle(270);
			piece.move = DGE.Sprite.move.angle;
		}

	}

};

function setBoard() {

	var pieces = board.getPieces();

	for (var x = 0; x < PIECES_X; x++) {
		sprites.pieces[x] = [];
		for (var y = 0; y < PIECES_Y; y++) {

			sprites.pieces[x].push(new DGE.Sprite({
				addTo : layers.play.board,
				click : function() {
					clickPieceByCoords(this._x, this._y);
				},
				cursor : true,
				group : GROUP_PIECE,
				image : gameData.pieceTypes[pieces[x][y]],
				speed : SPEED_PIECE,
				width : PIECE_SIZE,
				height : PIECE_SIZE,
				x : ((PIECE_SIZE + PIECE_BUFFER) * x + 2),
				y : ((PIECE_SIZE + PIECE_BUFFER) * y + 1),
				zIndex : Z_INDEX_PIECE
			}));

			sprites.pieces[x][y]._piece = pieces[x][y];

		}
	}

};

return init;

})();
