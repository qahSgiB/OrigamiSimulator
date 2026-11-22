attribute float instance_index;

uniform mat4 real_model_view;
uniform mat4 real_projection;

varying vec4 view_pos;
varying vec4 ndc_pos; // interolation doesn't matter since gl_Position.z is constant 0.5, by default perspective, linear would be better ?
varying float instance_index_v;


void main() {
    view_pos = real_model_view * vec4(position, 1.0);
    ndc_pos = real_projection * view_pos;

    instance_index_v = instance_index;

    gl_Position = vec4(uv * 2.0 - 1.0, 0.5, 1.0);
}