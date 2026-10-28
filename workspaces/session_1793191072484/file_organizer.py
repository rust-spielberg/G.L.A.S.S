import os
import shutil
import sys
from pathlib import Path

def get_file_type(file_path):
    return file_path.suffix.lower()

def create_subfolder(base_path, folder_name):
    folder_path = base_path / folder_name
    if not folder_path.exists():
        folder_path.mkdir()
    return folder_path

def move_file(file_path, target_folder):
    target_path = target_folder / file_path.name
    if target_path.exists():
        target_path = target_path.with_name(f"{target_path.stem}_copy{target_path.suffix}")
    shutil.move(file_path, target_path)

def preview_move(file_path, target_folder):
    target_path = target_folder / file_path.name
    if target_path.exists():
        target_path = target_path.with_name(f"{target_path.stem}_copy{target_path.suffix}")
    print(f"Move: {file_path} -> {target_path}")

def main():
    if len(sys.argv) != 2:
        print("Usage: python file_organizer.py <folder_path>")
        sys.exit(1)

    folder_path = Path(sys.argv[1])
    if not folder_path.exists() or not folder_path.is_dir():
        print("Invalid folder path.")
        sys.exit(1)

    preview_mode = input("Preview mode (y/n): ").lower() == 'y'
    for file_path in folder_path.iterdir():
        if file_path.is_file():
            file_type = get_file_type(file_path)
            target_folder = create_subfolder(folder_path, file_type)
            if preview_mode:
                preview_move(file_path, target_folder)
            else:
                move_file(file_path, target_folder)

    print("Organizing complete.")

if __name__ == "__main__":
    main()