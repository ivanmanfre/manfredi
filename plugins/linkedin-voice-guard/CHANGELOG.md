# Changelog: linkedin-voice-guard

## 0.1.1 (2026-10-04)
A long list of short fragments on one line is flagged once, across the whole list, instead of once per three.

## 0.1.0 (2026-10-04)
First release. Flags AI-sounding phrases and contrast lines ("X, not Y", "it's not X, it's Y") in each LinkedIn draft in a band above the prompt, highlighted in their line, with a count per draft. `r` asks Claude to rewrite only the flagged lines. Rules in an editable text file, plus /voice-guard-add and /voice-guard-remove. Needs Claude Code 2.1.287 or newer.
