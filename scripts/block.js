// uniform block box used for every manipulable HTML tag
var blockWidth = 60;
var blockHeight = 33;

// block class
function createBlock(tag) {
	return {
		index: blocks.length,
		html: tag.html,
		label: tag.html,
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
	}
}
