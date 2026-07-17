var canvas;
var ctx;
var loading = 0;
var images = 1;

window.onload = function() {
	// create the canvas
	canvas = document.getElementById('game');
	ctx = canvas.getContext('2d');
	
	canvas.width = 420;
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
	var playAreaBounds = getPlayAreaBounds();
	ctx.fillStyle = 'rgba(228, 232, 238, 0.9)';
	ctx.fillRect(playAreaBounds.right, 0, rightGutterWidth, canvas.height);
	ctx.fillStyle = 'rgba(175, 182, 190, 0.85)';
	ctx.fillRect(playAreaBounds.right - 1, 0, 1, canvas.height);
	var activeZone = getPlayerActiveZone();
	ctx.fillStyle = 'rgba(89, 101, 113, ' + (activeLineHighlightAlpha * 0.55) + ')';
	ctx.fillRect(0, activeZone.top, canvas.width, activeZone.height);
	ctx.strokeStyle = 'rgba(89, 101, 113, ' + (activeLineHighlightAlpha * 1.1) + ')';
	ctx.strokeRect(0.5, activeZone.top + 0.5, canvas.width - 1, activeZone.height - 1);
	ctx.fillStyle = 'rgba(89, 101, 113, ' + Math.min(0.26, activeLineHighlightAlpha * 1.85) + ')';
	ctx.fillRect(0, activeZone.top, codeLineBlockLeft, activeZone.height);

	var drawAcquiredPowerHud = function() {
		if (typeof getPowerHudIds !== 'function' || typeof getPowerDefinition !== 'function')
			return;

		var powerIds = getPowerHudIds();
		var debugPanelWidth = 206;
		var debugPanelLeft = canvas.width - rightGutterWidth - debugPanelWidth - 6;
		var chipWidth = 22;
		var chipHeight = 18;
		var chipGap = 4;
		var totalWidth = (powerIds.length * chipWidth) + Math.max(0, powerIds.length - 1) * chipGap;
		var hudRight = debugPanelLeft - 6;
		var hudLeft = Math.max(codeLineBlockLeft + 4, hudRight - totalWidth);
		var hudTop = 4;

		ctx.save();
		ctx.textAlign = 'center';
		ctx.textBaseline = 'middle';
		ctx.font = 'bold 11px monospace';

		for (var powerIndex = 0; powerIndex < powerIds.length; powerIndex++) {
			var powerId = powerIds[powerIndex];
			var powerInfo = getPowerDefinition(powerId);
			if (!powerInfo)
				continue;

			var chipLeft = hudLeft + powerIndex * (chipWidth + chipGap);
			ctx.fillStyle = powerInfo.color;
			ctx.fillRect(chipLeft, hudTop, chipWidth, chipHeight);
			ctx.strokeStyle = 'rgba(61, 69, 77, 0.36)';
			ctx.strokeRect(chipLeft + 0.5, hudTop + 0.5, chipWidth - 1, chipHeight - 1);
			ctx.fillStyle = '#ffffff';
			ctx.fillText(powerInfo.icon, chipLeft + Math.round(chipWidth / 2), hudTop + Math.round(chipHeight / 2) + 0.5);
		}

		var modeLabel = isTeacherMode() ? 'F8 MODE : PROF' : 'F8 MODE : ÉLÈVE';
		var modeLabelWidth = Math.ceil(ctx.measureText(modeLabel).width) + 14;
		var modeLabelX = Math.max(codeLineBlockLeft + 4, hudRight - modeLabelWidth);
		ctx.fillStyle = isTeacherMode() ? 'rgba(193, 143, 39, 0.96)' : 'rgba(94, 102, 110, 0.88)';
		ctx.fillRect(modeLabelX, hudTop + chipHeight + 5, modeLabelWidth, chipHeight);
		ctx.strokeStyle = isTeacherMode() ? 'rgba(145, 102, 12, 0.65)' : 'rgba(109, 118, 128, 0.35)';
		ctx.strokeRect(modeLabelX + 0.5, hudTop + chipHeight + 5.5, modeLabelWidth - 1, chipHeight - 1);
		ctx.fillStyle = '#ffffff';
		ctx.fillText(modeLabel, modeLabelX + Math.round(modeLabelWidth / 2), hudTop + chipHeight + 5 + Math.round(chipHeight / 2) + 0.5);

		var teacherStateLabel = isTeacherMode()
			? 'F7 : ' + (teacherModeState === 'test' ? 'TEST' : 'CONSTRUCTION') + '   SYNC : ' + (teacherTargetSyncEnabled ? 'ON' : 'OFF')
			: 'F7 : —   SYNC : —';
		ctx.font = 'bold 9px monospace';
		ctx.textAlign = 'left';
		ctx.textBaseline = 'middle';
		ctx.fillStyle = isTeacherMode() ? 'rgba(193, 143, 39, 0.92)' : 'rgba(94, 102, 110, 0.7)';
		ctx.fillText(teacherStateLabel, Math.max(codeLineBlockLeft + 4, hudLeft), hudTop + chipHeight + 5 + chipHeight + 8);

		ctx.restore();
	};

	var drawTeacherPaletteHud = function() {
		if (typeof isTeacherBuildMode !== 'function' || !isTeacherBuildMode() || !teacherPaletteOpen)
			return;
		if (typeof getTeacherPaletteActions !== 'function')
			return;

		var paletteActions = getTeacherPaletteActions();
		var paletteLeft = 4;
		var paletteTop = 48;
		var paletteWidth = 170;
		var palettePadding = 8;
		var actionRowHeight = 15;
		var paletteHeight = 20 + (paletteActions.length * actionRowHeight) + 30;

		var clipLabel = function(label, maxWidth) {
			var text = String(label || '');
			if (ctx.measureText(text).width <= maxWidth)
				return text;

			var ellipsis = '…';
			while (text.length && ctx.measureText(text + ellipsis).width > maxWidth)
				text = text.slice(0, -1);
			return text + ellipsis;
		};

		ctx.save();
		ctx.fillStyle = 'rgba(252, 249, 238, 0.94)';
		ctx.fillRect(paletteLeft, paletteTop, paletteWidth, paletteHeight);
		ctx.strokeStyle = 'rgba(145, 102, 12, 0.45)';
		ctx.strokeRect(paletteLeft + 0.5, paletteTop + 0.5, paletteWidth - 1, paletteHeight - 1);
		ctx.fillStyle = 'rgba(193, 143, 39, 0.95)';
		ctx.font = 'bold 11px monospace';
		ctx.textAlign = 'left';
		ctx.textBaseline = 'top';
		ctx.fillText('ATELIER PROF', paletteLeft + palettePadding, paletteTop + 6);

		ctx.font = '10px monospace';
		ctx.fillStyle = 'rgba(68, 74, 81, 0.92)';
		ctx.fillText('Target Sync : ' + (teacherTargetSyncEnabled ? 'ON' : 'OFF'), paletteLeft + palettePadding, paletteTop + 21);
		ctx.fillText('Code : ' + (teacherLevelCode ? String(teacherLevelCode) : '----'), paletteLeft + palettePadding, paletteTop + 33);

		for (var actionIndex = 0; actionIndex < paletteActions.length; actionIndex++) {
			var action = paletteActions[actionIndex];
			var rowTop = paletteTop + 48 + (actionIndex * actionRowHeight);
			var isSelected = actionIndex === clamp(teacherPaletteSelectedIndex || 0, 0, paletteActions.length - 1);

			ctx.fillStyle = isSelected ? 'rgba(193, 143, 39, 0.18)' : 'rgba(255, 255, 255, 0.55)';
			ctx.fillRect(paletteLeft + 5, rowTop - 1, paletteWidth - 10, actionRowHeight - 1);
			ctx.fillStyle = isSelected ? 'rgba(111, 77, 0, 0.96)' : 'rgba(63, 69, 76, 0.94)';
			ctx.font = isSelected ? 'bold 10px monospace' : '10px monospace';
			ctx.fillText((isSelected ? '> ' : '  ') + clipLabel(action.label, paletteWidth - (palettePadding * 2) - 14), paletteLeft + palettePadding, rowTop + 1);
		}

		ctx.font = '9px monospace';
		ctx.fillStyle = 'rgba(89, 96, 104, 0.92)';
		ctx.fillText('Space / Enter : exécuter', paletteLeft + palettePadding, paletteTop + 48 + (paletteActions.length * actionRowHeight) + 2);
		ctx.fillStyle = 'rgba(136, 66, 30, 0.92)';
		ctx.fillText(clipLabel(teacherPaletteMessage || '', paletteWidth - (palettePadding * 2)), paletteLeft + palettePadding, paletteTop + 48 + (paletteActions.length * actionRowHeight) + 14);
		ctx.restore();
	};

	var drawPowerAnimationOverlay = function() {
		if (!player || !player.actionAnimation || !player.actionAnimation.active)
			return;

		var action = player.actionAnimation;
		var targetBlock = typeof findBlockById === 'function' ? findBlockById(action.targetBlockId) : null;
		var targetRect = targetBlock || action.targetSnapshot;
		if (!targetRect)
			targetRect = {
				x: player.x,
				y: player.y,
				width: player.width,
				height: player.height
			};

		var powerColor = typeof getActionColor === 'function' ? getActionColor(action.powerId) : 'rgba(89, 101, 113, 0.9)';
		var powerLabel = typeof getActionLabel === 'function' ? getActionLabel(action.powerId) : String(action.powerId || '');
		var phaseLabel = action.phase === 'prep' ? 'PREP' : action.phase === 'execute' ? 'EXECUTE' : 'CLEANUP';
		var pad = action.phase === 'execute' ? 6 : 4;
		var haloAlpha = action.phase === 'prep' ? 0.24 : action.phase === 'execute' ? 0.45 : 0.14;
		var badgeTop = Math.max(4, targetRect.y - 18);

		ctx.save();
		ctx.globalAlpha = haloAlpha;
		ctx.fillStyle = powerColor;
		ctx.fillRect(targetRect.x - pad, targetRect.y - pad, targetRect.width + (pad * 2), targetRect.height + (pad * 2));

		ctx.globalAlpha = 1;
		ctx.lineWidth = action.phase === 'execute' ? 3 : 2;
		ctx.strokeStyle = powerColor;
		ctx.shadowColor = powerColor;
		ctx.shadowBlur = action.phase === 'execute' ? 16 : 10;
		ctx.strokeRect(targetRect.x - pad + 0.5, targetRect.y - pad + 0.5, targetRect.width + (pad * 2) - 1, targetRect.height + (pad * 2) - 1);

		ctx.shadowBlur = 0;
		ctx.font = 'bold 9px monospace';
		ctx.textAlign = 'left';
		ctx.textBaseline = 'middle';
		ctx.fillStyle = 'rgba(255, 255, 255, 0.92)';
		ctx.fillRect(targetRect.x, badgeTop, Math.min(118, targetRect.width + 20), 14);
		ctx.strokeStyle = powerColor;
		ctx.strokeRect(targetRect.x + 0.5, badgeTop + 0.5, Math.min(118, targetRect.width + 20) - 1, 13);
		ctx.fillStyle = '#3b424a';
		ctx.fillText(powerLabel + ' • ' + phaseLabel, targetRect.x + 6, badgeTop + 7);

		if (action.powerId === 'copy') {
			ctx.globalAlpha = action.phase === 'execute' ? 0.36 : 0.22;
			ctx.fillStyle = powerColor;
			ctx.fillRect(targetRect.x + 6, targetRect.y + 4, targetRect.width, targetRect.height);
			ctx.globalAlpha = action.phase === 'execute' ? 0.54 : 0.3;
			ctx.strokeRect(targetRect.x + 6.5, targetRect.y + 4.5, targetRect.width - 1, targetRect.height - 1);
		}
		else if (action.powerId === 'cut') {
			ctx.globalAlpha = action.phase === 'execute' ? 0.9 : 0.55;
			ctx.lineWidth = 3;
			ctx.beginPath();
			ctx.moveTo(targetRect.x - 2, targetRect.y + targetRect.height - 2);
			ctx.lineTo(targetRect.x + targetRect.width + 2, targetRect.y + 2);
			ctx.stroke();
		}
		else if (action.powerId === 'delete') {
			ctx.globalAlpha = action.phase === 'execute' ? 0.9 : 0.5;
			ctx.fillStyle = 'rgba(192, 57, 43, 0.2)';
			ctx.fillRect(targetRect.x - 2, targetRect.y - 2, targetRect.width + 4, targetRect.height + 4);
			ctx.strokeStyle = 'rgba(192, 57, 43, 0.95)';
			ctx.lineWidth = 3;
			ctx.beginPath();
			ctx.moveTo(targetRect.x - 1, targetRect.y - 1);
			ctx.lineTo(targetRect.x + targetRect.width + 1, targetRect.y + targetRect.height + 1);
			ctx.moveTo(targetRect.x + targetRect.width + 1, targetRect.y - 1);
			ctx.lineTo(targetRect.x - 1, targetRect.y + targetRect.height + 1);
			ctx.stroke();
		}
		else if (action.powerId === 'insert') {
			ctx.globalAlpha = action.phase === 'execute' ? 0.95 : 0.55;
			ctx.strokeStyle = 'rgba(96, 210, 96, 0.95)';
			ctx.lineWidth = 3;
			var arrowY = targetRect.y + Math.round(targetRect.height / 2);
			if (action.insertSide === 'before') {
				ctx.beginPath();
				ctx.moveTo(targetRect.x + targetRect.width + 10, arrowY);
				ctx.lineTo(targetRect.x - 8, arrowY);
				ctx.lineTo(targetRect.x + 2, arrowY - 6);
				ctx.moveTo(targetRect.x - 8, arrowY);
				ctx.lineTo(targetRect.x + 2, arrowY + 6);
				ctx.stroke();
			}
			else {
				ctx.beginPath();
				ctx.moveTo(targetRect.x - 10, arrowY);
				ctx.lineTo(targetRect.x + targetRect.width + 8, arrowY);
				ctx.lineTo(targetRect.x + targetRect.width - 2, arrowY - 6);
				ctx.moveTo(targetRect.x + targetRect.width + 8, arrowY);
				ctx.lineTo(targetRect.x + targetRect.width - 2, arrowY + 6);
				ctx.stroke();
			}
		}
		else if (action.powerId === 'inspect') {
			ctx.globalAlpha = action.phase === 'execute' ? 0.95 : 0.72;
			ctx.fillStyle = 'rgba(255, 255, 255, 0.92)';
			ctx.fillRect(targetRect.x - 4, targetRect.y + targetRect.height + 6, 156, 34);
			ctx.strokeStyle = 'rgba(245, 245, 245, 0.95)';
			ctx.strokeRect(targetRect.x - 3.5, targetRect.y + targetRect.height + 6.5, 155, 33);
			ctx.fillStyle = '#36404a';
			ctx.font = 'bold 9px monospace';
			ctx.fillText('Inspect', targetRect.x + 4, targetRect.y + targetRect.height + 17);
			ctx.font = '8px monospace';
			ctx.fillText('Type: ' + String(targetBlock ? targetBlock.type : targetRect.type || ''), targetRect.x + 4, targetRect.y + targetRect.height + 28);
			ctx.fillText('State: ' + String(targetBlock ? targetBlock.storageState : ''), targetRect.x + 72, targetRect.y + targetRect.height + 28);
		}
		else if (action.powerId === 'edit') {
			ctx.globalAlpha = action.phase === 'execute' ? 0.9 : 0.55;
			ctx.fillStyle = 'rgba(60, 120, 230, 0.95)';
			ctx.font = 'bold 16px monospace';
			ctx.fillText('✎', targetRect.x - 2, targetRect.y - 2);
		}

		ctx.restore();
	};

	drawAcquiredPowerHud();
	drawTeacherPaletteHud();

	if ($('#left').length) {
		$('#left').html(buildTargetWebsiteHtml());
	}

	// lightweight logical grid preview
	ctx.save();
	ctx.strokeStyle = 'rgba(131, 141, 150, 0.10)';
	for (i = 0; i < gridLineCount; i++) {
		for (var j = 0; j < gridColumnCount; j++) {
			var cell = cellToPosition(i, j);
			ctx.strokeRect(cell.x + 0.5, cell.y + 0.5, gridCellWidth - 1, gridCellHeight - 1);
		}
	}
	ctx.restore();

	var heldBlock = getHeldBlock();
	if (heldBlock) {
		var dropPreviewRect = getBlockDropTarget(heldBlock);
		var dropPreviewCell = getDropPreviewCell(heldBlock);
		ctx.save();
		ctx.fillStyle = dropPreviewRect.valid ? 'rgba(89, 101, 113, 0.10)' : 'rgba(192, 57, 43, 0.10)';
		ctx.strokeStyle = dropPreviewRect.valid ? 'rgba(89, 101, 113, 0.45)' : 'rgba(192, 57, 43, 0.70)';
		ctx.fillRect(dropPreviewCell.x, dropPreviewCell.y, gridCellWidth, gridCellHeight);
		ctx.strokeRect(dropPreviewCell.x + 0.5, dropPreviewCell.y + 0.5, gridCellWidth - 1, gridCellHeight - 1);
		ctx.restore();

		ctx.save();
		ctx.fillStyle = dropPreviewRect.valid ? 'rgba(89, 101, 113, 0.10)' : 'rgba(192, 57, 43, 0.16)';
		ctx.strokeStyle = dropPreviewRect.valid ? 'rgba(89, 101, 113, 0.55)' : 'rgba(192, 57, 43, 0.85)';
		ctx.fillRect(dropPreviewRect.x, dropPreviewRect.y, heldBlock.width, heldBlock.height);
		ctx.strokeRect(dropPreviewRect.x + 0.5, dropPreviewRect.y + 0.5, heldBlock.width - 1, heldBlock.height - 1);
		if (!dropPreviewRect.valid && debugInfoVisible) {
			ctx.fillStyle = 'rgba(192, 57, 43, 0.95)';
			ctx.font = 'bold 11px monospace';
			ctx.textAlign = 'left';
			ctx.textBaseline = 'alphabetic';
			ctx.fillText('invalid target', codeLineBlockLeft + 6, 18);
		}
		ctx.restore();
	}

	if (debugInfoVisible) {
		ctx.save();
		var debugPanelWidth = 206;
		var debugPanelLeft = canvas.width - rightGutterWidth - debugPanelWidth - 6;
		var debugPanelHeight = 208;
		ctx.fillStyle = 'rgba(255, 255, 255, 0.84)';
		ctx.fillRect(debugPanelLeft, 2, debugPanelWidth, debugPanelHeight);
		ctx.strokeStyle = 'rgba(89, 101, 113, 0.24)';
		ctx.strokeRect(debugPanelLeft + 0.5, 2.5, debugPanelWidth - 1, debugPanelHeight - 1);
		ctx.fillStyle = 'rgba(35, 35, 35, 0.9)';
		ctx.font = '10px monospace';
		ctx.textAlign = 'left';
		ctx.textBaseline = 'top';
		ctx.fillText('power visible line number = ' + (player.powerVisibleLineNumber === undefined ? 'undefined' : String(player.powerVisibleLineNumber)) + ' (' + typeof player.powerVisibleLineNumber + ')', debugPanelLeft + 6, 5);
		ctx.fillText('power.lineIndex = ' + (player.powerInteractionLineIndex === undefined ? 'undefined' : String(player.powerInteractionLineIndex)) + ' (' + typeof player.powerInteractionLineIndex + ')', debugPanelLeft + 6, 17);
		ctx.fillText('player visible feet line number = ' + (player.visibleFeetLineNumber === undefined ? 'undefined' : String(player.visibleFeetLineNumber)) + ' (' + typeof player.visibleFeetLineNumber + ')', debugPanelLeft + 6, 29);
		ctx.fillText('player.lineIndex = ' + (player.lineIndex === undefined ? 'undefined' : String(player.lineIndex)) + ' (' + typeof player.lineIndex + ')', debugPanelLeft + 6, 41);
		ctx.fillText('interaction lineIndex = ' + (player.interactionLineIndex === undefined ? 'undefined' : String(player.interactionLineIndex)) + ' (' + typeof player.interactionLineIndex + ')', debugPanelLeft + 6, 53);
		ctx.fillText('activeLineIndex = ' + (activeLineIndex === undefined ? 'undefined' : String(activeLineIndex)) + ' (' + typeof activeLineIndex + ')', debugPanelLeft + 6, 65);
		ctx.fillText('activeDisplayLineNumber = ' + (activeDisplayLineNumber === undefined ? 'undefined' : String(activeDisplayLineNumber)) + ' (' + typeof activeDisplayLineNumber + ')', debugPanelLeft + 6, 77);
		ctx.fillText('highlightedMarginIndex = ' + (highlightedMarginIndex === undefined ? 'undefined' : String(highlightedMarginIndex)) + ' (' + typeof highlightedMarginIndex + ')', debugPanelLeft + 6, 89);
		ctx.fillText('target type = ' + (player.interactionTarget && player.interactionTarget.type ? String(player.interactionTarget.type) : 'none'), debugPanelLeft + 6, 101);
		ctx.fillText('block type = ' + (player.interactionTarget && player.interactionTarget.block ? String(player.interactionTarget.block.type) : 'none'), debugPanelLeft + 6, 113);
		ctx.fillText('block.isEditable = ' + (player.interactionTarget && player.interactionTarget.block ? String(!!player.interactionTarget.block.isEditable) : 'false'), debugPanelLeft + 6, 125);
		ctx.fillText('block.isFilled = ' + (player.interactionTarget && player.interactionTarget.block ? String(!!player.interactionTarget.block.isFilled) : 'false'), debugPanelLeft + 6, 137);
		ctx.fillText('effective edit power = ' + (typeof getEffectivePlayerPowers === 'function' && getEffectivePlayerPowers().edit ? 'true' : 'false'), debugPanelLeft + 6, 149);
		ctx.fillText('interactionActions = ' + (player.interactionActions && player.interactionActions.length ? player.interactionActions.join(', ') : 'none'), debugPanelLeft + 6, 161);
		ctx.fillText('selectedInteractionActionIndex = ' + (player.selectedInteractionActionIndex === undefined ? 'undefined' : String(player.selectedInteractionActionIndex)), debugPanelLeft + 6, 173);
		ctx.fillText('showActionSelector = ' + String(!!(player.interactionMenuActive && player.interactionActions && player.interactionActions.length > 1 && player.carrying == -1)), debugPanelLeft + 6, 185);
		if (heldBlock) {
			ctx.fillText('targetX = ' + (dropPreviewRect && dropPreviewRect.x === undefined ? 'undefined' : String(dropPreviewRect.x)), debugPanelLeft + 6, 197);
		}
		ctx.restore();
	}

	if ($('#window-devhelp').length && devHelpVisible) {
		refreshDevHelpWindow();
	}

	ctx.fillStyle = '#7c848d';
	ctx.font = '12px monospace';
	ctx.textAlign = 'right';
	ctx.textBaseline = 'middle';
	for (i = 0; i < codeLines.length; i++) {
		var lineTop = codeLineTop + (i * codeLineHeight);
		var lineBottom = lineTop + codeLineHeight;
		var lineCenterY = lineTop + Math.round(codeLineHeight / 2);
		var marginNumberY = lineCenterY - codeLineHeight;

		if (i === highlightedMarginIndex) {
			ctx.fillStyle = '#4f5b66';
			ctx.font = 'bold 12px monospace';
		}
		else {
			ctx.fillStyle = '#7c848d';
			ctx.font = '12px monospace';
		}

		ctx.fillText(codeLines[i].number, codeLineTextLeft + codeLineNumberWidth, marginNumberY);
	}

	ctx.fillStyle = '#7c848d';
	ctx.font = '12px monospace';
	ctx.textAlign = 'right';
	ctx.textBaseline = 'middle';
	var gutterNumberPadding = 8;
	var rightGutterLeft = playAreaBounds.right;
	for (i = 0; i < codeLines.length; i++) {
		var rightLineTop = codeLineTop + (i * codeLineHeight);
		var rightLineCenterY = rightLineTop + Math.round(codeLineHeight / 2);
		var rightMarginNumberY = rightLineCenterY - codeLineHeight;
		var displayLineNumber = codeLines[i].number;
		var rightNumberX = rightGutterLeft + (displayLineNumber >= 10 ? 14 : gutterNumberPadding);

		if (i === highlightedMarginIndex) {
			ctx.fillStyle = '#4f5b66';
			ctx.font = 'bold 12px monospace';
		}
		else {
			ctx.fillStyle = '#7c848d';
			ctx.font = '12px monospace';
		}

		ctx.fillText(codeLines[i].number, rightNumberX, rightMarginNumberY);
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

	drawPowerAnimationOverlay();

	if (player.carrying == -1 && player.interactionTarget && player.interactionTarget.type === 'codeBlock' && player.interactionActions && player.interactionActions.length) {
		var interactionTargetBlock = blocks[player.interactionTarget.index];
		if (interactionTargetBlock && interactionTargetBlock.storageState !== 'distributor') {
			var selectedActionIndex = clamp(player.selectedInteractionActionIndex || 0, 0, player.interactionActions.length - 1);
			var selectedAction = player.interactionActions[selectedActionIndex] || player.interactionActions[0] || 'pickup';
			var selectedActionColor = getActionColor(selectedAction);

			ctx.save();
			ctx.shadowColor = selectedActionColor.replace('0.95', '0.35').replace('0.9', '0.35');
			ctx.shadowBlur = selectedAction === 'edit' ? 12 : 10;
			ctx.strokeStyle = selectedActionColor;
			ctx.lineWidth = selectedAction === 'edit' ? 3 : 2;
			ctx.strokeRect(interactionTargetBlock.x - 1.5, interactionTargetBlock.y - 1.5, interactionTargetBlock.width + 3, interactionTargetBlock.height + 3);
			ctx.restore();
		}
	}

	if (player.carrying == -1 && player.interactionMenuActive && player.interactionTarget && player.interactionTarget.type === 'codeBlock') {
		var actionTargetBlock = blocks[player.interactionTarget.index];
		if (actionTargetBlock && actionTargetBlock.storageState !== 'distributor') {
			var actionItemHeight = 18;
			var actionHintHeight = 14;
			var actionMenuPadding = 8;
			var actionMenuHeight = (player.interactionActions.length * actionItemHeight) + actionHintHeight + 4;
			ctx.save();
			ctx.font = '10px monospace';
			var actionIconWidth = 16;
			var actionIconGap = 6;
			var actionSelectionWidth = 12;
			var actionMaxLabelWidth = 0;
			for (var measureIndex = 0; measureIndex < player.interactionActions.length; measureIndex++) {
				var measureLabel = getActionLabel(player.interactionActions[measureIndex]);
				actionMaxLabelWidth = Math.max(actionMaxLabelWidth, ctx.measureText(measureLabel).width);
			}
			var actionMenuWidth = Math.ceil(actionMenuPadding * 2 + actionSelectionWidth + actionIconWidth + actionIconGap + actionMaxLabelWidth);
			var actionMenuX = actionTargetBlock.x + actionTargetBlock.width + 10;
			var actionMenuY = Math.max(0, actionTargetBlock.y - 2);
			var playAreaRight = canvas.width - rightGutterWidth;

			if (actionMenuX + actionMenuWidth > playAreaRight - 4)
				actionMenuX = Math.max(codeLineBlockLeft + 6, actionTargetBlock.x - actionMenuWidth - 10);

			ctx.save();
			ctx.fillStyle = 'rgba(255, 255, 255, 0.94)';
			ctx.fillRect(actionMenuX, actionMenuY, actionMenuWidth, actionMenuHeight);
			ctx.strokeStyle = 'rgba(89, 101, 113, 0.35)';
			ctx.strokeRect(actionMenuX + 0.5, actionMenuY + 0.5, actionMenuWidth - 1, actionMenuHeight - 1);
			ctx.textBaseline = 'middle';
			ctx.textAlign = 'left';

			for (var actionIndex = 0; actionIndex < player.interactionActions.length; actionIndex++) {
				var actionName = player.interactionActions[actionIndex];
				var actionInfo = {
					pickup: { icon: '↥', label: getActionLabel('pickup') },
					edit: { icon: '✎', label: getActionLabel('edit') },
					copy: { icon: '⧉', label: getActionLabel('copy') },
					cut: { icon: '✂', label: getActionLabel('cut') },
					delete: { icon: '×', label: getActionLabel('delete') },
					insert: { icon: '+', label: getActionLabel('insert') },
					inspect: { icon: '⌕', label: getActionLabel('inspect') }
				}[actionName] || { icon: '•', label: getActionLabel(actionName) };
				var actionRowY = actionMenuY + 3 + (actionIndex * actionItemHeight);
				var isSelectedAction = actionIndex === player.selectedInteractionActionIndex;
				var actionColor = getActionColor(actionName);

				if (isSelectedAction) {
					ctx.fillStyle = 'rgba(89, 101, 113, 0.14)';
					ctx.fillRect(actionMenuX + 1, actionRowY - 7, actionMenuWidth - 2, actionItemHeight - 2);
					ctx.fillStyle = actionColor;
				}
				else {
					ctx.fillStyle = 'rgba(82, 90, 99, 0.9)';
				}

				ctx.fillText(isSelectedAction ? '▶' : ' ', actionMenuX + actionMenuPadding - 2, actionRowY);
				ctx.fillText(actionInfo.icon, actionMenuX + actionMenuPadding + 10, actionRowY);
				ctx.fillText(actionInfo.label, actionMenuX + actionMenuPadding + 26, actionRowY);
			}

			ctx.fillStyle = 'rgba(92, 103, 114, 0.8)';
			ctx.font = '8px monospace';
			ctx.textBaseline = 'alphabetic';
			ctx.fillText('Shift + \u2191/\u2193 : choisir une action   Space : ex\u00E9cuter', actionMenuX + actionMenuPadding, actionMenuY + actionMenuHeight - 4);
			ctx.restore();
		}
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
