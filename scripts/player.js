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
		prevX: 0,
		frameX: 0,
		frameY: 0,
		// movement
		speed: 4,
		jumpSpeed: 17,
		jumping: false,
		airTime: 0,
		velocity: .05,
		velocityUp: 0,
		velocityDown: 0,
		// special pickup vars
		pickup: false,
		reverse: false,
		drop: false,
		carrying: -1,
		update: function() {			
			// record old position
			this.prevX = this.x;
			
			// stop at bottom of screen
			if (this.y + this.height >= canvas.height) {
				this.jumping = false;
				this.y = canvas.height - this.height;
				this.velocityDown = 0;
			}
			
			// pick up
			if (this.velocityDown <= 0 && !this.jumping && !this.pickup && this.x == this.prevX && keys.space in keysDown) {
				this.pickup = true;
				this.frameX = 7;
				this.velocity = 0;
				
				// mark as dropping so we don't pick it up again
				if (this.carrying != -1)
					this.drop = true;
			}
			
			// can't move if picking up
			if (this.pickup)
				return;
		
			// player presses up to jump
			if (!this.jumping && keys.up in keysDown && this.velocityDown <= 0) { 
				this.velocityUp = this.jumpSpeed/2;
				this.velocityDown = 0;
				this.jumping = true;
				this.airTime = 0;
			}
			// jump higher if held longer
			else if (this.jumping && this.airTime > 1 && this.airTime < 12 && keys.up in keysDown) {
				this.velocityUp += .25;
			}
			// fall faster if jump isn't as strong
			else if (this.jumping && this.velocityUp > 0 && this.airTime < 50) {
				this.velocityUp -= 2;
			}
			// update gravity
			else {
				if (this.velocityUp > 0)
					this.velocityUp--;
				else if (this.velocityDown < this.jumpSpeed)
					this.velocityDown += gravitySpeed;
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
			
			// final jump
			if (this.velocityUp > 0)
				this.y = this.y - this.velocityUp;
			// final fall
			else if (this.velocityUp < 1) {
				this.y = this.y + this.velocityDown;
			}

			// update time in air when jumping
			if (this.jumping)
				this.airTime++;
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
								this.carrying = -1;
								this.drop = false;
								
								validate(0); // game.js
							}
						}
					}
				}
				// falling
				else if (this.velocityDown > 0.5) {	
					this.frameX = 11;
				}
				// jumping
				else if (this.jumping) {
					this.frameX = 10;
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
