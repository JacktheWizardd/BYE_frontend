fn main() {
    tauri_build::try_build(tauri_build::Attributes::new().app_manifest(
        tauri_build::AppManifest::new().commands(&["load_state", "save_state", "api_get", "cancel_request", "open_source"]),
    )).expect("BYE Preview build configuration");
}
