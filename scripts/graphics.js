var canvas;
var ctx;
var loading = 0;
var images = 1;

window.onload = function() {
	// create the canvas
	canvas = document.getElementById('game');
	ctx = canvas.getContext('2d');
	
	canvas.width = 400;
	canvas.height = 600;

	// don't allow selecting of the canvas
	canvas.onselectstart = function () { return false; }
	
	// canvas load to sync up with images
	loading++;
	
	if (loading == images)
		setTimeout('init()', 1000); // game.js

	// sound effects
	var sfxDrop = $('#sfxDrop');
	sfxDrop[0].load();
	sfxDrop[0].volume = 1;
	var sfxDone = $('#sfxDone');
	sfxDone[0].load();
	sfxDone[0].volume = 0.9;
	var sfxNext = $('#sfxNext');
	sfxNext[0].load();
	sfxNext[0].volume = 0.8;
}

// image pre-loader
function loadImg(x) {
	images++;

    var img = new Image();
    img.onload = function() {
		loading++;
		
		if (loading == images)
			setTimeout('init()', 1000); // game.js
	};
    img.src = x;
    return img;
}

// start loading graphics
var spriteSheet = loadImg('images/spritesheet.png');
var plankImage = loadImg('images/plank.png');

// tag graphics
var tagA = loadImg('images/tag-a.png');
var tagAClose = loadImg('images/tag-a-close.png');
var tagBr = loadImg('images/tag-br.png');
var tagEm = loadImg('images/tag-em.png');
var tagEmClose = loadImg('images/tag-em-close.png');
var tagH1 = loadImg('images/tag-h1.png');
var tagH1Close = loadImg('images/tag-h1-close.png');
var tagH2 = loadImg('images/tag-h2.png');
var tagH2Close = loadImg('images/tag-h2-close.png');
var tagHr = loadImg('images/tag-hr.png');
var tagImg = loadImg('images/tag-img.png');
var tagLi = loadImg('images/tag-li.png');
var tagLiClose = loadImg('images/tag-li-close.png');
var tagOl = loadImg('images/tag-ol.png');
var tagOlClose = loadImg('images/tag-ol-close.png');
var tagP = loadImg('images/tag-p.png');
var tagPClose = loadImg('images/tag-p-close.png');
var tagStrong = loadImg('images/tag-strong.png');
var tagStrongClose = loadImg('images/tag-strong-close.png');
var tagUl = loadImg('images/tag-ul.png');
var tagUlClose = loadImg('images/tag-ul-close.png');

// special tag graphics
var tagImgSrc = loadImg('images/sample.png'); // this does not need to be added to the tag array
var tagText = loadImg('images/tag-text.png');

// draw everything
var render = function () {	
	// reset canvas
	ctx.globalAlpha = 1;
	ctx.clearRect(0, 0, canvas.width, canvas.height);
	
	for (i = 0; i < platforms.length; i++) {
		platforms[i].draw();
	}
	
	player.draw();
	
	// draw blocks in reverse
	for (i = blocks.length-1; i >= 0; i--) {
		blocks[i].draw();
	}
};

// format time for prettier display
var timer = function(x) {
	var timeH = Math.floor(x/60/60);
	var timeM = Math.floor(x/60 - timeH*60);
	var timeS = Math.floor(x - timeH*60*60 - timeM*60);
	
	return (zeros(timeH) + ':' + zeros(timeM) + ':' + zeros(timeS)); // graphics.js
};

// add extra zeros
var zeros = function(x) {
	if (x.toString().length == 1)
		return '0' + x;
	else
		return x;
};
