'use strict';

export class StereoCamera {
    constructor(convergence, eyeSeparation, aspectRatio, fov, nearClippingDistance, farClippingDistance) {
        this.convergence = convergence;
        this.eyeSeparation = eyeSeparation;
        this.aspectRatio = aspectRatio;
        this.fov = fov * Math.PI / 180.0;
        this.nearClippingDistance = nearClippingDistance;
        this.farClippingDistance = farClippingDistance;
    }

    applyFrustum(modelViewMatrix, projectionMatrix, eye) {
        const isLeft = eye === 'left';
        const top = this.nearClippingDistance * Math.tan(this.fov / 2);
        const bottom = -top;
        const a = this.aspectRatio * Math.tan(this.fov / 2) * this.convergence;
        const b = a - this.eyeSeparation / 2;
        const c = a + this.eyeSeparation / 2;
        const left = isLeft ? -b * this.nearClippingDistance / this.convergence : -c * this.nearClippingDistance / this.convergence;
        const right = isLeft ? c * this.nearClippingDistance / this.convergence : b * this.nearClippingDistance / this.convergence;

        m4.frustum(left, right, bottom, top, this.nearClippingDistance, this.farClippingDistance, projectionMatrix);

        const eyeOffset = (isLeft ? -1 : 1) * this.eyeSeparation / 2;
        const eyeTranslation = m4.translation(eyeOffset, 0.0, 0.0);

        m4.multiply(modelViewMatrix, eyeTranslation, modelViewMatrix);
    }
}
