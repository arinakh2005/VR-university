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
let sensorRotationMatrix4;

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
    connectSensorServer();
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

function getRotationMatrix4FromVector(rotationVector) {
    let q0;
    let q1 = rotationVector[0];
    let q2 = rotationVector[1];
    let q3 = rotationVector[2];

    if (rotationVector.length >= 4) {
        q0 = rotationVector[3];
    } else {
        q0 = 1 - q1 * q1 - q2 * q2 - q3 * q3;
        q0 = q0 > 0 ? Math.sqrt(q0) : 0;
    }

    const sq_q1 = 2 * q1 * q1;
    const sq_q2 = 2 * q2 * q2;
    const sq_q3 = 2 * q3 * q3;
    const q1_q2 = 2 * q1 * q2;
    const q3_q0 = 2 * q3 * q0;
    const q1_q3 = 2 * q1 * q3;
    const q2_q0 = 2 * q2 * q0;
    const q2_q3 = 2 * q2 * q3;
    const q1_q0 = 2 * q1 * q0;

    const R = new Float32Array(16);
    R[0] = 1 - sq_q2 - sq_q3;
    R[1] = q1_q2 - q3_q0;
    R[2] = q1_q3 + q2_q0;
    R[3] = 0;
    R[4] = q1_q2 + q3_q0;
    R[5] = 1 - sq_q1 - sq_q3;
    R[6] = q2_q3 - q1_q0;
    R[7] = 0;
    R[8] = q1_q3 - q2_q0;
    R[9] = q2_q3 + q1_q0;
    R[10] = 1 - sq_q1 - sq_q2;
    R[11] = 0;
    R[12] = R[13] = R[14] = 0;
    R[15] = 1;

    return R;
}

function connectSensorServer() {
    const sensorIp   = '192.168.31.70';
    const sensorPort = 8080;
    const sensorType = 'android.sensor.rotation_vector';
    const socketUrl = `ws://${sensorIp}:${sensorPort}/sensor/connect?type=${sensorType}`;
    const socket = new WebSocket(socketUrl);

    socket.onopen = () => {
        console.log('WS → Sensor Server connected');
    }

    socket.onmessage = ({ data }) => {
        const message = JSON.parse(data);
        if (message.values) {
            sensorRotationMatrix4 = getRotationMatrix4FromVector(message.values);
            draw();
        }
    };

    socket.onerror = ($event) => console.error('WS error:', $event);
    socket.onclose = ($event) => console.warn('WS closed', $event.code, $event.reason);
}

function draw() {
    gl.clearColor(0, 0, 0, 1);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    gl.disable(gl.DEPTH_TEST);
    renderVideoBackground();
    gl.enable(gl.DEPTH_TEST);

    let translate = m4.translation(0, 0, -10);
    let modelView = spaceBall.getViewMatrix();

    if (!sensorRotationMatrix4) {
        sensorRotationMatrix4 = m4.identity();
    }
    modelView = m4.multiply(sensorRotationMatrix4, modelView);
    modelView = m4.multiply(translate, modelView);

    let leftProjection = m4.identity();
    let rightProjection = m4.identity();
    let modelViewProjection;

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

    if (!model) {
        model = new Model(gl, shaderProgram, radius, amplitude, wavesCount, segmentsCountByU, segmentsCountByV);
    }
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
