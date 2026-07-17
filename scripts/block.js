// uniform block box used for every manipulable HTML tag
var blockWidth = 60;
var blockHeight = 33;
var nextBlockId = 1;

var escapeHtmlFragment = function(value) {
	return String(value)
		.replace(/&/g, '&amp;')
		.replace(/</g, '&lt;')
		.replace(/>/g, '&gt;')
		.replace(/"/g, '&quot;');
};

var isEditableBlockType = function(type) {
	return type === 'markup-empty' || type === 'string-empty' || type === 'markup-choice-empty';
};

var isValidMarkupFragment = function(value) {
	if (value === undefined || value === null)
		return false;

	var fragment = String(value).trim();
	if (!fragment)
		return false;

	var template = document.createElement('template');
	template.innerHTML = fragment;
	return template.content.querySelector('*') !== null;
};

var syncBlockContentState = function(block) {
	if (!block)
		return block;

	if (block.type === 'markup-choice-empty') {
		var hasValidChoice = block.selectedChoiceIndex !== undefined && block.selectedChoiceIndex !== null && block.choices && block.choices[block.selectedChoiceIndex];
		if (hasValidChoice) {
			var selectedChoice = block.choices[block.selectedChoiceIndex];
			block.label = selectedChoice.label;
			block.outputHtml = selectedChoice.html;
			block.isFilled = true;
			block.isEditable = false;
		}
		else {
			block.label = block.placeholderLabel || block.label || '[choix]';
			block.outputHtml = '';
			block.isEditable = true;
			block.isFilled = false;
		}
	}
	else if (block.type === 'markup-empty') {
		if (block.isFilled) {
			block.label = block.label || block.editableValue || '[markup]';
			block.isEditable = false;
		}
		else {
			block.label = block.placeholderLabel || block.label || '[markup]';
			block.outputHtml = '';
			block.isEditable = true;
			block.isFilled = false;
		}
	}
	else if (block.type === 'string-empty') {
		if (block.isFilled) {
			block.label = block.label || block.editableValue || '[texte]';
			block.isEditable = false;
		}
		else {
			block.label = block.placeholderLabel || block.label || '[texte]';
			block.outputHtml = '';
			block.isEditable = true;
			block.isFilled = false;
		}
	}
	else {
		block.label = block.label || block.html || '';
		if (block.outputHtml === undefined || block.outputHtml === null)
			block.outputHtml = block.html || '';
		block.isEditable = false;
		block.isFilled = false;
	}

	return block;
};

var getBlockOutputHtml = function(block) {
	if (!block)
		return '';

	if (block.outputHtml !== undefined && block.outputHtml !== null)
		return block.outputHtml;

	return block.html || '';
};

var setEditableBlockValue = function(block, value) {
	if (!block)
		return false;
	if (block.type === 'markup-choice-empty')
		return false;
	if (block.type !== 'markup-empty' && block.type !== 'string-empty')
		return false;

	var nextValue = value === undefined || value === null ? '' : String(value);
	if (block.type === 'markup-empty' && !isValidMarkupFragment(nextValue))
		return false;

	block.editableValue = nextValue;
	block.isFilled = true;
	block.isEditable = false;
	block.label = block.editableValue;
	block.outputHtml = block.type === 'string-empty' ? escapeHtmlFragment(block.editableValue) : block.editableValue;
	return true;
};

var applyEditableBlockValue = function(block, value) {
	return setEditableBlockValue(block, value);
};

var setMarkupChoice = function(block, choiceIndex) {
	if (!block || block.type !== 'markup-choice-empty' || !block.choices || !block.choices.length)
		return false;

	var normalizedChoiceIndex = choiceIndex;
	if (typeof normalizedChoiceIndex !== 'number')
		normalizedChoiceIndex = parseInt(normalizedChoiceIndex, 10);
	if (!Number.isInteger(normalizedChoiceIndex))
		return false;
	if (normalizedChoiceIndex < 0 || normalizedChoiceIndex >= block.choices.length)
		return false;

	var selectedChoice = block.choices[normalizedChoiceIndex];
	if (!selectedChoice || selectedChoice.label === undefined || selectedChoice.html === undefined)
		return false;

	block.selectedChoiceIndex = normalizedChoiceIndex;
	block.editableValue = '';
	block.label = selectedChoice.label;
	block.outputHtml = selectedChoice.html;
	block.isFilled = true;
	block.isEditable = false;
	return true;
};

// block class
function createBlock(tag) {
	var blockType = tag.type || 'markup';
	var initialEditable = isEditableBlockType(blockType);
	var block = {
		id: tag.id !== undefined && tag.id !== null ? tag.id : nextBlockId++,
		index: blocks.length,
		type: blockType,
		html: tag.html,
		label: tag.label || tag.placeholderLabel || tag.html,
		placeholderLabel: tag.placeholderLabel || tag.label || tag.html,
		choices: tag.choices ? tag.choices.slice() : [],
		selectedChoiceIndex: tag.selectedChoiceIndex !== undefined ? tag.selectedChoiceIndex : null,
		editableValue: tag.editableValue !== undefined ? tag.editableValue : '',
		outputHtml: tag.outputHtml !== undefined ? tag.outputHtml : (initialEditable ? '' : tag.html),
		isEditable: tag.isEditable !== undefined ? tag.isEditable : initialEditable,
		isFilled: tag.isFilled !== undefined ? tag.isFilled : false,
		isSystemOnly: tag.isSystemOnly !== undefined ? tag.isSystemOnly : false,
		lineIndex: null,
		storageState: 'playArea',
		distributorLineIndex: null,
		distributorSlotIndex: null,
		dropSnapActive: false,
		dropSnapDelayFrames: 0,
		dropSnapFrames: 0,
		dropSnapProgress: 0,
		dropSnapStartX: 0,
		dropSnapStartY: 0,
		dropSnapTargetX: 0,
		dropSnapTargetY: 0,
		// graphics
		sprite: tag.src,
		width: blockWidth,
		height: blockHeight,
		// position
		x: Math.floor((Math.random() * (canvas.width - blockWidth - codeLineBlockLeft)) + codeLineBlockLeft),
		y: getLineTop(Math.floor(Math.random() * Math.max(1, codeLines.length))) - blockHeight,
		velocityDown: 0,
		update: function() {
			if (this.storageState === 'distributor') {
				return;
			}

			// player is carrying this block
			if (player.carrying == this.index) {
				this.storageState = 'held';
				this.lineIndex = null;

				// set x-axis according to player position
				this.x = Math.round(player.x + player.width/2 - this.width/2);
				
				// y-axis is trickier
				if (player.pickup)
					this.y = Math.round(player.y + player.height - this.height);
				else
					this.y = Math.round(player.y + player.height - this.height*1.8);

				this.heldVisualRect = getHeldBlockVisualRect(this);
			}
			// gravity affects it
			else {
				this.storageState = 'playArea';
				this.heldVisualRect = null;

				if (this.dropSnapDelayFrames > 0) {
					this.dropSnapDelayFrames--;
					this.x = this.dropSnapStartX;
					this.y = this.dropSnapStartY;
					this.velocityDown = 0;
					return;
				}

				if (this.dropSnapActive) {
					this.dropSnapProgress++;
					var snapProgress = Math.min(1, this.dropSnapFrames ? (this.dropSnapProgress / this.dropSnapFrames) : 1);
					this.x = this.dropSnapStartX + ((this.dropSnapTargetX - this.dropSnapStartX) * snapProgress);
					this.y = this.dropSnapStartY + ((this.dropSnapTargetY - this.dropSnapStartY) * snapProgress);
					this.velocityDown = 0;
					if (snapProgress >= 1) {
						this.dropSnapActive = false;
						this.lineIndex = getBlockLineIndex(this);
					}
					return;
				}

				if (this.y + this.height < baselineY) {
					this.velocityDown += gravitySpeed;
					this.y += this.velocityDown;
				}
				else {
					this.y = baselineY - this.height;
					this.velocityDown = 0;
				}
			}
		},
		draw: function() {
			if (this.storageState === 'distributor')
				return;

			// keep the original sprite intact while giving every block the same hitbox and visual footprint
			var heldVisualRect = this.heldVisualRect || {
				x: this.x,
				y: this.y,
				width: this.width,
				height: this.height
			};
			var blockLineIndex = (this.lineIndex !== undefined && this.lineIndex !== null) ? this.lineIndex : getBlockLineIndex(this);
			var pickupAttemptActive = player.carrying == -1 && player.pickup && player.reverse;
			var pickupReachable = player.x + player.width >= heldVisualRect.x && player.x <= heldVisualRect.x + heldVisualRect.width;
			var isCurrentLinePickup = pickupAttemptActive && blockLineIndex === player.lineIndex && pickupReachable;
			var isNearbyWrongLine = pickupAttemptActive && blockLineIndex !== player.lineIndex && pickupReachable;
			ctx.fillStyle = isCurrentLinePickup ? 'rgba(244, 250, 244, 0.98)' : isNearbyWrongLine ? 'rgba(251, 243, 243, 0.97)' : 'rgba(250, 250, 250, 0.95)';
			ctx.fillRect(heldVisualRect.x, heldVisualRect.y, heldVisualRect.width, heldVisualRect.height);
			ctx.strokeStyle = isCurrentLinePickup ? 'rgba(72, 144, 96, 0.75)' : isNearbyWrongLine ? 'rgba(192, 57, 43, 0.55)' : '#d8d8d8';
			ctx.strokeRect(heldVisualRect.x + 0.5, heldVisualRect.y + 0.5, heldVisualRect.width - 1, heldVisualRect.height - 1);
			var scale = Math.min(heldVisualRect.width / this.sprite.width, heldVisualRect.height / this.sprite.height);
			var drawWidth = Math.round(this.sprite.width * scale);
			var drawHeight = Math.round(this.sprite.height * scale);
			ctx.drawImage(
				this.sprite,
				0,
				0,
				this.sprite.width,
				this.sprite.height,
				heldVisualRect.x + Math.round((heldVisualRect.width - drawWidth) / 2),
				heldVisualRect.y + Math.round((heldVisualRect.height - drawHeight) / 2),
				drawWidth,
				drawHeight
			);
		}
	};

	if (block.id >= nextBlockId)
		nextBlockId = block.id + 1;

	return syncBlockContentState(block);
}
