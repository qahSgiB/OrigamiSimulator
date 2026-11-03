#extension GL_OES_standard_derivatives : enable

// bursh
uniform vec2 brush_center;
uniform vec2 brush_radius;
uniform int brush_type;
uniform vec3 brush_color;
uniform sampler2D brush_texture;
uniform float brush_min_angle_cos;

// depth test
uniform sampler2D depth;
uniform float depth_epsilon;

// back side
uniform float flip_normal;

varying vec4 view_pos;
varying vec4 ndc_pos;


void main() {
    // constants
    float DEPTH_TEST_DISABLE = -69.0;

    vec3 screen_pos = ndc_pos.xyz / ndc_pos.w;
    vec2 brush_pos = (screen_pos.xy - brush_center) / brush_radius;

    if (abs(brush_pos.x) > 1.0 || abs(brush_pos.y) > 1.0) { // out of brush space
        discard;
    }

    // depth test
    if (depth_epsilon != DEPTH_TEST_DISABLE) {
        vec4 depth_at_screen = texture2D(depth, screen_pos.xy * 0.5 + 0.5);
        float depth = screen_pos.z * 0.5 + 0.5;
        if (depth > depth_at_screen.r + depth_epsilon) {
            discard;
        }
    }

    // compute normal based on derivatives
    vec3 dx = vec3(dFdx(view_pos.x), dFdx(view_pos.y), dFdx(view_pos.z));
    vec3 dy = vec3(dFdy(view_pos.x), dFdy(view_pos.y), dFdy(view_pos.z));
    vec3 normal = -normalize(cross(dx, dy)) * flip_normal;

    // orientation test
    vec3 to_eye = normalize(-view_pos.xyz);
    if (dot(normal, to_eye) < brush_min_angle_cos) {
        discard;
    }

    // brush
    vec4 color = vec4(0.4, 1.0, 0.8, 1.0);

    if (brush_type == 0) { // circle
        if (brush_pos.x * brush_pos.x + brush_pos.y * brush_pos.y >= 1.0) {
            discard;
        }

        color = vec4(brush_color, 1.0);
    } else if (brush_type == 1) { // square
        color = vec4(brush_color, 1.0);
    } else if (brush_type == 2) { // square 45
        if (abs(brush_pos.x) + abs(brush_pos.y) >= 1.0) {
            discard;
        }

        color = vec4(brush_color, 1.0);
    } else if (brush_type == 3) { // air bursh
        float dist2 = brush_pos.x * brush_pos.x + brush_pos.y * brush_pos.y;
        if (dist2 >= 1.0) {
            discard;
        }

        float falloff_exp = 1.0 / 6.0;

        float dist = pow(dist2, 0.5);
        float alpha = 1.0 - pow(dist, falloff_exp);
        color = vec4(brush_color, alpha);
    } else if (brush_type == 4) { // texture
        vec4 brush_color = texture2D(brush_texture, 0.5 * brush_pos + 0.5);
        color = brush_color;
    } else if (brush_type == 5) { // affinity air bursh
        float dist2 = brush_pos.x * brush_pos.x + brush_pos.y * brush_pos.y;
        if (dist2 >= 1.0) {
            discard;
        }

        float full_r = 1.0 / 6.0;
        float falloff_exp = 1.0 / 6.0;

        float dist = pow(dist2, 0.5);
        float dd = dist;
        float alpha = dd < full_r ? 1.0 : 1.0 - pow((dd - full_r) / (1.0 - full_r), falloff_exp);
        color = vec4(brush_color, alpha);
    }

    gl_FragColor = color;
}