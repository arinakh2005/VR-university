'use strict';

/**
 * Creates a corrugated sphere model.
 * Formulas for calculating the coordinates:
 *     x = R * cos(v) + a * (1 − sin(v)) * cos(n * φ) * cos(φ)
 *     y = R * cos(v) + a * (1 − sin(v)) * cos(n * φ) * sin(φ)
 *     z = R * sin(v)
 *
 * @param {WebGLRenderingContext} gl - The WebGL rendering context.
 * @param {ShaderProgram} shaderProgram - The shader program to be used for rendering the model.
 * @param {number} radius - The radius of the sphere (R)
 * @param {number} corrugation - The corrugation amplitude (a)
 * @param {number} waveCount - The number of waves (n)
 * @param {number} segmentsCountByU - The number of segments U
 * @param {number} segmentsCountByV - The number of segments V
 * @constructor
 */
export class Model {
    constructor(gl, shaderProgram, radius, corrugation, waveCount, segmentsCountByU, segmentsCountByV) {
        this.gl = gl;
        this.shaderProgram = shaderProgram;
        this.radius = radius;
        this.a = corrugation;
        this.n = waveCount;
        this.segmentsCountU = segmentsCountByU;
        this.segmentsCountV = segmentsCountByV;
        this.vertexBuffer = this.gl.createBuffer();
        this.indexBuffer = this.gl.createBuffer();
        this.indexBufferWireframe = this.gl.createBuffer();

        this.bufferData();
    }

    /** Generates vertices for drawing the corrugated sphere. **/
    getVertices() {
        const vertices = [];

        for (let i = 0; i <= this.segmentsCountU; i++) {
            const phi = (i / this.segmentsCountU) * 2 * Math.PI;

            for (let j = 0; j <= this.segmentsCountV; j++) {
                const v = (j / this.segmentsCountV) * Math.PI;
                const cosV = Math.cos(v);
                const sinV = Math.sin(v);
                const similarPart = this.radius * cosV + this.a * (1 - sinV) * Math.cos(this.n * phi);
                const x = similarPart * Math.cos(phi);
                const y = similarPart * Math.sin(phi);
                const z = this.radius * sinV;

                vertices.push(x, y, z);
            }
        }

        return vertices;
    }

    /** Generates indices for drawing the corrugated sphere. **/
    getIndices() {
        const indices = [];

        for (let i = 0; i < this.segmentsCountU; i++) {
            for (let j = 0; j < this.segmentsCountV; j++) {
                const point = i * (this.segmentsCountV + 1) + j;
                const pointInNextRow = point + (this.segmentsCountV + 1);

                indices.push(point, pointInNextRow, point + 1);
                indices.push(point + 1, pointInNextRow, pointInNextRow + 1);
            }
        }

        return indices;
    }

    /** Generates indices for drawing the wireframe of a corrugated sphere. **/
    getWireframeIndices() {
        const indices = [];

        for (let i = 0; i < this.segmentsCountU; i++) {
            for (let j = 0; j < this.segmentsCountV; j++) {
                const point = i * (this.segmentsCountV + 1) + j;
                const pointInNextRow = point + (this.segmentsCountV + 1);

                indices.push(point, point + 1);
                indices.push(point, pointInNextRow);
                indices.push(point + 1, pointInNextRow);
            }
        }

        return indices;
    }

    /** Buffers the vertex data for U and V curves in the WebGL context. **/
    bufferData() {
        const vertices = this.getVertices();
        this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.vertexBuffer);
        this.gl.bufferData(this.gl.ARRAY_BUFFER, new Float32Array(vertices), this.gl.STATIC_DRAW);

        const indices = this.getIndices();
        this.gl.bindBuffer(this.gl.ELEMENT_ARRAY_BUFFER, this.indexBuffer);
        this.gl.bufferData(this.gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(indices), this.gl.STATIC_DRAW);

        const wireframeIndices = this.getWireframeIndices();
        this.gl.bindBuffer(this.gl.ELEMENT_ARRAY_BUFFER, this.indexBufferWireframe);
        this.gl.bufferData(this.gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(wireframeIndices), this.gl.STATIC_DRAW);
    }

    /** Draws the corrugated sphere model using buffered vertex and index data. **/
    draw() {
        this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.vertexBuffer);
        this.gl.vertexAttribPointer(this.shaderProgram.aVertex, 3, this.gl.FLOAT, false, 0, 0);
        this.gl.enableVertexAttribArray(this.shaderProgram.aVertex);

        this.gl.uniform3fv(this.shaderProgram.uColor,  new Float32Array([0.5, 0.5, 0.5]));
        this.gl.bindBuffer(this.gl.ELEMENT_ARRAY_BUFFER, this.indexBuffer);
        this.gl.drawElements(this.gl.TRIANGLES, this.segmentsCountU * this.segmentsCountV * 6, this.gl.UNSIGNED_SHORT, 0);
    }

    /** Draws the wireframe of the corrugated sphere using buffered vertex and index data. **/
    drawWireframe() {
        this.gl.enable(this.gl.POLYGON_OFFSET_FILL);
        this.gl.polygonOffset(1, 1);

        this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.vertexBuffer);
        this.gl.vertexAttribPointer(this.shaderProgram.aVertex, 3, this.gl.FLOAT, false, 0, 0);
        this.gl.enableVertexAttribArray(this.shaderProgram.aVertex);

        this.gl.uniform3fv(this.shaderProgram.uColor, new Float32Array([0.8, 0.8, 0.8]));
        this.gl.bindBuffer(this.gl.ELEMENT_ARRAY_BUFFER, this.indexBufferWireframe);
        this.gl.drawElements(this.gl.LINES, this.segmentsCountU * this.segmentsCountV * 6, this.gl.UNSIGNED_SHORT, 0);

        this.gl.disable(this.gl.POLYGON_OFFSET_FILL);
    }
}