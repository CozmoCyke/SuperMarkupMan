// block class
function createBlock(tag) {
	return {
		index: blocks.length,
		html: tag.html,
		// graphics
		sprite: tag.src,
		width: tag.src.width,
		height: tag.src.height,
		// position
		x: Math.floor((Math.random()*(canvas.width-tag.src.width))+1),
		y: Math.floor((Math.random()*canvas.height-tag.src.height)+1),
		velocityDown: 0,
		update: function() {
			// player is carrying this block
			if (player.carrying == this.index) {
				// set x-axis according to player position
				this.x = Math.round(player.x + player.width/2 - this.width/2);
				
				// y-axis is trickier
				if (player.pickup)
					this.y = Math.round(player.y + player.height - this.height);
				else
					this.y = Math.round(player.y + player.height - this.height*1.8);
			}
			// gravity affects it
			else {
				if (this.y + this.height < canvas.height) {
					this.velocityDown += gravitySpeed;
					this.y += this.velocityDown;
				}
				else {
					this.y = canvas.height - this.height;
					this.velocityDown = 0;
				}
			}
		},
		draw: function() {
			ctx.drawImage(this.sprite, this.x, this.y);
		}
	}
}
