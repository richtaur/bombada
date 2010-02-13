/*

- down the road, OPTIMIZE! probably make a single asset/SpriteSheet
- if we're going to have the image filenames in bombada.js,
	also will need the image dimensions as right now it's hardcoded
- Moves Left VS Move Left (when only one move left -- singular/plural)

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

(function() {

var board = exports.board;

// Constants kinda
var DEFAULT_NUM_MOVES = 10;
//TODO var GROUP_PIECE = 'piece';
var INTERVAL_MATCH = 250;
var INTERVAL_NOTICE = 750;
var PIECE_SIZE = 36;
var PIECES_X = 8;
var PIECES_Y = 8;
var VELOCITY_PIECE = 10;
var Z_UI = 3; // Stuff like mute button: always on top on all game UI
var Z_CURSOR = 2; // Above the board
var Z_PIECE = 1; // Above the background

var assets = {
	background : 'gfx/480x320/bg.png',
	cursor : 'gfx/480x320/cursor.png',
	soundOn : 'gfx/volume_on.png',
	soundOff : 'gfx/volume_off.png'
};
var audio;
var busy;
var pieceTypes = [
	'gfx/480x320/piece_diamond.png',
	'gfx/480x320/piece_money.png',
	'gfx/480x320/piece_coin.png',
	'gfx/480x320/piece_bomb.png',
	'gfx/480x320/piece_clock.png',
	'gfx/480x320/piece_key.png',
	'gfx/480x320/piece_pill.png'
];
var player = {
	movesLeft : 0,
	movesTo : 0,
	selected : {}
};
var sprites;

var init = function() {

	DGE.init({
		id : 'bombada',
		image : assets.background,
		width : 480,
		height : 320
	});

	DGE.Text.defaults.color = '#FFF';
	DGE.Text.defaults.font = 'Lucida Grande, Helvetica, Sans-Serif';
	DGE.Text.defaults.shadow = '2px 2px 2px #000';

	board.set('getNewPiece', function() {

		if (DGE.rand(1, 10) == 1) { // 10% chance of a diamond
			return 0;
		} else {
			return DGE.rand(1, (pieceTypes.length - 1));
		}

	});

	new DGE.Loader([assets]);

	audio = {
		invalidMove : new DGE.Audio({
			file : 'audio/EnemyDeath.ogg'
		}),
		music : new DGE.Audio({
			file : 'audio/sly.ogg'
		}),
		soundOn : new DGE.Audio({
			file : 'audio/Powerup.ogg'
		})
	};

	sprites = {

		board : new DGE.Sprite({
			width : (PIECE_SIZE * PIECES_X),
			height : (PIECE_SIZE * PIECES_Y),
			x : 176,
			y : 16
		}),

		bombsIcon : new DGE.Sprite({
			image : pieceTypes[3],
			width : PIECE_SIZE,
			height : PIECE_SIZE,
			x : 10,
			y : 150
		}),

		bombsText : new DGE.Text({
			color : '#B62A04',
			size : 36,
			text : 0,
			width : 200,
			height : 42,
			x : 60,
			y : 150
		}),

		cursor : new DGE.Sprite({
			cursor : true,
			image : assets.cursor,
			width : 54,
			height : 54,
			x : 53,
			y : 2,
			z : Z_CURSOR
		}).on('ping', function() {

				var inc = 0.01;

				if (this.get('direction') === undefined) {
					this.set('direction', false);
					this.set('opacity', 1);
				}

				if (this.get('direction')) {
					this.offset('opacity', inc);
					if (this.get('opacity') >= 1) {
						this.set('direction', false);
					}
				} else {
					this.offset('opacity', -inc);
					if (this.get('opacity') <= 0.5) {
						this.set('direction', true);
					}
				}

		}),

		moneyIcon : new DGE.Sprite({
			image : pieceTypes[1],
			width : PIECE_SIZE,
			height : PIECE_SIZE,
			x : 10,
			y : 200
		}),

		moneyText : new DGE.Text({
			color : '#449F24',
			size : 36,
			text : 0,
			width : 200,
			height : 42,
			x : 60,
			y : 200
		}),

		movesText : new DGE.Text({
			font : 'Helvetica, Sans-Serif',
			ping : function() {
// TODO

				if (player.movesLeft < player.movesTo) {
					player.movesLeft++;
				} else if (player.movesLeft > player.movesTo) {
					player.movesLeft--;
				}

				this.text(player.movesLeft, 'number');

			},
			size : 64,
			width : 200,
			height: 42,
			x : 10,
			y : 230
		}).setCSS('text-align', 'center'),

		notice : new DGE.Text({
			z : Z_UI
		}),

		pieces : [],

		speaker : new DGE.Sprite({
// TODO
			cursor : true,
			image : assets.soundOn,
			width : 64,
			height : 53,
			x : 262,
			y : 30,
			z : Z_UI
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

		version : new DGE.Text({
			color : '#FFF',
			size : 8,
			text : 'v0.1',
			x : 140,
			y : 55
		})

	};

	new DGE.Text({
		color : '#A3A4AA',
		size : 14,
		text : 'Moves Left',
		width : 170,
		x : 0,
		y : 294
	}).setCSS('text-align', 'center');

	audio.music.play();
	newGame();

};

function clickPiece(px, py) {

	if (busy) return;

	var pieceClicked = getPieceByPXY(px, py);

	sprites.cursor.centerOn(pieceClicked).show();
	sprites.cursor.plot(
		(sprites.cursor.x + sprites.board.x),
		(sprites.cursor.y + sprites.board.y)
	);

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
				showNotice('Invalid move', '#EB0405');

				pieceCursor.animate({
					x : {
						from : pieceCursor.x,
						to : pieceClicked.x
					},
					y : {
						from : pieceCursor.y,
						to : pieceClicked.y
					},
				}, (INTERVAL_MATCH / 3));

				pieceClicked.animate({
					x : {
						from : pieceClicked.x,
						to : pieceCursor.x
					},
					y : {
						from : pieceClicked.y,
						to : pieceCursor.y
					},
				}, (INTERVAL_MATCH / 3));

			}

		}
	};

	pieceCursor.animate({
		x : {
			from : pieceCursor.x,
			to : pieceClicked.x
		},
		y : {
			from : pieceCursor.y,
			to : pieceClicked.y
		},
	}, INTERVAL_MATCH, callbacks);

	pieceClicked.animate({
		x : {
			from : pieceClicked.x,
			to : pieceCursor.x
		},
		y : {
			from : pieceClicked.y,
			to : pieceCursor.y
		},
	}, INTERVAL_MATCH, callbacks);

};

function clickPieceByCoords(x, y) {

	var px = ((x - 2) / PIECE_SIZE);
	var py = ((y - 1) / PIECE_SIZE);

	clickPiece(px, py);

};

function execMatches() {

	var matches = board.getPiecesMatched();

DGE.debug('matches:', matches);

	for (var i = 0; i < matches.length; i++) {

		var coords = matches[i];
		var piece = getPieceByPXY(coords.x, coords.y);

		piece.anchorToStage();

		switch (piece.get('type')) {
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

	var testX = ((PIECE_SIZE * px) + 2);
	var testY = ((PIECE_SIZE * py) + 1);

	for (var x = 0; x < PIECES_X; x++) {
		for (var y = 0; y < PIECES_Y; y++) {

			var sprite = sprites.pieces[x][y];
			if (sprite.isAt(testX, testY)) return sprite;

		}
	}

	throw DGE.sprintf("Couldn't find a piece at %s, %s", px, py);

};

function newGame() {

	player.movesLeft = DEFAULT_NUM_MOVES;
	player.movesTo = DEFAULT_NUM_MOVES;

	board.reset();
	//DGE.Sprite.getByGroup(GROUP_PIECE, 'remove');
	setBoard();

	sprites.cursor.hide();

};

function setBoard() {

	var pieces = board.getPieces();

	for (var x = 0; x < PIECES_X; x++) {
		sprites.pieces[x] = [];
		for (var y = 0; y < PIECES_Y; y++) {

			sprites.pieces[x].push(new DGE.Sprite({
				cursor : true,
// TODO
//				group : GROUP_PIECE,
				image : pieceTypes[pieces[x][y]],
				parent : sprites.board,
				velocity : VELOCITY_PIECE,
				width : PIECE_SIZE,
				height : PIECE_SIZE,
				x : ((PIECE_SIZE * x) + 2),
				y : ((PIECE_SIZE * y) + 1),
				z : Z_PIECE
			}).on('click', function() {
// TODO
				clickPieceByCoords(this.x, this.y);
			}));

			sprites.pieces[x][y].set('type', pieces[x][y]);

		}
	}

};

function showNotice(msg, color, size) {

	size = (size || 30);

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
				from : size,
				to : (size * 2)
			}
		}, INTERVAL_NOTICE, {
			complete : function() {
				this.hide();
				this.size(size);
			},
			tween : function() {
				this.center();
			}
		});

};

init();

})();
