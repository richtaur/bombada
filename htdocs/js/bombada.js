(function() {

var bombada = {};

bombada.core = {
	baseURL : 'gfx/480x320/',
	interval : 34 // ~30fps
};

bombada.assets = {
	background : 'bg.png',
	//board : 'board2.png',
	cursor : 'cursor.png',
	soundOn : 'volume_on.png',
	soundOff : 'volume_off.png'
};

bombada.audio = {
// TODO: audioURL conf?
	invalidMove : 'audio/EnemyDeath.ogg',
	music : 'audio/sly.ogg',
	soundOn : 'audio/Powerup.ogg'
};

bombada.copy = {
	invalidMove : 'Invalid move',
	movesLeft : 'Moves Left',
	version : 'v0.1'
};

bombada.design = {
	bombsTextColor : '#B62A04',
	color : '#FFF',
	cursorPing : function() {

		var inc = 0.01;

		if (this._dir === undefined) {
			this._dir = false;
			this._opacity = 1;
		}

		if (this._dir) {
			this._opacity += inc;
			if (this._opacity >= 1) {
				this._dir = false;
			}
		} else {
			this._opacity -= inc;
			if (this._opacity <= 0.5) {
				this._dir = true;
			}
		}

		this.opacity(this._opacity);

	},
	errorColor : '#EB0405',
	font : 'Lucida Grande, Helvetica, Sans-Serif',
	movesFont : 'Helvetica, Sans-Serif',
	noticeSize : 30,
	noticeSizeTo : 60,
	pieceSize : 36,
	shadow : '2px 2px 2px #000'
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
	width : 480,
	height : 320
};

/*
android emulator is 480x320
looks like iPhone is 480x320 too
if (DGE.platform.name == DGE.platform.BROWSER) {
	bombada.stage.width = 800;
	bombada.stage.height = 480;
} else {
	bombada.stage.width = DGE.DISPLAY_WIDTH;
	bombada.stage.height = DGE.DISPLAY_HEIGHT;
}
*/

puzzleGame(bombada);

})();
