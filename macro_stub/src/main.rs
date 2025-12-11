use clap::Parser;
use enigo::{Enigo, Key, KeyboardControllable};
use serde::Serialize;
use std::cmp::max;
use std::thread::sleep;
use std::time::Duration;

/// Single executable helper for sending stratagem inputs.
#[derive(Parser, Debug)]
#[command(name = "stratagema-macro-stub")]
#[command(about = "Send a stratagem code with optional cooldown handling", long_about = None)]
struct Args {
    /// WASD stratagem code to play back (e.g., saswd)
    #[arg(long, short = 'c', value_name = "CODE")]
    code: String,

    /// Optional cooldown to wait after sending the inputs (in seconds)
    #[arg(long, value_name = "SECONDS")]
    cooldown: Option<u64>,

    /// Use arrow keys instead of WASD
    #[arg(long, default_value_t = false)]
    arrows: bool,

    /// Skip holding the control key
    #[arg(long = "no-ctrl", default_value_t = false)]
    no_ctrl: bool,

    /// Total casting time budget in milliseconds for dividing key presses
    #[arg(long, default_value_t = 500, value_name = "MILLISECONDS")]
    cast_time: u64,

    /// Emit a JSON log describing the invocation
    #[arg(long, default_value_t = false)]
    log_json: bool,
}

#[derive(Serialize)]
struct InvocationLog<'a> {
    code: &'a str,
    cooldown: Option<u64>,
    arrows: bool,
    ctrl: bool,
    cast_time_ms: u64,
}

fn main() {
    let args = Args::parse();
    let ctrl_enabled = !args.no_ctrl;

    if args.log_json {
        let payload = InvocationLog {
            code: &args.code,
            cooldown: args.cooldown,
            arrows: args.arrows,
            ctrl: ctrl_enabled,
            cast_time_ms: args.cast_time,
        };

        if let Ok(serialized) = serde_json::to_string(&payload) {
            println!("{}", serialized);
        }
    }

    if let Err(err) = run_macro(
        &args.code,
        args.cooldown,
        args.arrows,
        ctrl_enabled,
        args.cast_time,
    ) {
        eprintln!("{}", err);
        std::process::exit(1);
    }
}

fn run_macro(
    code: &str,
    cooldown: Option<u64>,
    arrows: bool,
    ctrl: bool,
    cast_time_ms: u64,
) -> Result<(), String> {
    if code.trim().is_empty() {
        return Err("The stratagem code cannot be empty.".to_string());
    }

    let mut enigo = Enigo::new();
    let key_count = code.chars().count() as u64;
    let ctrl_bonus = if ctrl { 1 } else { 0 };
    let divisor = max(1, (key_count + ctrl_bonus) * 2);
    let delay_length = max(1, cast_time_ms / divisor);

    if ctrl {
        enigo.key_down(Key::Control);
        sleep(Duration::from_millis(delay_length));
    }

    for c in code.chars() {
        let mut key = Key::Layout(c);
        if arrows {
            key = parse_key(c);
        }
        enigo.key_down(key);
        sleep(Duration::from_millis(delay_length));
        enigo.key_up(key);
        sleep(Duration::from_millis(delay_length));
    }

    if ctrl {
        sleep(Duration::from_millis(delay_length));
        enigo.key_up(Key::Control);
    }

    if let Some(seconds) = cooldown {
        println!("Cooldown for {} seconds...", seconds);
        sleep(Duration::from_secs(seconds));
    }

    Ok(())
}

fn parse_key(key: char) -> Key {
    match key {
        'w' | 'W' => Key::UpArrow,
        's' | 'S' => Key::DownArrow,
        'a' | 'A' => Key::LeftArrow,
        'd' | 'D' => Key::RightArrow,
        'c' | 'C' => Key::Control,
        other => Key::Layout(other),
    }
}
