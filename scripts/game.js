// objects
var player;
var tags;
var level;
var alt = new Array;
var blocks = new Array;
var platforms = new Array;

// variables
var collisionPadding = 6;
var gravitySpeed = 0.3;
var gameOver = false;
var paused = false;
var firstTime = true;

// read from save file or create new
if (localStorage.progress !== undefined) {
	var progress = parseInt(localStorage.progress);
	
	if (progress < 1)
		gameOver = true;
}
else {
	var progress = 1;
	localStorage.progress = 1;
}

if (localStorage.helped !== undefined)
	var helped = true;
else {
	localStorage.helped = 1;
	var helped = false;
}

if (localStorage.time !== undefined)
	var time = parseInt(localStorage.time);
else {
	var time = 0;
	localStorage.time = 0;
}

if (localStorage.best !== undefined)
	var best = parseInt(localStorage.best);
else {
	var best = 0;
	localStorage.best = 0;
}

// for testing purposes
// progress = 29;

// keyboard input
var keysDown = new Array;
var keys = {left: 37, right: 39, up: 38, down: 40, space: 32, esc: 27};

addEventListener("keydown", function (e) {
	keysDown[e.keyCode] = true;
	
	// disable scrolling
    if([32, 37, 38, 39, 40].indexOf(e.keyCode) > -1) {
        e.preventDefault();
    }
}, false);

addEventListener("keyup", function (e) {
	delete keysDown[e.keyCode];
}, false);

// reset controls if window is lost
$(window).blur(function() {
	keysDown = new Array;
});

// initialize game
var init = function() {
	// first timers get the help window
	if (!helped)
		setTimeout("$('#overlay, #window-help').fadeIn('fast'); paused = true;", 1000);

	// set up player
	player = createPlayer(35, 60); // player.js
	
	// set up tags as json object
	tags = {
		'<a>' : { src: tagA, html: '<a href="#" onclick="return false;">' },
		'</a>' : { src: tagAClose, html: '</a>' },
		'<br/>' : { src: tagBr, html: '<br/>' },
		'<em>' : { src: tagEm, html: '<em>' },
		'</em>' : { src: tagEmClose, html: '</em>' },
		'<h1>' : { src: tagH1, html: '<h1>' },
		'</h1>' : { src: tagH1Close, html: '</h1>' },
		'<h2>' : { src: tagH2, html: '<h2>' },
		'</h2>' : { src: tagH2Close, html: '</h2>' },
		'<hr/>' : { src: tagHr, html: '<hr/>' },
		'<img/>' : { src: tagImg, html: '<img src="'+tagImgSrc.src+'" />' },
		'<li>' : { src: tagLi, html: '<li>' },
		'</li>' : { src: tagLiClose, html: '</li>' },
		'<ol>' : { src: tagOl, html: '<ol>' },
		'</ol>' : { src: tagOlClose, html: '</ol>' },
		'<p>' : { src: tagP, html: '<p>' },
		'</p>' : { src: tagPClose, html: '</p>' },
		'<strong>' : { src: tagStrong, html: '<strong>' },
		'</strong>' : { src: tagStrongClose, html: '</strong>' },
		'<ul>' : { src: tagUl, html: '<ul>' },
		'</ul>' : { src: tagUlClose, html: '</ul>' },
		'text' : { src: tagText, html: 'Lorem ipsum' },
	};

	// set up platforms
	for (i = 0; i < 5; i++) {
		platforms[i] = {
			x: (canvas.width - canvas.width/1.4)/2,
			y: canvas.height - 102 - 102*i,
			width: canvas.width/1.4,
			height: 15,
			draw: function() {
				ctx.drawImage(plankImage, this.x, this.y, this.width, this.height);
			}
		};
	}
	
	// create first level
	levelUp(progress);
	
	// high score?
	if (best != 0)
		$('#best').html('<br/>Best Time: '+timer(best));
		
	$('#right').html('<div style="color:gray; margin:20px; text-align:center">Start moving the HTML tags around to render your website here. Try to make it look like the website on the left.<p>Click "Help" for more info.</p></div>');

	// start game engine
	setInterval(main, 17);
};

// GAME ENGINE
var main = function () {
	update();
		
	render(); // graphics.js
};

// update game logic
var update = function() {
	// a dialogue box is open
	if (paused) {
		// exit window
		if (keys.esc in keysDown) {
			$('#overlay, .window').fadeOut('fast');
			paused = false;
		}
	
		// skip everything else
		keysDown = new Array;
		return;
	}
		
	// update player position
	player.update();
	
	// update score
	if (!gameOver) {
		time += (17/1000);
		localStorage.time = time;
	}
		
	// convert to readable time format
	$('#time').html(timer(time)); // graphics.js
	
	// block loop
	for (i = 0; i < blocks.length; i++) {
		blocks[i].update();
		
		// player is attempting to pick up a block
		if (player.carrying == -1 && player.pickup && player.reverse) {
			// compare x/y values
			if (player.x + player.width >= blocks[i].x && player.x <= blocks[i].x + blocks[i].width && player.y + player.height + collisionPadding >= blocks[i].y && player.y + player.height - collisionPadding <= blocks[i].y + blocks[i].height) {
				// tie index to player
				player.carrying = i;
				
				sfxDrop.play();
			}
		}

		// ignore the block being held
		if (player.carrying != i) {
			// look for collisions with player
			if (!(keys.down in keysDown) && player.velocityUp <= 0) {
				// compare x/y values
				if (player.y + player.height > blocks[i].y && player.y + player.height < blocks[i].y + blocks[i].height && player.y + player.height - player.velocityDown - collisionPadding < blocks[i].y && player.x + player.width > blocks[i].x + collisionPadding && player.x < blocks[i].x + blocks[i].width - collisionPadding) {
					// stop player
					player.y = blocks[i].y - player.height;
					
					// reset jumping/falling
					player.jumping = false;
					player.velocityDown = 0;
				}
			}
			
			// look for collision with other blocks
			for (t = 0; t < blocks.length; t++) {
				// ignore self and carried block
				if (t != i && t != player.carrying) {
					// compare x/y values
					if (blocks[i].y + blocks[i].height > blocks[t].y && blocks[i].y + blocks[i].height < blocks[t].y + blocks[t].height && blocks[i].y + blocks[i].height - blocks[i].velocityDown - collisionPadding < blocks[t].y && blocks[i].x + blocks[i].width > blocks[t].x + collisionPadding && blocks[i].x < blocks[t].x + blocks[t].width - collisionPadding) {
						// stop block from falling
						blocks[i].y = blocks[t].y - blocks[i].height;
						blocks[i].velocityDown = 0;
						
						// platforms don't matter at this point
						break;
					}
				}
			}
		
			// look for collision with platforms
			for (p = 0; p < platforms.length; p++) {
				// compare x/y values
				if (blocks[i].y + blocks[i].height > platforms[p].y && blocks[i].y + blocks[i].height < platforms[p].y + platforms[p].height && blocks[i].y + blocks[i].height - blocks[i].velocityDown - collisionPadding < platforms[p].y && blocks[i].x + blocks[i].width > platforms[p].x + collisionPadding && blocks[i].x < platforms[p].x + platforms[p].width - collisionPadding) {
					// stop block from falling
					blocks[i].y = platforms[p].y - blocks[i].height;
					blocks[i].velocityDown = 0;
				}
			}
		}
	}
	
	// platform loop
	for (i = 0; i < platforms.length; i++) {
		// look for collisions with player
		if (!(keys.down in keysDown) && player.velocityUp <= 0) {
			// compare x/y values
			if (player.y + player.height > platforms[i].y && player.y + player.height < platforms[i].y + platforms[i].height && player.y + player.height - player.velocityDown - collisionPadding < platforms[i].y && player.x + player.width > platforms[i].x + collisionPadding && player.x < platforms[i].x + platforms[i].width - collisionPadding) {
				// stop player
				player.y = platforms[i].y - player.height;
				
				// reset jumping/falling
				player.jumping = false;
				player.velocityDown = 0;
			}
        }
	}
};

// create a new level
var levelUp = function(x) {	
	// don't play sound on first load
	if (!firstTime)
		sfxNext.play();
	
	sfxDone.pause();
		
	// clear checkmark animation
	$('#check img').css('animation', '');
	$('#check img').css('-webkit-animation', '');
	$('#check img').fadeOut('fast'); 
	
	// begin new level
	$('#right').html(''); 
	paused = false;
		
	// prevents level from completing itself
	var pass = false;
	
	while (!pass) {
		blocks = new Array;
		alt = new Array;
		level = '';
	
		// *******************
		// LET'S MAKE A LEVEL!
		switch (x) {
			case 1:
				level = '<a>text</a>';
				break;
			case 2:
				level = '<em>text</em>';
				break;
			case 3:
				level = '<strong>text</strong>';
				break;
			case 4:
				level = '<em><a>text</a></em>';
				alt.push('<a><em>text</em></a>');
				break;
			case 5:
				level = '<strong><a>text</a></strong>';
				alt.push('<a><strong>text</strong></a>');
				break;
			case 6:
				level = '<em>text<strong>text</strong></em>';
				break;
			case 7:
				level = 'text<br/>text<br/>text';
				break;
			case 8:
				level = '<a>text</a><br/>text';
				alt.push('<a>text<br/></a>text');
				break;
			case 9:
				level = 'text<br/><em>text</em>';
				alt.push('text<em><br/>text</em>');
				break;
			case 10:
				level = 'text<p>text</p>';
				//alt.push('text<p></p>text');
				break;
			case 11:
				level = 'texttext<em>text</em><p>texttexttext</p>';
				//alt.push('texttext<em>text</em><p></p>texttexttext');
				break;
			case 12:
				level = 'text<p>text<br/>text</p>';
				//alt.push('text<p></p>text<br/>text');
				break;
			case 13:
				level = '<img/><p>text<br/>text</p>';
				//alt.push('<img/><p></p>text<br/>text');
				break;
			case 14:
				level = '<a>text</a><br/><img/>';
				alt.push('<a>text<br/></a><img/>');
				break;
			case 15:
				level = '<a><img/><br/>text</a>';
				break;
			case 16:
				level = 'text<p><img/><br/><img/></p>';
				//alt.push('text<p></p><img/><br/><img/>');
				break;
			case 17:
				level = '<h1>text</h1>text';
				break;
			case 18:
				level = '<h1>text</h1><h2>text</h2>';
				break;
			case 19:
				level = '<h1><em>text</em></h1><img/>';
				alt.push('<em><h1>text</h1></em><img/>');
				break;
			case 20:
				level = '<h2>text</h2><img/><p>text</p>';
				//alt.push('<h2>text</h2><img/><p></p>text');
				break;
			case 21:
				level = '<h2><a>text</a></h2><strong>text</strong>';
				alt.push('<a><h2>text</h2></a><strong>text</strong>');
				break;
			case 22:
				level = 'texttext<hr/>text<br/>text';
				break;
			case 23:
				level = '<img/><hr/>text<p>text</p>';
				//alt.push('<img/><hr/>text<p></p>text');
				break;
			case 24:
				level = 'text<hr/><a><img/></a><br/>text<hr/>';
				alt.push('text<hr/><a><img/><br/></a>text<hr/>');
				break;
			case 25:
				level = '<ul><li>text</li></ul>';
				break;
			case 26:
				level = '<ul><li>text</li><li>text</li></ul>';
				break;
			case 27:
				level = '<ol><li>text</li><li>text</li></ol>';
				break;
			case 28:
				level = '<ol><li>text</li><li><a>text</a></li><li>text</li></ol>';
				break;
			case 29:
				level = '<img/><ol><li>text</li><li>text</li></ol>text<p>text</p>';
				alt.push('<img/><ol><li>text</li><li>text</li></ol><p>text</p>text');
				break;
			case 30:
				level = '<h1>text</h1><hr/>text<ul><li><em><a>text</a></em></li><li>text</li>text<li>text</li></ul>';
				alt.push('<h1>text</h1><hr/>text<ul><em><li><a>text</a></li></em><li>text</li>text<li>text</li></ul>');
				alt.push('<h1>text</h1><hr/>text<ul><li><a><em>text</em></a></li><li>text</li>text<li>text</li></ul>');
				break;
			default:
				// game's done, let's load it up with crap now
				level = '<a></a><br/><em></em><h1></h1><h2></h2><hr/><img/><li></li><li><li></li><ul></ul><ol></ol><p></p><strong></strong>texttexttexttexttext';
				$('#left').html('');
				$('#level').html('');
				
				if (!gameOver) {
					gameOver = true;			
					localStorage.progress = 0;
					
					// record score
					$('#finaltime').html($('#time').html());
					if (time < best || best == 0) {
						localStorage.best = best = time;
						$('#best').html('<br/>Best Time: '+timer(best));
					}
				
					// congratulations!
					setTimeout("$('#overlay, #window-done').fadeIn('fast'); paused = true;", 1000);
				}
				break;
		}
		
		// replace easy markup with level objects
		for (t in tags) {
			// add level blocks per tag match
			try {
				for (i = 0; i < level.match(new RegExp(t, 'g')).length; i++)
					blocks.push(createBlock(tags[t])); // block.js
			}
			catch(e) {
				// fail gracefully
			}
		
			// convert to final html
			level = level.replace(new RegExp(t, 'g'), ' ' + tags[t].html);
			
			// format alt solutions, too
			for (i = 0; i < alt.length; i++)
				alt[i] = alt[i].replace(new RegExp(t, 'g'), ' ' + tags[t].html);
		}
		
		var html = validate(1);
		
		// if level isn't already solved, move on
		if (level != html) {
			// check for alt solutions, too
			for (i = 0; i < alt.length; i++) {
				if (alt[i] == html)
					continue;
			}
		
			pass = true;
		}
	}
	
	// display html in example window
	if (!gameOver) {
		$('#left').html(level);
		
		// level text
		$('#level').html('Level ' + progress);
		
		// don't animate level on first load
		if (!firstTime) {
			$('#level').css('animation', 'bounce .5s 1 ease');
			$('#level').css('-webkit-animation', 'bounce .5s 1 ease');
		}
		else
			firstTime = false;
	}
};

// validate placement of html blocks
var validate = function(x) {
	// make a copy of the blocks array
	var tempArray = blocks.slice();
	
	// sort by x/y coordinates
	tempArray.sort(function(a, b) {
		return  a.y - b.y || a.x - b.x;
	});
	
	// start html output
	var html = '';
	
	for (i = 0; i < tempArray.length; i++)
		html += ' ' + tempArray[i].html;
		
	// return html output for level building purposes
	if (x != 0)
		return html;
		
	// display new html
	$('#right').html(html);
	
	// check for solution
	var pass = false;
	
	// normal way
	if (level == html)
		pass = true;

	// alt solutions
	for (i = 0; i < alt.length; i++) {
		if (alt[i] == html) {
			pass = true;
			break;
		}
	}
	
	// final check
	if (pass && !gameOver) {
		sfxDrop.pause();
		sfxDone.play();
		
		// increase level number
		progress++;
		
		// save file
		localStorage.progress = progress;
		
		// done graphic
		$('#check img').fadeIn();
		$('#check img').css('animation', 'spin .5s 1 ease');
		$('#check img').css('-webkit-animation', 'spin .5s 1 ease');
		
		paused = true;
		
		// show new level
		setTimeout("levelUp(progress)", 1000);
		$('#level').css('animation', '');
		$('#level').css('-webkit-animation', '');
	}
};

$(function() {	
	// open dialogue boxes
	$('#help').click(function() {
		$('#overlay, #window-help').fadeIn('fast');
		paused = true;
	});
	
	$('#reset').click(function() {
		$('#overlay, #window-reset').fadeIn('fast');
		paused = true;
	});
	
	// close dialogue boxes
	$('#overlay, #window-reset #no, .close').click(function() {
		$('#overlay, .window').fadeOut('fast');
		paused = false;
		
		return false;
	});
	
	// allow clicking on dialogue box
	$('.window').click(function(e) {
		e.stopPropagation();
	});
		
	// reset everything
	$('#window-reset #yes').click(function() {
		firstTime = true;
		gameOver = paused = false;
		localStorage.progress = progress = 1;
		localStorage.time = time = 0
		player.carrying = -1;
		
		levelUp(progress);
		
		$('#right').html('');		
		
		$('#overlay, .window').fadeOut('fast');
		
		return false;
	});
	
	// download current website
	$('#download').click(function() {
		// make a copy of the blocks array
		var tempArray = blocks.slice();
		
		// sort by x/y coordinates
		tempArray.sort(function(a, b) {
			return  a.y - b.y || a.x - b.x;
		});
		
		// start html output
		var html = '';
		
		for (i = 0; i < tempArray.length; i++)
			html += ' ' + tempArray[i].html;
		
		var blob = new Blob([html.substr(1)], { type: 'text/html;charset=utf-8' });
		var url = URL.createObjectURL(blob);
		var link = document.createElement('a');
		link.href = url;
		link.download = 'current-website.html';
		document.body.appendChild(link);
		link.click();
		link.remove();
		setTimeout(function() { URL.revokeObjectURL(url); }, 1000);
		
		return false;
	});
});
