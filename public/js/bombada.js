(function() {

var bombada = {};

bombada.core = {
	baseURL : 'img/',
	interval : 17 // ~60fps
};

bombada.assets = {
	Andrius : {
		background : 'background.png',
		board : 'board2.png',
		boardCursor : 'cursor.png',
		soundOn : 'volume_on.png',
		soundOff : 'volume_off.png',
		title : 'title.png'
	}
};

bombada.copy = {
	movesLeft : 'Moves Left:',
	version : 'Bombada alpha build 00'
};

bombada.design = {
	bombsTextColor : '#B62A04',
	color : '#FFF',
	font : 'Helvetica'
};

bombada.pieceTypes = [
	'piece_diamond.png',
	'piece_money.png',
	'piece_coin.png',
	'piece_bomb.png',
	'piece_clock.png',
	'piece_key.png',
	'piece_pill.png'
];

bombada.stage = {
	id : 'bombada',
	background : '#000',
	width : 800,
	height : 480
};

bombada.theme = 'Andrius';

/*
android emulator is 480x320
*/
if (DGE._platform == DGE.PLATFORM_BROWSER) {
	bombada.stage.width = 800;
	bombada.stage.height = 480;
} else {
	bombada.stage.width = DGE.DISPLAY_WIDTH;
	bombada.stage.height = DGE.DISPLAY_HEIGHT;
}

bombada.board = {
	width : 8,
	height : 8
};

puzzleGame(bombada);

})();
