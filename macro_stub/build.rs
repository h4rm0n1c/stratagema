#[cfg(target_os = "windows")]
fn main() {
    if !std::path::Path::new("assets/blank.ico").exists() {
        println!("cargo:warning=assets/blank.ico not found; skipping icon embedding");
        return;
    }

    let mut res = winres::WindowsResource::new();
    res.set_icon("assets/blank.ico");
    res.compile().expect("Failed to embed icon");
}

#[cfg(not(target_os = "windows"))]
fn main() {}
