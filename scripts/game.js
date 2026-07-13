// objects
var player;
var tags;
var level;
var alt = new Array;
var blocks = new Array;
var codeLines = new Array;

// variables
var collisionPadding = 6;
var gravitySpeed = 0.3;
var gameOver = false;
var paused = false;
var firstTime = true;
var codeLineHeight = blockHeight;
var codeLineTop = 36;
var codeLineNumberWidth = 16;
var codeLineTextLeft = 8;
var codeLineBlockLeft = 30;
var rightGutterWidth = codeLineBlockLeft;
var codeGridBottom = 0;
var baselineY = 0;
var DISTRIBUTOR_CAPACITY = 6;
var distributorsByLine = new Array;
var gridOriginX = codeLineBlockLeft;
var gridOriginY = codeLineTop - blockHeight;
var gridCellWidth = blockWidth;
var gridCellHeight = blockHeight;
var gridColumnCount = 0;
var gridLineCount = 0;
var DROP_SNAP_RADIUS = Math.round(gridCellWidth * 0.6);
var HORIZONTAL_SNAP_RADIUS = gridCellWidth;
var activeLineIndex = 0;
var activeDisplayLineNumber = 1;
var highlightedMarginIndex = 0;
var activeLineHighlightAlpha = 0.14;
var activeZoneLineCount = 2;
var verticalStepInitialDelayFrames = 12;
var verticalStepRepeatFrames = 4;

var clamp = function(value, min, max) {
	return Math.max(min, Math.min(max, value));
};

var getBlockLineIndex = function(block) {
	return clamp(Math.round(((block.y + block.height) - codeLineTop) / codeLineHeight), 0, codeLines.length - 1);
};

var getLineTop = function(index) {
	return codeLineTop + (index * codeLineHeight);
};

var getBlockDepositTop = function(lineIndex) {
	return getLineTop(lineIndex) - blockHeight;
};

var getPlayAreaBounds = function() {
	return {
		left: codeLineBlockLeft,
		top: codeLineTop - blockHeight,
		right: canvas.width - rightGutterWidth,
		bottom: baselineY
	};
};

var getPlayerActiveZone = function() {
	return {
		top: player.feetY - (activeZoneLineCount * codeLineHeight),
		bottom: player.feetY,
		height: activeZoneLineCount * codeLineHeight
	};
};

var syncGridMetrics = function() {
	gridOriginX = codeLineBlockLeft;
	gridOriginY = codeLineTop - blockHeight;
	gridCellWidth = blockWidth;
	gridCellHeight = blockHeight;
	gridLineCount = codeLines.length;
	var playAreaBounds = getPlayAreaBounds();
	var playableWidth = playAreaBounds.right - playAreaBounds.left;
	gridColumnCount = Math.max(1, Math.floor(playableWidth / gridCellWidth));
};

var cellToPosition = function(lineIndex, columnIndex) {
	var clampedLineIndex = clamp(lineIndex, 0, Math.max(0, gridLineCount - 1));
	var clampedColumnIndex = clamp(columnIndex, 0, Math.max(0, gridColumnCount - 1));

	return {
		lineIndex: clampedLineIndex,
		columnIndex: clampedColumnIndex,
		x: gridOriginX + (clampedColumnIndex * gridCellWidth),
		y: gridOriginY + (clampedLineIndex * gridCellHeight)
	};
};

var positionToNearestCell = function(x, y) {
	var lineIndex = clamp(Math.round((y - gridOriginY) / gridCellHeight), 0, Math.max(0, gridLineCount - 1));
	var columnIndex = clamp(Math.round((x - gridOriginX) / gridCellWidth), 0, Math.max(0, gridColumnCount - 1));

	return cellToPosition(lineIndex, columnIndex);
};

var getDropSnapCell = function(block, rawX, rawY, pickupLineIndex, pickupColumnIndex) {
	var rawCell = positionToNearestCell(rawX, rawY);
	var rawCenterX = rawX + (block.width / 2);
	var preferredColumnIndex = player.facingDirection === 'left' ? rawCell.columnIndex - 1 : rawCell.columnIndex + 1;
	var fallbackColumnIndex = player.facingDirection === 'left' ? rawCell.columnIndex + 1 : rawCell.columnIndex - 1;
	var candidateColumns = [rawCell.columnIndex, preferredColumnIndex, fallbackColumnIndex];
	var bestCandidate = null;

	for (var i = 0; i < candidateColumns.length; i++) {
		var candidateColumnIndex = candidateColumns[i];
		var candidateLineIndex = rawCell.lineIndex;

		if (candidateColumnIndex < 0 || candidateColumnIndex >= gridColumnCount)
			continue;

		var candidateCell = cellToPosition(candidateLineIndex, candidateColumnIndex);
		var candidateCenterX = candidateCell.x + (gridCellWidth / 2);
		var distance = Math.abs(candidateCenterX - rawCenterX);

		if (distance > HORIZONTAL_SNAP_RADIUS)
			continue;
		if (isGridCellOccupied(candidateLineIndex, candidateColumnIndex, block.index))
			continue;

		var priority = 1;
		if (candidateColumnIndex === rawCell.columnIndex)
			priority = 0;
		else if (candidateColumnIndex === preferredColumnIndex)
			priority = 1;
		else
			priority = 2;

		var candidateScore = {
			lineIndex: candidateLineIndex,
			columnIndex: candidateColumnIndex,
			x: candidateCell.x,
			y: candidateCell.y,
			priority: priority,
			distance: distance
		};

		if (!bestCandidate || candidateScore.priority < bestCandidate.priority || (candidateScore.priority === bestCandidate.priority && candidateScore.distance < bestCandidate.distance)) {
			bestCandidate = candidateScore;
		}
	}

	return bestCandidate;
};

var getGridCellRect = function(lineIndex, columnIndex) {
	var cell = cellToPosition(lineIndex, columnIndex);
	return {
		x: cell.x,
		y: cell.y,
		width: gridCellWidth,
		height: gridCellHeight
	};
};

var isGridCellOccupied = function(lineIndex, columnIndex, ignoreBlockIndex) {
	var cellRect = getGridCellRect(lineIndex, columnIndex);

	for (var i = 0; i < blocks.length; i++) {
		if (i === ignoreBlockIndex)
			continue;
		if (blocks[i].storageState === 'distributor')
			continue;
		if (rectanglesOverlap(cellRect, blocks[i])) {
			return true;
		}
	}

	return false;
};

var getNearestFreeGridCell = function(x, y, ignoreBlockIndex) {
	var targetCell = positionToNearestCell(x, y);
	var bestCell = targetCell;
	var bestDistance = Infinity;
	var bestOccupied = true;

	for (var lineIndex = 0; lineIndex < gridLineCount; lineIndex++) {
		for (var columnIndex = 0; columnIndex < gridColumnCount; columnIndex++) {
			var cell = cellToPosition(lineIndex, columnIndex);
			var distance = Math.abs(cell.lineIndex - targetCell.lineIndex) + Math.abs(cell.columnIndex - targetCell.columnIndex);
			var occupied = isGridCellOccupied(lineIndex, columnIndex, ignoreBlockIndex);

			if (occupied && !bestOccupied)
				continue;
			if (!occupied && bestOccupied) {
				bestCell = cell;
				bestDistance = distance;
				bestOccupied = false;
				continue;
			}
			if (occupied === bestOccupied && distance < bestDistance) {
				bestCell = cell;
				bestDistance = distance;
			}
		}
	}

	return {
		lineIndex: bestCell.lineIndex,
		columnIndex: bestCell.columnIndex,
		x: bestCell.x,
		y: bestCell.y,
		valid: !bestOccupied,
		reason: bestOccupied ? 'occupied' : ''
	};
};

var getDropPreviewCell = function(block) {
	var dropPreviewRect = getBlockDropTarget(block);
	return {
		lineIndex: dropPreviewRect.cellLineIndex,
		columnIndex: dropPreviewRect.cellColumnIndex,
		x: dropPreviewRect.cellX,
		y: dropPreviewRect.cellY,
		valid: dropPreviewRect.valid,
		reason: dropPreviewRect.reason
	};
};

var rectanglesOverlap = function(a, b) {
	return a.x < b.x + b.width &&
		a.x + a.width > b.x &&
		a.y < b.y + b.height &&
		a.y + a.height > b.y;
};

var getHeldBlock = function() {
	return player.carrying != -1 ? blocks[player.carrying] : null;
};

var isPlayerInLeftGutter = function() {
	return player.x < codeLineBlockLeft;
};

var syncDistributorBlockLayout = function(lineIndex) {
	if (!distributorsByLine[lineIndex])
		return;

	var stack = distributorsByLine[lineIndex];
	var distributorMiniWidth = 20;
	var distributorMiniHeight = 12;
	var distributorStep = 3;
	var distributorLeft = 2;
	var distributorTop = getLineTop(lineIndex) + Math.round((codeLineHeight - distributorMiniHeight) / 2);

	for (var i = 0; i < stack.length; i++) {
		var block = stack[i];
		block.storageState = 'distributor';
		block.distributorLineIndex = lineIndex;
		block.distributorSlotIndex = i;
		block.lineIndex = null;
		block.velocityDown = 0;
		block.dropSnapActive = false;
		block.dropSnapDelayFrames = 0;
		block.dropSnapFrames = 0;
		block.dropSnapProgress = 0;
		block.x = distributorLeft + (i * distributorStep);
		block.y = distributorTop;
		block.width = distributorMiniWidth;
		block.height = distributorMiniHeight;
	}
};

var syncDistributorStorage = function() {
	distributorsByLine = new Array(codeLines.length);

	for (var lineIndex = 0; lineIndex < codeLines.length; lineIndex++)
		distributorsByLine[lineIndex] = new Array;
};

var storeHeldBlockInDistributor = function(lineIndex) {
	var heldBlock = getHeldBlock();
	if (!heldBlock || !distributorsByLine[lineIndex])
		return false;
	if (distributorsByLine[lineIndex].length >= DISTRIBUTOR_CAPACITY)
		return false;

	distributorsByLine[lineIndex].push(heldBlock);
	syncDistributorBlockLayout(lineIndex);
	heldBlock.storageState = 'distributor';
	heldBlock.distributorLineIndex = lineIndex;
	heldBlock.distributorSlotIndex = distributorsByLine[lineIndex].length - 1;
	heldBlock.lineIndex = null;
	heldBlock.velocityDown = 0;
	heldBlock.dropSnapActive = false;
	heldBlock.dropSnapDelayFrames = 0;
	heldBlock.dropSnapFrames = 0;
	heldBlock.dropSnapProgress = 0;
	heldBlock.pickupLineIndex = null;
	heldBlock.pickupColumnIndex = null;
	heldBlock.pickupPlayerLineIndex = null;
	heldBlock.pickupRelativeLineOffset = null;
	heldBlock.pickupPlayerX = null;
	heldBlock.pickupOffsetFromPlayer = null;
	heldBlock.pickupX = null;
	heldBlock.pickupY = null;
	return true;
};

var takeBlockFromDistributor = function(lineIndex) {
	if (!distributorsByLine[lineIndex] || !distributorsByLine[lineIndex].length)
		return null;

	var block = distributorsByLine[lineIndex].pop();
	block.storageState = 'held';
	block.distributorLineIndex = null;
	block.distributorSlotIndex = null;
	block.lineIndex = null;
	block.width = blockWidth;
	block.height = blockHeight;
	block.dropSnapActive = false;
	block.dropSnapDelayFrames = 0;
	block.dropSnapFrames = 0;
	block.dropSnapProgress = 0;
	syncDistributorBlockLayout(lineIndex);

	return block;
};

var getFacingInteractionTarget = function() {
	if (isPlayerInLeftGutter() && player.facingDirection === 'left') {
		var distributorStack = distributorsByLine[player.lineIndex] || [];
		if (distributorStack.length) {
			return {
				type: 'leftDistributor',
				lineIndex: player.lineIndex,
				block: distributorStack[distributorStack.length - 1]
			};
		}
	}

	var candidate = null;
	var bestDistance = Infinity;
	var playerCenterX = player.x + player.width / 2;

	for (var i = 0; i < blocks.length; i++) {
		var block = blocks[i];
		if (block.storageState === 'distributor')
			continue;
		var blockLineIndex = (block.lineIndex !== undefined && block.lineIndex !== null) ? block.lineIndex : getBlockLineIndex(block);
		var blockCenterX = block.x + block.width / 2;
		var isInFront = player.facingDirection === 'left' ? blockCenterX <= playerCenterX : blockCenterX >= playerCenterX;

		if (block.index === player.carrying)
			continue;
		if (blockLineIndex !== player.lineIndex)
			continue;
		if (!isInFront)
			continue;
		if (!(player.x + player.width >= block.x && player.x <= block.x + block.width))
			continue;

		var distance = Math.abs(playerCenterX - (block.x + block.width / 2));
		if (distance < bestDistance) {
			bestDistance = distance;
			candidate = block;
		}
	}

	return candidate ? {
		type: 'codeBlock',
		index: candidate.index,
		block: candidate
	} : null;
};

var getPickupCandidate = function() {
	return getFacingInteractionTarget();
};

var validateBlockPlacement = function(block, targetX, targetY, targetLineIndex) {
	var heldBlock = getHeldBlock();
	var pickupLineIndex = (block.pickupLineIndex !== undefined && block.pickupLineIndex !== null) ? block.pickupLineIndex : getBlockLineIndex(block);
	var pickupPlayerLineIndex = (block.pickupPlayerLineIndex !== undefined && block.pickupPlayerLineIndex !== null) ? block.pickupPlayerLineIndex : player.lineIndex;
	var pickupRelativeLineOffset = (block.pickupRelativeLineOffset !== undefined && block.pickupRelativeLineOffset !== null) ? block.pickupRelativeLineOffset : (pickupLineIndex - pickupPlayerLineIndex);
	var resolvedLineIndex = (targetLineIndex !== undefined && targetLineIndex !== null) ? targetLineIndex : (player.lineIndex + pickupRelativeLineOffset);
	var resolvedX = (targetX !== undefined && targetX !== null) ? targetX : Math.round(block.x);
	var resolvedY = (targetY !== undefined && targetY !== null) ? targetY : getBlockDepositTop(resolvedLineIndex);
	var targetCell = positionToNearestCell(resolvedX, resolvedY);
	var placementCell = targetCell;
	var snapCell = getDropSnapCell(block, resolvedX, resolvedY, pickupLineIndex, (block.pickupColumnIndex !== undefined && block.pickupColumnIndex !== null) ? block.pickupColumnIndex : null);
	var targetRect = {
		x: resolvedX,
		y: resolvedY,
		width: block.width,
		height: block.height
	};
	var playArea = getPlayAreaBounds();
	var valid = true;
	var reason = '';

	if (resolvedLineIndex < 0 || resolvedLineIndex >= codeLines.length) {
		valid = false;
		reason = 'out_of_bounds';
	}
	else if (!snapCell) {
		valid = false;
		reason = 'occupied';
	}
	else {
		placementCell = snapCell;
		resolvedX = snapCell.x;
		resolvedY = snapCell.y;
		targetRect = {
			x: resolvedX,
			y: resolvedY,
			width: block.width,
			height: block.height
		};

		if (targetRect.x < playArea.left || targetRect.y < playArea.top || targetRect.x + targetRect.width > playArea.right || targetRect.y + targetRect.height > playArea.bottom) {
			valid = false;
			reason = 'out_of_bounds';
		}
	}
	if (valid && (targetRect.x < playArea.left || targetRect.y < playArea.top || targetRect.x + targetRect.width > playArea.right || targetRect.y + targetRect.height > playArea.bottom)) {
		valid = false;
		reason = 'out_of_bounds';
	}
	else if (valid) {
		for (var j = 0; j < blocks.length; j++) {
			var otherBlock = blocks[j];
			if (otherBlock === block || otherBlock === heldBlock)
				continue;
			if (otherBlock.storageState === 'distributor')
				continue;

			var blockRect = {
				x: otherBlock.x,
				y: otherBlock.y,
				width: otherBlock.width,
				height: otherBlock.height
			};

			if (rectanglesOverlap(targetRect, blockRect)) {
				valid = false;
				reason = 'occupied';
				break;
			}
		}
	}

	return {
		lineIndex: placementCell.lineIndex,
		columnIndex: placementCell.columnIndex,
		x: resolvedX,
		y: resolvedY,
		cellX: placementCell.x,
		cellY: placementCell.y,
		cellLineIndex: placementCell.lineIndex,
		cellColumnIndex: placementCell.columnIndex,
		valid: valid,
		reason: reason
	};
};

var getBlockDropTarget = function(block) {
	return validateBlockPlacement(block);
};

var getHeldBlockVisualRect = function(block) {
	return {
		x: block.x,
		y: block.y,
		width: block.width,
		height: block.height
	};
};

var getPlacedBlockRect = function(block, target) {
	return {
		x: target.x,
		y: target.y,
		width: block.width,
		height: block.height
	};
};

var assertNoBlockOverlap = function() {
	for (var a = 0; a < blocks.length; a++) {
		for (var b = a + 1; b < blocks.length; b++) {
			var blockA = blocks[a];
			var blockB = blocks[b];
			if (blockA.lineIndex === null || blockA.lineIndex === undefined || blockB.lineIndex === null || blockB.lineIndex === undefined)
				continue;
			if (blockA.storageState === 'distributor' || blockB.storageState === 'distributor')
				continue;
			if (rectanglesOverlap(blockA, blockB)) {
				console.warn('Block overlap detected after deposit', {
					overlapA: a,
					overlapB: b
				});
				return false;
			}
		}
	}

	return true;
};

var finalizeHeldBlockDrop = function() {
	var heldBlock = getHeldBlock();
	if (!heldBlock)
		return;

	if (isPlayerInLeftGutter() && player.facingDirection === 'left') {
		if (storeHeldBlockInDistributor(player.lineIndex)) {
			heldBlock.storageState = 'distributor';
			heldBlock.distributorLineIndex = player.lineIndex;
			heldBlock.distributorSlotIndex = distributorsByLine[player.lineIndex].length - 1;
			heldBlock.lineIndex = null;
			heldBlock.velocityDown = 0;
			heldBlock.pickupLineIndex = null;
			heldBlock.pickupColumnIndex = null;
			heldBlock.pickupPlayerLineIndex = null;
			heldBlock.pickupRelativeLineOffset = null;
			heldBlock.pickupPlayerX = null;
			heldBlock.pickupOffsetFromPlayer = null;
			heldBlock.pickupX = null;
			heldBlock.pickupY = null;
			player.carrying = -1;
			player.drop = false;
			validate(0); // game.js
			return;
		}

		player.drop = false;
		return;
	}

	var dropPreviewRect = getBlockDropTarget(heldBlock);

	if (dropPreviewRect.valid) {
		var placedBlockRect = getPlacedBlockRect(heldBlock, dropPreviewRect);
		heldBlock.lineIndex = dropPreviewRect.lineIndex;
		heldBlock.x = placedBlockRect.x;
		heldBlock.y = placedBlockRect.y;
		heldBlock.dropSnapStartX = placedBlockRect.x;
		heldBlock.dropSnapStartY = placedBlockRect.y;
		heldBlock.dropSnapTargetX = dropPreviewRect.cellX;
		heldBlock.dropSnapTargetY = dropPreviewRect.cellY;
		heldBlock.dropSnapDelayFrames = 6;
		heldBlock.dropSnapFrames = 8;
		heldBlock.dropSnapProgress = 0;
		heldBlock.dropSnapActive = true;
	}
	else {
		player.drop = false;
		return;
	}

	heldBlock.velocityDown = 0;
	heldBlock.pickupLineIndex = null;
	heldBlock.pickupColumnIndex = null;
	heldBlock.pickupPlayerLineIndex = null;
	heldBlock.pickupRelativeLineOffset = null;
	heldBlock.pickupPlayerX = null;
	heldBlock.pickupOffsetFromPlayer = null;
	heldBlock.pickupX = null;
	heldBlock.pickupY = null;

	player.carrying = -1;
	player.drop = false;

	assertNoBlockOverlap();
	validate(0); // game.js
};

var getGridBottom = function() {
	return codeLines.length ? getLineTop(codeLines.length - 1) : canvas.height - blockHeight;
};

var syncBlockToLine = function(block, lineIndex) {
	block.lineIndex = clamp(lineIndex, 0, codeLines.length - 1);
	block.y = getBlockDepositTop(block.lineIndex);
	block.velocityDown = 0;
};

var syncPlayerToLine = function(lineIndex) {
	var nextLineIndex = clamp(lineIndex, 0, codeLines.length - 1);
	player.lineIndex = nextLineIndex;
	player.feetY = codeLines[nextLineIndex].y;
	player.targetFeetY = player.feetY;
	player.y = player.feetY - player.height;
	player.velocityUp = 0;
	player.velocityDown = 0;
	player.jumping = false;
};

var queuePlayerVerticalStep = function(direction) {
	if (!codeLines.length)
		return false;

	var nextLineIndex = clamp(player.lineIndex + direction, 0, codeLines.length - 1);
	if (nextLineIndex === player.lineIndex && player.targetFeetY === codeLines[nextLineIndex].y)
		return false;

	player.lineIndex = nextLineIndex;
	player.targetFeetY = codeLines[nextLineIndex].y;
	return true;
};

var getVerticalStepDirection = function() {
	if ((keys.up in keysDown) && !(keys.down in keysDown))
		return -1;
	if ((keys.down in keysDown) && !(keys.up in keysDown))
		return 1;
	return 0;
};

var buildHtmlFromBlocks = function(sourceBlocks) {
	var tempArray = sourceBlocks.slice();

	tempArray.sort(function(a, b) {
		var lineA = (a.lineIndex !== undefined && a.lineIndex !== null) ? a.lineIndex : getBlockLineIndex(a);
		var lineB = (b.lineIndex !== undefined && b.lineIndex !== null) ? b.lineIndex : getBlockLineIndex(b);

		return lineA - lineB || a.x - b.x || a.index - b.index;
	});

	var html = '';

	for (i = 0; i < tempArray.length; i++)
		if (tempArray[i].storageState !== 'distributor')
			html += ' ' + tempArray[i].html;

	return html;
};

var escapeHtml = function(value) {
	return String(value)
		.replace(/&/g, '&amp;')
		.replace(/</g, '&lt;')
		.replace(/>/g, '&gt;')
		.replace(/"/g, '&quot;');
};

var buildDistributorPanelHtml = function() {
	if (!distributorsByLine || !distributorsByLine.length)
		return '';

	var html = '<div style="margin-top:16px; padding-top:10px; border-top:1px dashed rgba(110, 120, 130, 0.35);">';
	html += '<div style="font:700 12px monospace; letter-spacing:0.04em; color:#5f6974; margin-bottom:8px;">BLOCK DISTRIBUTORS</div>';

	for (var lineIndex = 0; lineIndex < distributorsByLine.length; lineIndex++) {
		var stack = distributorsByLine[lineIndex] || [];
		html += '<div style="display:flex; align-items:center; gap:8px; margin:4px 0;">';
		html += '<div style="width:18px; text-align:right; font:700 11px monospace; color:#6d7680;">' + (lineIndex + 1) + '</div>';
		html += '<div style="display:flex; gap:4px; flex-wrap:nowrap;">';

		for (var slotIndex = 0; slotIndex < stack.length; slotIndex++) {
			var block = stack[slotIndex];
			html += '<span style="display:inline-flex; align-items:center; justify-content:center; width:60px; height:33px; box-sizing:border-box; border:1px solid rgba(120,130,140,0.55); border-radius:3px; background:' + (slotIndex === stack.length - 1 ? 'rgba(244, 250, 244, 0.98)' : 'rgba(246, 246, 246, 0.96)') + '; color:#3b424a; font:600 10px/1 monospace; overflow:hidden; white-space:nowrap; text-overflow:ellipsis; padding:0 4px;">' + escapeHtml(block.html) + '</span>';
		}

		html += '</div></div>';
	}

	html += '</div>';
	return html;
};

var buildTargetWebsiteHtml = function() {
	return '<div style="font:700 12px monospace; letter-spacing:0.04em; color:#5f6974; margin-bottom:8px;">TARGET WEBSITE</div>' +
		'<div style="margin-bottom:12px;">' + level + '</div>' +
		buildDistributorPanelHtml();
};

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

	// set up code lines
	codeLines = new Array;
	for (i = 0; i < Math.floor((canvas.height - codeLineTop - 1) / codeLineHeight) + 1; i++) {
		codeLines[i] = {
			index: i,
			number: i + 1,
			x: 0,
			y: getLineTop(i),
			width: canvas.width,
			height: codeLineHeight
		};
	}
	codeGridBottom = getGridBottom();
	baselineY = codeGridBottom;
	syncGridMetrics();
	
	// create first level
	syncPlayerToLine(codeLines.length - 1);
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
	var pickupCandidate = player.carrying == -1 && player.pickup && player.reverse ? getPickupCandidate() : null;
	for (i = 0; i < blocks.length; i++) {
		if (blocks[i].storageState === 'distributor')
			continue;
		blocks[i].update();
		
		// player is attempting to pick up a block
		if (player.carrying == -1 && player.pickup && player.reverse) {
			if (pickupCandidate && pickupCandidate.type === 'codeBlock' && pickupCandidate.index === i) {
				// tie index to player
				player.carrying = i;
				blocks[i].pickupLineIndex = (blocks[i].lineIndex !== undefined && blocks[i].lineIndex !== null) ? blocks[i].lineIndex : getBlockLineIndex(blocks[i]);
				blocks[i].pickupColumnIndex = Math.round((blocks[i].x - codeLineBlockLeft) / blockWidth);
				blocks[i].pickupPlayerLineIndex = player.lineIndex;
				blocks[i].pickupRelativeLineOffset = blocks[i].pickupLineIndex - blocks[i].pickupPlayerLineIndex;
	blocks[i].pickupPlayerX = Math.round(player.x);
	blocks[i].pickupOffsetFromPlayer = Math.round(blocks[i].x - player.x);
	blocks[i].pickupX = blocks[i].x;
	blocks[i].pickupY = blocks[i].y;
				
				sfxDrop.play();
			}
		}

		// ignore the block being held
		if (player.carrying != i) {
			// look for collisions with player
			if (player.velocityUp <= 0) {
				// compare x/y values
				if (player.y + player.height > blocks[i].y && player.y + player.height < blocks[i].y + blocks[i].height && player.y + player.height - player.velocityDown - collisionPadding < blocks[i].y && player.x + player.width > blocks[i].x + collisionPadding && player.x < blocks[i].x + blocks[i].width - collisionPadding) {
					// stop player
					player.y = blocks[i].y - player.height;
					player.feetY = blocks[i].y;
					player.targetFeetY = player.feetY;
					player.lineIndex = (blocks[i].lineIndex !== undefined && blocks[i].lineIndex !== null) ? blocks[i].lineIndex : getBlockLineIndex(blocks[i]);
					
					// reset jumping/falling
					player.jumping = false;
					player.velocityDown = 0;
				}
			}
			
			// look for collision with other blocks
			for (t = 0; t < blocks.length; t++) {
				// ignore self and carried block
				if (t != i && t != player.carrying && blocks[t].storageState !== 'distributor') {
					// compare x/y values
					if (blocks[i].y + blocks[i].height > blocks[t].y && blocks[i].y + blocks[i].height < blocks[t].y + blocks[t].height && blocks[i].y + blocks[i].height - blocks[i].velocityDown - collisionPadding < blocks[t].y && blocks[i].x + blocks[i].width > blocks[t].x + collisionPadding && blocks[i].x < blocks[t].x + blocks[t].width - collisionPadding) {
						// stop block from falling
						syncBlockToLine(blocks[i], ((blocks[t].lineIndex !== undefined && blocks[t].lineIndex !== null) ? blocks[t].lineIndex : getBlockLineIndex(blocks[t])) - 1);
						
						// the row support is already handled by the line grid
						break;
					}
				}
			}
		
			// look for collision with code lines
			for (p = 0; p < codeLines.length; p++) {
				// compare x/y values
				if (blocks[i].y + blocks[i].height > codeLines[p].y && blocks[i].y + blocks[i].height < codeLines[p].y + codeLines[p].height && blocks[i].y + blocks[i].height - blocks[i].velocityDown - collisionPadding < codeLines[p].y && blocks[i].x + blocks[i].width > codeLines[p].x + collisionPadding && blocks[i].x < codeLines[p].x + codeLines[p].width - collisionPadding) {
					// stop block from falling
					syncBlockToLine(blocks[i], p);
				}
			}
		}
	}
	
	// code line loop
	for (i = 0; i < codeLines.length; i++) {
		// look for collisions with player
		if (player.velocityUp <= 0) {
			// compare x/y values
			if (player.y + player.height > codeLines[i].y && player.y + player.height < codeLines[i].y + codeLines[i].height && player.y + player.height - player.velocityDown - collisionPadding < codeLines[i].y && player.x + player.width > codeLines[i].x + collisionPadding && player.x < codeLines[i].x + codeLines[i].width - collisionPadding) {
				// stop player
				player.y = codeLines[i].y - player.height;
				player.feetY = codeLines[i].y;
				player.targetFeetY = player.feetY;
				player.lineIndex = i;
				
				// reset jumping/falling
				player.jumping = false;
				player.velocityDown = 0;
			}
        }
	}

activeLineIndex = player.lineIndex;
activeDisplayLineNumber = activeLineIndex + 1;
highlightedMarginIndex = activeLineIndex;
	console.log({
		playerLineIndex: player.lineIndex,
		activeLineIndex: activeLineIndex,
		activeDisplayLineNumber: activeDisplayLineNumber,
		highlightedMarginIndex: highlightedMarginIndex
	});
if (!Number.isInteger(player.lineIndex) || !Number.isInteger(activeLineIndex) || !Number.isInteger(activeDisplayLineNumber) || !Number.isInteger(highlightedMarginIndex) || player.lineIndex !== activeLineIndex || highlightedMarginIndex !== activeLineIndex || activeDisplayLineNumber !== activeLineIndex + 1) {
		console.error('line sync mismatch', {
			playerLineIndex: player.lineIndex,
			activeLineIndex: activeLineIndex,
			activeDisplayLineNumber: activeDisplayLineNumber,
			highlightedMarginIndex: highlightedMarginIndex
		});
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
		syncDistributorStorage();
	
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
	var html = buildHtmlFromBlocks(blocks);
	
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
		var html = buildHtmlFromBlocks(blocks);
		
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
