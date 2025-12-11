#[cfg(target_os = "windows")]
fn main() {
    ensure_icon();

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

#[cfg(target_os = "windows")]
fn ensure_icon() {
    use std::io::Write;
    use std::path::Path;

    let target_path = Path::new("assets/blank.ico");
    if target_path.exists() {
        return;
    }

    let png_path = Path::new("..").join("icons").join("blank.png");

    let png = match std::fs::read(png_path) {
        Ok(bytes) => bytes,
        Err(err) => {
            println!("cargo:warning=unable to read icons/blank.png for icon generation: {err}");
            return;
        }
    };

    let image = match image::load_from_memory(&png) {
        Ok(img) => img.to_rgba8(),
        Err(err) => {
            println!("cargo:warning=failed to decode icons/blank.png: {err}");
            return;
        }
    };

    let (width, height) = image.dimensions();
    let icon = ico::IconImage::from_rgba_data(width, height, image.into_raw());

    let dir_entry = match ico::IconDirEntry::encode(&icon) {
        Ok(entry) => entry,
        Err(err) => {
            println!("cargo:warning=failed to encode icon: {err}");
            return;
        }
    };

    let mut icon_dir = ico::IconDir::new(ico::ResourceType::Icon);
    icon_dir.add_entry(dir_entry);

    let mut file = match std::fs::File::create(target_path) {
        Ok(file) => file,
        Err(err) => {
            println!("cargo:warning=failed to create assets/blank.ico: {err}");
            return;
        }
    };

    if let Err(err) = icon_dir.write(&mut file) {
        println!("cargo:warning=failed to write assets/blank.ico: {err}");
    } else if let Err(err) = file.flush() {
        println!("cargo:warning=failed to flush assets/blank.ico: {err}");
    }
}
