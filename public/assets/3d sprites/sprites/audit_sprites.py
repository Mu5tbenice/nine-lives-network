import os
import sys

def run_audit():
    # 1. Identify where the script is currently located
    script_dir = os.path.dirname(os.path.abspath(__file__))
    os.chdir(script_dir)
    
    report_name = "sprite_audit_report.txt"
    target_folders = ["BASE", "HATSHEADWEAR", "OUTFITS", "WEAPONSHOLDING","FACIAL"]
    
    print(f"Checking directory: {script_dir}")
    
    try:
        with open(report_name, "w", encoding="utf-8") as f:
            f.write(f"SPRITE FOLDER AUDIT REPORT\n")
            f.write(f"Location: {script_dir}\n")
            f.write("="*40 + "\n\n")
            
            for folder in target_folders:
                folder_path = os.path.join(script_dir, folder)
                
                if os.path.exists(folder_path) and os.path.isdir(folder_path):
                    files = [file for file in os.listdir(folder_path) if not file.startswith('.')]
                    f.write(f"FOLDER: [{folder}]\n")
                    f.write(f"Status: Found\n")
                    f.write(f"File Count: {len(files)}\n")
                    f.write("-" * 20 + "\n")
                    
                    if len(files) > 0:
                        for file in sorted(files):
                            f.write(f"  - {file}\n")
                    else:
                        f.write("  (Empty Folder)\n")
                else:
                    f.write(f"FOLDER: [{folder}]\n")
                    f.write(f"Status: NOT FOUND (Check spelling/location)\n")
                
                f.write("\n" + "="*40 + "\n\n")
        
        print(f"Success! Report generated: {report_name}")
        # Automatically open the text file for the user
        os.startfile(report_name) 
        
    except Exception as e:
        print(f"An error occurred: {e}")
        input("Press Enter to close...")

if __name__ == "__main__":
    run_audit()