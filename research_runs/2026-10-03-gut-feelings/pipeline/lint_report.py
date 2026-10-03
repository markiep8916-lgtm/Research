#!/usr/bin/env python3
"""Standalone-mode citation gate for the compiled report: three-layer markers, corpus membership,
anchor fidelity (decoded anchor must equal the corpus quote, <=25 words), reference-list parity, AI disclosure."""
import re, sys, urllib.parse
draft = open(sys.argv[1], encoding="utf-8").read()
corpus = open("corpus_context.md", encoding="utf-8").read()
keys = {}
for blk in re.split(r"\n## ", corpus)[1:]:
    k = blk.split()[0]
    q = re.search(r'Quote anchor: [“"](.*?)[”"]\s*[—-]+\s*location', blk, re.S)
    keys[k] = re.sub(r"\s+", " ", q.group(1)).strip() if q else None
refs = re.findall(r"<!--ref:([^-]+?)-->", draft)
anchors = re.findall(r"<!--ref:([^-]+?)--><!--anchor:(\w+):([^>]*?)-->", draft)
bad_key = sorted({k for k in refs if k not in keys})
no_anchor = len(refs) - len(anchors)
none_anchor = [k for k, kind, v in anchors if kind == "none"]
def norm(s): return re.sub(r"[^a-z0-9 ]", "", re.sub(r"\s+", " ", s.lower())).strip()
mismatch = []; toolong = []
for k, kind, v in anchors:
    if kind != "quote": continue
    dec = urllib.parse.unquote(v)
    if len(dec.split()) > 25: toolong.append(k)
    if k in keys and keys[k] and norm(dec) != norm(keys[k]):
        # allow a substring of the corpus quote
        if norm(dec) not in norm(keys[k]): mismatch.append((k, dec[:60]))
# references section
refsec = draft.split("## References", 1)[1] if "## References" in draft else ""
refsec = re.split(r"\n## |\n# ", refsec, 1)[0]
cited = set(refs)
ref_dois = set(re.findall(r"10\.\d{4,9}/[^\s\)\]>]+", refsec))
ref_lines = [l for l in refsec.splitlines() if re.match(r"^\s*(\d+\.\s*)?[A-Z][^\n]*\(\d{4}", l)]
disc = draft.count("AI Disclosure: This report was produced with AI-assisted research tools.")
body = draft.split("## References",1)[0]
words = len(re.sub(r"<!--.*?-->", "", body).split())
print(f"visible citations (ref markers): {len(refs)}; with anchors: {len(anchors)}; missing anchor: {no_anchor}")
print(f"unique keys cited: {len(cited)} / corpus {len(keys)}; unknown keys: {bad_key}")
print(f"anchor kind none: {len(none_anchor)}; >25 words: {toolong}; anchor text != corpus quote: {len(mismatch)}")
for m in mismatch[:10]: print("   MISMATCH", m)
print(f"reference entries (heuristic): {len(ref_lines)}; cited keys: {len(cited)}")
print(f"AI disclosure occurrences: {disc}; body words (excl. references & markers): {words}")
print("em-dashes in body:", body.count("—"))
