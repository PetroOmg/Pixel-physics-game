// src/ship/ship.js

export class PlayerShip {
    /**
     * Creates a new PlayerShip instance.
     * @param {number} width - Simulation grid width.
     * @param {number} height - Simulation grid height.
     * @param {WebGL2RenderingContext} gl - The WebGL context.
     * @param {WebGLFramebuffer} writeFramebuffer - The framebuffer for writing to textures.
     */
    constructor(width, height, gl, writeFramebuffer) {
        this.position = { x: width / 2, y: height / 2 };
        this.angle = 0; // In radians
        this.velocity = { x: 0, y: 0 };
        this.width = width;
        this.height = height;
        this.gl = gl;
        this.writeFramebuffer = writeFramebuffer;
    }

    /**
     * Updates the ship's state based on user input and physics.
     * @param {Array<string>} keys - The current array of pressed keys.
     * @param {number} deltaTime - Time elapsed since the last update (in seconds).
     */
    update(keys, deltaTime) {
        const thrustPower = 0.1;
        const reverseThrustPower = 0.033;
        const turnSpeed = 0.05;

        if (keys.includes('w')) {
            // Apply forward thrust
            this.velocity.x += Math.cos(this.angle) * thrustPower;
            this.velocity.y += Math.sin(this.angle) * thrustPower;
        }
        if (keys.includes('s')) {
            // Apply reverse thrust
            this.velocity.x -= Math.cos(this.angle) * reverseThrustPower;
            this.velocity.y -= Math.sin(this.angle) * reverseThrustPower;
        }
        if (keys.includes('a')) {
            // Turn left
            this.angle -= turnSpeed;
        }
        if (keys.includes('d')) {
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

    /**
     * Renders the ship onto the nextState texture by setting specific pixel attributes.
     */
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

            // Bind writeFramebuffer to modify nextState texture
            gl.bindFramebuffer(gl.FRAMEBUFFER, this.writeFramebuffer);

            // Retrieve the texture attached to the framebuffer
            const currentTexture = gl.getFramebufferAttachmentParameter(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.FRAMEBUFFER_ATTACHMENT_OBJECT_NAME);
            if (!currentTexture) {
                console.error('No texture is bound to COLOR_ATTACHMENT0 of the writeFramebuffer.');
                gl.bindFramebuffer(gl.FRAMEBUFFER, null);
                return;
            }

            // Bind the texture to TEXTURE_2D
            gl.bindTexture(gl.TEXTURE_2D, currentTexture);

            // Update the specific pixel in the texture
            gl.texSubImage2D(gl.TEXTURE_2D, 0, shipX, invertedY, 1, 1, gl.RGBA, gl.FLOAT, shipAttributes);

            // Check for errors
            const error = gl.getError();
            if (error !== gl.NO_ERROR) {
                console.error(`WebGL Error after texSubImage2D: ${error}`);
            }

            // Unbind the texture and framebuffer to clean up
            gl.bindTexture(gl.TEXTURE_2D, null);
            gl.bindFramebuffer(gl.FRAMEBUFFER, null);
        }
    }
}
