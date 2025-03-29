# [Stratagema](https://github.com/h4rm0n1c/stratagema)
## A Helldivers 2 Stratagem Macro Executable Builder, Primarily for Streamdeck
Based on [Work by TannerReynolds](https://github.com/TannerReynolds/Helldivers2-Macro-Engine/)
[Icons from nvigneux](https://github.com/nvigneux/Helldivers-2-Stratagems-icons-svg/)

Stratagema is a program that creates a series of rust projects that each compile into a stratagem executable, one per stratagem.
Why? Because the AdvancedLauncher Streamdeck Plugin has some advanced features that can be used to give:
1. A Cooldown indicator for each stratagem button (a green light that goes away when the stratagem is available again)
2. Automatic stratagem icon assignment for each stratagem button, high res icons, all current stratagems included.
3. The ability to use the new longpress feature to cancel the cooldown timer by terminating the stratagem executable.
4. Can be updated/rebuilt by anybody who has stratagema.exe and the supplied dependency files in this repository.

On execution a stratagem executable will: 
1. Hold the control key
2. Type Stratagem using WASD by default, or arrow keys if you supply the command line arg "arrows"
3. Release the control key
4. Wait for the Stratagem's cooldown time (this lets AdvancedLauncher display a green light while the stratagem is on cooldown)
5. Terminate itself

(stratagem cooldown time is set to the minimum cooldown in seconds based on full superdestroyer upgrades, these can be changed in "commands.txt" and then new macros can be built with those new cooldown times)

Why one executable per stratagem instead of TannerReynold's macro engine's all-in-one exe?
Doing so enables the above features through the Advanced Launcher Streamdeck plugin.

## Building, summarised
1. Download this repo. 
2. Download and Install ImageMagick
3. Run "cargo build --release" in the downloaded repo directory.
4. target/release will be created and will contain stratagema.exe and all required files to continue.
5. Assuming all needed files are in place and imagemagick is installed... 
6. Go to "Icons" folder in target/release and run "converticons.bat" in there.
7. Run stratagema.exe in target/release, it generates projects in the generated_commands folder that will be created if not present, and copies one ico file to each project folder within, it also copies "build_projects.bat" to generated_commands.
8. Go to generated_commands folder and run "build_projects.bat" in there, it will traverse the folders for you and build each project.
9. Find your compiled stratagem macro executables in the target/release directory of each stratagem project folder, which are in "generated_commands"
10. Move the compiled stratagem macro exectuables, to a single folder, I use "C:\stratagema\"
11. Admire your pretty stratagem macro executables and their amazing icons thanks to nvigenux.

## Here's the cool bit, you can "update" this.
When new stratagems come out, commands.txt can be updated to include them, alongside an identically named 256x256 PNG being placed in the icons directory, once that is done, running stratagema.exe will refresh the generated_commands folder to include these new stratagem projects, you can then pick up from step 6 above to build those fresh stratagems.

## commands.txt format
format is straightforward, one stratagem per line, example first line:
```
machine_gun|saswd|410
```
```
stratagem name, I suggest no spaces or other special characters
pipe character
stratagem code in wasd (to use arrows, do not change here, use 'arrows' in the program Arguments)
pipe character
cooldown time in seconds, rounded to the nearest whole second
```

## TL;DR, also known as: This Nerd Stuff is Booooring, Dude
You do not want or need to build anything, you're okay with possibly not having every single stratagem as of the current date.
1. Download "generated_commands.zip" from "Releases" to the right, and put the exe files in "C:\stratagema\"
2. Proceed to "AdvancedLauncher Modification" below, then to "Using In Streamdeck"
3. Have fun :D
These were built using the contents of this github repo, you don't get good grades if you don't show your work!
These MIGHT not be up to date when you read this, last build was 24/03/2025.

## FOR THOSE CONCERNED ABOUT SECURITY
IF you are in any way concerned about downloading 70+ executable files, I would reccomend that you
submit the link to generated_commands.zip in the releases section, to virustotal.com,
I have done so before every release myself all files have come back clean from every single vendor.

You are also free to download this repository, peruse the contents and rebuild everything from scratch.

## AdvancedLauncher Modification
This mod to AdvancedLauncher will allow you to type in the name of your stratagem exe files, very convenient.

1. Go to the Elgato Streamdeck store and find AdvancedLauncher by BarRaider, Install it.
2. Close the Elgato streamdeck software.

3. Go to Start, Run
4. Put in "%appdata%\elgato\StreamDeck\Plugins\com.barraider.advancedlauncher.sdPlugin\PropertyInspector"
5. Open Launcher.html in a Text Editor, preferably Notepad++ or Notepad
6. Go to line 20, it should look like this:
```
<input class="sdpi-item-value sdProperty sdFile" type="file" id="application" accept="*" oninput="setSettings()">
```
7. Replace it with the following:
```
<input class="sdpi-item-value sdProperty" id="application" accept="*" oninput="setSettings()">
```
8. Save the file.
9. Relaunch Elgato Streamdeck and you will now be able to type in the "Application" path box when you use AdvancedLauncher.

## Using in Streamdeck

1. Drag an AdvancedLauncher Widget to your current profile and then select it, go to the inspector down the bottom.
2. Click in the Application text box and type in the path to the stratagem macro you want. for example, "C:\stratagema\ems_mortar.exe"
3. Assuming the executables were compiled correctly and have their icons, the icon should change to the stratagem icon.
4. Tick "Run In Background", "Show Dot if process is Running", "Kill All Existing Instances" and "Limit Number of Instances Running"
5. Change "Long Press" to "Kill Existing Process", if you use a stratagem at the end of a round, long press will reset the button and kill the cooldown timer, convenient!
6. If you want to use arrows instead of WASD for stratagems, put "arrows" in the Arguments box.
7. If you did all that correctly, you should now have a big beautiful official looking stratagem button which will show a green light while the stratagem is on cooldown.
8. To add more stratagems, just copy your already configured advancedlauncher widget and then change the name of the executable in the Application box to whichever stratagem you want, I like to keep my stratagema folder up next to the Elgato app so I can refer to it.

# Ramblings

Developed with the assistance of ChatGPT o4, intermittently, from December 2024 to February 2025.

This is a great demo of how versatile rust has become under windows, however, I am not a native rust programmer.

## Why so many executables?
1. One per stratagem so the process can be tracked by advancedlauncher for cooldown timer purposes
2. Unix philosophy, do one thing, do it well, break things up into one tool per purpose.
3. Why bother with code, when a filesystem already provides the structure I need?
4. You have to admit that a rust program that makes rust projects that each compile into a unique parameterised windows executable complete with a full set of windows icons is pretty damned cool.

## Disclaimer
This is the only official source of this particular software.
Please do not accept alternative sources of this particular software, for your own safety.
Please link here rather than redistributing, as this will cut down on potential for abuse/malware.
Everything here is open and free to be inspected, the intention is that people can confirm what they are downloading is not malware.
Credit for any contributing code or IP has been given and linked to at the top of this file.
