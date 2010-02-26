// BUGS:
// TODO: Game Over modal showing before score is incremented properly
// TODO: may want to make the cursor smaller since clicking IT is what drops bombs. it's big so the bounding box is big

// FEATURES:
// TODO: double click to lay a bomb (with error message if out of bombs)
// TODO: use portrait mode like a phone would be used?
// TODO: show notices for awesome moves (4+ match) or cascades (2+ cascade)
// TODO: how to play
// TODO: settings: audio on/off, credits, reset high score
// TODO: OPTIMIZE! make everything a single SpriteSheet (do this LAST)
// TODO: bombsUsed

// POLISH:
// TODO: polish pieces moving to their icons
// TODO: increment the scores up on Game Over modal, don't just show them (polish!)
// TODO: Real Game Over menu

// NICE TO HAVE:
// TODO: instead of "Game Over", show a message like "You can do better" or "That's all you got?"
// TODO: high scores, maybe dates attached, and/or names attached? (most likely just the date)

(function() {

var board = exports.board;

// Constants (kinda).
var COLOR_ERROR = '#EB0405';
var DEFAULT_NUM_MOVES = 10;
var DELAY_ERROR = 100;
var DELAY_FADE = 500;
var DELAY_MATCH = 500;
var DELAY_MONEY = 10;
var DELAY_MOVE = 250;
var DELAY_NOTICE = 750;
var FRAMES_FALLING = 30;
var FRAMES_MOVING = 15;
var GROUP_PIECE = 'piece';
var MONEY_INCREMENT = 1;
var PIECE_SIZE = 36;
var PIECES_X = 8;
var PIECES_Y = 8;
var VELOCITY_PIECE = 15;
var Z_MODAL = 6; // The game over message stuff.
var Z_OVERLAY = 5; // Over everything but the stuff within the game over modal.
var Z_UI = 4; // Always above the pieces.
var Z_MOVING = 3; // Moving, so above the other pieces to prevent visual clutter.
var Z_PIECE = 2; // Above the background.

var assets = {
	background : 'gfx/480x320/bg.png',
	cursor : 'gfx/480x320/cursor.png',
	iconBomb : 'gfx/480x320/icon_bomb.png',
	iconMoney : 'gfx/480x320/icon_money.png',
	soundOn : 'gfx/volume_on.png',
	soundOff : 'gfx/volume_off.png'
};
var audio;
var busy;
var highScore;
var pieceTypes = [
/*
	'gfx/bombadaTiles/1.png',
	'gfx/bombadaTiles/2.png',
	'gfx/bombadaTiles/3.png',
	'gfx/bombadaTiles/4.png',
	'gfx/bombadaTiles/5.png',
	'gfx/bombadaTiles/6.png',
	'gfx/bombadaTiles/7.png'
*/
	'gfx/480x320/piece_diamond.png',
	'gfx/480x320/piece_money.png',
	'gfx/480x320/piece_coin.png',
	'gfx/480x320/piece_bomb.png',
	'gfx/480x320/piece_clock.png',
	'gfx/480x320/piece_crate.png',
	'gfx/480x320/piece_barrel.png'
];
var pieceWorth = [
	25, // Diamond.
	10, // Dollar.
	5 // Coin.
];
var player = {};
var queue = new DGE.Object();
var sprites;

/**
 * Initializes Bombada.
 * @method init
 */
function init() {

	DGE.init({
		id : 'bombada',
		image : assets.background,
		width : 480,
		height : 320
	});

	highScore = DGE.Data.get('highScore');
	if (!highScore) highScore = 10000;
	DGE.Data.set('highScore', highScore);

	DGE.Text.defaults.color = '#FFF';
	DGE.Text.defaults.font = 'Lucida Grande, Helvetica, Sans-Serif';
	DGE.Text.defaults.shadow = '2px 2px 2px #000';
	DGE.Text.defaults.size = 20;
	DGE.Text.defaults.height = 30;

	board.set('getNewPiece', getNewPiece);

	new DGE.Loader([assets]);

	audio = {
		invalidMove : new DGE.Audio({
			file : 'audio/EnemyDeath.ogg'
		}),
/*
		music : new DGE.Audio({
			file : 'audio/sly.ogg'
		}),
*/
		soundOn : new DGE.Audio({
			file : 'audio/Powerup.ogg'
		})
	};

	sprites = {

		board : new DGE.Sprite({
			width : (PIECE_SIZE * PIECES_X),
			height : (PIECE_SIZE * PIECES_Y),
			x : 176,
			y : 16,
			z : Z_PIECE
		}),

		bombsIcon : new DGE.Sprite({
			image : assets.iconBomb,
			width : 39,
			height : 39,
			x : 10,
			y : 140
		}),

		bombsText : new DGE.Text({
			color : '#FE6401',
			size : 36,
			text : 0,
			width : 110,
			height : 42,
			x : 60,
			y : 140,
			z : Z_UI
		}).on('ping', function() {

			if (player.bombs == player.bombsTo) return;

			if (player.bombs < player.bombsTo) {
				player.bombs++;
			} else if (player.bombs > player.bombsTo) {
				player.bombs--;
			}

			this.set('text', DGE.formatNumber(player.bombs));

		}).start(),

		cursor : new DGE.Sprite({
			cursor : true,
			image : assets.cursor,
			width : 54,
			height : 54,
			x : 53,
			y : 2,
			z : Z_UI
		}).on('click', function() {
			dropBomb();
		}).on('ping', function() {

			var offset = 1.5;

			if (this.get('direction')) {
				this.offset('opacity', offset);
				if (this.get('opacity') >= 100) {
					this.set('direction', false);
				}
			} else {
				this.offset('opacity', -offset);
				if (this.get('opacity') <= 45) {
					this.set('direction', true);
				}
			}

		}).start(),

		modal : new DGE.Sprite({
			width : DGE.stage.width,
			height : DGE.stage.height,
			z : Z_MODAL
		}).hide(),

		moneyIcon : new DGE.Sprite({
			image : assets.iconMoney,
			width : 24,
			height : 44,
			x : 10,
			y : 80
		}),

		moneyText : new DGE.Text({
			color : '#D3B701',
			delay : DELAY_MONEY,
			size : 36,
			text : 0,
			width : 110,
			height : 42,
			x : 60,
			y : 80,
			z : Z_UI
		}).on('ping', function() {

			if (player.money == player.moneyTo) return;

			if (player.money < player.moneyTo) {
				player.money += MONEY_INCREMENT;
			}

			if (player.money > player.moneyTo) {
				player.money = player.moneyTo;
			}

			this.set('text', DGE.formatNumber(player.money));

		}).start(),

		moves : new DGE.Text({
			align : 'center',
			color : '#A3A4AA',
			size : 14,
			text : 'Moves Left',
			width : 170,
			height : 15,
			x : 0,
			y : 290
		}),

		movesText : new DGE.Text({
			align : 'center',
			font : 'Helvetica, Sans-Serif',
			size : 64,
			width : 170,
			height : 64,
			x : 0,
			y : 220,
			z : Z_UI
		}).on('ping', function() {

			if (player.moves == player.movesTo) return;

			if (player.moves < player.movesTo) {
				player.moves++;
			} else if (player.moves > player.movesTo) {
				player.moves--;
			}

			this.set('text', DGE.formatNumber(player.moves));

		}).start(),

		notice : new DGE.Text({
			align : 'center',
			width : DGE.stage.width,
			height : 50,
			z : Z_MODAL
		}).hide(),

		overlay : new DGE.Sprite({
			width : DGE.stage.width,
			height : DGE.stage.height,
			z : Z_OVERLAY
		}).fill('#000').hide(),

/*
		speaker : new DGE.Sprite({
			cursor : true,
			image : assets.soundOn,
			width : 64,
			height : 53,
			x : 262,
			y : 30
		}).on('click', function() {

			if (DGE.Audio.enabled) {
				DGE.Audio.enabled = false;
				audio.music.pause();
				this.set('image', (assets.soundOff));
			} else {
				DGE.Audio.enabled = true;
				audio.music.play();
				audio.soundOn.play();
				this.set('image', (assets.soundOn));
			}

		}),
*/

		version : new DGE.Text({
			color : '#FFF',
			size : 8,
			text : 'v0.1',
			x : 140,
			y : 55
		})

	};

	sprites.gameOver = {
		header : new DGE.Text({
			align : 'center',
			parent : sprites.modal,
			size : 40,
			text : 'Game Over',
			width : DGE.stage.width,
			height : 50,
			y : 50
		}),
		yourScore : new DGE.Text({
			align : 'center',
			parent : sprites.modal,
			width : DGE.stage.width,
			height : 30,
			y : 120
		}),
		highScore : new DGE.Text({
			align : 'center',
			parent : sprites.modal,
			width : DGE.stage.width,
			height : 30,
			y : 145
		}),
		movesUsed : new DGE.Text({
			align : 'center',
			parent : sprites.modal,
			width : DGE.stage.width,
			height : 30,
			y : 170
		}),
		playAgain : new DGE.Text({
			align : 'center',
			cursor : true,
			parent : sprites.modal,
			width : DGE.stage.width,
			text : 'Play Again?',
			height : 30,
			y : 220
		}).on('click', newGame)

	};

	//audio.music.play();
	newGame();

};

/**
 * Initiates a click on a piece.
 * @param {Number} pieceX The X coordinate of the piece to click.
 * @param {Number} pieceY The Y coordinate of the piece to click.
 * @method clickPiece
 */
function clickPiece(pieceX, pieceY) {

	if (busy) return;

	var pieceClicked = getPieceByPieceXY(pieceX, pieceY);

	sprites.cursor.centerOn(pieceClicked).show();

	var selectedPieceX = player.selected.pieceX;
	var selectedPieceY = player.selected.pieceY;

	player.selected = {
		pieceX : pieceX,
		pieceY : pieceY
	};

	// We're all done if this was just a selection.
	if (!board.isAdjacent(selectedPieceX, selectedPieceY, pieceX, pieceY)) return;

	// This wasn't a selection, it was a move!
	busy = true;
	var pieceCursor = getPieceByPieceXY(selectedPieceX, selectedPieceY);

	queue.on('change:numActive', null);
	queue.set('numActive', 2);
	queue.on('change:numActive', function(numActive) {

		if (numActive) return;

		player.movesTo--;
		player.movesUsed++;

		if (board.hasMatches()) {
			player.selected = {};
			sprites.cursor.hide();
			execMatches();
		} else {

			audio.invalidMove.play();
			board.swapPieces(pieceX, pieceY, selectedPieceX, selectedPieceY);
			showNotice('Invalid move', COLOR_ERROR, function() {
				busy = false;
				if (player.moves == 0) gameOver();
			});

			var cursorToX = pieceClicked.x;
			var cursorToY = pieceClicked.y;
			var clickedToX = pieceCursor.x;
			var clickedToY = pieceCursor.y;

			pieceCursor.animate({
				x : cursorToX,
				y : cursorToY
			}, DELAY_ERROR);

			pieceClicked.animate({
				x : clickedToX,
				y : clickedToY
			}, DELAY_ERROR);

		}

	});

	board.swapPieces(pieceX, pieceY, selectedPieceX, selectedPieceY);

	var callbacks = {
		complete : function() {
			queue.offset('numActive', -1);
		}
	};

	pieceCursor.animate({
		x : pieceClicked.x,
		y : pieceClicked.y
	}, DELAY_MOVE, callbacks);

	pieceClicked.animate({
		x : pieceCursor.x,
		y : pieceCursor.y
	}, DELAY_MOVE, callbacks);

};

/**
 * Clicks a piece based on X and Y coordinates (a helper function for clickPiece).
 * @param {Number} x The X coordinate of the piece to click.
 * @param {Number} y The Y coordinate of the piece to click.
 * @method clickPieceByCoords
 */
function clickPieceByCoords(x, y) {

	var pieceX = (x / PIECE_SIZE);
	var pieceY = (y / PIECE_SIZE);

	clickPiece(pieceX, pieceY);

};

/**
 * Attempts to drop a bomb where the cursor is.
 * @method dropPieces
 */
function dropBomb() {

	if (!player.bombs) {
		showNotice('No bombs', COLOR_ERROR);
		return;
	}

	player.bombsTo--;

	var pieceX = player.selected.pieceX;
	var pieceY = player.selected.pieceY;

	execMatches([{
		x : pieceX,
		y : pieceY
	}]);

};

/**
 * Applies gravity to pieces on the board and drops new ones from above.
 * @method dropPieces
 */
function dropPieces() {

	var holes;
	var pieces = board.getPieces();
	var stack = [];
	var toDrop = [];

	// Find out which pieces need to be dropped.
	for (var x = 0; x < PIECES_X; x++) {

		holes = 0;
		stack[x] = 0;

		for (var y = (PIECES_Y - 1); y >= 0; y--) {

			if (pieces[y][x] === false) {
				holes++;
				stack[x]++;
			} else if (holes) {
				toDrop.push(getPieceByPieceXY(x, y).set('maxY', ((y + holes) * PIECE_SIZE)));
//DGE.log('1. Latest toDrop: ', toDrop[toDrop.length - 1].get('type'));
			}

		}
	}

	// Drop the stacked pieces from above the board.
	for (var x = 0; x < PIECES_X; x++) {
		for (var i = 0; i < stack[x]; i++) {
			toDrop.push(
				makePiece(x, -(i + 1), getNewPiece()).set('maxY', ((stack[x] - i - 1) * PIECE_SIZE))
			);
//DGE.log('2. Latest toDrop: ', toDrop[toDrop.length - 1].get('type'));
		}
	}

	// Set gravity on the pieces to drop.
	for (var i = 0; i < toDrop.length; i++) {

		toDrop[i]
			.set('angle', 270)
			.set('frame', 0)
			.set('framesMax', FRAMES_FALLING)
			.on('ping', function() {

				var maxY = this.get('maxY');

				if (this.y >= maxY) {
					this.stop();
					this.set('y', maxY);
					queue.offset('numActive', -1);
				}
				
			});

	}

	// Move all the sprites at the same time.
	queue.moving = queue.moving.concat(toDrop);

	// Listen to when the sprites are all done moving.
	queue.on('change:numActive', null);
	queue.set('numActive', queue.moving.length);
	queue.on('change:numActive', function(numActive) {

		if (numActive) return;

		board.setPieces(setBoard());

//DGE.log('num possible matches', board.getPossibleMatches().length);
		if (board.hasMatches()) {
			execMatches();
		} else {

			if (player.moves == 0) {
				gameOver();
			} else if (!board.hasPossibleMatches()) {
				newBoard();
			} else {
				busy = false;
			}

		}

	});

	for (var i = 0; i < queue.moving.length; i++) {
		queue.moving[i].set('moving', true).start();
	}

};

/**
 * Executes any matches on the board.
 * @param {Array} additionalMatches (optional) An array of {x:x,y:y} matches to supplement what's actually matched.
 * @method execMatches
 */
function execMatches(additionalMatches) {

	player.cascade++;
//DGE.log('cascade: ' + player.cascade);

	var matched = board.getPiecesMatched();
	var pieces = board.getPieces();

	if (additionalMatches) {
		matched = matched.concat(additionalMatches);
	}

//DGE.log('[NOTICE] pieces matched: ', matched);

	queue.moving = [];

	for (var i = 0; i < matched.length; i++) {

		var x = matched[i].x;
		var y = matched[i].y;
		var piece = getPieceByPieceXY(x, y);

		piece
			.anchorToStage()
			.set('frame', 0)
			.set('framesMax', FRAMES_MOVING)
			.set('group', null);

		switch (piece.get('type')) {
			case 0: // Diamond.
			case 1: // Money.
			case 2: // Coin.
				piece.set('angle', piece.getAngleTo(sprites.moneyIcon));
				piece.on('ping', function() {

					if (this.isTouching(sprites.moneyIcon)) {
						player.moneyTo += pieceWorth[this.get('type')];
						queue.offset('numActive', -1);
						this.remove();
					}

				});
				break;
			case 3: // Bomb.
				piece.set('angle', piece.getAngleTo(sprites.bombsIcon));
				piece.on('ping', function() {

					if (this.isTouching(sprites.bombsIcon)) {
						player.bombsTo++;
						queue.offset('numActive', -1);
						this.remove();
					}

				});
				break;
			case 4: // Clock.
				piece.set('angle', piece.getAngleTo(sprites.movesText.getCenter()));
				piece.on('ping', function() {

					if (!this.get('active')) return;

					this.offset('rotation', 18);

					if (this.isTouching(sprites.movesText)) {

						player.movesTo++;
						queue.offset('numActive', -1);
						this.set('active', false);

						this.fade(0, 100, function() {
							this.remove();
						});

					}

				});
				break;
			default: // Everything else.
				piece.set('angle', 270);
				piece.set('framesMax', FRAMES_FALLING);
				piece.set('z', Z_MOVING);
				piece.on('ping', function() {

					this.offset('opacity', -1);
					this.offset('rotation', 1);

					if (this.isOutOfBounds(true)) {
						queue.offset('numActive', -1);
						this.remove();
					}

				});
				break;
		}

		pieces[y][x] = false;
		queue.moving.push(piece);

	}

//DGE.log('pieces:',pieces);
	board.setPieces(pieces);
//boardDump();
	dropPieces();

};

/**
 * Shows the game over modal.
 * @method gameOver
 */
function gameOver() {

	// wait is this right ...
	var interval = new DGE.Interval({
		interval : function() {
		}
	});

	var values = {
		money : 0,
		highScore : 0,
		movesUsed : 0
	};

	sprites.gameOver.yourScore.set('text', ('Your Score: ' + DGE.formatNumber(player.money)));
	sprites.gameOver.highScore.set('text', ('High Score: ' + DGE.formatNumber(highScore)));
	sprites.gameOver.movesUsed.set('text', ('Total Moves: ' + DGE.formatNumber(player.movesUsed)));

	sprites.modal.set('opacity', 0);
	sprites.overlay.set('opacity', 0);

	sprites.modal.show();
	sprites.overlay.show();

	sprites.modal.fade(100, DELAY_FADE);
	sprites.overlay.fade(90, DELAY_FADE, function() {

		busy = false;

	});

};

/**
 * Gets a new (random) piece type for the board.
 * @return {Number} A random piece type.
 */
function getNewPiece() {
	return DGE.rand(pieceTypes);
};

/**
 * Gets a piece by its piece X/Y coordinates.
 * @param {Number} pieceX The X coordinate of the piece to click.
 * @param {Number} pieceY The Y coordinate of the piece to click.
 * @return {Object} The Sprite at the passed piece coordinates.
 * @method getPieceByPieceXY
 */
function getPieceByPieceXY(pieceX, pieceY) {

	var children = DGE.Sprite.getByProperty('group', GROUP_PIECE);
	var testX = (PIECE_SIZE * pieceX);
	var testY = (PIECE_SIZE * pieceY);

	for (var x = 0; x < PIECES_X; x++) {
		for (var y = 0; y < PIECES_Y; y++) {
			for (var i = 0; i < children.length; i++) {
				var sprite = children[i];
				if (sprite.isAt(testX, testY)) return sprite;
			}
		}
	}

	throw DGE.sprintf("Couldn't find a piece at %s, %s (checked %s, %s)", pieceX, pieceY, testX, testY);

};

/**
 * Makes a new piece at the passed piece coordinates.
 * @param {Number} x The X coordinate of the piece to make.
 * @param {Number} y The Y coordinate of the piece to make.
 * @param {Number} type The type of piece to make.
 * @return {Object} The new piece.
 * @method makePiece
 */
function makePiece(x, y, type) {

	return new DGE.Sprite({
		cursor : true,
		group : GROUP_PIECE,
		image : pieceTypes[type],
		parent : sprites.board,
		pieceX : x,
		pieceY : y,
		type : type,
		velocity : VELOCITY_PIECE,
		width : PIECE_SIZE,
		height : PIECE_SIZE,
		x : (PIECE_SIZE * x),
		y : (PIECE_SIZE * y)
	}).on('mouseDown', function() {
		clickPieceByCoords(this.x, this.y);
	});

};

/**
 * Drops all the current pieces and creates a new board.
 * @method newBoard
 */
function newBoard() {

	busy = false;
	var children = DGE.Sprite.getByProperty('group', GROUP_PIECE);
	var numPieces = (PIECES_X * PIECES_Y);
	var pieces = board.getPieces();

	showNotice('No moves', COLOR_ERROR);

	function ping() {

		this.offset('opacity', -1);
		this.offset('rotation', 1);

		if (this.isOutOfBounds(true)) {

			this.remove();

			if (--numPieces == 0) {
				busy = false;
				sprites.board.set('opacity', 0);
				board.reset();
				resetBoard();
				sprites.board.fade(100, DELAY_FADE);
			}

		}

	};

	for (var i = 0; i < children.length; i++) {

		children[i]
			.set('angle', 270)
			.set('frame', 0)
			.set('framesMax', FRAMES_FALLING)
			.set('moving', true)
			.on('ping', ping)
			.start();

	}

};

/**
 * Starts a new game.
 * @method newGame
 */
function newGame() {

	player = {
		bombs : 0,
		bombsTo : 0,
		cascade : 0,
		money : 0,
		moneyTo : 0,
		moves : DEFAULT_NUM_MOVES,
		movesTo : DEFAULT_NUM_MOVES,
		movesUsed : 0,
		selected : {}
	};

	board.reset();

// This is a single-move board.
/*
board.setPieces([
[0,4,1,1,5,6,3,6],
[3,5,5,2,6,0,6,5],
[1,0,2,6,1,3,1,2],
[4,4,0,5,5,0,6,5],
[6,6,1,3,1,6,2,2],
[6,2,4,3,5,4,2,0],
[4,5,4,0,2,5,3,4],
[3,3,6,0,1,4,6,3],
]);
*/

	resetBoard();
	sprites.cursor.hide();
	sprites.bombsText.set('text', player.bombs);
	sprites.moneyText.set('text', player.money);
	sprites.movesText.set('text', player.moves);

	sprites.modal.hide();
	sprites.overlay.hide();

/*
var matches = board.getPossibleMatches();
DGE.log('number of possible matches: ', matches.length);
*/

};

/**
 * Sets up the board, including removing any old sprites.
 * @method resetBoard
 */
function resetBoard() {

	var children = DGE.Sprite.getByProperty('group', GROUP_PIECE);
	var pieces = board.getPieces();

	for (var i = 0; i < children.length; i++) {
		children[i].remove();
	}

	for (var x = 0; x < PIECES_X; x++) {
		for (var y = 0; y < PIECES_Y; y++) {
			makePiece(x, y, pieces[y][x]);
		}
	}

};

/**
 * Sets the board based on the sprites.
 * @return {Array} A matrix of piece types.
 * @method setBoard
 */
function setBoard() {

	var children = DGE.Sprite.getByProperty('group', GROUP_PIECE);
	var pieces = [];

var found = false;

	for (var y = 0; y < PIECES_Y; y++) {

		pieces[y] = [];

		for (var x = 0; x < PIECES_X; x++) {

			for (var i = 0; i < children.length; i++) {
				if (children[i].isAt((PIECE_SIZE * x), (PIECE_SIZE * y))) {
					pieces[y][x] = children[i].get('type');
					break;
				}
			}

if (pieces[y][x] === undefined) {

	found = {
		x : x,
		y : y
	};

}

		}

	}

	if (found) {

		DGE.log('2. WHOA COULD NOT FIND at:', x, y);

		for (var i = 0; i < children.length; i++) {
			if (children[i].isAt((PIECE_SIZE * x), (PIECE_SIZE * y))) {
				DGE.log('3.x. FOUND: ', children[i]);
			} else {
				DGE.log('3.x. not at index: ', i);
			}
		}

		DGE.log('[done]');

	}

/*
DGE.log('IN SET BOARD:');
DGE.log('length', pieces[pieces.length - 1].length);
DGE.log('pieces:', pieces);
*/

	return pieces;

};

/**
 * Shows the user a notice message.
 * @param {String} text The text to display.
 * @param {String} color The color of the text.
 * @param {Function} complete (optional) The function to execute when complete.
 * @method showNotice
 */
function showNotice(text, color, complete) {

	sprites.notice
		.set({
			color : color,
			opacity : 100,
			size : 30,
			text : text
		})
		.show()
		.center()
		.animate({
			opacity : 0,
			size : 60
		}, DELAY_NOTICE, {
			complete : function() {
				this.hide();
				if (complete) complete();
			},
			tween : function() {
				this.center();
			}
		});

};

init();

// Easter Egg (Konami Code).
DGE.Keyboard.code([38, 38, 40, 40, 37, 39, 37, 39, 66, 65], (function() {

	var used;

	return function() {

		if (used) {
			showNotice('ALREADY USED', COLOR_ERROR);
		} else if (player.moves == 1) {
			player.movesTo++;
			used = true;
			showNotice('+1 MOVE', COLOR_ERROR);
		} else {
			player.movesTo = 1;
			showNotice('DENIED!', COLOR_ERROR);
		}

	};
	
})());

// Debugging
sprites.version.on('click', boardDump);

function boardDump() {

	var pieces = board.getPieces();
	var tmp = "board.setPieces([\n";

	for (var y = 0; y < PIECES_Y; y++) {
		tmp += "[";
		for (var x = 0; x < PIECES_X; x++) {
			if (pieces[y][x] === false) {
				tmp += '.,';
			} else {
				tmp += pieces[y][x] + ',';
			}
		}
		tmp = tmp.substr(0, tmp.length - 1) + "],\n";
	}

	tmp += "]);";

	DGE.log('[Board Dump]');
	DGE.log(tmp);

};

sprites.movesText.on('click', function() {
	DGE.log('[getPossibleMatches]');
	DGE.log(board.getPossibleMatches());
});
// /Debugging

})();
