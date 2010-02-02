/*

TODO:
- audit all sprite and layer usage -- might be stuff not using
- down the road, OPTIMIZE! probably make a single asset/SpriteSheet
- if we're going to have the image filenames in bombada.js,
	also will need the image dimensions as right now it's hardcoded
- figure out why git reset --hard isn't working on slicehost
- Moves Left and Move Left (when only one move left)

things left before beta is done:
- finish flow (select pieces, earn points, drop bombs, etc.)
- easing
- local storage (DGE.data)
- music/sound effects from josh
- export to Android
- and iPhone
- have an overlay with a Game Over modal
	it should tell your your score and if you beat the old score
	with an OK button

*/

var puzzleGame = (function() {

var board = exports.board;

// Constants kinda
var DEFAULT_NUM_MOVES = 10;
var GROUP_PIECE = 'piece';
var INTERVAL_MATCH = 250;
var INTERVAL_NOTICE = 750;
var PIECE_BUFFER = 0;
var PIECES_X = 8;
var PIECES_Y = 8;
var SPEED_PIECE = 10;
var Z_INDEX_UI = 3; // Stuff like mute button: always on top on all game UI
var Z_INDEX_CURSOR = 2; // Above the board
var Z_INDEX_PIECE = 1; // Above the background

var audio;
var busy;
var gameData;
var layers;
var player = {
	movesLeft : 0,
	movesTo : 0,
	selected : {}
};
var sprites;

var init = function(data) {

	gameData = data;

	DGE.init({
		baseURL : gameData.core.baseURL,
		interval : gameData.core.interval,
		stage : gameData.stage
	});

	DGE.Text.defaults.color = gameData.design.color;
	DGE.Text.defaults.font = gameData.design.font;
	DGE.Text.defaults.shadow = gameData.design.shadow;

	board.set('getNewPiece', function() {

		if (DGE.rand(1, 10) == 1) { // 10% chance of a diamond
			return 0;
		} else {
			return DGE.rand(1, (gameData.pieceTypes.length - 1));
		}

	});

	new DGE.Loader([gameData.assets]);

	audio = {
		invalidMove : new DGE.Audio({
			file : gameData.audio.invalidMove
		}),
		music : new DGE.Audio({
			file : gameData.audio.music
		}),
		soundOn : new DGE.Audio({
			file : gameData.audio.soundOn
		})
	};

	layers = DGE.layers.set({

		play : {
			init : function() {

				this.image(gameData.assets.background);

				this.board = new DGE.Sprite({
					addTo : this,
					width : ((gameData.design.pieceSize + PIECE_BUFFER) * PIECES_X),
					height : ((gameData.design.pieceSize + PIECE_BUFFER) * PIECES_Y)
				});

				this.counts = {};
				this.pieces = {};

				// Money
				this.moneyIcon = new DGE.Sprite({
					addTo : this,
					image : gameData.pieceTypes[1],
					width : gameData.design.pieceSize,
					height : gameData.design.pieceSize,
					x : 0,
					y : 0
				});

				this.moneyText = new DGE.Text({
					addTo : this,
					color : '#449F24',
					size : 36,
					text : 0,
					x : (gameData.design.pieceSize + PIECE_BUFFER),
					y : 0
				});

				// Bombs
				this.bombsIcon = new DGE.Sprite({
					addTo : this,
					image : gameData.pieceTypes[3],
					width : gameData.design.pieceSize,
					height : gameData.design.pieceSize,
					x : 0,
					y : (gameData.design.pieceSize + PIECE_BUFFER)
				});

				this.bombsText = new DGE.Text({
					addTo : this,
					color : gameData.design.bombsTextColor,
					size : 36,
					text : 0,
					x : (gameData.design.pieceSize + PIECE_BUFFER),
					y : (gameData.design.pieceSize + PIECE_BUFFER)
				});

				new DGE.Text({
					addTo : this,
					color : '#A3A4AA',
					size : 14,
					text : gameData.copy.movesLeft,
					width : 170,
					x : 0,
					y : 294
				}).setCSS('text-align', 'center');

/*
				this.movesIcon = new DGE.Sprite({
					addTo : this,
					image : gameData.pieceTypes[4],
					width : gameData.design.pieceSize,
					height : gameData.design.pieceSize,
					x : 110,
					y : 
				});
*/

				this.movesText = new DGE.Text({
					addTo : this,
					font : gameData.design.movesFont,
					ping : function() {

						if (player.movesLeft < player.movesTo) {
							player.movesLeft++;
						} else if (player.movesLeft > player.movesTo) {
							player.movesLeft--;
						}

						this.text(player.movesLeft, 'number');

					},
					size : 64,
					width: 170,
					x : 0,
					y : 230
				}).setCSS('text-align', 'center');

			}
		}

	});

	sprites = {

		cursor : new DGE.Sprite({
			cursor : true,
			image : gameData.assets.cursor,
			ping : gameData.design.cursorPing,
			width : 54,
			height : 54,
			x : 53,
			y : 2,
			zIndex : Z_INDEX_CURSOR
		}),

		notice : new DGE.Text({
			size : gameData.design.noticeSize,
			zIndex : Z_INDEX_UI
		}),

		pieces : [],

		speaker : new DGE.Sprite({
			click : function() {

				if (DGE.Audio.enabled) {
					DGE.Audio.enabled = false;
					audio.music.pause();
					this.image(gameData.assets.soundOff);
				} else {
					DGE.Audio.enabled = true;
					audio.music.play();
					audio.soundOn.play();
					this.image(gameData.assets.soundOn);
				}

			},
			cursor : true,
			image : gameData.assets.soundOn,
			width : 64,
			height : 53,
			x : 262,
			y : 30,
			zIndex : Z_INDEX_UI
		}),

		version : new DGE.Text({
			color : '#FFF',
			size : 8,
			text : gameData.copy.version,
			wrap : false,
			x : 140,
			y : 55
		})

	};

	audio.music.play();
	DGE.start();
	newGame();

};

function clickPiece(px, py) {

	if (busy) return;

	var pieceClicked = getPieceByPXY(px, py);
	sprites.cursor.centerOn(pieceClicked).show();

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

				// Invalid move!
				audio.invalidMove.play();
				if (--player.movesTo == 0) newGame();
				showNotice(gameData.copy.invalidMove, gameData.design.errorColor);

				pieceCursor.animate({
					x : {
						from : pieceCursor._x,
						to : pieceClicked._x
					},
					y : {
						from : pieceCursor._y,
						to : pieceClicked._y
					},
				}, (INTERVAL_MATCH / 3));

				pieceClicked.animate({
					x : {
						from : pieceClicked._x,
						to : pieceCursor._x
					},
					y : {
						from : pieceClicked._y,
						to : pieceCursor._y
					},
				}, (INTERVAL_MATCH / 3));

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

	var px = ((x - 2) / (gameData.design.pieceSize + PIECE_BUFFER));
	var py = ((y - 1) / (gameData.design.pieceSize + PIECE_BUFFER));

	clickPiece(px, py);

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

function getPieceByPXY(px, py) {

	var found = DGE.Sprite.getByGroup(GROUP_PIECE);

	if (found) {

		for (var i = 0; i < found.length; i++) {

			var x = ((gameData.design.pieceSize + PIECE_BUFFER) * px + 2);
			var y = ((gameData.design.pieceSize + PIECE_BUFFER) * py + 1);

			if (
				(found[i]._x == x)
				&& (found[i]._y == y)
			) return found[i];

		}

	}

	throw(DGE.printf("Couldn't find a piece at %s, %s", px, py));

};

function newGame() {

	player.movesLeft = DEFAULT_NUM_MOVES;
	player.movesTo = DEFAULT_NUM_MOVES;

	board.reset();
	DGE.Sprite.getByGroup(GROUP_PIECE, 'remove');
	setBoard();

	layers.play.show();
	layers.play.board.plot(176, 16);
	sprites.cursor.hide();

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
				width : gameData.design.pieceSize,
				height : gameData.design.pieceSize,
				x : ((gameData.design.pieceSize + PIECE_BUFFER) * x + 2),
				y : ((gameData.design.pieceSize + PIECE_BUFFER) * y + 1),
				zIndex : Z_INDEX_PIECE
			}));

			sprites.pieces[x][y]._piece = pieces[x][y];

		}
	}

};

function showNotice(msg, color) {

	sprites.notice
		.color(color)
		.text(msg)
		.show()
		.center()
		.animate({
			opacity : {
				from : 1,
				to : 0
			},
			size : {
				from : gameData.design.noticeSize,
				to : gameData.design.noticeSizeTo
			}
		}, INTERVAL_NOTICE, {
			complete : function() {
				this.hide();
				this.size(gameData.design.noticeSize);
			},
			tween : function() {
				this.center();
			}
		});

};

return init;

})();
