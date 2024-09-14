// src/ship/ship.js

import { clamp } from '../utils/utils.js';

/**
 * Represents the player's ship in the simulation.
 */
export class PlayerShip {
    constructor(width, height, gl, readFramebuffer) {
        this.position = { x: width / 2, y: height / 2 };
        this.angle = 0; // In radians
        this.velocity = { x: 0, y: 0 };
        this.width = width;
        this.height = height;
        this.gl = gl;
        this.readFramebuffer = readFramebuffer;
    }

    update(keys, deltaTime) {
        const thrustPower = 0.1;
        const reverseThrustPower = 0.033;
        const turnSpeed = 0.05;

        if (keys['w']) {
            // Apply forward thrust
            this.velocity.x += Math.cos(this.angle) * thrustPower;
            this.velocity.y += Math.sin(this.angle) * thrustPower;
        }
        if (keys['s']) {
            // Apply reverse thrust
            this.velocity.x -= Math.cos(this.angle) * reverseThrustPower;
            this.velocity.y -= Math.sin(this.angle) * reverseThrustPower;
        }
        if (keys['a']) {
            // Turn left
            this.angle -= turnSpeed;
        }
        if (keys['d']) {
            // Turn right
            this.angle += turnSpeed;
        }

        // Update position
        this.position.x += this.velocity.x * deltaTime;
        this.position.y += this.velocity.y * deltaTime;

        // Clamp position within the world bounds
        this.position.x = clamp(this.position.x, 0, this.width - 1);
        this.position.y = clamp(this.position.y, 0, this.height - 1);
    }

    render() {
        const gl = this.gl;
        const shipX = Math.floor(this.position.x);
        const shipY = Math.floor(this.position.y);

        // Ensure coordinates are within bounds
        if (shipX >= 0 && shipX < this.width && shipY >= 0 && shipY < this.height) {
            // Define attribute values for the ship
            const shipAttributes = new Float32Array([1.0, 1.0, 0.0, 0.0]); // [Density, Temperature, Magic, Organic]

            // Invert Y-coordinate for WebGL
            const invertedY = this.height - shipY - 1;

            // Bind readFramebuffer to modify currentState texture
            gl.bindFramebuffer(gl.FRAMEBUFFER, this.readFramebuffer);

            // Bind the texture to which we want to apply the texSubImage2D operation
            const currentTexture = gl.getFramebufferAttachmentParameter(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.FRAMEBUFFER_ATTACHMENT_OBJECT_NAME);
            gl.bindTexture(gl.TEXTURE_2D, currentTexture);

            // Update the specific pixel in the texture
            gl.texSubImage2D(gl.TEXTURE_2D, 0, shipX, invertedY, 1, 1, gl.RGBA, gl.FLOAT, shipAttributes);

            // Unbind framebuffer and texture
            gl.bindTexture(gl.TEXTURE_2D, null);
            gl.bindFramebuffer(gl.FRAMEBUFFER, null);
        }
    }
}
