#[cfg(target_os = "windows")]
fn main() {
    use std::path::Path;

    let icon_path = Path::new("assets/blank.ico");
    let resolved_path = if icon_path.exists() {
        icon_path.to_path_buf()
    } else if let Some(generated) = generate_icon_from_png() {
        generated
    } else {
        println!(
            "cargo:warning=assets/blank.ico not found and icons/blank.png missing; skipping icon embedding"
        );
        return;
    };

    let mut res = winres::WindowsResource::new();
    let icon_str = resolved_path
        .to_str()
        .expect("Icon path contained invalid UTF-8");
    res.set_icon(icon_str);
    res.compile().expect("Failed to embed icon");
}

#[cfg(target_os = "windows")]
fn generate_icon_from_png() -> Option<std::path::PathBuf> {
    use ico::{IconDir, IconDirEntry, IconImage, ResourceType};
    use image::io::Reader as ImageReader;
    use std::env;
    use std::fs::File;
    use std::path::PathBuf;

    let png_path = std::path::Path::new("icons/blank.png");
    if !png_path.exists() {
        return None;
    }

    let img = ImageReader::open(png_path).ok()?.decode().ok()?.to_rgba8();
    let (width, height) = img.dimensions();

    let mut dir = IconDir::new(ResourceType::Icon);
    let entry =
        IconDirEntry::encode(&IconImage::from_rgba_data(width, height, img.into_raw())).ok()?;
    dir.add_entry(entry);

    let out_path = PathBuf::from(env::var("OUT_DIR").ok()?).join("blank.ico");
    let file = File::create(&out_path).ok()?;
    dir.write(file).ok()?;

    Some(out_path)
}

#[cfg(not(target_os = "windows"))]
fn main() {}
