use std::path::PathBuf;

fn get_settings_file_path() -> PathBuf {
    if let Ok(mut exe) = std::env::current_exe() {
        exe.pop();
        exe.push("settings.json");
        return exe;
    }
    PathBuf::from("settings.json")
}

#[tauri::command]
fn get_exe_dir() -> Result<String, String> {
    std::env::current_exe()
        .map_err(|e| e.to_string())
        .and_then(|path| {
            path.parent()
                .map(|p| p.to_string_lossy().into_owned())
                .ok_or_else(|| "Failed to get executable directory".to_string())
        })
}

#[tauri::command]
fn save_settings(settings: serde_json::Value) -> Result<serde_json::Value, String> {
    let path = get_settings_file_path();
    let content = serde_json::to_string_pretty(&settings).map_err(|e| e.to_string())?;
    
    if let Some(parent) = path.parent() {
        let _ = std::fs::create_dir_all(parent);
    }
    std::fs::write(&path, &content).map_err(|e| format!("Failed to write {}: {}", path.display(), e))?;
    
    if let Ok(mut cwd) = std::env::current_dir() {
        cwd.push("settings.json");
        if cwd != path {
            let _ = std::fs::write(&cwd, &content);
        }
    }
    
    Ok(settings)
}

#[tauri::command]
fn get_settings() -> Result<Option<serde_json::Value>, String> {
    let path = get_settings_file_path();
    if path.exists() {
        let content = std::fs::read_to_string(&path).map_err(|e| e.to_string())?;
        let parsed: serde_json::Value = serde_json::from_str(&content).map_err(|e| e.to_string())?;
        return Ok(Some(parsed));
    }
    
    if let Ok(mut cwd) = std::env::current_dir() {
        cwd.push("settings.json");
        if cwd.exists() {
            if let Ok(content) = std::fs::read_to_string(&cwd) {
                if let Ok(parsed) = serde_json::from_str::<serde_json::Value>(&content) {
                    return Ok(Some(parsed));
                }
            }
        }
    }
    
    Ok(None)
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
  tauri::Builder::default()
    .plugin(tauri_plugin_fs::init())
    .plugin(tauri_plugin_dialog::init())
    .plugin(tauri_plugin_shell::init())
    .setup(|app| {
      if cfg!(debug_assertions) {
        app.handle().plugin(
          tauri_plugin_log::Builder::default()
            .level(log::LevelFilter::Info)
            .build(),
        )?;
      }
      Ok(())
    })
    .invoke_handler(tauri::generate_handler![get_exe_dir, save_settings, get_settings])
    .run(tauri::generate_context!())
    .expect("error while running tauri application");
}

