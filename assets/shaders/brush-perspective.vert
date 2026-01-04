uniform mat4 real_model_view;
uniform mat3 real_normal;
uniform mat4 real_projection;

varying vec4 ndc_pos; // (interolation doesn't matter since gl_Position.z is constant 0.0, by default perspective, linear would be better ?)
// varying vec3 ndc_normal;


void main() {
    ndc_pos = real_projection * real_model_view * vec4(position, 1.0);
    // ndc_normal = real_normal * normal;

    gl_Position = vec4(uv * 2.0 - 1.0, 0.5, 1.0);
}