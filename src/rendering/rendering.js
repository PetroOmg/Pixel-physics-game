// src/rendering/rendering.js

/**
 * Initializes the shader program for updating the simulation.
 * @param {WebGL2RenderingContext} gl - The WebGL context.
 * @returns {WebGLProgram} - The compiled and linked update shader program.
 */
export function initializeUpdateProgram(gl) {
    const vertexShaderSrc = `#version 300 es
    precision highp float;
    layout(location=0) in vec2 a_position;
    out vec2 v_uv;
    void main() {
        v_uv = (a_position + 1.0) / 2.0;
        gl_Position = vec4(a_position, 0.0, 1.0);
    }`;

    const fragmentShaderSrc = `#version 300 es
    precision highp float;
    in vec2 v_uv;
    uniform sampler2D u_currentState;
    uniform float u_gravity;
    out vec4 outColor;

    void main() {
        // Sample current state
        vec4 state = texture(u_currentState, v_uv);

        // Apply gravity to density attribute
        float density = clamp(state.r + u_gravity * 0.01, 0.0, 1.0);

        // Example: Apply some rules to other attributes if needed
        float temperature = clamp(state.g - 0.005, 0.0, 1.0); // Decrease temperature slightly
        float magic = clamp(state.b + 0.001, 0.0, 1.0); // Increase magic slightly
        float organic = clamp(state.a + 0.0005, 0.0, 1.0); // Increase organic slightly

        outColor = vec4(density, temperature, magic, organic);
    }`;

    const vertexShader = compileShader(gl, gl.VERTEX_SHADER, vertexShaderSrc);
    const fragmentShader = compileShader(gl, gl.FRAGMENT_SHADER, fragmentShaderSrc);
    const program = linkProgram(gl, vertexShader, fragmentShader);

    // Setup a full-screen quad
    const vao = gl.createVertexArray();
    gl.bindVertexArray(vao);

    const quadBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, quadBuffer);
    const quadVertices = new Float32Array([
        -1.0, -1.0,
         1.0, -1.0,
        -1.0,  1.0,
         1.0,  1.0,
    ]);
    gl.bufferData(gl.ARRAY_BUFFER, quadVertices, gl.STATIC_DRAW);

    gl.enableVertexAttribArray(0); // a_position
    gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);

    gl.bindVertexArray(null);
    gl.bindBuffer(gl.ARRAY_BUFFER, null);

    return program;
}

/**
 * Initializes the shader program for rendering the simulation.
 * @param {WebGL2RenderingContext} gl - The WebGL context.
 * @returns {WebGLProgram} - The compiled and linked render shader program.
 */
export function initializeRenderProgram(gl) {
    const vertexShaderSrc = `#version 300 es
    precision highp float;
    layout(location=0) in vec2 a_position;
    out vec2 v_uv;
    void main() {
        v_uv = (a_position + 1.0) / 2.0;
        gl_Position = vec4(a_position, 0.0, 1.0);
    }`;

    const fragmentShaderSrc = `#version 300 es
    precision highp float;
    in vec2 v_uv;
    uniform sampler2D u_currentState;
    out vec4 outColor;

    void main() {
        vec4 state = texture(u_currentState, v_uv);

        // Color mixing based on attributes, ensuring all are within [0,1]
        vec3 color = vec3(0.0);

        // Magic: more magic -> blue
        color += vec3(0.0, 0.0, clamp(state.b, 0.0, 1.0));

        // Density: more dense -> gray
        color += vec3(0.5) * clamp(state.r, 0.0, 1.0);

        // Temperature: more temperature -> red
        color += vec3(clamp(state.g, 0.0, 1.0), 0.0, 0.0);

        // Organic: more organic -> green
        color += vec3(0.0, 0.5, 0.0) * clamp(state.a, 0.0, 1.0);

        outColor = vec4(color, 1.0);
    }`;

    const vertexShader = compileShader(gl, gl.VERTEX_SHADER, vertexShaderSrc);
    const fragmentShader = compileShader(gl, gl.FRAGMENT_SHADER, fragmentShaderSrc);
    const program = linkProgram(gl, vertexShader, fragmentShader);

    // Setup a full-screen quad
    const vao = gl.createVertexArray();
    gl.bindVertexArray(vao);

    const quadBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, quadBuffer);
    const quadVertices = new Float32Array([
        -1.0, -1.0,
         1.0, -1.0,
        -1.0,  1.0,
         1.0,  1.0,
    ]);
    gl.bufferData(gl.ARRAY_BUFFER, quadVertices, gl.STATIC_DRAW);

    gl.enableVertexAttribArray(0); // a_position
    gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);

    gl.bindVertexArray(null);
    gl.bindBuffer(gl.ARRAY_BUFFER, null);

    return program;
}

/**
 * Renders the current state to the canvas.
 * @param {WebGL2RenderingContext} gl - The WebGL context.
 * @param {WebGLProgram} renderProgram - The shader program used for rendering.
 * @param {WebGLTexture} currentState - The texture representing the current state.
 */
export function renderScene(gl, renderProgram, currentState) {
    gl.useProgram(renderProgram);
    gl.bindVertexArray(gl.createVertexArray()); // Assuming VAO is already bound in initializeRendering

    // Bind the current state texture to texture unit 0
    const currentStateLoc = gl.getUniformLocation(renderProgram, 'u_currentState');
    gl.uniform1i(currentStateLoc, 0);
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, currentState);

    // Draw the full-screen quad
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);

    // Clean up
    gl.bindTexture(gl.TEXTURE_2D, null);
    gl.bindVertexArray(null);
    gl.useProgram(null);
}

/**
 * Compiles a shader from source.
 * @param {WebGL2RenderingContext} gl - The WebGL context.
 * @param {number} type - The type of shader (VERTEX_SHADER or FRAGMENT_SHADER).
 * @param {string} source - The shader source code.
 * @returns {WebGLShader} - The compiled shader.
 */
function compileShader(gl, type, source) {
    const shader = gl.createShader(type);
    gl.shaderSource(shader, source);
    gl.compileShader(shader);
    const success = gl.getShaderParameter(shader, gl.COMPILE_STATUS);
    if (!success) {
        console.error('Shader compilation failed:', gl.getShaderInfoLog(shader));
        gl.deleteShader(shader);
        return null;
    }
    return shader;
}

/**
 * Links a shader program from compiled vertex and fragment shaders.
 * @param {WebGL2RenderingContext} gl - The WebGL context.
 * @param {WebGLShader} vertexShader - The compiled vertex shader.
 * @param {WebGLShader} fragmentShader - The compiled fragment shader.
 * @returns {WebGLProgram} - The linked shader program.
 */
function linkProgram(gl, vertexShader, fragmentShader) {
    const program = gl.createProgram();
    gl.attachShader(program, vertexShader);
    gl.attachShader(program, fragmentShader);
    gl.linkProgram(program);
    const success = gl.getProgramParameter(program, gl.LINK_STATUS);
    if (!success) {
        console.error('Program linking failed:', gl.getProgramInfoLog(program));
        gl.deleteProgram(program);
        return null;
    }
    return program;
}
