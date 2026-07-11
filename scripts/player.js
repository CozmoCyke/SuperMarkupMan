// player class
function createPlayer(w, h) {
	return {
		// graphics
		sprite: spriteSheet,
		width: w,
		height: h,
		delay: 0,
		// position
		x: canvas.width/2 - w/2,
		y: canvas.height - h,
		feetY: canvas.height,
		targetFeetY: canvas.height,
		lineIndex: 0,
		prevX: 0,
		frameX: 0,
		frameY: 0,
		// movement
		speed: 4,
		velocity: .05,
		velocityUp: 0,
		velocityDown: 0,
		verticalMoveSpeed: 8,
		verticalRepeatDirection: 0,
		verticalRepeatFrames: 0,
		// special pickup vars
		pickup: false,
		reverse: false,
		drop: false,
		carrying: -1,
		update: function() {			
			// record old position
			this.prevX = this.x;
			
			// pick up
			if (!this.pickup && this.x == this.prevX && keys.space in keysDown) {
				if (this.carrying != -1 || getPickupCandidate()) {
					this.pickup = true;
					this.frameX = 7;
					this.velocity = 0;
					
					// mark as dropping so we don't pick it up again
					if (this.carrying != -1)
						this.drop = true;
				}
			}
			
			// can't move if picking up
			if (this.pickup)
				return;

			// move one grid line at a time, with deterministic repeat while the key is held
			var verticalDirection = getVerticalStepDirection();
			if (verticalDirection !== 0) {
				if (this.verticalRepeatDirection !== verticalDirection) {
					this.verticalRepeatDirection = verticalDirection;
					this.verticalRepeatFrames = 0;
					queuePlayerVerticalStep(verticalDirection);
				}
				else {
					this.verticalRepeatFrames++;
					if (this.verticalRepeatFrames >= verticalStepInitialDelayFrames && ((this.verticalRepeatFrames - verticalStepInitialDelayFrames) % verticalStepRepeatFrames === 0))
						queuePlayerVerticalStep(verticalDirection);
				}
			}
			else {
				this.verticalRepeatDirection = 0;
				this.verticalRepeatFrames = 0;
			}

			// advance toward the requested line using a fixed travel speed
			if (this.feetY !== this.targetFeetY) {
				var verticalDelta = this.targetFeetY > this.feetY ? Math.min(this.verticalMoveSpeed, this.targetFeetY - this.feetY) : -Math.min(this.verticalMoveSpeed, this.feetY - this.targetFeetY);
				this.feetY += verticalDelta;
				this.y = this.feetY - this.height;
				this.velocityUp = 0;
				this.velocityDown = 0;
				this.jumping = false;
				this.airTime = 0;
			}
			else {
				this.y = this.feetY - this.height;
				this.velocityUp = 0;
				this.velocityDown = 0;
				this.jumping = false;
				this.airTime = 0;
			}
			
			// player presses left
			if (this.x > 0 && keys.left in keysDown) { 
				this.x -= this.speed * this.velocity;
				this.frameY = 1;
			}
			// presses right
			if (this.x + this.width < canvas.width && keys.right in keysDown) { 
				this.x += this.speed * this.velocity;
				this.frameY = 0;
			}

			// update running velocity
			if ((keys.left in keysDown && this.prevX > this.x) || (keys.right in keysDown && this.prevX < this.x))
				this.velocity += .05;
			else
				this.velocity = .05;

			// cap velocity at 1
			if (this.velocity > 1)
				this.velocity = 1;
		},
		draw: function() {
			// increment animation delay
			this.delay++;
			
			// change animation frame
			if (this.delay > 4) {
				// reset animation delay
				this.delay = 0;
				
				// crouching
				if (this.pickup) {
					// bending down
					if (!this.reverse) {
						if (this.frameX < 9)
							this.frameX++;
						else {
							this.reverse = true;
								
							if (this.carrying != -1)
								sfxDrop.play();
						}
					}
					// standing back up
					else {
						if (this.frameX > 7)
							this.frameX--;
						else {
							// restore control
							this.pickup = false;
							this.reverse = false;
							this.frameX = 1;
							
							// $&%^! yeah i dropped it
							if (this.drop) {
								finalizeHeldBlockDrop(); // game.js
							}
						}
					}
				}
				// walking
				else if (keys.left in keysDown || keys.right in keysDown) {				
					if (this.frameX < 6)
						this.frameX++;
					else
						this.frameX = 1;
				}
				// stopped
				else {
					this.frameX = 0;
				}
			}
			
			// draw on canvas
			ctx.drawImage(this.sprite, this.frameX * this.width, this.frameY * this.height, this.width, this.height, this.x, Math.round(this.y), this.width, this.height);
		}
	}
}
