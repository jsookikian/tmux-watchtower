use serde::{Deserialize, Serialize};
use std::path::PathBuf;
use std::process::Command;
use std::sync::Mutex;

static CACHED_TMUX_PATH: Mutex<Option<String>> = Mutex::new(None);

/// Set the cached tmux path from hook events
pub fn set_cached_tmux_path(path: &str) {
    if !path.is_empty() {
        if let Ok(mut cached) = CACHED_TMUX_PATH.lock() {
            *cached = Some(path.to_string());
            log::info!(target: "eocc.tmux", "Cached tmux path set to: {}", path);
        }
    }
}

fn get_tmux_path() -> Option<PathBuf> {
    if let Ok(cached) = CACHED_TMUX_PATH.lock() {
        if let Some(ref path_str) = *cached {
            let path = PathBuf::from(path_str);
            if path.exists() {
                return Some(path);
            }
        }
    }

    // Fall back to common installation paths
    let common_paths = [
        "/opt/homebrew/bin/tmux",
        "/usr/local/bin/tmux",
        "/usr/bin/tmux",
    ];
    for p in &common_paths {
        let path = PathBuf::from(p);
        if path.exists() {
            return Some(path);
        }
    }

    // Last resort: ask the shell
    if let Ok(output) = Command::new("which").arg("tmux").output() {
        if output.status.success() {
            let s = String::from_utf8_lossy(&output.stdout);
            let trimmed = s.trim();
            if !trimmed.is_empty() {
                let path = PathBuf::from(trimmed);
                if path.exists() {
                    return Some(path);
                }
            }
        }
    }

    None
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TmuxPane {
    pub session_name: String,
    pub window_index: u32,
    pub window_name: String,
    pub pane_index: u32,
    pub pane_id: String,
    pub pane_title: String,
    pub is_active: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TmuxPaneSize {
    pub width: u32,
    pub height: u32,
}

fn validate_pane_id(pane_id: &str) -> Result<(), String> {
    // tmux pane ID format: %[0-9]+
    if pane_id.starts_with('%')
        && !pane_id[1..].is_empty()
        && pane_id[1..].chars().all(|c| c.is_ascii_digit())
    {
        Ok(())
    } else {
        Err(format!("Invalid pane ID format: {}", pane_id))
    }
}

fn run_tmux_command(args: &[&str]) -> Result<String, String> {
    let tmux_path = get_tmux_path().ok_or_else(|| {
        "tmux path not available. Please start a Claude Code session first.".to_string()
    })?;

    let start = std::time::Instant::now();
    let output = Command::new(&tmux_path)
        .args(args)
        .output()
        .map_err(|e| format!("Failed to execute tmux: {}", e))?;

    let elapsed = start.elapsed();
    if elapsed > std::time::Duration::from_millis(200) {
        log::warn!(target: "eocc.perf", "tmux {:?}: {:?}", args, elapsed);
    }

    if output.status.success() {
        Ok(String::from_utf8_lossy(&output.stdout).to_string())
    } else {
        let stderr = String::from_utf8_lossy(&output.stderr);
        Err(format!("tmux command failed: {}", stderr.trim()))
    }
}

pub fn is_tmux_available() -> bool {
    get_tmux_path().is_some()
}

pub fn list_panes() -> Result<Vec<TmuxPane>, String> {
    let format =
        "#{session_name}|#{window_index}|#{window_name}|#{pane_index}|#{pane_id}|#{pane_title}|#{pane_active}";
    let output = run_tmux_command(&["list-panes", "-a", "-F", format])?;

    let panes: Vec<TmuxPane> = output
        .lines()
        .filter_map(|line| {
            let parts: Vec<&str> = line.split('|').collect();
            if parts.len() >= 7 {
                Some(TmuxPane {
                    session_name: parts[0].to_string(),
                    window_index: parts[1].parse().unwrap_or(0),
                    window_name: parts[2].to_string(),
                    pane_index: parts[3].parse().unwrap_or(0),
                    pane_id: parts[4].to_string(),
                    pane_title: parts[5].to_string(),
                    is_active: parts[6] == "1",
                })
            } else {
                None
            }
        })
        .collect();

    Ok(panes)
}

pub fn capture_pane(pane_id: &str) -> Result<String, String> {
    validate_pane_id(pane_id)?;
    // -p: output to stdout
    // -e: include escape sequences for colors
    // -S -: start from the beginning of history
    // -E -: end at the last line
    run_tmux_command(&[
        "capture-pane",
        "-p",
        "-e",
        "-S",
        "-",
        "-E",
        "-",
        "-t",
        pane_id,
    ])
}

pub fn send_keys(pane_id: &str, keys: &str) -> Result<(), String> {
    validate_pane_id(pane_id)?;
    log::info!(target: "eocc.tmux", "send_keys: pane_id={}, keys={}", pane_id, keys);
    let result = run_tmux_command(&["send-keys", "-t", pane_id, keys]);
    log::info!(target: "eocc.tmux", "send_keys result: {:?}", result);
    result?;
    Ok(())
}

pub fn get_pane_size(pane_id: &str) -> Result<TmuxPaneSize, String> {
    validate_pane_id(pane_id)?;
    let output = run_tmux_command(&[
        "display-message",
        "-p",
        "-t",
        pane_id,
        "#{pane_width}x#{pane_height}",
    ])?;
    let trimmed = output.trim();
    let parts: Vec<&str> = trimmed.split('x').collect();
    if parts.len() != 2 {
        return Err(format!("Invalid pane size format: {}", trimmed));
    }
    let width = parts[0]
        .parse()
        .map_err(|_| format!("Invalid width: {}", parts[0]))?;
    let height = parts[1]
        .parse()
        .map_err(|_| format!("Invalid height: {}", parts[1]))?;
    Ok(TmuxPaneSize { width, height })
}

/// Capture the last `lines` lines of a pane as plain text (no ANSI escapes).
/// Used for regex-based status detection in the watched-pane polling loop.
pub fn capture_pane_tail(pane_id: &str, lines: u32) -> Result<String, String> {
    validate_pane_id(pane_id)?;
    let start_arg = format!("-{}", lines);
    // -p: stdout, no -e: plain text so regex matching works correctly
    run_tmux_command(&["capture-pane", "-p", "-S", &start_arg, "-t", pane_id])
}
