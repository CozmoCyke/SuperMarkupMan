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
var codeGridVerticalOffset = 3 * codeLineHeight;
var codeLineTop = 36 + codeGridVerticalOffset;
var codeLineNumberWidth = 16;
var codeLineTextLeft = 8;
var codeLineBlockLeft = 30;
var codeLineCount = 15;
var rightGutterWidth = codeLineBlockLeft;
var codeGridBottom = 0;
var baselineY = 0;
var DISTRIBUTOR_CAPACITY = 5;
var distributorsByLine = new Array;
var powerDistributorsByLine = new Array;
var POWER_ORDER = ['edit', 'copy', 'cut', 'delete', 'insert', 'inspect'];
var POWER_DEFINITIONS = {
	edit: { label: 'Edit', color: 'rgba(60, 120, 230, 0.95)', icon: '✎' },
	copy: { label: 'Copy', color: 'rgba(214, 180, 60, 0.95)', icon: '▣' },
	cut: { label: 'Cut', color: 'rgba(230, 135, 55, 0.95)', icon: '✂' },
	delete: { label: 'Delete', color: 'rgba(210, 72, 72, 0.95)', icon: '×' },
	insert: { label: 'Insert', color: 'rgba(96, 210, 96, 0.95)', icon: '+' },
	inspect: { label: 'Inspect', color: 'rgba(245, 245, 245, 0.95)', icon: '⌕' }
};
var POWER_UNLOCK_REQUIREMENTS = {
	edit: 3,
	copy: 6,
	cut: 9,
	delete: 12,
	insert: 15,
	inspect: 18
};
var POWER_DISTRIBUTOR_LINE_INDICES = {
	edit: 0,
	copy: 2,
	cut: 4,
	delete: 6,
	insert: 8,
	inspect: 10
};
var gridOriginX = codeLineBlockLeft;
var gridOriginY = codeLineTop - blockHeight;
var gridCellWidth = blockWidth;
var gridCellHeight = blockHeight;
var gridColumnCount = 0;
var gridLineCount = 0;
var DROP_SNAP_RADIUS = Math.round(gridCellWidth * 0.6);
var HORIZONTAL_SNAP_RADIUS = gridCellWidth;
var pickupContactTolerance = 3;
var activeLineIndex = 0;
var activeDisplayLineNumber = 1;
var highlightedMarginIndex = 0;
var activeLineHighlightAlpha = 0.14;
var activeZoneLineCount = 2;
var verticalStepInitialDelayFrames = 12;
var verticalStepRepeatFrames = 4;
var distributorStartMode = false;
var gameMode = 'student';
var teacherModeState = 'build';
var teacherTargetSyncEnabled = true;
var teacherTargetHtml = '';
var teacherDraftSnapshot = null;
var teacherTestSnapshot = null;
var teacherStartingSnapshot = null;
var teacherImportOverflow = [];
var teacherLevelCode = '';
var teacherLevelLibrary = [];
var teacherInventoryByLine = [];
var teacherPaletteOpen = false;
var teacherPaletteSelectedIndex = 0;
var teacherPaletteMessage = '';
var debugInfoVisible = true;
var POWER_ACTION_FRAME_PREP = 10;
var POWER_ACTION_FRAME_EXECUTE = 11;
var POWER_ACTION_PREP_DURATION = 5;
var POWER_ACTION_EXECUTE_DURATION = 5;
var POWER_ACTION_CLEANUP_DURATION = 5;
var maxAvailableLevel = 33;
var currentLevel = 1;
var savedProgress = 1;
var currentRightBaseHtml = '';
var devHelpVisible = false;

var clamp = function(value, min, max) {
	return Math.max(min, Math.min(max, value));
};

var createInactivePowerAnimationState = function() {
	return {
		active: false,
		powerId: null,
		targetBlockId: null,
		targetSnapshot: null,
		insertSide: null,
		phase: 'idle',
		frameCounter: 0,
		effectExecuted: false,
		cleanupHandled: false,
		requiresHtmlRefresh: false
	};
};

var isPowerAnimationActive = function() {
	return !!(player && player.actionAnimation && player.actionAnimation.active);
};

var findBlockById = function(blockId) {
	if (blockId === undefined || blockId === null)
		return null;

	for (var i = 0; i < blocks.length; i++) {
		if (blocks[i] && blocks[i].id === blockId)
			return blocks[i];
	}

	return null;
};

var getPowerAnimationTargetBlock = function(action) {
	if (!action)
		return null;

	return findBlockById(action.targetBlockId);
};

var syncNextBlockId = function() {
	var highestBlockId = 0;
	for (var i = 0; i < blocks.length; i++) {
		if (blocks[i] && Number.isInteger(blocks[i].id))
			highestBlockId = Math.max(highestBlockId, blocks[i].id);
	}

	nextBlockId = highestBlockId + 1;
};

var isTeacherMode = function() {
	return gameMode === 'teacher';
};

var isStudentMode = function() {
	return gameMode === 'student';
};

var isTeacherBuildMode = function() {
	return isTeacherMode() && teacherModeState === 'build';
};

var isTeacherTestMode = function() {
	return isTeacherMode() && teacherModeState === 'test';
};

var setTeacherModeState = function(nextState) {
	if (nextState !== 'build' && nextState !== 'test')
		return false;

	if (!isTeacherMode()) {
		teacherModeState = 'build';
		return false;
	}

	if (teacherModeState === nextState)
		return true;

	if (nextState === 'test') {
		teacherPaletteOpen = false;
		teacherDraftSnapshot = captureTeacherStateSnapshot();
		teacherModeState = 'test';
		teacherTargetSyncEnabled = false;
		restoreTeacherStartingState();
	}
	else {
		teacherPaletteOpen = false;
		teacherTestSnapshot = captureTeacherStateSnapshot();
		teacherModeState = 'build';
		teacherTargetSyncEnabled = true;
		restoreTeacherDraftState();
	}

	refreshTeacherHudState();
	refreshDevHelpWindow();
	return true;
};

var toggleTeacherModeState = function() {
	return setTeacherModeState(teacherModeState === 'build' ? 'test' : 'build');
};

var escapeRegExp = function(value) {
	return String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
};

var getBlockLineIndex = function(block) {
	return clamp(Math.round(((block.y + block.height) - codeLineTop) / codeLineHeight), 0, codeLines.length - 1);
};

var getLineTop = function(index) {
	return codeLineTop + (index * codeLineHeight);
};

var getDisplayLineNumber = function(lineIndex) {
	return clamp(codeLineCount - lineIndex, 1, codeLineCount);
};

var getPlayerFeetLineIndex = function(targetPlayer) {
	var activePlayer = targetPlayer || player;
	if (!activePlayer)
		return 0;

	if (Number.isInteger(activePlayer.lineIndex))
		return clamp(activePlayer.lineIndex, 0, Math.max(0, codeLines.length - 1));

	if (activePlayer.feetY !== undefined && activePlayer.feetY !== null)
		return clamp(Math.round((activePlayer.feetY - codeLineTop) / codeLineHeight), 0, Math.max(0, codeLines.length - 1));

	return 0;
};

var getDistributorZoneTop = function() {
	var leftPanel = document.getElementById('left');
	if (!canvas || !leftPanel || !leftPanel.getBoundingClientRect)
		return codeLineTop - codeLineHeight;

	var canvasRect = canvas.getBoundingClientRect();
	var leftRect = leftPanel.getBoundingClientRect();

	return Math.round(canvasRect.top + codeLineTop - codeLineHeight - leftRect.top - leftPanel.clientTop);
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

var isPlayerInRightGutter = function() {
	var playAreaBounds = getPlayAreaBounds();
	return player.x + player.width > playAreaBounds.right;
};

var isExperimentalPowerLevel = function() {
	return currentLevel >= 31 && currentLevel <= 33;
};

var getCompletedLevelCount = function() {
	return clamp((Number.isInteger(savedProgress) ? savedProgress : 1) - 1, 0, maxAvailableLevel);
};

var isPowerPermanentlyUnlocked = function(powerId) {
	if (!POWER_UNLOCK_REQUIREMENTS[powerId])
		return false;

	return getCompletedLevelCount() >= POWER_UNLOCK_REQUIREMENTS[powerId];
};

var isPowerAvailableForCurrentLevel = function(powerId) {
	if (isExperimentalPowerLevel())
		return true;

	return isPowerPermanentlyUnlocked(powerId);
};

var createDefaultPowerState = function() {
	var state = {};
	for (var i = 0; i < POWER_ORDER.length; i++)
		state[POWER_ORDER[i]] = false;
	return state;
};

var clonePowerState = function(sourceState) {
	var state = createDefaultPowerState();
	if (!sourceState)
		return state;

	for (var i = 0; i < POWER_ORDER.length; i++) {
		var powerId = POWER_ORDER[i];
		state[powerId] = !!sourceState[powerId];
	}

	return state;
};

var loadStoredPowerState = function() {
	var state = createDefaultPowerState();
	if (localStorage.powers === undefined)
		return state;

	try {
		var parsedState = JSON.parse(localStorage.powers);
		return clonePowerState(parsedState);
	}
	catch (e) {
		return state;
	}
};

var saveStoredPowerState = function(state) {
	if (isExperimentalPowerLevel())
		return;

	localStorage.powers = JSON.stringify(clonePowerState(state));
};

var getPowerDefinition = function(powerId) {
	return POWER_DEFINITIONS[powerId] || null;
};

var getPowerLineIndex = function(powerId) {
	return POWER_DISTRIBUTOR_LINE_INDICES[powerId];
};

var getPowerIdForLine = function(lineIndex) {
	for (var i = 0; i < POWER_ORDER.length; i++) {
		var powerId = POWER_ORDER[i];
		if (POWER_DISTRIBUTOR_LINE_INDICES[powerId] === lineIndex)
			return powerId;
	}

	return null;
};

var getDistributorZoneTopForPanel = function(panelId) {
	var panel = document.getElementById(panelId);
	if (!canvas || !panel || !panel.getBoundingClientRect)
		return codeLineTop;

	var canvasRect = canvas.getBoundingClientRect();
	var panelRect = panel.getBoundingClientRect();
	var panelStyle = window.getComputedStyle ? window.getComputedStyle(panel) : null;
	var panelPaddingTop = panelStyle ? parseFloat(panelStyle.paddingTop) || 0 : 0;

	return Math.round(canvasRect.top + codeLineTop - panelRect.top - panel.clientTop - panelPaddingTop);
};

var getDistributorZoneTop = function() {
	return getDistributorZoneTopForPanel('left');
};

var getPowerDistributorZoneTop = function() {
	return getDistributorZoneTopForPanel('right');
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

var syncPowerDistributorStorage = function() {
	powerDistributorsByLine = new Array(codeLines.length);

	for (var lineIndex = 0; lineIndex < codeLines.length; lineIndex++)
		powerDistributorsByLine[lineIndex] = new Array;

	var visiblePowerIds = getVisiblePowerIdsForCurrentLevel();
	for (var i = 0; i < visiblePowerIds.length; i++) {
		var powerId = visiblePowerIds[i];
		var powerLineIndex = getPowerLineIndex(powerId);
		if (powerLineIndex === undefined || powerLineIndex === null)
			continue;
		if (!powerDistributorsByLine[powerLineIndex])
			continue;

		powerDistributorsByLine[powerLineIndex].push(powerId);
	}
};

var canStartLevelInDistributorMode = function() {
	var blocksForDistribution = [];
	var blocksPerLine = new Array(codeLines.length);

	for (var lineIndex = 0; lineIndex < codeLines.length; lineIndex++)
		blocksPerLine[lineIndex] = 0;

	for (var i = 0; i < blocks.length; i++) {
		var block = blocks[i];
		if (!block || block.storageState === 'distributor')
			continue;
		if (typeof block.index !== 'number')
			continue;

		var blockLineIndex = (block.lineIndex !== undefined && block.lineIndex !== null) ? block.lineIndex : getBlockLineIndex(block);
		blockLineIndex = clamp(blockLineIndex, 0, codeLines.length - 1);
		blocksPerLine[blockLineIndex]++;

		if (blocksPerLine[blockLineIndex] > DISTRIBUTOR_CAPACITY) {
			return {
				allowed: false,
				lineIndex: blockLineIndex
			};
		}

		blocksForDistribution.push(block);
	}

	blocksForDistribution.sort(function(a, b) {
		var lineA = (a.lineIndex !== undefined && a.lineIndex !== null) ? a.lineIndex : getBlockLineIndex(a);
		var lineB = (b.lineIndex !== undefined && b.lineIndex !== null) ? b.lineIndex : getBlockLineIndex(b);

		return lineA - lineB || a.x - b.x || a.index - b.index;
	});

	return {
		allowed: true,
		blocks: blocksForDistribution
	};
};

var applyDistributorStartMode = function() {
	var plan = canStartLevelInDistributorMode();
	if (!plan.allowed)
		return false;

	syncDistributorStorage();

	for (var i = 0; i < plan.blocks.length; i++) {
		var block = plan.blocks[i];
		var lineIndex = (block.lineIndex !== undefined && block.lineIndex !== null) ? block.lineIndex : getBlockLineIndex(block);
		lineIndex = clamp(lineIndex, 0, codeLines.length - 1);
		distributorsByLine[lineIndex].push(block);
	}

	for (var lineIndex = 0; lineIndex < codeLines.length; lineIndex++)
		syncDistributorBlockLayout(lineIndex);

	return true;
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

var takePowerFromDistributor = function(lineIndex) {
	if (!powerDistributorsByLine[lineIndex] || !powerDistributorsByLine[lineIndex].length)
		return null;

	var powerId = powerDistributorsByLine[lineIndex].pop();
	return powerId || null;
};

var getFacingInteractionTarget = function() {
	var playerFeetLineIndex = getPlayerFeetLineIndex(player);

	if (isPlayerInLeftGutter() && player.facingDirection === 'left') {
		var distributorStack = distributorsByLine[playerFeetLineIndex] || [];
		if (distributorStack.length) {
			return {
				type: 'leftDistributor',
				lineIndex: playerFeetLineIndex,
				block: distributorStack[distributorStack.length - 1]
			};
		}
	}

	var candidate = null;
	var bestDistance = Infinity;
	var playerLeft = player.x;
	var playerRight = player.x + player.width;
	var playerTop = player.y;
	var playerBottom = player.y + player.height;

	for (var i = 0; i < blocks.length; i++) {
		var block = blocks[i];
		if (block.storageState === 'distributor')
			continue;
		var blockLineIndex = (block.lineIndex !== undefined && block.lineIndex !== null) ? block.lineIndex : getBlockLineIndex(block);
		var blockLeft = block.x;
		var blockRight = block.x + block.width;
		var blockTop = block.y;
		var blockBottom = block.y + block.height;
		var overlapsPlayerHorizontally = blockLeft < playerRight && blockRight > playerLeft;
		var touchesHorizontally = blockLeft <= playerRight + pickupContactTolerance && blockRight >= playerLeft - pickupContactTolerance;
		var touchesVertically = blockTop <= playerBottom + pickupContactTolerance && blockBottom >= playerTop - pickupContactTolerance;
		var facesBlock = overlapsPlayerHorizontally || (player.facingDirection === 'left' ? blockRight <= playerLeft : blockLeft >= playerRight);
		var canPickup = blockLineIndex === playerFeetLineIndex && touchesHorizontally && touchesVertically && facesBlock;

		if (block.index === player.carrying)
			continue;
		if (!canPickup)
			continue;

		var horizontalGap = 0;
		if (blockRight < playerLeft)
			horizontalGap = playerLeft - blockRight;
		else if (blockLeft > playerRight)
			horizontalGap = blockLeft - playerRight;

		var verticalGap = 0;
		if (blockBottom < playerTop)
			verticalGap = playerTop - blockBottom;
		else if (blockTop > playerBottom)
			verticalGap = blockTop - playerBottom;

		var distance = Math.sqrt((horizontalGap * horizontalGap) + (verticalGap * verticalGap));
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

var getFacingEditInteractionTarget = function() {
	var target = getFacingInteractionTarget();
	return target && target.type === 'codeBlock' ? target : null;
};

var getPickupCandidate = function() {
	return getFacingInteractionTarget();
};

var validateBlockPlacement = function(block, targetX, targetY, targetLineIndex) {
	var heldBlock = getHeldBlock();
	var pickupLineIndex = (block.pickupLineIndex !== undefined && block.pickupLineIndex !== null) ? block.pickupLineIndex : getBlockLineIndex(block);
	var pickupPlayerLineIndex = (block.pickupPlayerLineIndex !== undefined && block.pickupPlayerLineIndex !== null) ? block.pickupPlayerLineIndex : getPlayerFeetLineIndex(player);
	var pickupRelativeLineOffset = (block.pickupRelativeLineOffset !== undefined && block.pickupRelativeLineOffset !== null) ? block.pickupRelativeLineOffset : (pickupLineIndex - pickupPlayerLineIndex);
	var resolvedLineIndex = (targetLineIndex !== undefined && targetLineIndex !== null) ? targetLineIndex : (getPlayerFeetLineIndex(player) + pickupRelativeLineOffset);
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
		var playerFeetLineIndex = getPlayerFeetLineIndex(player);
		if (storeHeldBlockInDistributor(playerFeetLineIndex)) {
			heldBlock.storageState = 'distributor';
			heldBlock.distributorLineIndex = playerFeetLineIndex;
			heldBlock.distributorSlotIndex = distributorsByLine[playerFeetLineIndex].length - 1;
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
			html += ' ' + getBlockOutputHtml(tempArray[i]);

	return html;
};

var escapeHtml = function(value) {
	return String(value)
		.replace(/&/g, '&amp;')
		.replace(/</g, '&lt;')
		.replace(/>/g, '&gt;')
		.replace(/"/g, '&quot;');
};

var buildTeacherInventoryPanelHtml = function() {
	if (!isTeacherBuildMode())
		return '';

	if (!teacherInventoryByLine || teacherInventoryByLine.length !== codeLines.length)
		syncTeacherInventoryStorage();

	var zoneTop = getDistributorZoneTop();
	var zoneHeight = codeLineCount * codeLineHeight;
	var html = '<div style="font:700 12px monospace; letter-spacing:0.04em; color:#5f6974; margin-bottom:8px;">PROF INVENTORY</div>';
	html += '<div style="position:absolute; left:0; right:0; top:' + zoneTop + 'px; height:' + zoneHeight + 'px; pointer-events:none;">';
	html += '<div style="position:relative; width:100%; height:100%;">';

	for (var lineIndex = 0; lineIndex < teacherInventoryByLine.length; lineIndex++) {
		var stack = teacherInventoryByLine[lineIndex] || [];
		var template = stack[0];
		if (!template)
			continue;

		var rowTop = lineIndex * codeLineHeight;
		var rowLabel = getDisplayLineNumber(lineIndex);
		html += '<div style="position:absolute; left:0; right:0; top:' + rowTop + 'px; height:' + codeLineHeight + 'px; display:flex; align-items:center; gap:8px; box-sizing:border-box; pointer-events:auto;">';
		html += '<div style="width:18px; flex:0 0 18px; text-align:right; font:700 11px monospace; color:#6d7680; line-height:' + codeLineHeight + 'px;">' + rowLabel + '</div>';
		html += '<div style="margin-left:auto; display:flex; align-items:center; justify-content:flex-end; gap:4px; flex:1 1 auto; min-width:0; height:' + codeLineHeight + 'px;">';
		html += '<span style="display:inline-flex; align-items:center; justify-content:center; width:60px; height:' + blockHeight + 'px; box-sizing:border-box; border:1px solid rgba(120,130,140,0.55); border-radius:3px; background:rgba(246, 246, 246, 0.96); color:#3b424a; font:600 10px/1 monospace; overflow:hidden; white-space:nowrap; text-overflow:ellipsis; padding:0 4px;">' + escapeHtml(template.label || template.html) + '</span>';
		html += '</div></div>';
	}

	html += '</div></div></div>';
	return html;
};

var buildDistributorPanelHtml = function() {
	if (isTeacherBuildMode())
		return buildTeacherInventoryPanelHtml();

	if (!distributorsByLine || !distributorsByLine.length)
		return '';

	var zoneTop = getDistributorZoneTop();
	var zoneHeight = codeLineCount * codeLineHeight;
	var html = '<div style="font:700 12px monospace; letter-spacing:0.04em; color:#5f6974; margin-bottom:8px;">BLOCK DISTRIBUTORS</div>';
	html += '<div style="position:absolute; left:0; right:0; top:' + zoneTop + 'px; height:' + zoneHeight + 'px; pointer-events:none;">';
	html += '<div style="position:relative; width:100%; height:100%;">';

	for (var lineIndex = 0; lineIndex < distributorsByLine.length; lineIndex++) {
		var stack = distributorsByLine[lineIndex] || [];
		var rowTop = lineIndex * codeLineHeight;
		html += '<div style="position:absolute; left:0; right:0; top:' + rowTop + 'px; height:' + codeLineHeight + 'px; display:flex; align-items:center; gap:8px; box-sizing:border-box; pointer-events:auto;">';
		html += '<div style="width:18px; flex:0 0 18px; text-align:right; font:700 11px monospace; color:#6d7680; line-height:' + codeLineHeight + 'px;">' + getDisplayLineNumber(lineIndex) + '</div>';
		html += '<div style="margin-left:auto; display:flex; align-items:center; justify-content:flex-end; gap:4px; flex:1 1 auto; min-width:0; height:' + codeLineHeight + 'px;">';

		for (var slotIndex = 0; slotIndex < stack.length; slotIndex++) {
			var block = stack[slotIndex];
			html += '<span style="display:inline-flex; align-items:center; justify-content:center; width:60px; height:' + blockHeight + 'px; box-sizing:border-box; border:1px solid rgba(120,130,140,0.55); border-radius:3px; background:' + (slotIndex === stack.length - 1 ? 'rgba(244, 250, 244, 0.98)' : 'rgba(246, 246, 246, 0.96)') + '; color:#3b424a; font:600 10px/1 monospace; overflow:hidden; white-space:nowrap; text-overflow:ellipsis; padding:0 4px;">' + escapeHtml(block.label || block.html) + '</span>';
		}

		html += '</div></div>';
	}

	html += '</div></div></div>';
	return html;
};

var buildPowerDistributorPanelHtml = function() {
	if (!powerDistributorsByLine || !powerDistributorsByLine.length)
		return '';

	var hasVisiblePower = false;
	for (var scanLineIndex = 0; scanLineIndex < powerDistributorsByLine.length; scanLineIndex++) {
		if (powerDistributorsByLine[scanLineIndex] && powerDistributorsByLine[scanLineIndex].length) {
			hasVisiblePower = true;
			break;
		}
	}

	if (!hasVisiblePower)
		return '';

	var zoneTop = getPowerDistributorZoneTop();
	var zoneHeight = codeLineCount * codeLineHeight;
	var html = '<div style="position:absolute; left:0; right:0; top:' + zoneTop + 'px; height:' + zoneHeight + 'px; pointer-events:none;">';
	html += '<div style="position:relative; width:100%; height:100%;">';

	for (var lineIndex = 0; lineIndex < powerDistributorsByLine.length; lineIndex++) {
		var stack = powerDistributorsByLine[lineIndex] || [];
		if (!stack.length)
			continue;

		var powerId = stack[stack.length - 1];
		var powerInfo = getPowerDefinition(powerId);
		if (!powerInfo)
			continue;

		var rowTop = lineIndex * codeLineHeight;
		var visibleLineNumber = getDisplayLineNumber(lineIndex);
		var rowCenterY = rowTop + Math.round(codeLineHeight / 2);
		html += '<div data-power-id="' + escapeHtml(powerId) + '" data-power-line-index="' + lineIndex + '" style="position:absolute; left:0; right:0; top:' + rowTop + 'px; height:' + codeLineHeight + 'px; box-sizing:border-box; pointer-events:auto; overflow:hidden;">';
		html += '<div style="position:relative; width:100%; height:100%;">';
		html += '<span style="position:absolute; left:6px; top:4px; display:inline-flex; align-items:center; justify-content:flex-start; min-width:72px; max-width:100%; height:14px; padding:0 8px; border:1px solid rgba(120,130,140,0.55); border-radius:3px; background:' + powerInfo.color + '; color:#ffffff; font:600 10px/1 monospace; overflow:hidden; white-space:nowrap; text-overflow:ellipsis;">' + escapeHtml(powerInfo.icon + ' ' + powerInfo.label) + '</span>';
		if (debugInfoVisible)
			html += '<span style="position:absolute; left:6px; bottom:2px; color:rgba(73,82,90,0.78); font:8px monospace; white-space:nowrap;">power.lineIndex=' + lineIndex + ' visibleLineNumber=' + visibleLineNumber + ' powerTop=' + rowTop + ' powerCenterY=' + rowCenterY + ' interactionLineIndex=' + lineIndex + '</span>';
		html += '</div>';
		html += '</div>';
	}

	html += '</div></div></div>';
	return html;
};

var buildRightPanelHtml = function(baseHtml) {
	var html = '<div style="position:relative; min-height:100%;">';
	html += '<div style="position:relative; z-index:1;">' + (baseHtml || '') + '</div>';
	html += '<div style="position:absolute; left:0; right:0; top:0; z-index:2;">' + buildPowerDistributorPanelHtml() + '</div>';
	html += '</div>';
	return html;
};

var refreshRightPanelHtml = function(baseHtml) {
	if (baseHtml !== undefined && baseHtml !== null)
		currentRightBaseHtml = baseHtml;

	if ($('#right').length)
		$('#right').html(buildRightPanelHtml(currentRightBaseHtml));
};

var getEffectivePlayerPowers = function() {
	var effectivePowers = createDefaultPowerState();
	var powerSources = [player && player.unlockedPowers, player && player.equippedPowers, player && player.testLevelPowers];

	for (var sourceIndex = 0; sourceIndex < powerSources.length; sourceIndex++) {
		var source = powerSources[sourceIndex];
		if (!source)
			continue;

		for (var powerIndex = 0; powerIndex < POWER_ORDER.length; powerIndex++) {
			var powerId = POWER_ORDER[powerIndex];
			effectivePowers[powerId] = !!(effectivePowers[powerId] || source[powerId]);
		}
	}

	return effectivePowers;
};

var getPowerHudIds = function() {
	var effectivePowers = getEffectivePlayerPowers();
	var powerIds = [];

	for (var i = 0; i < POWER_ORDER.length; i++) {
		var powerId = POWER_ORDER[i];
		if (effectivePowers[powerId])
			powerIds.push(powerId);
	}

	return powerIds;
};

var buildTargetWebsiteHtml = function() {
	var targetPreviewHtml = isTeacherMode() && teacherTargetHtml ? teacherTargetHtml : level;
	var statusHtml = '';
	if (isTeacherMode()) {
		statusHtml = '<div style="font:700 12px monospace; letter-spacing:0.04em; color:#5f6974; margin-bottom:8px;">' +
			(isTeacherBuildMode() ? 'PROF — CONSTRUCTION' : 'PROF — TEST') +
			' | TARGET SYNC: ' + (teacherTargetSyncEnabled ? 'ON' : 'OFF') +
			(teacherLevelCode ? ' | CODE ' + escapeHtml(teacherLevelCode) : '') +
			'</div>';
	}

	return statusHtml +
		'<div style="margin-bottom:12px;">' + targetPreviewHtml + '</div>' +
		buildDistributorPanelHtml();
};

// read from save file or create new
if (localStorage.progress !== undefined) {
	var progress = parseInt(localStorage.progress);
	if (!Number.isInteger(progress))
		progress = 1;
	if (progress > maxAvailableLevel)
		progress = maxAvailableLevel;
	
	if (progress < 1)
		gameOver = true;
	savedProgress = progress;
	currentLevel = clamp(progress, 1, maxAvailableLevel);
}
else {
	var progress = 1;
	localStorage.progress = 1;
	savedProgress = progress;
	currentLevel = progress;
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

var isEditableTarget = function(target) {
	if (!target)
		return false;

	if (target.isContentEditable)
		return true;

	var tagName = target.tagName ? target.tagName.toLowerCase() : '';
	return tagName === 'input' || tagName === 'textarea' || tagName === 'select';
};

var selectLevelFromPrompt = function() {
	var currentLevelValue = clamp(currentLevel, 1, maxAvailableLevel);
	var requestedLevel = prompt('Choisir un niveau de 1 à ' + maxAvailableLevel, String(currentLevelValue));
	if (requestedLevel === null)
		return;

	requestedLevel = String(requestedLevel).trim();
	if (requestedLevel === '')
		return;

	var selectedLevel = Number(requestedLevel);
	if (!Number.isFinite(selectedLevel) || !Number.isInteger(selectedLevel)) {
		alert('Veuillez entrer un niveau entier entre 1 et ' + maxAvailableLevel + '.');
		return;
	}

	if (selectedLevel < 1 || selectedLevel > maxAvailableLevel) {
		alert('Veuillez choisir un niveau entre 1 et ' + maxAvailableLevel + '.');
		return;
	}

	currentLevel = selectedLevel;
	progress = selectedLevel;
	levelUp(progress);
};

var editTargetBlock = function(block) {
	var target = block ? { type: 'codeBlock', index: block.index } : player.editInteractionTarget;
	if (!target || target.type !== 'codeBlock')
		return false;

	block = blocks[target.index];
	if (!block || block.storageState === 'distributor')
		return false;

	if (block.type === 'string-empty') {
		if (block.isFilled)
			return editGeneralBlock(block);
		var stringValue = prompt('Saisir une chaîne de texte', block.editableValue || '');
		if (stringValue === null)
			return false;

		if (!applyEditableBlockValue(block, stringValue)) {
			alert('Valeur invalide.');
			return false;
		}

		return true;
	}

	if (block.type === 'markup-empty') {
		if (block.isFilled)
			return editGeneralBlock(block);
		var markupValue = prompt('Saisir un fragment de markup valide', block.editableValue || '');
		if (markupValue === null)
			return false;

		if (!applyEditableBlockValue(block, markupValue)) {
			alert('Markup invalide.');
			return false;
		}

		return true;
	}

	if (block.type === 'markup-choice-empty') {
		if (block.isFilled)
			return editGeneralBlock(block);
		if (!block.choices || !block.choices.length) {
			alert('Aucun choix disponible pour ce bloc.');
			return false;
		}

		var choicesText = [];
		for (var i = 0; i < block.choices.length; i++)
			choicesText.push((i + 1) + '. ' + block.choices[i].label);

		var currentChoice = block.selectedChoiceIndex !== undefined && block.selectedChoiceIndex !== null ? block.selectedChoiceIndex + 1 : '';
		var choiceValue = prompt('Choisir un fragment:\n' + choicesText.join('\n'), String(currentChoice));
		if (choiceValue === null)
			return false;

		var choiceIndex = parseInt(choiceValue, 10) - 1;
		if (!setMarkupChoice(block, choiceIndex)) {
			alert('Choix invalide.');
			return false;
		}

		return true;
	}

	return editGeneralBlock(block);
};

var editBlock = function(block) {
	return editTargetBlock(block);
};

var canPickupBlock = function(block) {
	return !!block && block.storageState !== 'distributor' && !block.isSystemOnly;
};

var canEditBlock = function(block) {
	return !!block && block.storageState !== 'distributor' && !block.isSystemOnly;
};

var canCopyBlock = function(block) {
	return !!block && block.storageState !== 'distributor' && !block.isSystemOnly;
};

var canCutBlock = function(block) {
	return canPickupBlock(block) && canDeleteBlock(block);
};

var canDeleteBlock = function(block) {
	return !!block && block.storageState !== 'distributor' && !block.isSystemOnly;
};

var canInsertRelativeToBlock = function(block) {
	return !!block && block.storageState !== 'distributor' && !block.isSystemOnly && !!player && !!player.clipboardBlock;
};

var canInspectBlock = function(block) {
	return !!block && block.storageState !== 'distributor' && !block.isSystemOnly;
};

var hasEffectivePower = function(powerId) {
	var effectivePlayerPowers = getEffectivePlayerPowers();
	return !!(effectivePlayerPowers && effectivePlayerPowers[powerId]);
};

var editGeneralBlock = function(block) {
	if (!block || block.storageState === 'distributor')
		return false;

	var currentValue = getBlockOutputHtml(block);
	var promptLabel = 'Modifier le bloc';
	var nextValue = prompt(promptLabel, currentValue || block.label || block.placeholderLabel || '');
	if (nextValue === null)
		return false;

	nextValue = String(nextValue);
	if (block.type === 'markup-empty' && !isValidMarkupFragment(nextValue)) {
		alert('Markup invalide.');
		return false;
	}

	block.editableValue = nextValue;
	if (block.type === 'string-empty')
		block.outputHtml = escapeHtmlFragment(nextValue);
	else
		block.outputHtml = nextValue;

	block.label = nextValue;
	block.isEditable = true;
	if (block.type === 'string-empty' || block.type === 'markup-empty' || block.type === 'markup-choice-empty')
		block.isFilled = true;

	return true;
};

var getAvailableBlockActions = function(block) {
	var actions = [];

	if (canPickupBlock(block))
		actions.push('pickup');

	if (hasEffectivePower('edit') && canEditBlock(block))
		actions.push('edit');

	if (hasEffectivePower('copy') && canCopyBlock(block))
		actions.push('copy');

	if (hasEffectivePower('cut') && canCutBlock(block))
		actions.push('cut');

	if (hasEffectivePower('delete') && canDeleteBlock(block))
		actions.push('delete');

	if (hasEffectivePower('insert') && canInsertRelativeToBlock(block))
		actions.push('insert');

	if (hasEffectivePower('inspect') && canInspectBlock(block))
		actions.push('inspect');

	return actions;
};

var isFacingLeftDistributor = function() {
	var playerFeetLineIndex = getPlayerFeetLineIndex(player);
	if (!player || player.facingDirection !== 'left' || !isPlayerInLeftGutter() || !Number.isInteger(playerFeetLineIndex) || playerFeetLineIndex < 0 || playerFeetLineIndex >= codeLines.length)
		return false;

	if (isTeacherBuildMode())
		return !!getTeacherInventoryTemplate(playerFeetLineIndex);

	return !!distributorsByLine[playerFeetLineIndex];
};

var isFacingRightPowerDistributor = function() {
	if (!player || player.facingDirection !== 'right' || !isPlayerInRightGutter() || player.carrying != -1)
		return false;
	var playerFeetLineIndex = getPlayerFeetLineIndex(player);
	if (!Number.isInteger(playerFeetLineIndex) || playerFeetLineIndex < 0 || playerFeetLineIndex >= codeLines.length)
		return false;

	return !!(powerDistributorsByLine && powerDistributorsByLine[playerFeetLineIndex] && powerDistributorsByLine[playerFeetLineIndex].length);
};

var getActionLabel = function(actionName) {
	var actionLabels = {
		pickup: 'Pickup',
		edit: 'Edit',
		copy: 'Copy',
		cut: 'Cut',
		delete: 'Delete',
		insert: player && player.facingDirection === 'left' ? 'Insert ← avant' : 'Insert → après',
		inspect: 'Inspect'
	};

	return actionLabels[actionName] || String(actionName || '');
};

var getActionColor = function(actionName) {
	var actionColors = {
		pickup: 'rgba(72, 160, 90, 0.9)',
		edit: 'rgba(60, 120, 230, 0.95)',
		copy: 'rgba(214, 180, 60, 0.95)',
		cut: 'rgba(230, 135, 55, 0.95)',
		delete: 'rgba(210, 72, 72, 0.95)',
		insert: 'rgba(96, 210, 96, 0.95)',
		inspect: 'rgba(245, 245, 245, 0.95)'
	};

	return actionColors[actionName] || actionColors.pickup;
};

var getTeacherPaletteActions = function() {
	return [
		{ id: 'freeze-target', label: 'Figer la cible' },
		{ id: 'capture-start-state', label: 'Capturer l\u2019\u00e9tat \u00e9l\u00e8ve' },
		{ id: 'import-html', label: 'Importer HTML' },
		{ id: 'save-level', label: 'Sauvegarder le niveau' }
	];
};

var setTeacherPaletteMessage = function(message) {
	teacherPaletteMessage = message ? String(message) : '';
};

var closeTeacherPalette = function() {
	teacherPaletteOpen = false;
	teacherPaletteSelectedIndex = 0;
};

var openTeacherPalette = function() {
	if (!isTeacherBuildMode())
		return false;

	teacherPaletteOpen = true;
	teacherPaletteSelectedIndex = clamp(teacherPaletteSelectedIndex, 0, getTeacherPaletteActions().length - 1);
	return true;
};

var toggleTeacherPalette = function() {
	if (!isTeacherBuildMode())
		return false;

	if (teacherPaletteOpen) {
		closeTeacherPalette();
		return false;
	}

	return openTeacherPalette();
};

var executeSelectedTeacherPaletteAction = function() {
	if (!isTeacherBuildMode())
		return false;

	var actions = getTeacherPaletteActions();
	var selectedActionIndex = clamp(teacherPaletteSelectedIndex || 0, 0, actions.length - 1);
	var selectedAction = actions[selectedActionIndex];
	if (!selectedAction)
		return false;

	if (selectedAction.id === 'freeze-target') {
		freezeTeacherTarget();
		setTeacherPaletteMessage('Cible figée');
		return true;
	}

	if (selectedAction.id === 'capture-start-state') {
		captureTeacherStartingState();
		setTeacherPaletteMessage('État élève capturé');
		return true;
	}

	if (selectedAction.id === 'import-html') {
		var sourceHtml = prompt('Coller le HTML à importer', '');
		if (sourceHtml === null) {
			setTeacherPaletteMessage('Import annulé');
			return false;
		}

		var importedResult = importSourceAsBlocks(sourceHtml);
		var importedCount = importedResult && importedResult.blocks ? importedResult.blocks.length : 0;
		var overflowCount = importedResult && importedResult.overflow ? importedResult.overflow.length : 0;
		setTeacherPaletteMessage(importedCount + ' blocs importés / ' + overflowCount + ' en overflow');
		return true;
	}

	if (selectedAction.id === 'save-level') {
		var levelTitle = prompt('Titre du niveau', '');
		if (levelTitle === null) {
			setTeacherPaletteMessage('Sauvegarde annulée');
			return false;
		}

		var levelCode = prompt('Code à 4 chiffres', teacherLevelCode || '');
		if (levelCode === null) {
			setTeacherPaletteMessage('Sauvegarde annulée');
			return false;
		}

		levelCode = String(levelCode).trim();
		if (!/^[0-9]{4}$/.test(levelCode)) {
			setTeacherPaletteMessage('Code invalide');
			return false;
		}

		var keywordInput = prompt('Mots-clés séparés par des virgules', '');
		if (keywordInput === null) {
			setTeacherPaletteMessage('Sauvegarde annulée');
			return false;
		}

		var exerciseType = prompt('Type d’exercice (recognize, order, complete, repair, transform, create, debug)', 'recognize');
		if (exerciseType === null) {
			setTeacherPaletteMessage('Sauvegarde annulée');
			return false;
		}

		exerciseType = String(exerciseType).trim().toLowerCase();
		var allowedExerciseTypes = {
			recognize: true,
			order: true,
			complete: true,
			repair: true,
			transform: true,
			create: true,
			debug: true
		};
		if (!allowedExerciseTypes[exerciseType]) {
			setTeacherPaletteMessage('Type d’exercice invalide');
			return false;
		}

		var savedMetadata = saveTeacherLevelMetadata({
			code: levelCode,
			title: levelTitle,
			keywords: String(keywordInput || '').split(','),
			lessonType: exerciseType,
			targetHtml: teacherTargetHtml || buildHtmlFromBlocks(blocks),
			startingState: captureTeacherStateSnapshot()
		});

		if (!savedMetadata) {
			setTeacherPaletteMessage('Code ' + levelCode + ' déjà utilisé');
			return false;
		}

		setTeacherPaletteMessage('Niveau sauvegardé : ' + levelCode);
		return true;
	}

	return false;
};

var syncPlayerInteractionActions = function() {
	if (!player)
		return;

	if (isFacingRightPowerDistributor() || isFacingLeftDistributor()) {
		player.interactionActions = [];
		player.selectedInteractionActionIndex = 0;
		player.interactionActionsSignature = '';
		player.interactionMenuActive = false;
		return;
	}

	var target = player.interactionTarget;
	var block = target && target.type === 'codeBlock' ? blocks[target.index] : null;
	var nextActions = block ? getAvailableBlockActions(block) : [];
	var nextSignature = block ? (block.index + ':' + nextActions.join('|')) : '';
	var previousSignature = player.interactionActionsSignature || '';
	var wasMenuActive = !!player.interactionMenuActive;

	player.interactionActions = nextActions;
	player.interactionActionsSignature = nextSignature;
	player.interactionMenuActive = nextActions.length > 1 && player.carrying == -1;

	if (!nextActions.length) {
		player.selectedInteractionActionIndex = 0;
	}
	else if (nextSignature !== previousSignature) {
		player.selectedInteractionActionIndex = 0;
	}
	else {
		var previousSelectedIndex = player.selectedInteractionActionIndex || 0;
		player.selectedInteractionActionIndex = ((previousSelectedIndex % nextActions.length) + nextActions.length) % nextActions.length;
	}

	if (player.interactionMenuActive && !wasMenuActive) {
		delete keysDown[keys.up];
		delete keysDown[keys.down];
	}
};

var getSelectedBlockInteractionAction = function() {
	if (!player || !player.interactionActions || !player.interactionActions.length)
		return null;

	var selectedIndex = clamp(player.selectedInteractionActionIndex || 0, 0, player.interactionActions.length - 1);
	return player.interactionActions[selectedIndex];
};

var setSelectedBlockInteractionActionIndex = function(nextIndex) {
	if (!player || !player.interactionActions || !player.interactionActions.length)
		return;

	player.selectedInteractionActionIndex = ((nextIndex % player.interactionActions.length) + player.interactionActions.length) % player.interactionActions.length;
};

var getSelectedBlockInteractionActionIndex = function() {
	return player && Number.isInteger(player.selectedInteractionActionIndex) ? player.selectedInteractionActionIndex : 0;
};

var reindexBlocks = function() {
	for (var i = 0; i < blocks.length; i++)
		blocks[i].index = i;
};

var syncHeldBlockPickupState = function(block) {
	if (!block || !player)
		return false;

	player.carrying = block.index;
	block.storageState = 'held';
	block.distributorLineIndex = null;
	block.distributorSlotIndex = null;
	block.pickupLineIndex = (block.pickupLineIndex !== undefined && block.pickupLineIndex !== null) ? block.pickupLineIndex : getBlockLineIndex(block);
	block.pickupColumnIndex = (block.pickupColumnIndex !== undefined && block.pickupColumnIndex !== null) ? block.pickupColumnIndex : Math.round((block.x - codeLineBlockLeft) / blockWidth);
	block.pickupPlayerLineIndex = getPlayerFeetLineIndex(player);
	block.pickupRelativeLineOffset = block.pickupLineIndex - block.pickupPlayerLineIndex;
	block.pickupPlayerX = Math.round(player.x);
	block.pickupOffsetFromPlayer = Math.round(block.x - player.x);
	block.pickupX = block.x;
	block.pickupY = block.y;
	player.interactionActions = [];
	player.selectedInteractionActionIndex = 0;
	player.interactionActionsSignature = '';
	player.interactionMenuActive = false;
	player.interactionTarget = null;
	player.editInteractionTarget = null;
	return true;
};

var cloneBlockForAction = function(sourceBlock) {
	if (!sourceBlock)
		return null;

	var clonedTag = {
		src: sourceBlock.sprite || sourceBlock.src || sourceBlock.html,
		type: sourceBlock.type,
		label: sourceBlock.label,
		placeholderLabel: sourceBlock.placeholderLabel,
		html: sourceBlock.html,
		outputHtml: getBlockOutputHtml(sourceBlock),
		isEditable: sourceBlock.isEditable,
		isFilled: sourceBlock.isFilled,
		isSystemOnly: sourceBlock.isSystemOnly,
		editableValue: sourceBlock.editableValue,
		selectedChoiceIndex: sourceBlock.selectedChoiceIndex,
		choices: sourceBlock.choices ? sourceBlock.choices.slice() : []
	};

	return createBlock(clonedTag);
};

var clearBlockInteractionState = function() {
	if (!player)
		return;

	player.interactionActions = [];
	player.selectedInteractionActionIndex = 0;
	player.interactionActionsSignature = '';
	player.interactionMenuActive = false;
	player.interactionTarget = null;
	player.editInteractionTarget = null;
};

var pickupBlock = function(block) {
	if (!block)
		return false;

	if (player.carrying != -1) {
		player.drop = true;
		return true;
	}

	if (block.storageState === 'distributor')
		return false;

	player.pickup = true;
	player.frameX = 7;
	player.velocity = 0;
	return syncHeldBlockPickupState(block);
};

var handleSpaceOnLeftDistributor = function() {
	if (!isFacingLeftDistributor())
		return false;

	if (isTeacherBuildMode()) {
		if (player.carrying != -1) {
			var teacherHeldBlock = getHeldBlock();
			if (teacherHeldBlock) {
				blocks.splice(teacherHeldBlock.index, 1);
				reindexBlocks();
			}
			player.carrying = -1;
			player.drop = false;
			clearBlockInteractionState();
			return true;
		}

		var teacherTemplate = getTeacherInventoryTemplate(getPlayerFeetLineIndex(player));
		return takeTeacherInventoryBlock(teacherTemplate);
	}

	if (player.carrying != -1) {
		var playerFeetLineIndex = getPlayerFeetLineIndex(player);
		if (storeHeldBlockInDistributor(playerFeetLineIndex)) {
			var heldBlock = getHeldBlock();
			if (heldBlock) {
				heldBlock.storageState = 'distributor';
				heldBlock.distributorLineIndex = playerFeetLineIndex;
				heldBlock.distributorSlotIndex = distributorsByLine[playerFeetLineIndex].length - 1;
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
			}

			player.carrying = -1;
			player.drop = false;
			player.interactionActions = [];
			player.selectedInteractionActionIndex = 0;
			player.interactionActionsSignature = '';
			player.interactionMenuActive = false;
			player.interactionTarget = null;
			player.editInteractionTarget = null;
		}

		return true;
	}

	var takenBlock = takeBlockFromDistributor(getPlayerFeetLineIndex(player));
	if (!takenBlock)
		return true;

	player.carrying = takenBlock.index;
	takenBlock.storageState = 'held';
	takenBlock.distributorLineIndex = null;
	takenBlock.distributorSlotIndex = null;
	player.interactionActions = [];
	player.selectedInteractionActionIndex = 0;
	player.interactionActionsSignature = '';
	player.interactionMenuActive = false;
	player.interactionTarget = null;
	player.editInteractionTarget = null;
	return true;
};

var handleSpaceOnRightPowerDistributor = function() {
	if (!isFacingRightPowerDistributor())
		return false;

	var playerFeetLineIndex = getPlayerFeetLineIndex(player);
	var powerId = takePowerFromDistributor(playerFeetLineIndex);
	if (!powerId)
		return true;

	if (!acquireOrEquipPower(powerId)) {
		if (!powerDistributorsByLine[playerFeetLineIndex])
			powerDistributorsByLine[playerFeetLineIndex] = new Array;
		powerDistributorsByLine[playerFeetLineIndex].push(powerId);
		refreshRightPanelHtml(currentRightBaseHtml);
		return true;
	}

	refreshRightPanelHtml(currentRightBaseHtml);
	player.interactionActions = [];
	player.selectedInteractionActionIndex = 0;
	player.interactionActionsSignature = '';
	player.interactionMenuActive = false;
	player.interactionTarget = null;
	player.editInteractionTarget = null;
	return true;
};

var copyBlock = function(block) {
	if (!canCopyBlock(block))
		return false;

	player.clipboardBlock = cloneBlockForAction(block);
	return !!player.clipboardBlock;
};

var cutBlock = function(block) {
	if (!canCutBlock(block))
		return false;

	player.clipboardBlock = cloneBlockForAction(block);
	return deleteBlock(block);
};

var deleteBlock = function(block) {
	if (!block)
		return false;

	var blockIndex = block.index;
	if (blockIndex < 0 || blockIndex >= blocks.length)
		return false;

	blocks.splice(blockIndex, 1);
	reindexBlocks();

	if (player && player.carrying === blockIndex)
		player.carrying = -1;
	else if (player && player.carrying > blockIndex)
		player.carrying--;

	if (!isPowerAnimationActive()) {
		clearBlockInteractionState();
		syncPlayerInteractionActions();
	}
	return true;
};

var insertBlockNear = function(block) {
	if (!block || !player || !player.clipboardBlock)
		return false;

	if (!canInsertRelativeToBlock(block))
		return false;

	var insertSide = player.actionAnimation && player.actionAnimation.insertSide ? player.actionAnimation.insertSide : (player.facingDirection === 'left' ? 'before' : 'after');
	var targetCell = positionToNearestCell(block.x + (block.width / 2), block.y + (block.height / 2));
	var targetLineIndex = targetCell.lineIndex;
	var targetColumnIndex = targetCell.columnIndex;
	var stepDirection = insertSide === 'before' ? -1 : 1;
	var chosenCell = null;
	var chosenColumnIndex = targetColumnIndex + stepDirection;
	var insertedBlock = cloneBlockForAction(player.clipboardBlock);
	var searchAttempts = 0;

	if (!insertedBlock)
		return false;

	while (chosenColumnIndex >= 0 && chosenColumnIndex < gridColumnCount) {
		if (!isGridCellOccupied(targetLineIndex, chosenColumnIndex, block.index)) {
			chosenCell = cellToPosition(targetLineIndex, chosenColumnIndex);
			break;
		}

		chosenColumnIndex += stepDirection;
		searchAttempts++;
		if (searchAttempts > gridColumnCount)
			break;
	}

	if (!chosenCell)
		return false;

	var insertIndex = insertSide === 'before' ? block.index : block.index + 1;
	blocks.splice(insertIndex, 0, insertedBlock);
	reindexBlocks();
	insertedBlock.lineIndex = targetLineIndex;
	insertedBlock.y = chosenCell.y;
	insertedBlock.x = chosenCell.x;
	insertedBlock.storageState = 'playArea';
	insertedBlock.velocityDown = 0;
	insertedBlock.dropSnapActive = false;
	insertedBlock.dropSnapDelayFrames = 0;
	insertedBlock.dropSnapFrames = 0;
	insertedBlock.dropSnapProgress = 0;
	if (!isPowerAnimationActive()) {
		player.interactionTarget = { type: 'codeBlock', index: block.index, block: block };
		player.editInteractionTarget = player.interactionTarget;
		syncPlayerInteractionActions();
	}
	return true;
};

var inspectBlock = function(block) {
	if (!block)
		return false;
	alert(
		'Type: ' + String(block.type || '') +
		'\nLabel: ' + String(block.label || '') +
		'\nHTML: ' + String(getBlockOutputHtml(block) || '') +
		'\nLigne: ' + String(block.lineIndex !== undefined && block.lineIndex !== null ? block.lineIndex : getBlockLineIndex(block)) +
		'\nColonne: ' + String(block.columnIndex !== undefined && block.columnIndex !== null ? block.columnIndex : Math.round((block.x - codeLineBlockLeft) / blockWidth)) +
		'\nEtat: ' + String(block.storageState || '')
	);
	return true;
};

var onActionStart = function(powerId, targetBlock) {
	if (!player || !player.actionAnimation)
		return;

	var action = player.actionAnimation;
	action.powerId = powerId;
	action.targetBlockId = targetBlock && targetBlock.id !== undefined ? targetBlock.id : null;
	action.targetSnapshot = targetBlock ? {
		id: targetBlock.id,
		index: targetBlock.index,
		type: targetBlock.type,
		label: targetBlock.label,
		storageState: targetBlock.storageState,
		x: targetBlock.x,
		y: targetBlock.y,
		width: targetBlock.width,
		height: targetBlock.height,
		lineIndex: targetBlock.lineIndex
	} : null;
	action.insertSide = powerId === 'insert' ? (player.facingDirection === 'left' ? 'before' : 'after') : null;
	action.phase = 'prep';
	action.frameCounter = 0;
	action.effectExecuted = false;
	action.cleanupHandled = false;
	action.requiresHtmlRefresh = false;

	clearBlockInteractionState();
	player.interactionActionHold = true;
};

var onActionPrepare = function(action) {
	if (!action)
		return;
};

var onActionExecute = function(action) {
	if (!action)
		return false;

	var targetBlock = getPowerAnimationTargetBlock(action);
	if (!targetBlock)
		return false;

	var didExecute = false;
	switch (action.powerId) {
		case 'edit':
			didExecute = editBlock(targetBlock);
			break;
		case 'copy':
			didExecute = copyBlock(targetBlock);
			break;
		case 'cut':
			didExecute = cutBlock(targetBlock);
			break;
		case 'delete':
			didExecute = deleteBlock(targetBlock);
			break;
		case 'insert':
			didExecute = insertBlockNear(targetBlock);
			break;
		case 'inspect':
			didExecute = inspectBlock(targetBlock);
			break;
		default:
			didExecute = false;
	}

	if (didExecute && action.powerId !== 'copy' && action.powerId !== 'inspect')
		action.requiresHtmlRefresh = true;

	return didExecute;
};

var onActionCleanup = function(action) {
	if (!action || action.cleanupHandled)
		return;

	action.cleanupHandled = true;

	var targetBlock = getPowerAnimationTargetBlock(action);
	if (targetBlock) {
		player.interactionTarget = { type: 'codeBlock', index: targetBlock.index, block: targetBlock };
		player.editInteractionTarget = player.interactionTarget;
	}
	else {
		clearBlockInteractionState();
	}

	if (action.requiresHtmlRefresh)
		validate(0);

	syncPlayerInteractionActions();
};

var finishPowerAnimation = function() {
	if (!player)
		return;

	player.actionAnimation = createInactivePowerAnimationState();
	player.frameX = 0;
};

var startPowerAnimation = function(powerId, targetBlock) {
	if (!player || !powerId || !targetBlock || !targetBlock.id)
		return false;
	if (player.actionAnimation && player.actionAnimation.active)
		return false;
	if (player.pickup)
		return false;

	player.actionAnimation = {
		active: true,
		powerId: powerId,
		targetBlockId: targetBlock.id,
		targetSnapshot: null,
		insertSide: null,
		phase: 'prep',
		frameCounter: 0,
		effectExecuted: false,
		cleanupHandled: false,
		requiresHtmlRefresh: false
	};

	onActionStart(powerId, targetBlock);
	return true;
};

var updatePowerAnimation = function() {
	if (!player || !player.actionAnimation || !player.actionAnimation.active)
		return;

	var action = player.actionAnimation;
	action.frameCounter += 1;

	switch (action.phase) {
		case 'prep':
			player.frameX = POWER_ACTION_FRAME_PREP;
			onActionPrepare(action);

			if (action.frameCounter >= POWER_ACTION_PREP_DURATION) {
				action.phase = 'execute';
				action.frameCounter = 0;
			}
			break;

		case 'execute':
			player.frameX = POWER_ACTION_FRAME_EXECUTE;

			if (!action.effectExecuted) {
				action.effectExecuted = true;
				onActionExecute(action);
			}

			if (action.frameCounter >= POWER_ACTION_EXECUTE_DURATION) {
				action.phase = 'cleanup';
				action.frameCounter = 0;
			}
			break;

		case 'cleanup':
			player.frameX = 0;
			onActionCleanup(action);

			if (action.frameCounter >= POWER_ACTION_CLEANUP_DURATION)
				finishPowerAnimation();
			break;
	}
};

var executeSelectedBlockAction = function() {
	var action = getSelectedBlockInteractionAction();
	var target = getFacingInteractionTarget();
	var editTarget = getFacingEditInteractionTarget();
	var targetBlock = target && target.type === 'codeBlock' ? (target.block || blocks[target.index]) : null;
	var editTargetBlock = editTarget && editTarget.type === 'codeBlock' ? (editTarget.block || blocks[editTarget.index]) : null;
	if (!action)
		return false;

	switch (action) {
		case 'pickup':
			return pickupBlock(targetBlock);
		case 'edit':
			return startPowerAnimation('edit', editTargetBlock || targetBlock);
		case 'copy':
			return startPowerAnimation('copy', targetBlock);
		case 'cut':
			return startPowerAnimation('cut', targetBlock);
		case 'delete':
			return startPowerAnimation('delete', targetBlock);
		case 'insert':
			return startPowerAnimation('insert', targetBlock);
		case 'inspect':
			return startPowerAnimation('inspect', targetBlock);
		default:
			return false;
	}
};

var getVisiblePowerIdsForCurrentLevel = function() {
	var visiblePowerIds = [];
	var effectivePlayerPowers = getEffectivePlayerPowers();

	for (var i = 0; i < POWER_ORDER.length; i++) {
		var powerId = POWER_ORDER[i];
		if (isPowerAvailableForCurrentLevel(powerId) && !effectivePlayerPowers[powerId])
			visiblePowerIds.push(powerId);
	}

	return visiblePowerIds;
};

var acquireOrEquipPower = function(powerId) {
	if (!POWER_DEFINITIONS[powerId])
		return false;
	if (!player || !player.unlockedPowers || !player.equippedPowers)
		return false;
	if (!isPowerAvailableForCurrentLevel(powerId) && !player.unlockedPowers[powerId])
		return false;

	if (isExperimentalPowerLevel()) {
		if (!player.testLevelPowers)
			player.testLevelPowers = createDefaultPowerState();
		player.testLevelPowers[powerId] = true;
	}
	else {
		player.unlockedPowers[powerId] = true;
	}

	player.equippedPowers[powerId] = true;
	player.activePowerId = powerId;
	saveStoredPowerState(player.unlockedPowers);
	return true;
};

var refreshPlayerPowerState = function() {
	if (!player)
		return;

	var permanentPowers = loadStoredPowerState();
	player.unlockedPowers = clonePowerState(permanentPowers);
	player.equippedPowers = clonePowerState(permanentPowers);
	player.testLevelPowers = createDefaultPowerState();

	player.activePowerId = player.activePowerId && player.unlockedPowers[player.activePowerId] ? player.activePowerId : null;
};

var refreshTeacherHudState = function() {
	if (!player)
		return;

	player.teacherModeState = teacherModeState;
	player.teacherTargetSyncEnabled = teacherTargetSyncEnabled;
	player.teacherLevelCode = teacherLevelCode;
};

var getTeacherInventoryCatalog = function() {
	return [
		'<h1>', '</h1>',
		'<p>', '</p>',
		'<ul>', '</ul>',
		'<ol>', '</ol>',
		'<a>', '</a>',
		'<strong>', '</strong>',
		'<em>', '</em>',
		'<br/>', '<hr/>', '<img/>',
		'text', '[string-empty]', '[markup-empty]', '[markup-choice-empty]'
	];
};

var getTeacherInventoryTemplate = function(lineIndex) {
	var catalog = getTeacherInventoryCatalog();
	if (!catalog.length || !tags)
		return null;

	var key = catalog[lineIndex % catalog.length];
	return tags[key] || null;
};

var syncTeacherInventoryStorage = function() {
	teacherInventoryByLine = new Array(codeLines.length);
	for (var lineIndex = 0; lineIndex < codeLines.length; lineIndex++) {
		var template = getTeacherInventoryTemplate(lineIndex);
		teacherInventoryByLine[lineIndex] = template ? [template] : [];
	}
};

var takeTeacherInventoryBlock = function(template) {
	if (!isTeacherBuildMode() || !template || player.carrying != -1)
		return false;

	player.carrying = -1;
	var clone = cloneBlockForAction(template);
	if (!clone)
		return false;

	blocks.push(clone);
	reindexBlocks();
	player.pickup = true;
	player.frameX = 7;
	player.velocity = 0;
	return syncHeldBlockPickupState(clone);
};

var serializeBlockSnapshot = function(block) {
	if (!block)
		return null;

	return {
		id: block.id,
		html: block.html,
		type: block.type,
		label: block.label,
		placeholderLabel: block.placeholderLabel,
		choices: block.choices ? block.choices.slice() : [],
		selectedChoiceIndex: block.selectedChoiceIndex,
		editableValue: block.editableValue,
		outputHtml: block.outputHtml,
		isEditable: block.isEditable,
		isFilled: block.isFilled,
		isSystemOnly: block.isSystemOnly,
		storageState: block.storageState,
		distributorLineIndex: block.distributorLineIndex,
		distributorSlotIndex: block.distributorSlotIndex,
		lineIndex: block.lineIndex,
		x: block.x,
		y: block.y,
		width: block.width,
		height: block.height
	};
};

var hydrateBlockSnapshot = function(snapshot) {
	if (!snapshot)
		return null;

	var template = {
		id: snapshot.id,
		src: snapshot.src || tagText,
		type: snapshot.type,
		label: snapshot.label,
		placeholderLabel: snapshot.placeholderLabel,
		html: snapshot.html,
		choices: snapshot.choices,
		selectedChoiceIndex: snapshot.selectedChoiceIndex,
		editableValue: snapshot.editableValue,
		outputHtml: snapshot.outputHtml,
		isEditable: snapshot.isEditable,
		isFilled: snapshot.isFilled,
		isSystemOnly: snapshot.isSystemOnly
	};

	var block = createBlock(template);
	block.storageState = snapshot.storageState || 'playArea';
	block.distributorLineIndex = snapshot.distributorLineIndex;
	block.distributorSlotIndex = snapshot.distributorSlotIndex;
	block.lineIndex = snapshot.lineIndex;
	block.x = snapshot.x;
	block.y = snapshot.y;
	block.width = snapshot.width || block.width;
	block.height = snapshot.height || block.height;
	return block;
};

var captureTeacherStateSnapshot = function() {
	return {
		modeState: teacherModeState,
		targetSyncEnabled: teacherTargetSyncEnabled,
		targetHtml: teacherTargetHtml,
		levelHtml: level,
		rightHtml: currentRightBaseHtml,
		levelCode: teacherLevelCode,
		blocks: blocks.map(serializeBlockSnapshot),
		distributorsByLine: (distributorsByLine || []).map(function(stack) {
			return (stack || []).map(function(block) {
				return block ? block.index : null;
			});
		}),
		powerDistributorsByLine: (powerDistributorsByLine || []).map(function(stack) {
			return (stack || []).slice();
		})
	};
};

var restoreTeacherStateSnapshot = function(snapshot) {
	if (!snapshot)
		return false;

	level = snapshot.levelHtml || level;
	currentRightBaseHtml = snapshot.rightHtml || currentRightBaseHtml;
	teacherTargetHtml = snapshot.targetHtml || teacherTargetHtml;
	teacherTargetSyncEnabled = snapshot.targetSyncEnabled !== undefined ? snapshot.targetSyncEnabled : teacherTargetSyncEnabled;
	teacherLevelCode = snapshot.levelCode || teacherLevelCode;

	blocks = [];
	if (snapshot.blocks && snapshot.blocks.length) {
		for (var i = 0; i < snapshot.blocks.length; i++) {
			var hydratedBlock = hydrateBlockSnapshot(snapshot.blocks[i]);
			if (hydratedBlock)
				blocks.push(hydratedBlock);
		}
		reindexBlocks();
		syncNextBlockId();
	}

	if (snapshot.distributorsByLine && snapshot.distributorsByLine.length) {
		distributorsByLine = new Array(snapshot.distributorsByLine.length);
		for (var lineIndex = 0; lineIndex < snapshot.distributorsByLine.length; lineIndex++) {
			var distributorLine = snapshot.distributorsByLine[lineIndex] || [];
			distributorsByLine[lineIndex] = [];
			for (var slotIndex = 0; slotIndex < distributorLine.length; slotIndex++) {
				var blockIndex = distributorLine[slotIndex];
				if (Number.isInteger(blockIndex) && blocks[blockIndex])
					distributorsByLine[lineIndex].push(blocks[blockIndex]);
			}
			syncDistributorBlockLayout(lineIndex);
		}
	}

	if (snapshot.powerDistributorsByLine && snapshot.powerDistributorsByLine.length) {
		powerDistributorsByLine = new Array(snapshot.powerDistributorsByLine.length);
		for (var powerLineIndex = 0; powerLineIndex < snapshot.powerDistributorsByLine.length; powerLineIndex++)
			powerDistributorsByLine[powerLineIndex] = (snapshot.powerDistributorsByLine[powerLineIndex] || []).slice();
	}

	validate(0);
	refreshTeacherHudState();
	return true;
};

var restoreTeacherDraftState = function() {
	var restored = restoreTeacherStateSnapshot(teacherDraftSnapshot);
	teacherModeState = 'build';
	teacherTargetSyncEnabled = true;
	refreshTeacherHudState();
	refreshDevHelpWindow();
	return restored;
};

var restoreTeacherStartingState = function() {
	var restored = restoreTeacherStateSnapshot(teacherStartingSnapshot);
	teacherModeState = 'test';
	teacherTargetSyncEnabled = false;
	refreshTeacherHudState();
	refreshDevHelpWindow();
	return restored;
};

var freezeTeacherTarget = function() {
	teacherTargetHtml = buildHtmlFromBlocks(blocks);
	teacherTargetSyncEnabled = false;
	refreshTeacherHudState();
	refreshDevHelpWindow();
	return teacherTargetHtml;
};

var captureTeacherStartingState = function() {
	teacherStartingSnapshot = captureTeacherStateSnapshot();
	return teacherStartingSnapshot;
};

var loadTeacherLevelLibrary = function() {
	try {
		var raw = localStorage.teacherLevelLibrary;
		if (!raw) {
			teacherLevelLibrary = [];
			return teacherLevelLibrary;
		}

		var parsed = JSON.parse(raw);
		teacherLevelLibrary = Array.isArray(parsed) ? parsed : [];
	}
	catch (e) {
		teacherLevelLibrary = [];
	}

	return teacherLevelLibrary;
};

var persistTeacherLevelLibrary = function() {
	try {
		localStorage.teacherLevelLibrary = JSON.stringify(teacherLevelLibrary || []);
	}
	catch (e) {
	}
};

var normalizeTeacherKeywordList = function(keywords) {
	if (!Array.isArray(keywords))
		return [];

	var normalized = [];
	var seen = {};
	for (var i = 0; i < keywords.length; i++) {
		var keyword = String(keywords[i] || '').trim().toLowerCase();
		if (!keyword || seen[keyword])
			continue;
		seen[keyword] = true;
		normalized.push(keyword);
	}

	return normalized;
};

var generateTeacherLevelCode = function() {
	var existingCodes = {};
	for (var i = 0; i < teacherLevelLibrary.length; i++) {
		if (teacherLevelLibrary[i] && teacherLevelLibrary[i].code)
			existingCodes[String(teacherLevelLibrary[i].code)] = true;
	}

	var nextCode = '';
	for (var attempt = 0; attempt < 10000; attempt++) {
		nextCode = String(Math.floor(Math.random() * 10000)).padStart(4, '0');
		if (!existingCodes[nextCode])
			return nextCode;
	}

	return String(currentLevel).padStart(4, '0');
};

var createTeacherLevelMetadata = function(partialMetadata) {
	var metadata = partialMetadata || {};
	return {
		code: metadata.code || generateTeacherLevelCode(),
		title: metadata.title || '',
		keywords: normalizeTeacherKeywordList(metadata.keywords || []),
		lessonType: metadata.lessonType || 'build',
		difficulty: Number.isFinite(metadata.difficulty) ? metadata.difficulty : 1,
		instructions: metadata.instructions || '',
		targetHtml: metadata.targetHtml || teacherTargetHtml || '',
		startingState: metadata.startingState || captureTeacherStateSnapshot(),
		availablePowers: Array.isArray(metadata.availablePowers) ? metadata.availablePowers.slice() : [],
		createdAt: metadata.createdAt || new Date().toISOString()
	};
};

var saveTeacherLevelMetadata = function(partialMetadata) {
	var metadata = createTeacherLevelMetadata(partialMetadata);
	loadTeacherLevelLibrary();
	for (var i = 0; i < teacherLevelLibrary.length; i++) {
		if (teacherLevelLibrary[i] && teacherLevelLibrary[i].code === metadata.code)
			return false;
	}

	teacherLevelLibrary.push(metadata);
	persistTeacherLevelLibrary();
	teacherLevelCode = metadata.code;
	refreshTeacherHudState();
	refreshDevHelpWindow();
	return metadata;
};

var importSourceAsBlocks = function(sourceHtml) {
	var parser = new DOMParser();
	var documentRoot = parser.parseFromString('<div id="teacher-import-root"></div>', 'text/html');
	var importRoot = documentRoot.getElementById('teacher-import-root');
	importRoot.innerHTML = sourceHtml || '';

	var createFilledMarkupEmpty = function(fragment) {
		var block = createBlock(tags['[markup-empty]']);
		block.editableValue = fragment;
		block.label = fragment;
		block.outputHtml = fragment;
		block.isEditable = true;
		block.isFilled = true;
		block.html = fragment;
		return block;
	};

	var createFilledStringEmpty = function(textValue) {
		var block = createBlock(tags['[string-empty]']);
		block.editableValue = textValue;
		block.label = textValue;
		block.outputHtml = escapeHtmlFragment(textValue);
		block.isEditable = true;
		block.isFilled = true;
		return block;
	};

	var serializeStartTag = function(element) {
		var tagName = element.tagName.toLowerCase();
		var attrs = [];
		for (var i = 0; i < element.attributes.length; i++) {
			var attr = element.attributes[i];
			if (!attr)
				continue;
			if (attr.value === '')
				attrs.push(attr.name);
			else
				attrs.push(attr.name + '="' + escapeHtml(String(attr.value)) + '"');
		}

		return '<' + tagName + (attrs.length ? ' ' + attrs.join(' ') : '') + '>';
	};

	var serializeSelfClosingTag = function(element) {
		var tagName = element.tagName.toLowerCase();
		var attrs = [];
		for (var i = 0; i < element.attributes.length; i++) {
			var attr = element.attributes[i];
			if (!attr)
				continue;
			if (attr.value === '')
				attrs.push(attr.name);
			else
				attrs.push(attr.name + '="' + escapeHtml(String(attr.value)) + '"');
		}

		return '<' + tagName + (attrs.length ? ' ' + attrs.join(' ') : '') + ' />';
	};

	var importedBlocks = [];
	var walkNode = function(node) {
		if (!node)
			return;

		if (node.nodeType === Node.TEXT_NODE) {
			var textValue = String(node.nodeValue || '');
			if (textValue.trim().length) {
				importedBlocks.push(createFilledStringEmpty(textValue));
			}
			return;
		}

		if (node.nodeType === Node.COMMENT_NODE) {
			importedBlocks.push(createFilledMarkupEmpty('<!--' + String(node.nodeValue || '') + '-->'));
			return;
		}

		if (node.nodeType !== Node.ELEMENT_NODE)
			return;

		var tagName = node.tagName.toLowerCase();
		var hasAttributes = node.attributes && node.attributes.length > 0;
		var isSelfClosing = tagName === 'br' || tagName === 'hr' || tagName === 'img';
		var openingKey = '<' + tagName + '>';
		var closingKey = '</' + tagName + '>';
		var openingTemplate = tags && tags[openingKey];
		var closingTemplate = tags && tags[closingKey];

		if (isSelfClosing) {
			if (!hasAttributes && tags && tags['<' + tagName + '/>']) {
				importedBlocks.push(createBlock(tags['<' + tagName + '/>']));
			}
			else {
				importedBlocks.push(createFilledMarkupEmpty(serializeSelfClosingTag(node)));
			}
			return;
		}

		if (!hasAttributes && openingTemplate) {
			importedBlocks.push(createBlock(openingTemplate));
		}
		else {
			importedBlocks.push(createFilledMarkupEmpty(serializeStartTag(node)));
		}

		for (var childIndex = 0; childIndex < node.childNodes.length; childIndex++)
			walkNode(node.childNodes[childIndex]);

		if (!hasAttributes && closingTemplate) {
			importedBlocks.push(createBlock(closingTemplate));
		}
		else {
			importedBlocks.push(createFilledMarkupEmpty(closingKey));
		}
	};

	for (var childIndex = 0; childIndex < importRoot.childNodes.length; childIndex++)
		walkNode(importRoot.childNodes[childIndex]);

	teacherImportOverflow = [];
	blocks = [];
	var maxPlacements = codeLines.length * gridColumnCount;
	for (var importedIndex = 0; importedIndex < importedBlocks.length; importedIndex++) {
		var importedBlock = importedBlocks[importedIndex];
		if (blocks.length >= maxPlacements) {
			teacherImportOverflow.push(importedBlock);
			continue;
		}

		var targetLineIndex = Math.floor(blocks.length / gridColumnCount);
		var targetColumnIndex = blocks.length % gridColumnCount;
		var targetCell = cellToPosition(targetLineIndex, targetColumnIndex);
		importedBlock.x = targetCell.x;
		importedBlock.y = targetCell.y;
		importedBlock.lineIndex = targetCell.lineIndex;
		importedBlock.storageState = 'playArea';
		importedBlock.velocityDown = 0;
		importedBlock.dropSnapActive = false;
		importedBlock.dropSnapDelayFrames = 0;
		importedBlock.dropSnapFrames = 0;
		importedBlock.dropSnapProgress = 0;
		blocks.push(importedBlock);
	}

	reindexBlocks();
	validate(0);
	refreshTeacherHudState();
	return {
		blocks: blocks.slice(),
		overflow: teacherImportOverflow.slice()
	};
};

var refreshDevHelpWindow = function() {
	if (!$('#window-devhelp').length)
		return;

	$('#devhelp-f8').text(isTeacherMode() ? 'PROF' : 'ÉLÈVE');
	$('#devhelp-f7').text(isTeacherMode() ? (teacherModeState === 'test' ? 'TEST' : 'CONSTRUCTION') : 'ÉLÈVE');
	$('#devhelp-f6').text(isTeacherBuildMode() ? 'ATELIER' : 'ÉLÈVE');
	$('#devhelp-f9').text(distributorStartMode ? 'ON' : 'OFF');
	$('#devhelp-f10').text(debugInfoVisible ? 'ON' : 'OFF');
	$('#devhelp-f11').text(String(clamp(currentLevel, 1, maxAvailableLevel)));
	$('#devhelp-target-sync').text(teacherTargetSyncEnabled ? 'ON' : 'OFF');
	$('#devhelp-target-sync-line').text(teacherTargetSyncEnabled ? 'ON' : 'OFF');
	$('#devhelp-level-code').text(teacherLevelCode ? String(teacherLevelCode) : '—');
	$('#devhelp-game-mode').text(isTeacherMode() ? 'Professeur' : 'Élève');
	if (player) {
		var effectivePlayerPowers = getEffectivePlayerPowers();
		$('#devhelp-power-edit').text(effectivePlayerPowers.edit ? 'ON' : 'OFF');
		$('#devhelp-power-copy').text(effectivePlayerPowers.copy ? 'ON' : 'OFF');
		$('#devhelp-power-cut').text(effectivePlayerPowers.cut ? 'ON' : 'OFF');
		$('#devhelp-power-delete').text(effectivePlayerPowers.delete ? 'ON' : 'OFF');
		$('#devhelp-power-insert').text(effectivePlayerPowers.insert ? 'ON' : 'OFF');
		$('#devhelp-power-inspect').text(effectivePlayerPowers.inspect ? 'ON' : 'OFF');
	}
};

var closeDevHelpWindow = function() {
	if (!devHelpVisible)
		return;

	devHelpVisible = false;
	var otherWindowsVisible = $('.window:visible').not('#window-devhelp').length;
	$('#window-devhelp').fadeOut('fast');
	if (!otherWindowsVisible)
		$('#overlay').fadeOut('fast');
};

var openDevHelpWindow = function() {
	refreshDevHelpWindow();
	devHelpVisible = true;
	$('#overlay').fadeIn('fast');
	$('#window-devhelp').fadeIn('fast');
};

var toggleDevHelpWindow = function() {
	if (devHelpVisible)
		closeDevHelpWindow();
	else
		openDevHelpWindow();
};

addEventListener("keydown", function (e) {
	if (isEditableTarget(e.target)) {
		return;
	}

	if (e.keyCode === 123) {
		e.preventDefault();
		if (e.repeat)
			return;

		toggleDevHelpWindow();
		return;
	}

	if (e.keyCode === 117) {
		e.preventDefault();
		if (e.repeat)
			return;

		if (isTeacherBuildMode())
			toggleTeacherPalette();
		return;
	}

	if (isTeacherBuildMode() && teacherPaletteOpen) {
		if (e.keyCode === keys.esc) {
			e.preventDefault();
			if (e.repeat)
				return;

			closeTeacherPalette();
			return;
		}

		if (e.keyCode === keys.up || e.keyCode === keys.down) {
			e.preventDefault();
			if (e.repeat)
				return;

			var teacherPaletteActions = getTeacherPaletteActions();
			if (!teacherPaletteActions.length)
				return;

			if (e.keyCode === keys.up)
				teacherPaletteSelectedIndex = ((teacherPaletteSelectedIndex - 1) % teacherPaletteActions.length + teacherPaletteActions.length) % teacherPaletteActions.length;
			else
				teacherPaletteSelectedIndex = ((teacherPaletteSelectedIndex + 1) % teacherPaletteActions.length + teacherPaletteActions.length) % teacherPaletteActions.length;
			return;
		}

		if (e.keyCode === keys.space || e.keyCode === 13) {
			e.preventDefault();
			if (e.repeat)
				return;

			executeSelectedTeacherPaletteAction();
			return;
		}
	}

	if (e.keyCode === 119) {
		e.preventDefault();
		if (e.repeat)
			return;

		gameMode = isStudentMode() ? 'teacher' : 'student';
		teacherModeState = 'build';
		teacherTargetSyncEnabled = true;
		closeTeacherPalette();
		if (isTeacherMode())
			teacherTargetHtml = buildHtmlFromBlocks(blocks);
		if (isTeacherMode())
			captureTeacherStartingState();
		else
			teacherTargetHtml = '';
		refreshTeacherHudState();
		refreshDevHelpWindow();
		return;
	}

	if (e.keyCode === 118) {
		e.preventDefault();
		if (e.repeat)
			return;

		if (isTeacherMode())
			toggleTeacherModeState();
		if (!isTeacherBuildMode())
			closeTeacherPalette();
		return;
	}

	if (player && player.interactionMenuActive && !isPowerAnimationActive() && e.shiftKey && (e.keyCode === keys.up || e.keyCode === keys.down)) {
		e.preventDefault();
		if (e.repeat)
			return;

		if (e.keyCode === keys.up)
			setSelectedBlockInteractionActionIndex(getSelectedBlockInteractionActionIndex() - 1);
		else
			setSelectedBlockInteractionActionIndex(getSelectedBlockInteractionActionIndex() + 1);
		return;
	}

	if (devHelpVisible && e.keyCode === 27) {
		e.preventDefault();
		if (e.repeat)
			return;

		closeDevHelpWindow();
		return;
	}

	if (e.keyCode === 120 || e.keyCode === 121 || e.keyCode === 122) {
		e.preventDefault();
		if (e.repeat)
			return;

		if (e.keyCode === 120) {
			distributorStartMode = !distributorStartMode;
			levelUp(progress);
			return;
		}

		if (e.keyCode === 121)
			debugInfoVisible = !debugInfoVisible;
		else
			selectLevelFromPrompt();
		return;
	}

	keysDown[e.keyCode] = true;

	// disable scrolling
	if ([32, 37, 38, 39, 40].indexOf(e.keyCode) > -1) {
		e.preventDefault();
	}
}, false);

addEventListener("keyup", function (e) {
	delete keysDown[e.keyCode];
	if (player && e.keyCode === keys.space)
		player.interactionActionHold = false;
}, false);

// reset controls if window is lost
$(window).blur(function() {
	keysDown = new Array;
	if (player)
		player.interactionActionHold = false;
});

// initialize game
var init = function() {
	// first timers get the help window
	if (!helped)
		setTimeout("$('#overlay, #window-help').fadeIn('fast'); paused = true;", 1000);

	// set up player
	player = createPlayer(35, 60); // player.js
	refreshPlayerPowerState();
	loadTeacherLevelLibrary();

	// set up tags as json object
	tags = {
		'<a>' : { src: tagA, label: '<a>', html: '<a href="#" onclick="return false;">' },
		'</a>' : { src: tagAClose, label: '</a>', html: '</a>' },
		'<br/>' : { src: tagBr, label: '<br/>', html: '<br/>' },
		'<em>' : { src: tagEm, label: '<em>', html: '<em>' },
		'</em>' : { src: tagEmClose, label: '</em>', html: '</em>' },
		'<h1>' : { src: tagH1, label: '<h1>', html: '<h1>' },
		'</h1>' : { src: tagH1Close, label: '</h1>', html: '</h1>' },
		'<h2>' : { src: tagH2, label: '<h2>', html: '<h2>' },
		'</h2>' : { src: tagH2Close, label: '</h2>', html: '</h2>' },
		'<hr/>' : { src: tagHr, label: '<hr/>', html: '<hr/>' },
		'<img/>' : { src: tagImg, label: '<img/>', html: '<img src="'+tagImgSrc.src+'" />' },
		'<li>' : { src: tagLi, label: '<li>', html: '<li>' },
		'</li>' : { src: tagLiClose, label: '</li>', html: '</li>' },
		'<ol>' : { src: tagOl, label: '<ol>', html: '<ol>' },
		'</ol>' : { src: tagOlClose, label: '</ol>', html: '</ol>' },
		'<p>' : { src: tagP, label: '<p>', html: '<p>' },
		'</p>' : { src: tagPClose, label: '</p>', html: '</p>' },
		'<strong>' : { src: tagStrong, label: '<strong>', html: '<strong>' },
		'</strong>' : { src: tagStrongClose, label: '</strong>', html: '</strong>' },
		'<ul>' : { src: tagUl, label: '<ul>', html: '<ul>' },
		'</ul>' : { src: tagUlClose, label: '</ul>', html: '</ul>' },
		'[string-empty]' : { src: tagText, type: 'string-empty', label: '[texte]', placeholderLabel: '[texte]', html: 'Bonjour le monde', outputHtml: '', isEditable: true, isFilled: false },
		'[markup-empty]' : { src: tagText, type: 'markup-empty', label: '[markup]', placeholderLabel: '[markup]', html: '<strong>Bonjour</strong>', outputHtml: '', isEditable: true, isFilled: false },
		'[markup-choice-empty]' : { src: tagText, type: 'markup-choice-empty', label: '[choix]', placeholderLabel: '[choix]', html: '<br/>', outputHtml: '', isEditable: true, isFilled: false, selectedChoiceIndex: null, choices: [
			{ label: '<br/>', html: '<br/>' },
			{ label: '<hr/>', html: '<hr/>' },
			{ label: '<img/>', html: '<img src="'+tagImgSrc.src+'" />' }
		] },
		'text' : { src: tagText, label: 'text', html: 'Lorem ipsum' },
	};

	// set up code lines
	codeLines = new Array;
	for (i = 0; i < codeLineCount; i++) {
		codeLines[i] = {
			index: i,
			number: getDisplayLineNumber(i),
			x: 0,
			y: getLineTop(i),
			width: canvas.width,
			height: codeLineHeight
		};
	}
	codeGridBottom = getGridBottom();
	baselineY = codeGridBottom;
	syncGridMetrics();
	syncPowerDistributorStorage();
	syncTeacherInventoryStorage();

	// create first level
	syncPlayerToLine(codeLines.length - 1);
	levelUp(progress);

	// high score?
	if (best != 0)
		$('#best').html('<br/>Best Time: '+timer(best));

	refreshRightPanelHtml('<div style="color:gray; margin:20px; text-align:center">Start moving the HTML tags around to render your website here. Try to make it look like the website on the left.<p>Click "Help" for more info.</p></div>');

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
	if (player.actionAnimation && player.actionAnimation.active) {
		updatePowerAnimation();
	}
	else {
		player.interactionTarget = player.carrying == -1 ? getFacingInteractionTarget() : null;
		player.editInteractionTarget = player.carrying == -1 ? getFacingEditInteractionTarget() : null;
		syncPlayerInteractionActions();
	}
	
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
				blocks[i].pickupPlayerLineIndex = getPlayerFeetLineIndex(player);
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
	activeDisplayLineNumber = getDisplayLineNumber(activeLineIndex);
	highlightedMarginIndex = activeLineIndex;
	player.visibleFeetLineNumber = getDisplayLineNumber(getPlayerFeetLineIndex(player));
	player.visibleLineNumber = player.visibleFeetLineNumber;
	player.interactionLineIndex = player.interactionTarget && player.interactionTarget.type === 'codeBlock' ? player.interactionTarget.index : null;
	player.powerInteractionLineIndex = isFacingRightPowerDistributor() ? getPlayerFeetLineIndex(player) : null;
	player.powerVisibleLineNumber = player.powerInteractionLineIndex === null ? null : getDisplayLineNumber(player.powerInteractionLineIndex);
if (debugInfoVisible) {
	console.log({
		playerLineIndex: player.lineIndex,
		activeLineIndex: activeLineIndex,
		activeDisplayLineNumber: activeDisplayLineNumber,
		highlightedMarginIndex: highlightedMarginIndex
	});
}
if (!Number.isInteger(player.lineIndex) || !Number.isInteger(activeLineIndex) || !Number.isInteger(activeDisplayLineNumber) || !Number.isInteger(highlightedMarginIndex) || player.lineIndex !== activeLineIndex || highlightedMarginIndex !== activeLineIndex || activeDisplayLineNumber !== getDisplayLineNumber(activeLineIndex)) {
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
	if (player) {
		player.carrying = -1;
		player.clipboardBlock = null;
		player.pickup = false;
		player.reverse = false;
		player.drop = false;
		player.actionAnimation = createInactivePowerAnimationState();
		player.interactionTarget = null;
		player.editInteractionTarget = null;
		player.interactionActions = [];
		player.selectedInteractionActionIndex = 0;
		player.interactionActionsSignature = '';
		player.interactionMenuActive = false;
		player.interactionActionHold = false;
		player.verticalRepeatDirection = 0;
		player.verticalRepeatFrames = 0;
		player.frameX = 0;
		player.velocity = 0.05;
		player.velocityUp = 0;
		player.velocityDown = 0;
		player.jumping = false;
	}
		
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
			case 31:
				level = '<p>[string-empty]</p>';
				break;
			case 32:
				level = '<p>[markup-empty]</p>';
				break;
			case 33:
				level = 'text[markup-choice-empty]';
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
			var escapedTag = escapeRegExp(t);
			var tagPattern = new RegExp(escapedTag, 'g');
			// add level blocks per tag match
			try {
				var levelMatches = level.match(tagPattern);
				for (i = 0; i < levelMatches.length; i++)
					blocks.push(createBlock(tags[t])); // block.js
			}
			catch(e) {
				// fail gracefully
			}
		
			// convert to final html
			level = level.replace(tagPattern, ' ' + tags[t].html);
			
			// format alt solutions, too
			for (i = 0; i < alt.length; i++)
				alt[i] = alt[i].replace(tagPattern, ' ' + tags[t].html);
		}

		if (distributorStartMode) {
			var distributorStartApplied = applyDistributorStartMode();
			if (!distributorStartApplied) {
				distributorStartMode = false;
				alert('Parsons mode is unavailable for this level because one line contains more than ' + DISTRIBUTOR_CAPACITY + ' blocks.');
			}
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
		currentLevel = progress;
		refreshPlayerPowerState();
		syncPowerDistributorStorage();
		syncTeacherInventoryStorage();
		if (isTeacherMode()) {
			teacherTargetHtml = buildHtmlFromBlocks(blocks);
			teacherTargetSyncEnabled = true;
			captureTeacherStartingState();
		}
		refreshRightPanelHtml('');
		refreshTeacherHudState();
		
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
	refreshRightPanelHtml(html);

	if (isTeacherBuildMode()) {
		if (teacherTargetSyncEnabled)
			teacherTargetHtml = html;
		refreshTeacherHudState();
		return html;
	}
	
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
		
		$('#check img').fadeIn();
		$('#check img').css('animation', 'spin .5s 1 ease');
		$('#check img').css('-webkit-animation', 'spin .5s 1 ease');
		$('#level').css('animation', '');
		$('#level').css('-webkit-animation', '');

		if (progress >= maxAvailableLevel) {
			currentLevel = maxAvailableLevel;
			savedProgress = 0;
			localStorage.progress = 0;
			gameOver = true;
			paused = true;

			$('#finaltime').html($('#time').html());
			if (time < best || best == 0) {
				localStorage.best = best = time;
				$('#best').html('<br/>Best Time: '+timer(best));
			}

			setTimeout("$('#overlay, #window-done').fadeIn('fast'); paused = true;", 1000);
			return;
		}

		// increase level number
		progress++;
		savedProgress = progress;
		currentLevel = progress;
		
		// save file
		localStorage.progress = progress;
		
		paused = true;
		
		// show new level
		setTimeout("levelUp(progress)", 1000);
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
		savedProgress = progress;
		currentLevel = progress;
		localStorage.powers = JSON.stringify(createDefaultPowerState());
		localStorage.time = time = 0
		player.carrying = -1;
		
		levelUp(progress);
		
		refreshRightPanelHtml('');
		
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
