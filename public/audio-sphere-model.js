'use strict';

/**
 * Creates a simple sphere model.
 * @param {WebGLRenderingContext} gl - The WebGL rendering context.
 * @param {ShaderProgram} shaderProgram - The shader program to be used for rendering the model.
 * @param {number} radius - The radius of the sphere.
 * @param {number} latBands - The number of latitude bands.
 * @param {number} longBands - The number of longitude bands.
 * @constructor
 */
export class SphereModel {
    constructor(gl, shaderProgram, radius, latBands, longBands) {
        this.gl = gl;
        this.shaderProgram = shaderProgram;
        this.radius = radius;
        this.latBands = latBands;
        this.longBands = longBands;
        this.vertexBuffer = this.gl.createBuffer();
        this.indexBuffer = this.gl.createBuffer();

        this.bufferData();
    }

    /** Generates vertices for drawing the sphere. **/
    getVertices() {
        const vertices = [];

        for (let lat = 0; lat <= this.latBands; lat++) {
            const theta = lat * Math.PI / this.latBands;
            const sinTheta = Math.sin(theta);
            const cosTheta = Math.cos(theta);

            for (let lon = 0; lon <= this.longBands; lon++) {
                const phi = lon * 2 * Math.PI / this.longBands;
                const sinPhi = Math.sin(phi);
                const cosPhi = Math.cos(phi);
                const x = this.radius * cosPhi * sinTheta;
                const y = this.radius * cosTheta;
                const z = this.radius * sinPhi * sinTheta;

                vertices.push(x, y, z);
            }
        }

        return vertices;
    }

    /** Generates indices for drawing the sphere. **/
    getIndices() {
        const indices = [];

        for (let lat = 0; lat < this.latBands; lat++) {
            for (let lon = 0; lon < this.longBands; lon++) {
                const first = lat * (this.longBands + 1) + lon;
                const second = first + this.longBands + 1;

                indices.push(first, second, first + 1);
                indices.push(second, second + 1, first + 1);
            }
        }

        return indices;
    }

    /** Buffers the vertex and index data in the WebGL context. **/
    bufferData() {
        const vertices = this.getVertices();
        this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.vertexBuffer);
        this.gl.bufferData(this.gl.ARRAY_BUFFER, new Float32Array(vertices), this.gl.STATIC_DRAW);

        const indices = this.getIndices();
        this.gl.bindBuffer(this.gl.ELEMENT_ARRAY_BUFFER, this.indexBuffer);
        this.gl.bufferData(this.gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(indices), this.gl.STATIC_DRAW);
    }

    /** Draws the sphere surface using buffered vertex and index data. **/
    draw() {
        this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.vertexBuffer);
        this.gl.vertexAttribPointer(this.shaderProgram.aVertex, 3, this.gl.FLOAT, false, 0, 0);
        this.gl.enableVertexAttribArray(this.shaderProgram.aVertex);

        this.gl.uniform3fv(this.shaderProgram.uColor, new Float32Array([1.0, 1.0, 1.0]));
        this.gl.bindBuffer(this.gl.ELEMENT_ARRAY_BUFFER, this.indexBuffer);
        this.gl.drawElements(this.gl.LINES, this.latBands * this.longBands * 6, this.gl.UNSIGNED_SHORT, 0);
    }
}
