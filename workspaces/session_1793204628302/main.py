#!/usr/bin/env python3
"""
Story Teller Bot - A simple interactive story generator.

This bot creates short, random stories based on user-selected themes or
completely random choices. It uses template-based generation with
placeholders filled from curated lists of characters, settings, and events.

Run the script and type commands like:
  - "tell me a story"  (random theme)
  - "tell me an adventure story"  (specific theme)
  - "help"  (show available commands)
  - "exit"  (quit the bot)
"""

import random
import sys
from typing import Dict, List, Optional


class StoryTellerBot:
    """A simple rule-based story generator."""

    def __init__(self) -> None:
        """Initialize story templates, characters, settings, and objects."""
        # Character archetypes
        self.characters = {
            "hero": ["a brave knight", "a clever detective", "a young wizard",
                     "a fearless explorer", "a kind-hearted thief"],
            "villain": ["a wicked sorcerer", "a cunning bandit", "a mad scientist",
                        "a jealous rival", "a shadowy figure"],
            "companion": ["a loyal dog", "a witty sidekick", "a mysterious stranger",
                          "a talking cat", "an old sage"]
        }

        # Settings for different themes
        self.settings = {
            "adventure": ["a dense jungle", "a forgotten temple", "a stormy sea",
                          "a vast desert", "a hidden mountain pass"],
            "mystery": ["a foggy London street", "an old mansion", "a quiet village",
                        "a dimly lit library", "a deserted train station"],
            "fantasy": ["an enchanted forest", "a floating castle", "a dragon's lair",
                        "a magical kingdom", "a mystical cave"],
            "sci-fi": ["a distant planet", "a space station", "a futuristic city",
                       "a time portal", "an alien spaceship"]
        }

        # Objects and items that can appear in stories
        self.objects = ["a golden key", "an ancient map", "a mysterious amulet",
                        "a glowing crystal", "a hidden diary", "a magical sword",
                        "a secret formula", "a lost treasure"]

        # Story templates for each theme
        self.templates = {
            "adventure": [
                "In {setting}, {hero} discovered {object}. With the help of {companion}, "
                "they set out to find the legendary treasure. But {villain} was also after it. "
                "After a thrilling chase, {hero} used {object} to outsmart {villain} and "
                "saved the day.",
                "{hero} woke up in {setting} with no memory of how they got there. "
                "They met {companion}, who told them about {object}. Together, they "
                "embarked on a dangerous journey to return {object} to its rightful place, "
                "all while being pursued by {villain}."
            ],
            "mystery": [
                "In {setting}, {hero} stumbled upon a strange clue: {object}. "
                "As they investigated, they realized {villain} was behind a series of "
                "mysterious events. With the help of {companion}, {hero} pieced together "
                "the evidence and exposed {villain} in a dramatic confrontation.",
                "A quiet evening in {setting} was shattered when {object} went missing. "
                "{hero} was called to solve the case. The only witness was {companion}, "
                "who seemed to know more than they let on. After a tense interrogation, "
                "{hero} discovered that {villain} had stolen {object} for a sinister purpose."
            ],
            "fantasy": [
                "In {setting}, {hero} found {object}, a relic of immense power. "
                "Guided by {companion}, they learned that {villain} sought to use it "
                "for evil. A epic battle ensued, and with the help of {object}, "
                "{hero} banished {villain} and restored peace to the realm.",
                "The kingdom was in peril. {hero} was chosen to retrieve {object} "
                "from {setting}. Along the way, they met {companion}, who joined the quest. "
                "But {villain} ambushed them, and only by combining their strengths "
                "did they overcome the darkness."
            ],
            "sci-fi": [
                "On {setting}, {hero} discovered {object}, a device of unknown origin. "
                "With {companion}, they tried to understand its purpose, but {villain} "
                "wanted it for themselves. A high-tech chase led to a showdown where "
                "{hero} used {object} to save the colony.",
                "In the year 3021, {hero} was a routine mission on {setting} when "
                "they encountered {object}. {companion} warned them about {villain}, "
                "who had been tracking the same object. The fate of the galaxy hung "
                "in the balance as {hero} made a choice that would change everything."
            ]
        }

        # Fallback templates for random theme
        self.random_templates = [
            "In {setting}, {hero} found {object}. With {companion}, they faced "
            "{villain} and emerged victorious.",
            "A tale of {hero} in {setting}, where {object} played a crucial role "
            "in defeating {villain}."
        ]

    def _fill_template(self, template: str, theme: str) -> str:
        """Replace placeholders in a template with random choices."""
        # Choose random values for each placeholder
        hero = random.choice(self.characters["hero"])
        villain = random.choice(self.characters["villain"])
        companion = random.choice(self.characters["companion"])
        setting = random.choice(self.settings[theme])
        obj = random.choice(self.objects)

        # Replace placeholders
        story = template.format(
            hero=hero,
            villain=villain,
            companion=companion,
            setting=setting,
            object=obj
        )
        return story

    def generate_story(self, theme: Optional[str] = None) -> str:
        """
        Generate a story based on the given theme.
        If theme is None, a random theme is chosen.
        """
        if theme is None:
            theme = random.choice(list(self.templates.keys()))
        elif theme not in self.templates:
            # If theme is invalid, fall back to random
            theme = random.choice(list(self.templates.keys()))

        # Choose a template from the theme
        template = random.choice(self.templates[theme])
        return self._fill_template(template, theme)

    def run(self) -> None:
        """Start the interactive command loop."""
        print("Welcome to the Story Teller Bot!")
        print("Type 'help' for commands, or 'exit' to quit.\n")

        while True:
            try:
                user_input = input("> ").strip().lower()
            except (EOFError, KeyboardInterrupt):
                print("\nGoodbye!")
                break

            if not user_input:
                continue

            if user_input in ("exit", "quit"):
                print("Goodbye!")
                break

            elif user_input in ("help", "?"):
                self._show_help()

            elif user_input.startswith("tell me"):
                # Parse theme from input if present
                theme = None
                for t in self.templates:
                    if t in user_input:
                        theme = t
                        break
                story = self.generate_story(theme)
                print("\n" + story + "\n")

            else:
                print("I didn't understand that. Type 'help' for commands.")

    def _show_help(self) -> None:
        """Display available commands."""
        print("\nCommands:")
        print("  tell me a story              - Generate a random story")
        print("  tell me an adventure story   - Adventure theme")
        print("  tell me a mystery story      - Mystery theme")
        print("  tell me a fantasy story      - Fantasy theme")
        print("  tell me a sci-fi story       - Sci-fi theme")
        print("  help                         - Show this help")
        print("  exit                         - Quit the bot\n")


def main() -> None:
    """Entry point for the script."""
    bot = StoryTellerBot()
    bot.run()


if __name__ == "__main__":
    main()