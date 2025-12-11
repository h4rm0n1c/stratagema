use std::env;
use std::fs;
use std::path::Path;

// copy icons folder, buildscript.txt and the current list of stratagem commands to the target dir, ready for building the stratagem projects

fn main() {
    // Get the current target directory (debug or release)
    let target_dir = env::var("OUT_DIR").unwrap();
    
    // Define the source and destination paths
    let source_dir = Path::new("icons");
    let dest_dir = Path::new(&target_dir).parent().unwrap().join("..").join("..").join("icons");
    
    let target_path = Path::new(&target_dir).parent().unwrap().join("..").join("..");
    
    // Create the target directory if it doesn't exist
    if !dest_dir.exists() {
        fs::create_dir_all(&dest_dir).unwrap();
    }
    
    // Copy all the files from source to destination
    if source_dir.exists() && source_dir.is_dir() {
        for entry in fs::read_dir(source_dir).unwrap() {
            let entry = entry.unwrap();
            let src = entry.path();
            let dest = dest_dir.join(entry.file_name());
            if src.is_dir() {
                // If the entry is a directory, recursively copy its contents
                fs::create_dir_all(&dest).unwrap();
                copy_dir(&src, &dest);
            } else {
                // If it's a file, copy the file
                fs::copy(src, dest).unwrap();
            }
        }
    }
    
    fs::copy("build_projects.bat",target_path.join("build_projects.bat")).unwrap();
    fs::copy("commands.txt",target_path.join("commands.txt")).unwrap();
}

fn copy_dir(src: &Path, dest: &Path) {
    // Recursively copy a directory and its contents
    for entry in fs::read_dir(src).unwrap() {
        let entry = entry.unwrap();
        let src = entry.path();
        let dest = dest.join(entry.file_name());
        if src.is_dir() {
            fs::create_dir_all(&dest).unwrap();
            copy_dir(&src, &dest);
        } else {
            fs::copy(src, dest).unwrap();
        }
    }
}
