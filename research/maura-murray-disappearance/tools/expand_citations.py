#!/usr/bin/env python3
"""Expand citation placeholders into v3.7.3 three-layer markers.

Placeholders (written by the compiler in the draft template):
  {{Q:slug|verbatim quote}}   -> <!--ref:slug--><!--anchor:quote:<encoded>-->
  {{S:slug|Section name}}     -> <!--ref:slug--><!--anchor:section:<encoded>-->
  {{P:slug|page}}             -> <!--ref:slug--><!--anchor:page:<encoded>-->

Checks (fail-closed):
  * slug exists in corpus.yaml
  * a quote anchor's text is one of, or a substring of one of, the entry's recorded anchor_quotes
    (so every quotation in the report is a recorded snippet string)
  * a quote is <= 25 words by whitespace split
Encoding: percent-encode everything except unreserved characters, then
percent-encode every hyphen inside a run of two or more hyphens (%2D) so a
quote can never close the HTML comment early.
"""
import re, sys, yaml
from urllib.parse import quote as pct

def encode(value: str) -> str:
    enc = pct(value, safe="")
    return re.sub(r"-{2,}", lambda m: "%2D" * len(m.group(0)), enc)

def main(corpus_path, src, dst):
    corpus = yaml.safe_load(open(corpus_path))
    entries = {e["citation_key"]: e for e in corpus["entries"] if "citation_key" in e}
    text = open(src, encoding="utf-8").read()
    errors = []
    used = set()
    def repl(m):
        kind, slug, value = m.group(1), m.group(2), m.group(3).strip()
        if slug not in entries:
            errors.append(f"unknown slug: {slug}")
            return m.group(0)
        used.add(slug)
        if kind == "Q":
            recorded = entries[slug].get("anchor_quotes") or []
            if not any(value in r for r in recorded):
                errors.append(f"quote not recorded for {slug}: {value[:60]}")
            if len(value.split()) > 25:
                errors.append(f"quote over 25 words for {slug}: {value[:60]}")
            return f"<!--ref:{slug}--><!--anchor:quote:{encode(value)}-->"
        if kind == "S":
            return f"<!--ref:{slug}--><!--anchor:section:{encode(value)}-->"
        if kind == "P":
            return f"<!--ref:{slug}--><!--anchor:page:{encode(value)}-->"
        errors.append(f"bad kind {kind}")
        return m.group(0)
    out = re.sub(r"\{\{([QSP]):([A-Za-z0-9_]+)\|(.*?)\}\}", repl, text, flags=re.S)
    if errors:
        print("\n".join(errors)); sys.exit(1)
    open(dst, "w", encoding="utf-8").write(out)
    print(f"expanded {src} -> {dst}; {len(used)} distinct slugs cited")
    print("cited slugs:", " ".join(sorted(used)))

if __name__ == "__main__":
    main(*sys.argv[1:4])
