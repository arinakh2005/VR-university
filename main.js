'use strict';

import { Model } from './model.js';

let gl;
let model;
let shaderProgram;
let spaceBall;
let lightConfig = {
    position: [1.0, 2.0, 5.0],
    angle: 0,
    radius: 10,
    speed: 0.075,
};

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
    requestAnimationFrame(render);
}

function initGL() {
    const program = createProgram(gl, vertexShaderSource, fragmentShaderSource);
    shaderProgram = new ShaderProgram('BasicProgram', program);
    shaderProgram.use();

    // Get attribute and uniform locations
    shaderProgram.aVertex = gl.getAttribLocation(program, 'aVertex');
    shaderProgram.aNormal = gl.getAttribLocation(program, 'aNormal');
    shaderProgram.uModelViewProjectionMatrix = gl.getUniformLocation(program, 'uModelViewProjectionMatrix');
    shaderProgram.uLightPosition = gl.getUniformLocation(program, 'uLightPosition');
    shaderProgram.uAmbientColor = gl.getUniformLocation(program, 'uAmbientColor');
    shaderProgram.uDiffuseColor = gl.getUniformLocation(program, 'uDiffuseColor');
    shaderProgram.uSpecularColor = gl.getUniformLocation(program, 'uSpecularColor');
    shaderProgram.uShininess = gl.getUniformLocation(program, 'uShininess');
    shaderProgram.uColor = gl.getUniformLocation(program, 'uColor');
}

function render() {
    setInterval(() => {
        updateLightPosition();
        draw()
    }, 50);
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
    gl.uniform3fv(shaderProgram.uLightPosition, lightConfig.position);
    gl.uniform3fv(shaderProgram.uAmbientColor, [0.1, 0.1, 0.1]);
    gl.uniform3fv(shaderProgram.uDiffuseColor, [1.0, 1.0, 1.0]);
    gl.uniform3fv(shaderProgram.uSpecularColor, [1.0, 1.0, 1.0]);
    gl.uniform1f(shaderProgram.uShininess, 32.0);

    updateModel();
}

function updateLightPosition() {
    lightConfig.angle += lightConfig.speed;
    lightConfig.position[0] = lightConfig.radius * Math.cos(lightConfig.angle);
    lightConfig.position[1] = lightConfig.radius * Math.sin(lightConfig.angle);
}

function updateModel() {
    const radius = parseFloat(document.getElementById('radius').value);
    const amplitude = parseFloat(document.getElementById('amplitude').value);
    const wavesCount = parseInt(document.getElementById('wavesCount').value);
    const segmentsCountByU = parseInt(document.getElementById('segmentsCountByU').value);
    const segmentsCountByV = parseInt(document.getElementById('segmentsCountByV').value);

    updateCurrentValue('segmentsCountByU', segmentsCountByU);
    updateCurrentValue('segmentsCountByV', segmentsCountByV);

    model = new Model(gl, shaderProgram, radius, amplitude, wavesCount, segmentsCountByU, segmentsCountByV);
    model.bufferData();
    model.draw();
}

function updateCurrentValue(elementId, value) {
    document.getElementById(elementId + 'Value').textContent = value;
}

window.onload = init;
