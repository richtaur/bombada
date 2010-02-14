/*

- down the road, OPTIMIZE! probably make a single asset/SpriteSheet

things left before beta is done:
- finish flow (select pieces, earn points, drop bombs, etc.)
- music/sound effects from josh
- export to Android
- and iPhone
- have an overlay with a Game Over modal
	it should tell your your score and if you beat the old score
	with an OK button

*/

/*
DGE.init({
	id : 'bombada',
	width : 480,
	height : 320
}).fill('#000');

var sprite = new DGE.Sprite({
	width : 50,
	height : 50
}).fill('blue');

var stage = 0;
var x = 430;
var y = 0;

var callbacks = {
	complete : function() {
		init();
	},
	tween : function() {
		//DGE.log('tween');
	}
};

function init() {

	if (++stage == 4) stage = 0;

	switch (stage) {
		case 0:
			x = 0;
			y = 0;
			break;
		case 1:
			x = 430;
			y = 0;
			break;
		case 2:
			x = 430;
			y = 270;
			break;
		case 3:
			x = 0;
			y = 270;
			break;
	}

	sprite.animate({
		x : x,
		y : y
	}, 500, callbacks);
	
};

init();
*/

(function() {

var board = exports.board;

// Constants kinda
var DEFAULT_NUM_MOVES = 10;
var DELAY_ERROR = 100;
var DELAY_MATCH = 750;
var DELAY_MOVE = 250;
var DELAY_NOTICE = 750;
var PIECE_SIZE = 36;
var PIECES_X = 8;
var PIECES_Y = 8;
var VELOCITY_PIECE = 10;
var Z_UI = 5; // Stuff like mute button: always on top on all game UI.
var Z_CURSOR = 4; // Above the pieces.
var Z_PIECE_MOVING = 3; // Moving, so above the other pieces to prevent visual clutter.
var Z_PIECE = 2; // Above the background.

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
			y : 16,
			z : Z_PIECE
		}),

		bombsIcon : new DGE.Sprite({
			image : pieceTypes[3],
			width : PIECE_SIZE,
			height : PIECE_SIZE,
			x : 10,
			y : 110
		}),

		bombsText : new DGE.Text({
			color : '#B62A04',
			size : 36,
			text : 0,
			width : 200,
			height : 42,
			x : 60,
			y : 110
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

		}).start(),

		moneyIcon : new DGE.Sprite({
			image : pieceTypes[1],
			width : PIECE_SIZE,
			height : PIECE_SIZE,
			x : 10,
			y : 150
		}),

		moneyText : new DGE.Text({
			color : '#449F24',
			size : 36,
			text : 0,
			width : 200,
			height : 42,
			x : 60,
			y : 150
		}),

		movesLeft : new DGE.Text({
			color : '#A3A4AA',
			size : 14,
			text : 'Moves Left',
			width : 170,
			height : 14,
			x : 0,
			y : 294
		}).setCSS('text-align', 'center'),
// TODO: get rid of all the text-align centres and replace with format center, once you figure that out

		movesText : new DGE.Text({
			font : 'Helvetica, Sans-Serif',
			size : 64,
			width : 170,
			height : 64,
			x : 0,
			y : 230
		}).on('ping', function() {

			var movesLeft = player.movesLeft;

			if (player.movesLeft < player.movesTo) {
				movesLeft++;
			} else if (player.movesLeft > player.movesTo) {
				movesLeft--;
			}

			if (movesLeft != player.movesLeft) {
				player.movesLeft = movesLeft;
				sprites.movesLeft.set('text', DGE.sprintf('Move%s Left', (movesLeft == 1) ? '' : 's'));
				this.set('text', movesLeft);
			}

		}).setCSS('text-align', 'center').start(),

		notice : new DGE.Text({
			width : 500,
			height : 50,
			z : Z_UI
		}).hide().setCSS('text-align', 'center'),

		pieces : [],

		speaker : new DGE.Sprite({
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

	audio.music.play();
	newGame();

};

function clickPiece(px, py) {

	if (busy) return;

	var pieceClicked = getPieceByPXY(px, py);

	sprites.cursor.centerOn(pieceClicked).show();
// TODO: should centerOn do this manually? yes, i think so
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

	busy = true;
	var numToMove = 2;
	var pieceCursor = getPieceByPXY(psx, psy);

	board.swapPieces(px, py, psx, psy);

	var callbacks = {
		complete : function() {

			busy = !!(--numToMove);

			if (busy) return;

			if (board.hasMatches()) {

DGE.log('we got a valid move, run execMatches()');

				execMatches();

			} else {

				audio.invalidMove.play();
				showNotice('Invalid move', '#EB0405');

				var cursorToX = pieceClicked.x;
				var cursorToY = pieceClicked.y;
				var clickedToX = pieceCursor.x;
				var clickedToY = pieceCursor.y;

				pieceCursor.animate({
					x : cursorToX,
					y : cursorToY
				}, DELAY_ERROR);

// this one doesn't move:
				pieceClicked.animate({
					x : clickedToX,
					y : clickedToY
				}, DELAY_ERROR);

// TODO: new game flow
if (--player.movesTo == 0) newGame();

			}

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

function clickPieceByCoords(x, y) {

	var px = ((x - 2) / PIECE_SIZE);
	var py = ((y - 1) / PIECE_SIZE);

	clickPiece(px, py);

};

function execMatches() {

	var matches = board.getPiecesMatched();

DGE.log('matches:', matches);

	for (var i = 0; i < matches.length; i++) {

		var piece = getPieceByPXY(matches[i].x, matches[i].y);

		piece.anchorToStage();

		var x = piece.x;
		var y = DGE.stage.height;

		switch (piece.get('type')) {
			case 0: // diamond
			case 1: // money
			case 2: // coin
				x = sprites.moneyIcon.x;
				y = sprites.moneyIcon.y;
				break;
			case 3: // bomb
				x = sprites.bombsIcon.x;
				y = sprites.bombsIcon.y;
				break;
			case 4: // clock
				x = sprites.movesText.x;
				y = sprites.movesText.y;
				break;
		}

		piece.set('z', Z_PIECE_MOVING);

		piece.animate({
			x : x,
			y : y
		}, DELAY_MATCH, {}, 'easeIn');

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
	sprites.movesText.set('text', player.movesLeft);

};

function setBoard() {

	var pieces = board.getPieces();

	for (var x = 0; x < PIECES_X; x++) {
		sprites.pieces[x] = [];
		for (var y = 0; y < PIECES_Y; y++) {

			sprites.pieces[x].push(new DGE.Sprite({
				cursor : true,
				image : pieceTypes[pieces[x][y]],
				parent : sprites.board,
				velocity : VELOCITY_PIECE,
				width : PIECE_SIZE,
				height : PIECE_SIZE,
				x : ((PIECE_SIZE * x) + 2),
				y : ((PIECE_SIZE * y) + 1)
			}).on('click', function() {
				clickPieceByCoords(this.x, this.y);
			}));

			sprites.pieces[x][y].set('type', pieces[x][y]);

		}
	}

};

function showNotice(text, color, size) {

	size = (size || 30);

	sprites.notice
	.set({
		color : color,
		opacity : 1,
		size : size,
		text : text
	})
		.show()
		.center()
		.animate({
			opacity : 0,
			size : (size * 2)
		}, DELAY_NOTICE, {
			complete : function() {
				this.hide().set('size', size);
			},
			tween : function() {
				this.center();
			}
		});

};

init();

})();
