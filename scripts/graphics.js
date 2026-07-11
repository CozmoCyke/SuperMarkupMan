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
	
	// editor-style backdrop and line numbers
	ctx.fillStyle = '#fbfbf8';
	ctx.fillRect(0, 0, canvas.width, canvas.height);
	ctx.fillStyle = 'rgba(228, 232, 238, 0.9)';
	ctx.fillRect(0, 0, codeLineBlockLeft, canvas.height);
	ctx.fillStyle = 'rgba(175, 182, 190, 0.85)';
	ctx.fillRect(codeLineBlockLeft - 1, 0, 1, canvas.height);
	var activeZone = getPlayerActiveZone();
	ctx.fillStyle = 'rgba(89, 101, 113, ' + (activeLineHighlightAlpha * 0.55) + ')';
	ctx.fillRect(0, activeZone.top, canvas.width, activeZone.height);
	ctx.strokeStyle = 'rgba(89, 101, 113, ' + (activeLineHighlightAlpha * 1.1) + ')';
	ctx.strokeRect(0.5, activeZone.top + 0.5, canvas.width - 1, activeZone.height - 1);
	ctx.fillStyle = 'rgba(89, 101, 113, ' + Math.min(0.26, activeLineHighlightAlpha * 1.85) + ')';
	ctx.fillRect(0, activeZone.top, codeLineBlockLeft, activeZone.height);
	
	var heldBlock = getHeldBlock();
	if (heldBlock) {
		var dropPreviewRect = getBlockDropTarget(heldBlock);
		ctx.save();
		ctx.fillStyle = dropPreviewRect.valid ? 'rgba(89, 101, 113, 0.10)' : 'rgba(192, 57, 43, 0.16)';
		ctx.strokeStyle = dropPreviewRect.valid ? 'rgba(89, 101, 113, 0.55)' : 'rgba(192, 57, 43, 0.85)';
		ctx.fillRect(dropPreviewRect.x, dropPreviewRect.y, heldBlock.width, heldBlock.height);
		ctx.strokeRect(dropPreviewRect.x + 0.5, dropPreviewRect.y + 0.5, heldBlock.width - 1, heldBlock.height - 1);
		if (!dropPreviewRect.valid) {
			ctx.fillStyle = 'rgba(192, 57, 43, 0.95)';
			ctx.font = 'bold 11px monospace';
			ctx.textAlign = 'left';
			ctx.textBaseline = 'alphabetic';
			ctx.fillText('invalid target', codeLineBlockLeft + 6, 18);
		}
		ctx.restore();
	}

	ctx.save();
	ctx.fillStyle = 'rgba(35, 35, 35, 0.72)';
	ctx.font = '10px monospace';
	ctx.textAlign = 'right';
	ctx.textBaseline = 'top';
	ctx.fillText('player.lineIndex: ' + player.lineIndex, canvas.width - 6, 6);
	ctx.fillText('activeLineIndex: ' + activeLineIndex, canvas.width - 6, 18);
	ctx.fillText('activeDisplayLineNumber: ' + activeDisplayLineNumber, canvas.width - 6, 30);
	ctx.fillText('highlightedMarginIndex: ' + highlightedMarginIndex, canvas.width - 6, 42);
	ctx.restore();
	
	ctx.fillStyle = '#7c848d';
	ctx.font = '12px monospace';
	ctx.textAlign = 'right';
	ctx.textBaseline = 'middle';
	for (i = 0; i < codeLines.length; i++) {
		if (i === highlightedMarginIndex) {
			ctx.fillStyle = '#4f5b66';
			ctx.font = 'bold 12px monospace';
		}
		else {
			ctx.fillStyle = '#7c848d';
			ctx.font = '12px monospace';
		}

		ctx.fillText(codeLines[i].number, codeLineTextLeft + codeLineNumberWidth, codeLines[i].y + Math.round(codeLineHeight / 2));
	}

	// physical baseline for the avatar and block stack
	ctx.fillStyle = 'rgba(176, 184, 191, 0.25)';
	ctx.fillRect(codeLineBlockLeft, baselineY - 2, canvas.width - codeLineBlockLeft, 5);
	ctx.fillStyle = 'rgba(255, 255, 255, 0.65)';
	ctx.fillRect(codeLineBlockLeft, baselineY - 1, canvas.width - codeLineBlockLeft, 1);
	ctx.fillStyle = 'rgba(102, 112, 123, 0.9)';
	ctx.fillRect(codeLineBlockLeft, baselineY, canvas.width - codeLineBlockLeft, 1);
	
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
