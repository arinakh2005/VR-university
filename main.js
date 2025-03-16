'use strict';

import { Model } from './model.js';

let gl;
let model;
let shaderProgram;
let spaceBall;

class ShaderProgram {
    constructor(name, program) {
        this.program = program;
    }

    use() {
        gl.useProgram(this.program);
    }
}

export function init() {
    let canvas;
    try {
        canvas = document.getElementById('webglcanvas');
        gl = canvas.getContext('webgl');
        if (!gl) {
            throw new Error('WebGL not supported');
        }
    } catch (e) {
        document.getElementById('canvas-holder').innerHTML = '<p>Unable to initialize WebGL.</p>';
        return;
    }

    try {
        initGL();
    } catch (e) {
        document.getElementById('canvas-holder').innerHTML = `<p>WebGL initialization failed: ${e}</p>`;
        return;
    }

    spaceBall = new TrackballRotator(canvas, draw, 0);
    draw();
}

function initGL() {
    const program = createProgram(gl, vertexShaderSource, fragmentShaderSource);
    shaderProgram = new ShaderProgram('BasicProgram', program);
    shaderProgram.use();

    // Get attribute and uniform locations
    shaderProgram.aVertex = gl.getAttribLocation(program, 'aVertex');
    shaderProgram.uModelViewProjectionMatrix = gl.getUniformLocation(program, 'uModelViewProjectionMatrix');
    shaderProgram.uColor = gl.getUniformLocation(program, 'uColor');
}

function createProgram(gl, vShader, fShader) {
    const vertexShader = gl.createShader(gl.VERTEX_SHADER);
    gl.shaderSource(vertexShader, vShader);
    gl.compileShader(vertexShader);
    if (!gl.getShaderParameter(vertexShader, gl.COMPILE_STATUS)) {
        throw new Error('Vertex shader error: ' + gl.getShaderInfoLog(vertexShader));
    }

    const fragmentShader = gl.createShader(gl.FRAGMENT_SHADER);
    gl.shaderSource(fragmentShader, fShader);
    gl.compileShader(fragmentShader);
    if (!gl.getShaderParameter(fragmentShader, gl.COMPILE_STATUS)) {
        throw new Error('Fragment shader error: ' + gl.getShaderInfoLog(fragmentShader));
    }

    const program = gl.createProgram();
    gl.attachShader(program, vertexShader);
    gl.attachShader(program, fragmentShader);
    gl.linkProgram(program);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
        throw new Error('Program link error: ' + gl.getProgramInfoLog(program));
    }

    return program;
}

function draw() {
    gl.clearColor(0, 0, 0, 1);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    gl.enable(gl.DEPTH_TEST);

    const projection = m4.perspective(Math.PI / 4, gl.canvas.width / gl.canvas.height, 0.1, 100);
    const rotate = m4.axisRotation([0.707, 0.707, 0], 0.7);
    const translate = m4.translation(0, 0, -10);

    let modelView = spaceBall.getViewMatrix();
    modelView = m4.multiply(rotate, modelView);
    modelView = m4.multiply(translate, modelView);

    const modelViewProjection = m4.multiply(projection, modelView);
    gl.uniformMatrix4fv(shaderProgram.uModelViewProjectionMatrix, false, modelViewProjection);
    gl.uniform3fv(shaderProgram.uColor, [1.0, 0.0, 0.0]);

    updateModel();
}


function updateModel() {
    const radius = parseFloat(document.getElementById('radius').value);
    const amplitude = parseFloat(document.getElementById('amplitude').value);
    const wavesCount = parseInt(document.getElementById('wavesCount').value);
    const segmentsCountByU = parseInt(document.getElementById('segmentsCountByU').value);
    const segmentsCountByV = parseInt(document.getElementById('segmentsCountByV').value);

    model = new Model(gl, shaderProgram, radius, amplitude, wavesCount, segmentsCountByU, segmentsCountByV);
    model.bufferData();
    model.draw();
}

document.querySelectorAll('input').forEach(input => {
    input.addEventListener('input', (event) => {
        const id = event.target.id;

        if (['radius', 'amplitude', 'wavesCount', 'segmentsCountByU', 'segmentsCountByV'].includes(id)) {
            draw();
        } else {
        }
    });
});

document.getElementById('segmentsCountByU').addEventListener('input', function (){
    document.getElementById('segmentsCountByUValue').textContent = this.value;
    updateModel();
});

document.getElementById('segmentsCountByV').addEventListener('input', function () {
    document.getElementById('segmentsCountByVValue').textContent = this.value;
    updateModel();
});

window.onload = init;
