varying vec2 vUv;


uniform int type;
uniform vec2 mouse;
uniform float r;
uniform sampler2D brush;


void main() {
    if (type == 0) { // circle
        vec2 d = vUv - mouse;
        if (d.x * d.x + d.y * d.y >= r * r) {
            discard;
        }

        gl_FragColor = vec4(0.0, 0.0, 0.0, 1.0);
    } else if (type == 1) { // square
        vec2 d = vUv - mouse;
        if (!(abs(d.x) <= r && abs(d.y) <= r)) {
            discard;
        }

        gl_FragColor = vec4(0.0, 0.0, 0.0, 1.0);
    } else if (type == 2) { // square 45
        vec2 d = vUv - mouse;
        if (abs(d.x) + abs(d.y) >= r) {
            discard;
        }

        gl_FragColor = vec4(0.0, 0.0, 0.0, 1.0);
    } else if (type == 3) { // air bursh
        vec2 d = vUv - mouse;
        float dist2 = d.x * d.x + d.y * d.y;
        if (dist2 >= r * r) {
            discard;
        }

        float falloff_exp = 1.0 / 4.0;
        float dist = pow(dist2, 0.5);
        float alpha = 1.0 - pow(dist / r, falloff_exp);
        gl_FragColor = vec4(0.0, 0.0, 0.0, alpha);
    } else if (type == 4) { // texture
        vec2 d = (vUv - mouse) / r;
        if (d.x * d.x + d.y * d.y >= 1.0) {
            discard;
        }

        vec4 brush_color = texture2D(brush, 0.5 * d + 0.5);
        gl_FragColor = brush_color;
    } else if (type == 5) { // affinity air bursh
        vec2 d = vUv - mouse;
        float dist2 = d.x * d.x + d.y * d.y;
        if (dist2 >= r * r) {
            discard;
        }

        float full_r = 1.0 / 3.0;
        float falloff_exp = 1.0 / 4.0;

        float dist = pow(dist2, 0.5);
        float dd = dist / r;
        float alpha = dd < full_r ? 1.0 : 1.0 - pow((dd - full_r) / (1.0 - full_r), falloff_exp);
        gl_FragColor = vec4(0.0, 0.0, 0.0, alpha);
    }
}