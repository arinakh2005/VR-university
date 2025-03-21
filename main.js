'use strict';

import { Model } from './model.js';
import { StereoCamera } from './stereo-camera.js';

let gl;
let model;
let stereoCamera;
let shaderProgram;
let backgroundShaderProgram;
let spaceBall;
let video;
let videoTexture;
let quadBuffer;
let texCoordBuffer;

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

    initVideoStream();
    initGL();
    spaceBall = new TrackballRotator(canvas, draw, 0);
    draw();
}

function initVideoStream() {
    video = document.createElement('video');
    video.autoplay = true;
    video.loop = true;

    navigator.mediaDevices.getUserMedia({ video: true })
        .then((stream) => {
            video.srcObject = stream;
        })
        .catch((err) => {
            console.error('Error accessing webcam: ', err);
        });
}

function initGL() {
    const program = createProgram(gl, vertexShaderSource, fragmentShaderSource);
    shaderProgram = new ShaderProgram('BasicProgram', program);
    shaderProgram.use();

    shaderProgram.aVertex = gl.getAttribLocation(program, 'aVertex');
    shaderProgram.uModelViewProjectionMatrix = gl.getUniformLocation(program, 'uModelViewProjectionMatrix');
    shaderProgram.uColor = gl.getUniformLocation(program, 'uColor');

    const bgProgram = createProgram(gl, backgroundVertexShaderSource, backgroundFragmentShaderSource);
    backgroundShaderProgram = new ShaderProgram('BackgroundProgram', bgProgram);
    backgroundShaderProgram.use();

    backgroundShaderProgram.aPosition = gl.getAttribLocation(bgProgram, 'aPosition');
    backgroundShaderProgram.aTexCoord = gl.getAttribLocation(bgProgram, 'aTexCoord');
    backgroundShaderProgram.uVideoTexture = gl.getUniformLocation(bgProgram, 'uVideoTexture');

    initQuadBuffers();
    initVideoTexture();
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

function initQuadBuffers() {
    const vertices = new Float32Array([
        -1, -1,
        1, -1,
        -1, 1,
        1, 1,
    ]);
    quadBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, quadBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, vertices, gl.STATIC_DRAW);


    const texCoords = new Float32Array([
        0, 1,
        1, 1,
        0, 0,
        1, 0,
    ]);
    texCoordBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, texCoordBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, texCoords, gl.STATIC_DRAW);
}

function initVideoTexture() {
    videoTexture = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, videoTexture);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
}

function updateVideoTexture() {
    if (video.readyState >= 2) {
        gl.bindTexture(gl.TEXTURE_2D, videoTexture);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGB, gl.RGB, gl.UNSIGNED_BYTE, video);
    }
}

function renderVideoBackground() {
    updateVideoTexture();

    backgroundShaderProgram.use();
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, videoTexture);
    gl.uniform1i(backgroundShaderProgram.uVideoTexture, 0);

    gl.bindBuffer(gl.ARRAY_BUFFER, quadBuffer);
    gl.enableVertexAttribArray(backgroundShaderProgram.aPosition);
    gl.vertexAttribPointer(backgroundShaderProgram.aPosition, 2, gl.FLOAT, false, 0, 0);

    gl.bindBuffer(gl.ARRAY_BUFFER, texCoordBuffer);
    gl.enableVertexAttribArray(backgroundShaderProgram.aTexCoord);
    gl.vertexAttribPointer(backgroundShaderProgram.aTexCoord, 2, gl.FLOAT, false, 0, 0);

    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
}

function draw() {
    gl.clearColor(0, 0, 0, 1);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    gl.disable(gl.DEPTH_TEST);
    renderVideoBackground();
    gl.enable(gl.DEPTH_TEST);

    const rotate = m4.axisRotation([0.707, 0.707, 0], 0.7);
    const translate = m4.translation(0, 0, -10);

    let modelView = spaceBall.getViewMatrix();
    let leftProjection = m4.identity();
    let rightProjection = m4.identity();
    let modelViewProjection;

    modelView = m4.multiply(rotate, modelView);
    modelView = m4.multiply(translate, modelView);

    updateStereoCamera();
    shaderProgram.use();
    gl.uniform3fv(shaderProgram.uColor, [1.0, 1.0, 1.0]);

    gl.colorMask(true, false, false, true);
    stereoCamera.applyFrustum(modelView, leftProjection, 'left');
    modelViewProjection = m4.multiply(leftProjection, modelView);
    gl.uniformMatrix4fv(shaderProgram.uModelViewProjectionMatrix, false, modelViewProjection);
    updateModel();

    gl.colorMask(false, true, true, true);
    stereoCamera.applyFrustum(modelView, rightProjection, 'right');
    modelViewProjection = m4.multiply(rightProjection, modelView);
    gl.uniformMatrix4fv(shaderProgram.uModelViewProjectionMatrix, false, modelViewProjection);
    updateModel();

    gl.colorMask(true, true, true, true);
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
    model.drawWireframe();
}

function updateStereoCamera() {
    const convergence = parseFloat(document.getElementById('convergence').value);
    const eyeSeparation = parseFloat(document.getElementById('eyeSeparation').value);
    const fov = parseInt(document.getElementById('fov').value);
    const nearClippingDistance = parseInt(document.getElementById('nearClippingDistance').value);
    const farClippingDistance = parseInt(document.getElementById('farClippingDistance').value);

    stereoCamera = new StereoCamera(convergence, eyeSeparation, gl.canvas.width / gl.canvas.height, fov, nearClippingDistance, farClippingDistance);
}

document.querySelectorAll('input').forEach(input => {
    input.addEventListener('input', () => draw());
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
