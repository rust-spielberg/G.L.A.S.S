from setuptools import setup, find_packages

setup(
    name="file_organizer",
    version="0.1",
    packages=find_packages(),
    entry_points={
        "console_scripts": [
            "file_organizer=file_organizer:main",
        ],
    },
)