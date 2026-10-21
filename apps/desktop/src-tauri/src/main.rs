#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use std::{collections::{HashMap, HashSet}, fs, sync::Mutex, time::Duration};
use serde::{Deserialize, Serialize};
use tauri::Manager;
use tokio::sync::oneshot;

#[derive(Clone, Debug, Serialize, Deserialize, Default)]
#[serde(deny_unknown_fields)]
struct Settings { name: String, onboarded: bool, recent: Vec<String> }
#[derive(Clone, Debug, Serialize, Deserialize, Default)]
#[serde(deny_unknown_fields)]
struct PreviewState { settings: Settings, choices: HashMap<String, String> }
#[derive(Default)]
struct Requests { active: HashMap<String, oneshot::Sender<()>>, cancelled: HashSet<String> }
struct Native { http: reqwest::Client, requests: Mutex<Requests>, storage: Mutex<()> }
#[derive(Serialize)]
struct ApiResponse { status: u16, body: String, headers: HashMap<String, String> }

fn validate_state(state: &PreviewState) -> Result<(), String> {
    let name = regex::Regex::new(r"^[\p{L}\p{M}\p{N} .'’-]*$").unwrap();
    if state.settings.name.chars().count() > 20 || !name.is_match(&state.settings.name) { return Err("Invalid preview name".into()); }
    if state.settings.recent.len() > 5 || state.settings.recent.iter().any(|s| s.len() > 80 || s.chars().any(|c| c.is_control() || c == '<' || c == '>')) { return Err("Invalid recent classes".into()); }
    if state.choices.len() > 200 || state.choices.iter().any(|(key, value)| key.len() > 250 || !key.starts_with("bye-profile:v1:2649:") || value.is_empty() || value.len() > 20 || !value.bytes().all(|b| b.is_ascii_digit()) || value.starts_with('0')) { return Err("Invalid preview profile choices".into()); }
    Ok(())
}
fn allowed_api(path: &str) -> bool {
    if path.len() > 2048 || path.contains('#') || path.chars().any(char::is_control) { return false; }
    matches!(path.split('?').next().unwrap_or(""),
        "/api/v1/status" | "/api/v1/terms" | "/api/v1/courses" | "/api/v1/sections" | "/api/v1/candidates" | "/api/v1/profile" | "/api/v1/reviews" |
        "/api/reviews/resolve" | "/api/reviews/profile" | "/api/reviews/list")
}
fn allowed_link(value: &str) -> bool {
    let Ok(url) = reqwest::Url::parse(value) else { return false; };
    if url.scheme() != "https" || !url.username().is_empty() || url.password().is_some() || url.port().is_some() { return false; }
    match url.host_str().unwrap_or("") {
        "bye-before-you-enroll.pages.dev" => matches!(url.path(), "/" | "/reviews/"),
        "findclasses.pasadena.edu" => url.path() == "/",
        "www.ratemyprofessors.com" => url.path().strip_prefix("/professor/").is_some_and(|id| !id.is_empty() && !id.starts_with('0') && id.bytes().all(|b| b.is_ascii_digit())),
        _ => false,
    }
}
fn request_id(id: &str) -> bool { !id.is_empty() && id.len() <= 64 && id.bytes().all(|b| b.is_ascii_alphanumeric() || b == b'-') }
fn api_origin() -> Result<String, String> {
    let value = option_env!("BYE_PREVIEW_API_ORIGIN").unwrap_or("https://bye-before-you-enroll.pages.dev");
    let url = reqwest::Url::parse(value).map_err(|_| "Invalid preview API origin")?;
    let host = url.host_str().unwrap_or("");
    if url.scheme() != "https" || !url.username().is_empty() || url.password().is_some() || url.port().is_some() || url.path() != "/" || url.query().is_some() || url.fragment().is_some() || !(host == "bye-before-you-enroll.pages.dev" || host.ends_with(".bye-before-you-enroll.pages.dev")) { return Err("Invalid preview API origin".into()); }
    Ok(value.trim_end_matches('/').to_string())
}

#[tauri::command]
fn load_state(app: tauri::AppHandle, native: tauri::State<Native>) -> Result<PreviewState, String> {
    let _lock = native.storage.lock().map_err(|_| "Preview storage unavailable")?;
    let path = app.path().app_data_dir().map_err(|_| "Preview directory unavailable")?.join("preferences-v1.json");
    if !path.exists() { return Ok(PreviewState::default()); }
    if fs::metadata(&path).map_err(|_| "Preview preferences unavailable")?.len() > 65536 { return Err("Preview preferences too large".into()); }
    let value: PreviewState = serde_json::from_slice(&fs::read(path).map_err(|_| "Preview preferences unavailable")?).map_err(|_| "Preview preferences unreadable")?;
    validate_state(&value)?; Ok(value)
}
#[tauri::command]
fn save_state(app: tauri::AppHandle, native: tauri::State<Native>, state: PreviewState) -> Result<(), String> {
    validate_state(&state)?;
    let bytes = serde_json::to_vec(&state).map_err(|_| "Preview preferences invalid")?;
    if bytes.len() > 65536 { return Err("Preview preferences too large".into()); }
    let _lock = native.storage.lock().map_err(|_| "Preview storage unavailable")?;
    let dir = app.path().app_data_dir().map_err(|_| "Preview directory unavailable")?;
    fs::create_dir_all(&dir).map_err(|_| "Could not create preview directory")?;
    let tmp = dir.join("preferences-v1.tmp");
    fs::write(&tmp, bytes).map_err(|_| "Could not save preview preferences")?;
    #[cfg(unix)] { use std::os::unix::fs::PermissionsExt; fs::set_permissions(&tmp, fs::Permissions::from_mode(0o600)).map_err(|_| "Could not protect preview preferences")?; }
    fs::rename(tmp, dir.join("preferences-v1.json")).map_err(|_| "Could not finish saving preview preferences")?;
    Ok(())
}
#[tauri::command]
fn cancel_request(native: tauri::State<Native>, request_id: String) -> Result<(), String> {
    if !self::request_id(&request_id) { return Err("Invalid request identifier".into()); }
    let mut requests = native.requests.lock().map_err(|_| "Request state unavailable")?;
    if let Some(cancel) = requests.active.remove(&request_id) { let _ = cancel.send(()); }
    else { if requests.cancelled.len() >= 32 { if let Some(old) = requests.cancelled.iter().next().cloned() { requests.cancelled.remove(&old); } } requests.cancelled.insert(request_id); }
    Ok(())
}
#[tauri::command]
async fn api_get(native: tauri::State<'_, Native>, path: String, request_id: String) -> Result<ApiResponse, String> {
    if !allowed_api(&path) || !self::request_id(&request_id) { return Err("Unsupported API request".into()); }
    let (cancel, cancelled) = oneshot::channel();
    {
        let mut requests = native.requests.lock().map_err(|_| "Request state unavailable")?;
        if requests.cancelled.remove(&request_id) { return Err("Request cancelled".into()); }
        if requests.active.len() >= 8 || requests.active.contains_key(&request_id) { return Err("Too many active requests".into()); }
        requests.active.insert(request_id.clone(), cancel);
    }
    let task = async {
        let mut response = native.http.get(format!("{}{path}", api_origin()?)).header("Accept", "application/json").send().await.map_err(|_| "BYE API unavailable")?;
        let status = response.status().as_u16();
        let headers = ["content-type", "retry-after"].into_iter().filter_map(|name| response.headers().get(name).and_then(|v| v.to_str().ok()).map(|v| (name.to_string(), v.to_string()))).collect();
        let mut bytes = Vec::new();
        while let Some(chunk) = response.chunk().await.map_err(|_| "BYE response interrupted")? {
            if bytes.len() + chunk.len() > 4 * 1024 * 1024 { return Err("BYE response too large".to_string()); }
            bytes.extend_from_slice(&chunk);
        }
        let body = String::from_utf8(bytes).map_err(|_| "BYE response unreadable")?;
        Ok(ApiResponse { status, body, headers })
    };
    let result = tokio::select! { result = task => result, _ = cancelled => Err("Request cancelled".into()) };
    native.requests.lock().map_err(|_| "Request state unavailable")?.active.remove(&request_id);
    result
}
#[tauri::command]
fn open_source(url: String) -> Result<(), String> {
    if !allowed_link(&url) { return Err("Unsupported external link".into()); }
    open::that_detached(url).map_err(|_| "Could not open the browser".into())
}
fn main() {
    let http = reqwest::Client::builder().https_only(true).redirect(reqwest::redirect::Policy::none()).timeout(Duration::from_secs(65)).connect_timeout(Duration::from_secs(15)).pool_max_idle_per_host(2).build().expect("BYE HTTP client");
    tauri::Builder::default().manage(Native { http, requests: Mutex::new(Requests::default()), storage: Mutex::new(()) })
        .invoke_handler(tauri::generate_handler![load_state, save_state, api_get, cancel_request, open_source])
        .run(tauri::generate_context!()).expect("BYE Preview runtime");
}

#[cfg(test)]
mod tests {
    use super::*;
    #[test] fn native_requests_are_route_scoped() {
        assert!(allowed_api("/api/v1/sections?term=202670&query=MATH%20005A"));
        assert!(allowed_api("/api/reviews/list?professorId=fixture"));
        for value in ["https://evil.example/api/v1/status", "//evil.example/api/v1/status", "/api/v1/../submit", "/api/reviews/submit", "/api/v1/status#secret"] { assert!(!allowed_api(value)); }
    }
    #[test] fn links_cannot_escape_the_approved_hosts() {
        assert!(allowed_link("https://bye-before-you-enroll.pages.dev/reviews/"));
        assert!(allowed_link("https://www.ratemyprofessors.com/professor/123"));
        for value in ["javascript:alert(1)", "file:///C:/Windows", "https://evil.example", "https://bye-before-you-enroll.pages.dev.evil.example/", "https://name@bye-before-you-enroll.pages.dev/", "https://www.ratemyprofessors.com/professor/../admin"] { assert!(!allowed_link(value)); }
    }
    #[test] fn preview_storage_is_bounded_and_validated() {
        let mut state = PreviewState::default(); assert!(validate_state(&state).is_ok());
        state.settings.recent = vec!["MATH 005A".into(); 6]; assert!(validate_state(&state).is_err());
        state.settings.recent.clear(); state.choices.insert("../../legacy".into(), "123".into()); assert!(validate_state(&state).is_err());
    }
}
