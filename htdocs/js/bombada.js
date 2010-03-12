// POLISH:
// TODO: redo explosion
// TODO: increment the scores up on Game Over modal, don't just show them (improve game over menu)
// TODO: OPTIMIZE! make everything a single SpriteSheet (do this LAST)

// NICE TO HAVE:
// TODO: test in IE (I'm sure it's broken as balls)
// TODO: instead of "Game Over", show a message like:
// "You can do better" or "That's all you got?" or "Whoa, nicely done!"
// TODO: save/show the date of the high score
// TODO: bombsUsed
// TODO: show a hint after X seconds of no activity

(function() {

var match3 = exports.match3;

// Constants (kinda).
var COLOR_ERROR = '#D60000';
var COLOR_DEFAULT = '#FFF';
var DEFAULT_NUM_MOVES = 3;
var DELAY_ERROR = 100;
var DELAY_FADE = 500;
var DELAY_SETTINGS = 250;
var DELAY_MONEY = 10;
var DELAY_MOVE = 250;
var DELAY_NOTICE = 750;
var FRAMES_FALLING = 30;
var FRAMES_MOVING = 15;
var GROUP_PIECE = 'piece';
var MODE_BOMB = 0;
var MODE_MOVE = 1;
var MONEY_INCREMENT = 5;
var PAD_HOW_TO_PLAY = 6;
var PER_LEVEL = 1000;
var PIECE_SIZE = 36;
var PIECES_X = 8;
var PIECES_Y = 8;
var TYPE_CLOCK = 0;
var TYPE_BOMB = 1;
var TYPE_DIAMOND = 2;
var TYPE_DOLLAR = 3;
var TYPE_COIN = 4;
var TYPE_CRATE = 5;
var TYPE_BARREL = 6;
var VELOCITY_PIECE = 15;
var Z_MAX = 7; // The how-to-play modal and settings icon.
var Z_MODAL = 6; // The game over message stuff.
var Z_OVERLAY = 5; // Over everything but the stuff within the game over modal.
var Z_UI = 4; // Always above the pieces.
var Z_MOVING = 3; // Moving, so above the other pieces to prevent visual clutter.
var Z_PIECE = 2; // Above the background.

var assets = {
	background : 'gfx/480x320/bg.png',
	backgroundBomb : 'gfx/480x320/bg_bomb.png',
	check : 'gfx/480x320/check.png',
	checkGrey : 'gfx/480x320/check_grey.png',
	cursor : 'gfx/480x320/cursor.png',
	dialogCredits : 'gfx/480x320/credits.png',
	dialogSettings : 'gfx/480x320/settings.png',
	done : 'gfx/480x320/done.png',
	howToPlayArrow : 'gfx/480x320/htp_arrow.png',
	levelMeter : 'gfx/480x320/level_meter.png',
	iconBomb : 'gfx/480x320/icon_bomb.png',
	iconBombGlow : 'gfx/480x320/icon_bomb_glow.png',
	settings : 'gfx/480x320/icon_settings.png'
};
var audio;
var busy;
var dragging;
var explosionSheet;
var highScore;
var pieceTypes = [
	'gfx/480x320/piece_clock.png',
	'gfx/480x320/piece_bomb.png',
	'gfx/480x320/piece_diamond.png',
	'gfx/480x320/piece_money.png',
	'gfx/480x320/piece_coin.png',
	'gfx/480x320/piece_crate.png',
	'gfx/480x320/piece_barrel.png'
];
var player = {};
var queue = new DGE.Object();
var screen;
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
	}).fill('#000').on('mouseUp', function() {
		dragging = false;
	});

	highScore = DGE.Data.get('highScore');
	if (!highScore) highScore = 10000;
	DGE.Data.set('highScore', highScore);

	DGE.Text.defaults.color = COLOR_DEFAULT;
	DGE.Text.defaults.font = 'Lucida Grande, Helvetica, Sans-Serif';
	DGE.Text.defaults.shadow = '2px 2px 2px #000';
	DGE.Text.defaults.size = 20;
	DGE.Text.defaults.height = 30;

	match3.set('getNewPiece', getNewPiece);

	new DGE.Loader([assets]);

	audio = {
		explosion : new DGE.Audio({
			file : 'audio/sound_effects/drop_bomb.ogg'
		}),
		invalidMove : new DGE.Audio({
			file : 'audio/sound_effects/invalid_move.ogg'
		}),
		modeSwitch : new DGE.Audio({
			file : 'audio/sound_effects/enter_exit_bomb_mode.ogg'
		}),
		movePiece : new DGE.Audio({
			file : 'audio/sound_effects/piece_move.ogg'
		}),
		music : new DGE.Audio({
			file : 'audio/sly.ogg'
		}),
		noBombs : new DGE.Audio({
			file : 'audio/sound_effects/no_bombs.ogg'
		}),
		noMoves : new DGE.Audio({
			file : 'audio/sound_effects/no_moves_left.ogg'
		}),
		selectPiece : new DGE.Audio({
			file : 'audio/sound_effects/piece_select.ogg'
		})
	};

	explosionSheet = new DGE.Sprite.Sheet({
		image : 'gfx/480x320/explosions.png',
		spriteWidth : 48,
		spriteHeight : 48,
		width : 240,
		height : 48,
		x : 24,
		y : 56
	});

	sprites = {

		board : new DGE.Sprite({
			width : (PIECE_SIZE * PIECES_X),
			height : (PIECE_SIZE * PIECES_Y),
			x : 176,
			y : 16,
			z : Z_PIECE
		}),

		bombsIcon : new DGE.Sprite({
			cursor : true,
			image : assets.iconBomb,
			width : 46,
			height : 47,
			x : 8,
			y : 150
		}).on('click', toggleMode),

		bombsText : new DGE.Text({
			color : '#FE6401',
			cursor : true,
			size : 24,
			text : 0,
			width : 110,
			height : 42,
			x : 55,
			y : 162,
			z : Z_UI
		}).on('click', toggleMode).on('ping', function() {

			if (player.numBombsDisplay == player.numBombs) return;

			if (player.numBombsDisplay < player.numBombs) {
				player.numBombsDisplay++;
			} else if (player.numBombsDisplay > player.numBombs) {
				player.numBombsDisplay--;
			}

			if (player.numBombs == 0) {
				sprites.bombsIcon.set('image', assets.iconBomb);
			} else {
				sprites.bombsIcon.set('image', assets.iconBombGlow);
			}

			this.set('text', DGE.formatNumber(player.numBombsDisplay));

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
			this.hide();
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

		explosion : new DGE.Sprite({
			delay : 100,
			sheet : explosionSheet,
			width : 48,
			height : 48,
			x : 100,
			y : 100,
			z : Z_UI
		}).hide().on('ping', function() {

			if (this.get('sheetIndex') == 4) {
				this.hide().stop();
				return;
			}

			this.offset('sheetIndex', 1);
			
		}),

		howToPlay : new DGE.Text({
			autoAdjust : 'height',
			cursor : true,
			opacity : 90,
			size : 12,
			width : 200,
			height : 200,
			z : Z_MAX
		})
			.fill(COLOR_ERROR)
			.hide()
			.setCSS('border-radius', '6px')
			.setCSS('box-shadow', '5px 5px 10px #000')
			.setCSS('padding', (PAD_HOW_TO_PLAY + 'px')),

		howToPlayArrow : new DGE.Sprite({
			image : assets.howToPlayArrow,
			width : 12,
			height : 12,
			z : Z_MAX
		}).hide(),

		levelMeter : new DGE.Sprite({
			image : assets.levelMeter,
			width : 0,
			height : 24,
			x : 12,
			y : 81,
			z : Z_UI
		}).on('ping', function() {

			var goal = (player.level * PER_LEVEL);
			var width = ((player.levelProgress / goal) * 146);

			if (this.get('width') < width) {
				this.offset('width', 1);
			}

			if (player.levelProgress >= goal) {

				player.level++;
				player.levelProgress -= goal;

				showNotice('Level up!', COLOR_DEFAULT);
				sprites.levelText.set('text', DGE.sprintf('Level %s', player.level));
				this.set('width', 0);

			}

		}).start(),

		levelText : new DGE.Text({
			align : 'center',
			size : 16,
			text : 'Level 1',
			width : 146,
			height : 24,
			x : 12,
			y : 83,
			z : Z_UI
		}),

		modal : new DGE.Sprite({
			width : DGE.stage.width,
			height : DGE.stage.height,
			z : Z_MODAL
		}).hide(),

		moneyIcon : new DGE.Text({
			size : 30,
			text : '$',
			width : 36,
			height : 36,
			x : 18,
			y : 117
		}),

		moneyText : new DGE.Text({
			color : '#8CEDC0',
			delay : DELAY_MONEY,
			size : 24,
			text : 0,
			width : 110,
			height : 42,
			x : 55,
			y : 120,
			z : Z_UI
		}).on('ping', function() {

			if (player.moneyDisplay == player.money) return;

			if (player.moneyDisplay < player.money) {
				player.moneyDisplay += MONEY_INCREMENT;
			}

			if (player.moneyDisplay > player.money) {
				player.moneyDisplay = player.money;
			}

			this.set('text', DGE.formatNumber(player.moneyDisplay));

		}).start(),

		movesLeft : new DGE.Text({
			align : 'center',
			color : '#AAA',
			size : 14,
			text : 'Moves Left',
			width : 170,
			height : 17,
			x : 0,
			y : 257
		}),

		movesText : new DGE.Text({
			align : 'center',
			delay : 100,
			font : 'Helvetica, Sans-Serif',
			size : 64,
			width : 170,
			height : 64,
			x : 0,
			y : 192,
			z : Z_UI
		}).on('ping', function() {

			var bounce = 0;
			var resetX = this.get('resetX');
			var resetY = this.get('resetY');

			if (player.numMoves <= 3) {

				bounce = (5 - player.numMoves);
				this.set('color', 'rgb(214, n, n)'.replace(/n/g, (player.numMoves * 50 - 50)));

				if (DGE.rand(0, 1) == 0) {
					this.plot(resetX + DGE.rand(-bounce, bounce), resetY + DGE.rand(-bounce, bounce));
				} else {
					this.plot(resetX, resetY);
				}

			} else {
				this.plot(resetX, resetY);
				this.set('color', COLOR_DEFAULT);
			}

			if (player.numMovesDisplay == player.numMoves) return;

			if (player.numMovesDisplay < player.numMoves) {
				player.numMovesDisplay++;
			} else if (player.numMovesDisplay > player.numMoves) {
				player.numMovesDisplay--;
			}

			this.set('text', DGE.formatNumber(player.numMovesDisplay));

		})
			.set('resetX', 0)
			.set('resetY', 192)
			.start(),

		overlay : new DGE.Sprite({
			width : DGE.stage.width,
			height : DGE.stage.height,
			z : Z_OVERLAY
		}).fill('#000').hide(),

		settingsIcon : new DGE.Sprite({
			cursor : true,
			image : assets.settings,
			width : 36,
			height : 36,
			x : 3,
			y : 280,
			z : Z_UI
		}).on('click', toggleSettings),

		version : new DGE.Text({
			color : COLOR_DEFAULT,
			size : 8,
			text : 'v0.7',
			x : 145,
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

	initSettings();

	if (DGE.Data.get('playMusic')) audio.music.play();
	newGame();

	if (1) {
//	if (!DGE.Data.get('shownHowToPlay')) {
		showHowToPlay();
	}

};

/**
 * Initializes the settings sprites and events.
 * @method initSettings
 */
function initSettings() {

	function clickHowToPlay() {

		if (DGE.Data.get('shownHowToPlay')) {
			checkHowToPlay.set('image', assets.check);
			textHowToPlay.set('opacity', 100);
			DGE.Data.set('shownHowToPlay', false);
		} else {
			checkHowToPlay.set('image', assets.checkGrey);
			textHowToPlay.set('opacity', 50);
			DGE.Data.set('shownHowToPlay', true);
		}

	};

	function clickPlayMusic() {

		if (DGE.Data.get('playMusic')) {
			checkPlayMusic.set('image', assets.checkGrey);
			textPlayMusic.set('opacity', 50);
			DGE.Data.set('playMusic', false);
		} else {
			checkPlayMusic.set('image', assets.check);
			textPlayMusic.set('opacity', 100);
			DGE.Data.set('playMusic', true);
		}

	};

	function clickPlaySFX() {

		if (DGE.Data.get('playSFX')) {
			checkPlaySFX.set('image', assets.checkGrey);
			textPlaySFX.set('opacity', 50);
			DGE.Data.set('playSFX', false);
		} else {
			checkPlaySFX.set('image', assets.check);
			textPlaySFX.set('opacity', 100);
			DGE.Data.set('playSFX', true);
		}

	};

	sprites.settings = {

		dialogSettings : new DGE.Sprite({
			image : assets.dialogSettings,
			width : 224,
			height : 300,
			x : -224,
			y : 10,
			z : Z_MODAL
		}),

		dialogCredits :	new DGE.Sprite({
			image : assets.dialogCredits,
			width : 224,
			height : 300,
			x : DGE.stage.width,
			y : 10,
			z : Z_MODAL
		})

	};

	// How to Play.
	var textHowToPlay = new DGE.Text({
		cursor : true,
		opacity : (DGE.Data.get('shownHowToPlay') ? 50 : 100),
		parent : sprites.settings.dialogSettings,
		size : 12,
		text : DGE.formatBBCode('Show [b]How to Play[/b] dialog.'),
		width : 300,
		x : 50,
		y : 80,
		z : Z_MODAL
	}).on('click', clickHowToPlay);

	var checkHowToPlay = new DGE.Sprite({
		cursor : true,
		image : (DGE.Data.get('shownHowToPlay') ? assets.checkGrey : assets.check),
		parent : sprites.settings.dialogSettings,
		width : 36,
		height : 36,
		x : 12,
		y : 68,
		z : Z_MODAL
	}).on('click', clickHowToPlay);

	// Play music.
	var textPlayMusic = new DGE.Text({
		cursor : true,
		opacity : (DGE.Data.get('playMusic') ? 100 : 50),
		parent : sprites.settings.dialogSettings,
		size : 12,
		text : 'Play music.',
		width : 300,
		x : 50,
		y : 120,
		z : Z_MODAL
	}).on('click', clickPlayMusic);

	var checkPlayMusic = new DGE.Sprite({
		cursor : true,
		image : (DGE.Data.get('playMusic') ? assets.check : assets.checkGrey),
		parent : sprites.settings.dialogSettings,
		width : 36,
		height : 36,
		x : 12,
		y : 108,
		z : Z_MODAL
	}).on('click', clickPlayMusic);

	// Play sound effects.
	var textPlaySFX = new DGE.Text({
		cursor : true,
		opacity : (DGE.Data.get('playSFX') ? 100 : 50),
		parent : sprites.settings.dialogSettings,
		size : 12,
		text : 'Play sound effects.',
		width : 300,
		x : 50,
		y : 160,
		z : Z_MODAL
	}).on('click', clickPlaySFX);

	var checkPlaySFX = new DGE.Sprite({
		cursor : true,
		image : (DGE.Data.get('playSFX') ? assets.check : assets.checkGrey),
		parent : sprites.settings.dialogSettings,
		width : 36,
		height : 36,
		x : 12,
		y : 148,
		z : Z_MODAL
	}).on('click', clickPlaySFX);

	new DGE.Sprite({
		cursor : true,
		image : assets.done,
		parent : sprites.settings.dialogSettings,
		width : 175,
		height : 48,
		x : 26,
		y : 229,
		z : Z_MODAL
	}).on('click', toggleSettings);

	// Credcits!h <-- ROFL!

	new DGE.Text({
		align : 'center',
		parent : sprites.settings.dialogCredits,
		size : 12,
		text : DGE.formatBBCode('Game Design & Programming<br>Matt Hackett<br><br>Music & Sound Effects<br>Josh Morse<br><br>Art Assets<br>Andrius<br><br>Game Testing<br>Andrea Abney'),
		width : 212,
		height : 200,
		x : 6,
		y : 75,
		z : Z_MODAL
	});

};

/**
 * Checks if the game is over (also puts you in bomb mode if you must be).
 * @return {Boolean} true if the game is over, false if GAME ON!
 * @method checkGameOver
 */
function checkGameOver() {

	if (player.numMoves) {
		return false;
	} else if (player.numBombs) {
		
		if (player.mode != MODE_BOMB) {
			toggleMode();
		}

		return false;

	}

	return true;

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
	if (!match3.isAdjacent(selectedPieceX, selectedPieceY, pieceX, pieceY)) {
		dragging = true;
		if (DGE.Data.get('playSFX')) audio.selectPiece.play();
		return;
	}

	// This wasn't a selection, it was a move!
	busy = true;
	var pieceCursor = getPieceByPieceXY(selectedPieceX, selectedPieceY);

	if (DGE.Data.get('playSFX')) audio.movePiece.play();

	queue.on('change:numActive', null);
	queue.set('numActive', 2);
	queue.on('change:numActive', function(numActive) {

		if (numActive) return;

		player.movesUsed++;
		player.numMoves--;

		if (match3.hasMatches()) {
			player.cascade = 1;
			player.selected = {};
			sprites.cursor.hide();
			execMatches();
		} else {

			if (DGE.Data.get('playSFX')) audio.invalidMove.play();
			match3.swapPieces(pieceX, pieceY, selectedPieceX, selectedPieceY);
			showNotice('Invalid move', COLOR_ERROR, function() {
				busy = false;
				if (checkGameOver()) gameOver();
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

	match3.swapPieces(pieceX, pieceY, selectedPieceX, selectedPieceY);

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

	if (busy) return;

	dragging = false;

	var pieceX = (x / PIECE_SIZE);
	var pieceY = (y / PIECE_SIZE);

	if (player.mode == MODE_BOMB) {
		dropBomb(pieceX, pieceY);
	} else {
		clickPiece(pieceX, pieceY);
	}

};

/**
 * Attempts to drop a bomb where the cursor is.
 * @param {Number} pieceX The X coordinate of the piece to click.
 * @param {Number} pieceY The Y coordinate of the piece to click.
 * @method dropBomb
 */
function dropBomb(pieceX, pieceY) {

	if (busy) return;

	busy = true;

	var piece = getPieceByPieceXY(pieceX, pieceY);
	var pieces = match3.getPieces();
	pieces[pieceY][pieceX] = true;

	match3.setPieces(pieces);

	player.cascade = 0;
	player.numBombs--;

	sprites.explosion
		.centerOn(piece)
		.set('sheetIndex', 0)
		.show()
		.start();

	if (DGE.Data.get('playSFX')) audio.explosion.play();
	piece.remove();
	execMatches();

};

/**
 * Applies gravity to pieces on the board and drops new ones from above.
 * @method dropPieces
 */
function dropPieces() {

	var holes;
	var pieces = match3.getPieces();
	var stack = [];
	var toDrop = [];

	// Find out which pieces need to be dropped.
	for (var x = 0; x < PIECES_X; x++) {

		holes = 0;
		stack[x] = 0;

		for (var y = (PIECES_Y - 1); y >= 0; y--) {

			if (pieces[y][x] === true) {
				holes++;
				stack[x]++;
			} else if (holes) {
				toDrop.push(
					getPieceByPieceXY(x, y)
						.set('maxY', ((y + holes) * PIECE_SIZE))
				);
			}

		}
	}

	// Drop the stacked pieces from above the board.
	for (var x = 0; x < PIECES_X; x++) {
		for (var i = 0; i < stack[x]; i++) {
			toDrop.push(
				makePiece(x, -(i + 1), getNewPiece())
					.set('maxY', ((stack[x] - i - 1) * PIECE_SIZE))
			);
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

		match3.setPieces(setBoard());

		if (match3.hasMatches()) {
			player.cascade++;
			execMatches();
		} else {

			// Turn is over ...
			if (
				(player.mode == MODE_BOMB)
				&& (player.numMoves)
				&& (player.numBombs == 0)
			) toggleMode();

			if (checkGameOver()) {
				gameOver();
			} else if (!match3.hasPossibleMatches()) {
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
 * @method execMatches
 */
function execMatches() {

	showCascades();

	var matches = match3.getMatches();
	var pieces = match3.getPieces();
	var toMove = {};

	queue.moving = [];

	for (var i = 0; i < matches.length; i++) {

		showOfAKind(matches[i].length);

		for (var j = 0; j < matches[i].length; j++) {

			var x = matches[i][j].x;
			var y = matches[i][j].y;
			var piece = getPieceByPieceXY(x, y);
			pieces[y][x] = true;
			toMove[piece.id] = piece;

		}
	}

	for (var id in toMove) {

		var piece = toMove[id];

		piece
			.anchorToStage()
			.set('frame', 0)
			.set('framesMax', FRAMES_MOVING)
			.set('group', null);

		switch (piece.get('type')) {

			case TYPE_DIAMOND:
			case TYPE_DOLLAR:
			case TYPE_COIN:
				piece.set('angle', piece.getAngleTo(sprites.moneyIcon));
				piece.on('ping', function() {

					if (this.isTouching(sprites.moneyIcon)) {
						var money = (getWorth(this.get('type')) * player.cascade);
						player.levelProgress += money;
						player.money += money;
						queue.offset('numActive', -1);
						this.remove();
					}

				});
				break;

			case TYPE_BOMB:
				piece.set('angle', piece.getAngleTo(sprites.bombsIcon));
				piece.on('ping', function() {

					if (this.isTouching(sprites.bombsIcon)) {
						player.numBombs++;
						queue.offset('numActive', -1);
						this.remove();
					}

				});
				break;

			case TYPE_CLOCK:
				piece.set('angle', piece.getAngleTo(sprites.movesText.getCenter()));
				piece.on('ping', function() {

					if (!this.get('active')) return;

					this.offset('rotation', -20);

					if (this.isTouching(sprites.movesText)) {

						player.numMoves++;
						queue.offset('numActive', -1);
						this.set('active', false);

						this.fade(0, 100, function() {
							this.remove();
						});

					}

				});
				break;

			default: // Crates & Barrels.
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

		queue.moving.push(piece);

	}

	match3.setPieces(pieces);
	dropPieces();

};

/**
 * Shows the game over modal.
 * @method gameOver
 */
function gameOver() {

	// TODO wait is this right ...
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
	sprites.gameOver.movesUsed.set('text', ('Moves Used: ' + DGE.formatNumber(player.movesUsed)));

	sprites.modal.set('opacity', 0);
	sprites.overlay.plot(0, 0);
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

	if (DGE.rand(1, 100) <= (player.level * 10)) {
		return DGE.rand(1, (pieceTypes.length - 1));
	}

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

	throw DGE.sprintf("getPieceByPieceXY: Couldn't find a piece at %s, %s (checked %s, %s).", pieceX, pieceY, testX, testY);

};

/**
 * Gets the monetary worth of a piece type.
 * @param {Number} type The piece type to check.
 * @return {Number} The worth of the piece type.
 * @method getWorth
 */
function getWorth(type) {

	switch (type) {
		case TYPE_DIAMOND:
			return 100;
		case TYPE_DOLLAR:
			return 50;
		case TYPE_COIN:
			return 25;
	}

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
	}).on('mouseOver', function() {
		if (dragging) clickPieceByCoords(this.x, this.y);
	});

};

/**
 * Drops all the current pieces and creates a new board.
 * @method newBoard
 */
function newBoard() {

	var children = DGE.Sprite.getByProperty('group', GROUP_PIECE);
	var numPieces = (PIECES_X * PIECES_Y);
	var pieces = match3.getPieces();

	showNotice('No moves', COLOR_ERROR);

	function ping() {

		this.offset('opacity', -1);
		this.offset('rotation', 1);

		if (this.isOutOfBounds(true)) {

			this.remove();

			if (--numPieces == 0) {
				busy = false;
				sprites.board.set('opacity', 0);
				match3.reset();
				resetBoard();
				sprites.board.fade(100, DELAY_FADE);
			}

		}

	};

	for (var i = 0; i < children.length; i++) {

		children[i]
			.on('ping', ping)
			.set('angle', 270)
			.set('frame', 0)
			.set('framesMax', FRAMES_FALLING)
			.set('moving', true)
			.start();

	}

};

/**
 * Starts a new game.
 * @method newGame
 */
function newGame() {

	player = {
		level : 1,
		levelProgress : 0,
		money : 0,
		moneyDisplay : 0,
		movesUsed : 0,
		numBombs : 0,
		numBombsDisplay : 0,
		numMoves : DEFAULT_NUM_MOVES,
		numMovesDisplay : DEFAULT_NUM_MOVES,
		selected : {}
	};

	match3.reset();
	showMode();

// DEBUG: This is a single-move board.
/*
match3.setPieces([
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

// DEBUG: This is a board with a cascade move available.
/*
match3.setPieces([
[3,1,3,0,1,2,3,5],
[3,1,4,1,3,1,3,2],
[4,4,6,1,4,1,6,1],
[3,6,6,3,0,0,3,6],
[5,5,0,0,3,2,3,5],
[4,2,2,6,4,0,6,0],
[4,0,0,6,1,4,4,3],
[1,0,2,2,3,6,4,0],
]);
*/

// DEBUG: This is a board with 4+-of-a-kinds available.
/*
match3.setPieces([
[1,4,2,5,2,3,2,1],
[0,3,1,1,2,5,3,0],
[0,3,6,5,5,3,3,0],
[1,2,3,6,1,3,1,5],
[3,3,1,0,2,1,3,6],
[1,0,2,5,0,0,3,5],
[1,0,1,0,6,6,5,1],
[2,6,4,0,1,6,3,2],
]);
*/

	resetBoard();
	sprites.cursor.hide();
	sprites.levelMeter.set('width', 0);
	sprites.levelText.set('text', DGE.sprintf('Level %s', player.level));
	sprites.moneyText.set('text', player.money);
	sprites.bombsText.set('text', player.numBombs);
	sprites.movesText.set('text', player.numMoves);

	sprites.modal.hide();
	sprites.overlay.hide();

};

/**
 * Sets up the board, including removing any old sprites.
 * @method resetBoard
 */
function resetBoard() {

	var children = DGE.Sprite.getByProperty('group', GROUP_PIECE);
	var pieces = match3.getPieces();

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

	for (var y = 0; y < PIECES_Y; y++) {

		pieces[y] = [];

		for (var x = 0; x < PIECES_X; x++) {

			for (var i = 0; i < children.length; i++) {
				if (children[i].isAt((PIECE_SIZE * x), (PIECE_SIZE * y))) {
					pieces[y][x] = children[i].get('type');
					break;
				}
			}

/*
if (pieces[y][x] === undefined) {

	found = {
		x : x,
		y : y
	};

}
*/

		}

	}

/*
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
*/

	return pieces;

};

/**
 * Displays the number of cascades just accomplished.
 * @method showCascades
 */
function showCascades() {

	if (player.cascade < 2) return;

	var congrats;
	var message = '';
	var switch1 = (DGE.rand(0, 1) == 0);
	var switch2 = (DGE.rand(0, 1) == 0);

	if (switch1) {
		if (player.cascade == 3) {
			if (switch2) {
				congrats = 'Nice.';
			} else {
				congrats = 'Well done.';
			}
		} else if (player.cascade == 4) {
			if (switch2) {
				congrats = 'Impressive!';
			} else {
				congrats = 'Nicely done!';
			}
		}
	}

	if (player.cascade == 5) {
		if (switch2) {
			congrats = 'Whoa!';
		} else {
			congrats = "You're good!";
		}
	} else if (player.cascade > 5) {
		if (switch2) {
			congrats = 'Amazing!';
		} else {
			congrats = 'Astonishing!';
		}
	}

	if (congrats) {
		message = DGE.sprintf(' %s', congrats);
	}

	showNotice(
		DGE.sprintf('\u00D7%s%s', player.cascade, message),
		COLOR_DEFAULT
	);

};

/**
 * Shows the How to Play modal.
 */
function showHowToPlay() {

	busy = true;

	var icons = [];
	var tipIndex = 0;
	var tips = [
		{
			message : "Bombada is a [b]match-3[/b] game. To play, click on a piece, then an adjacent piece to match them into straight lines of 3 or more.",
			x : 214,
			y : 90
		}, {
			arrow : 50,
			icons : [TYPE_DIAMOND, TYPE_DOLLAR, TYPE_COIN],
			message : DGE.sprintf(
				"Your goal is to collect money. Collect as many [b]Diamonds[/b] ($%s), [b]Dollars[/b] ($%s), and [b]Coins[/b] ($%s) as you can!",
				getWorth(TYPE_DIAMOND),
				getWorth(TYPE_DOLLAR),
				getWorth(TYPE_COIN)
			),
			x : 170,
			y : 75
		}, {
			arrow : 55,
			icons : [TYPE_CLOCK],
			message : "This is the number of moves remaining before the game is over. You can get more moves by matching [b]4-of-a-kind[/b] or more, or by collecting [b]Clocks[/b].",
			x : 140,
			y : 165
		}, {
			arrow : 45,
			message : "As you get more money, your [b]Difficulty Level[/b] will increase, which causes the board to generate fewer [b]Clocks[/b].",
			x : 170,
			y : 40
		}, {
			arrow : 60,
			icons : [TYPE_BOMB],
			message : "Once you collect bombs, click the bomb icon to enter [b]Bomb Mode[/b], then click on the board to drop a bomb. Click the bomb icon again to exit [b]Bomb Mode[/b].",
			x : 170,
			y : 112
		}, {
			icons : [TYPE_CRATE, TYPE_BARREL],
			message : "You'll want to blow up [b]Crates[/b] and [b]Barrels[/b] since you get no benefits from matching them.",
			x : 214,
			y : 90
		}, {
			arrow : 75,
			message : "Click the [b]Settings Icon[/b] for options, credits, or to see this tutorial again. Have fun!",
			x : 55,
			y : 208
		}
	];

	for (var i = 0; i < 3; i++) {
		icons.push(new DGE.Sprite({
			width : PIECE_SIZE,
			height : PIECE_SIZE,
			z : Z_MAX
		}).on('ping', function() {

			var index = this.get('index');

			if (index === true) {

				this.offset('rotation', 1);

				if (this.get('rotation') >= 15) {
					this.set('index', false);
				}

			} else {

				this.offset('rotation', -1);

				if (this.get('rotation') <= -15) {
					this.set('index', true);
				}

			}

		}).start());
			
	}

	function showNext() {

		if (tipIndex == tips.length) {

			DGE.Data.set('shownHowToPlay', true);

			sprites.howToPlay.fade(0, 500, function() {
				busy = false;
				this.hide();
			});

			sprites.howToPlayArrow.fade(0, 500, function() {
				this.hide();
			});

			return;

		}

		var suffix = DGE.sprintf("<br><br>Click to %s.", ((tipIndex == (tips.length - 1)) ? 'finish' : 'continue'));
		var message = DGE.sprintf('[b]How to Play (%s/%s)[/b]<br>', (tipIndex + 1), tips.length);

		message += (tips[tipIndex].message + suffix)
			.replace(/Click/g, DGE.platform.terms.click.capitalize())
			.replace(/click/g, DGE.platform.terms.click);

		sprites.howToPlay
			.plot(tips[tipIndex].x, tips[tipIndex].y)
			.set('text', DGE.formatBBCode(message));

		sprites.howToPlay.offset('height', -(PAD_HOW_TO_PLAY * 2));

		if (tips[tipIndex].arrow) {
			sprites.howToPlayArrow.plot(
				(sprites.howToPlay.x - sprites.howToPlayArrow.width),
				(sprites.howToPlay.y + tips[tipIndex].arrow)
			)
			sprites.howToPlayArrow.show();
		} else {
			sprites.howToPlayArrow.hide();
		}

		for (var i = 0; i < icons.length; i++) {

			var type = (tips[tipIndex].icons && tips[tipIndex].icons[i]);

			if (typeof(type) == 'number') {

				var x = (sprites.howToPlay.x + sprites.howToPlay.width);
				var y = (sprites.howToPlay.y + sprites.howToPlay.height);

				icons[i].plot(
					(x - ((i + 1) * PIECE_SIZE) + (PAD_HOW_TO_PLAY * 1.5) + (i * (PAD_HOW_TO_PLAY / 2))),
					(y - PIECE_SIZE + (PAD_HOW_TO_PLAY * 1.5))
				);

				icons[i].set('image', pieceTypes[type].replace(/\.png/, '_dark.png'));
				icons[i].show();

			} else {
				icons[i].hide();
			}

		}

		tipIndex++;

	};

	sprites.howToPlay
		.set('opacity', 0)
		.show()
		.fade(100, 500);

	sprites.howToPlay.on('click', showNext);
	showNext();

};

/**
 * Shows the current play mode.
 * @method showMode
 */
function showMode() {

	if (player.mode == MODE_BOMB) {
		DGE.stage.set('image', assets.backgroundBomb);
		sprites.movesLeft.set('opacity', 25);
		sprites.movesText.set('opacity', 25);
	} else {
		DGE.stage.set('image', assets.background);
		sprites.movesLeft.set('opacity', 100);
		sprites.movesText.set('opacity', 100);
	}

};

/**
 * Shows the user a notice.
 * @param {String} text The text to display.
 * @param {String} color The color of the text.
 * @param {Function} complete (optional) The function to execute when complete.
 * @method showNotice
 */
var showNotice = (function() {

	var notices = [];

	new DGE.Interval({
		delay : 750,
		interval : shift
	}).start();

	function shift() {

		if (!notices.length) return;

		var notice = notices.shift();

		new DGE.Text({
			align : 'center',
			color : notice.color,
			opacity : 100,
			size : 30,
			text : notice.text,
			width : DGE.stage.width,
			height : 50,
			z : Z_MODAL
		})
			.center()
			.animate({
				opacity : 0,
				y : 100
			}, DELAY_NOTICE, {
				complete : function() {
					if (notice.complete) notice.complete();
					this.remove();
				}
			});

	};

	return function(text, color, complete) {
		notices.push({
			text : text,
			color : color,
			complete : complete
		});
	};

})();

/**
 * Displays the number of pieces just matched in a row.
 * @method showOfAKind
 */
function showOfAKind(length) {

	var movesGained = (length - 3);

	if (!movesGained) return;

	showNotice(
		DGE.sprintf('%s of a kind', length),
		COLOR_DEFAULT
	);

	player.numMoves += movesGained;
	var message = ((movesGained == 1) ? '%s extra move' : '%s extra moves!');

	showNotice(
		DGE.sprintf(message, movesGained),
		COLOR_DEFAULT
	);

};

/**
 * Attempts to toggle between regular moves and dropping bombs.
 * @method toggleMode
 */
function toggleMode() {

	sprites.cursor.hide();

	if (player.mode == MODE_BOMB) {

		if (!player.numMoves) {
			showNotice('No moves left', COLOR_ERROR);
		} else {
			if (DGE.Data.get('playSFX')) audio.modeSwitch.play();
			player.mode = MODE_MOVE;
			showMode();
		}

	} else {

		if (!player.numBombs) {
			showNotice('You have no bombs', COLOR_ERROR);
			if (DGE.Data.get('playSFX')) audio.noBombs.play();
		} else {
			if (DGE.Data.get('playSFX')) audio.modeSwitch.play();
			player.mode = MODE_BOMB;
			showMode();
		}

	}

};

/**
 * Toggles the settings dialog.
 * @method toggleSettings
 */
function toggleSettings() {

	if (busy) return;

	busy = true;

	if (screen == 'settings') {

		sprites.overlay.animate({
			opacity : 0
		}, DELAY_SETTINGS);

		sprites.settings.dialogSettings.animate({
			x : -sprites.settings.dialogSettings.width
		}, DELAY_SETTINGS);

		sprites.settings.dialogCredits.animate({
			x : DGE.stage.width
		}, DELAY_SETTINGS, {
			complete : function() {
				busy = false;
				screen = null;
				sprites.overlay.hide();
			}
		});

	} else {

		sprites.overlay.set('opacity', 0).show().animate({
			opacity : 90
		}, DELAY_SETTINGS);

		sprites.settings.dialogSettings.animate({
			x : 10
		}, DELAY_SETTINGS);

		sprites.settings.dialogCredits.animate({
			x : 246
		}, DELAY_SETTINGS, {
			complete : function() {
				busy = false;
				screen = 'settings';
			}
		});

	}

};

init();

// Easter Egg (Konami Code).
DGE.Keyboard.code([38, 38, 40, 40, 37, 39, 37, 39, 66, 65], (function() {

	// TODO?:
	// - number of times played
	// - number of moves
	// - total number of bombs dropped
	// - number of times high score beaten
	// - total money earned

	var used;

	return function() {

		if (used) {
			showNotice('Already used', COLOR_ERROR);
		} else if (player.numMoves == 1) {
			player.numMoves++;
			used = true;
			showNotice('+1 move', COLOR_DEFAULT);
		} else {
			player.numMoves = 1;
			showNotice('Denied!', COLOR_ERROR);
		}

	};
	
})());

// DEBUG
sprites.version.on('click', boardDump);

function boardDump() {

	var pieces = match3.getPieces();
	var tmp = "match3.setPieces([\n";

	for (var y = 0; y < PIECES_Y; y++) {
		tmp += "[";
		for (var x = 0; x < PIECES_X; x++) {
			if (pieces[y][x] === true) {
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
	DGE.log(match3.getPossibleMatches());
});
// /DEBUG

})();
