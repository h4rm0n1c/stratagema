use std::{fs, path::Path, collections::HashMap};
use std::io::{self};

#[derive(Debug)]
struct CommandData {
    key_sequence: String,
    cooldown: u64, // Cooldown in seconds
}

fn main() {
    // The file containing the list of commands in the format:
    // command_name,key_sequence,cooldown
    let commands_file = "commands.txt";
    let output_dir = Path::new("generated_commands");
  
    // Clean output dir if it does exist
    if output_dir.exists() {
      fs::remove_dir_all(output_dir).expect("Failed to clean output directory");
    }

    // Create the output directory if it doesn't exist
    if !output_dir.exists() {
        fs::create_dir_all(output_dir).expect("Failed to create output directory");
    }

    // Read the commands from the file
    let commands = match read_commands_from_file(commands_file) {
        Ok(commands) => commands,
        Err(e) => {
            eprintln!("Error reading commands from file: {}", e);
            return;
        }
    };

    // Loop through each command and generate a separate main.rs
    for (command, command_data) in commands.iter() {
        let project_name = format!("{}", command);
        let project_path = output_dir.join(&project_name);

        // Create the project directory for the command
        if !project_path.exists() {
            fs::create_dir_all(&project_path).expect("Failed to create project directory");
        }

        // Create a new Cargo.toml for each command
        let cargo_toml = format!(
            r#"
[package]
name = "{command_name}"
version = "0.1.5"
authors = ["Tanner <Tanner@NorthPeak.Software>", "h4rm0n1c <h4rm0n1c@gmail.com>"]
edition = "2018"

[dependencies]
enigo = "0.1.3"
rand = "0.8.5"

[build-dependencies]
winres = "0.1"
"#,
            command_name = project_name
        );
        let cargo_toml_path = project_path.join("Cargo.toml");
        fs::write(cargo_toml_path, cargo_toml).expect("Failed to write Cargo.toml");

        // Generate the main.rs for each command
let main_rs = format!(
    r#"
extern crate enigo;

use enigo::*;
use std::{{env}};
use std::thread::sleep;
use std::time::Duration;

fn main() {{
  let args: Vec<String> = env::args().collect(); // collect args from SD
    let key_sequence = "{}";  // Key sequence for the command
    let cooldown = {};  // Cooldown in seconds for the command
    let mut arrows:bool = false;
    let mut ctrl:bool = true;
    
    if args.iter().any(|arg| arg.to_lowercase() == "arrows".to_lowercase()) {{
        arrows = true; //checks to see if any arguments are "arrows" if so sets stratagem input as arrow keys
    }} else {{}}

    if args.iter().any(|arg| arg.to_lowercase() == "no_ctrl".to_lowercase()) {{
        ctrl = false; //checks to see if any arguments are "no_ctrl" if so no ctrl keypress will be sent
    }} else {{}}
    
    run_macro(key_sequence, cooldown,arrows,ctrl);
}}

fn run_macro(key_sequence: &str, cooldown: u64,arrows:bool,ctrl:bool) {{
    let mut enigo = Enigo::new();
    let cast_time: u64 = 500; // stratagem cast time in milliseconds, so far I've tested this in a handful of games and as of 30/05/2025 it works perfectly.
    let delay_length: u64 = cast_time / ((((key_sequence.len() as u64) + (ctrl as u64)) * 2) as u64);

    if ctrl == true {{
        enigo.key_down(Key::Control);
        sleep(Duration::from_millis(delay_length));
    }}

    for c in key_sequence.chars() {{
      let mut key = Key::Layout(c);
        if arrows == true {{
          key = parse_key(c);
        }}
        enigo.key_down(key);
        sleep(Duration::from_millis(delay_length));
        enigo.key_up(key);
        sleep(Duration::from_millis(delay_length));
    }}
    
    if ctrl == true {{
        sleep(Duration::from_millis(delay_length));
        enigo.key_up(Key::Control);
    }}

    println!("Cooldown for {} seconds...");
    sleep(Duration::from_secs(cooldown));
}}

fn parse_key(key: char) -> enigo::Key {{
    match key {{
        'w' => enigo::Key::UpArrow,
        's' => enigo::Key::DownArrow,
        'a' => enigo::Key::LeftArrow,
        'd' => enigo::Key::RightArrow,
        'c' => enigo::Key::Control,
        _ => enigo::Key::Layout(key),
    }}
}}
"#
    , command_data.key_sequence, command_data.cooldown, command_data.cooldown
);

        let main_rs_path = project_path.join("src").join("main.rs");
        fs::create_dir_all(main_rs_path.parent().unwrap())
            .expect("Failed to create 'src' directory");

        fs::write(main_rs_path, main_rs).expect("Failed to write main.rs");

        // Copy the icon file (assuming the icons are named after the commands)
        let icon_path = format!("icons/{}.ico", command);
        let icon_output_path = project_path.join("assets").join("icon.ico");
        let blank_icon = "icons/blank.ico";
        
        
        //let buildrs_path = project_path.join("build.rs");
        //fs::copy("buildscript.txt",buildrs_path).expect("Failed to copy buildscript.txt to build.rs");
        
        let build_rs = format!(
    r#"
fn main() {{
    // This assumes the icon file is in the "assets" directory and named icon.ico
    let icon_path = "assets/icon.ico";  // Change to match the path where your icon is stored

    let mut res = winres::WindowsResource::new();
    res.set_icon(icon_path);
    res.compile().expect("Failed to compile resources");
}}
"#
);

let build_rs_path = project_path.join("build.rs");
fs::write(build_rs_path, build_rs).expect("Failed to write build.rs");

fs::copy("build_projects.bat",output_dir.join("build_projects.bat")).unwrap();

        if Path::new(&icon_path).exists() {
            fs::create_dir_all(icon_output_path.parent().unwrap()).expect("Failed to create icon directory");
            fs::copy(icon_path, icon_output_path).expect("Failed to copy icon file");
            
        } else {
         if Path::new(&blank_icon).exists() {
            fs::create_dir_all(icon_output_path.parent().unwrap()).expect("Failed to create icon directory");
            fs::copy(blank_icon, icon_output_path).expect("Failed to copy default blank icon file");
            } else {}
        }
    }

    println!("Generated project files for all commands!");
}

// Read the commands from a file, expecting lines in the format:
// command_name,key_sequence,cooldown
fn read_commands_from_file(file_path: &str) -> io::Result<HashMap<String, CommandData>> {
    let mut commands = HashMap::new();
    let content = fs::read_to_string(file_path)?;

    for line in content.lines() {
        let parts: Vec<&str> = line.split('|').collect();
        if parts.len() != 3 {
            eprintln!("Skipping invalid line: {}", line);
            continue;
        }

        let command_name = parts[0].to_string();
        let key_sequence = parts[1].to_string();
        let cooldown = parts[2].parse::<u64>().unwrap_or(0);

        commands.insert(command_name, CommandData {
            key_sequence,
            cooldown,
        });
    }

    Ok(commands)
}
