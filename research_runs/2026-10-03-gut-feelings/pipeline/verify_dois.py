#!/usr/bin/env python3
"""Deterministic citation-existence triangulation (Crossref + OpenAlex) over the Phase 2 bibliographies.
Parses '#### [citation_key]' blocks, extracts the DOI from the APA line, queries both indexes,
and reports title-match using difflib ratio against the APA title (text between year ')' and the first '.' after it)."""
import re, sys, json, time, difflib, urllib.request, urllib.parse, glob, os

SP = os.path.dirname(os.path.abspath(__file__))
files = sorted(glob.glob(os.path.join(SP, "phase2_sq*_bibliography.md")))

def get(url):
    req = urllib.request.Request(url, headers={"User-Agent": "ars-verify/1.0 (mailto:YOUR_EMAIL_FOR_CROSSREF_POLITE_POOL)"})
    for attempt in range(3):
        try:
            with urllib.request.urlopen(req, timeout=25) as r:
                return json.load(r)
        except urllib.error.HTTPError as e:
            if e.code == 404: return None
            if e.code == 429: time.sleep(2*(attempt+1)); continue
            return {"_err": e.code}
        except Exception as e:
            time.sleep(1)
    return {"_err": "timeout"}

def norm(s):
    s = re.sub(r"<[^>]+>", "", s or "")
    s = re.sub(r"[^a-z0-9 ]", " ", s.lower())
    return re.sub(r"\s+", " ", s).strip()

rows = []
for f in files:
    txt = open(f, encoding="utf-8").read()
    blocks = re.split(r"\n#### ", txt)[1:]
    for b in blocks:
        key = b.split("\n",1)[0].strip().strip("[]").strip()
        apa = re.search(r"APA 7\**:?\**\s*(.*)", b)
        apa = apa.group(1).strip() if apa else ""
        doi_m = re.search(r"10\.\d{4,9}/[^\s\)\]>]+", apa) or re.search(r"10\.\d{4,9}/[^\s\)\]>]+", b)
        doi = doi_m.group(0).rstrip(".,;") if doi_m else None
        # title heuristic: after "(YYYY)." up to next ". "
        tm = re.search(r"\(\d{4}[a-z]?\)\.\s*(.*?)(?:\.\s|\?\s|\*)", apa)
        title = tm.group(1) if tm else ""
        rec = {"file": os.path.basename(f), "key": key, "doi": doi, "apa_title": title}
        if not doi:
            rec["crossref"] = rec["openalex"] = "NO-DOI"
            rows.append(rec); continue
        cr = get("https://api.crossref.org/works/" + urllib.parse.quote(doi, safe=""))
        if cr and "message" in cr:
            t = (cr["message"].get("title") or [""])[0]
            rec["crossref"] = round(difflib.SequenceMatcher(None, norm(t), norm(title)).ratio(), 2)
            rec["crossref_title"] = t
        else:
            rec["crossref"] = "MISS" if cr is None else cr.get("_err")
        oa = get("https://api.openalex.org/works/doi:" + urllib.parse.quote(doi, safe=""))
        if oa and "title" in oa:
            rec["openalex"] = round(difflib.SequenceMatcher(None, norm(oa.get("title")), norm(title)).ratio(), 2)
            rec["openalex_year"] = oa.get("publication_year")
            rec["openalex_retracted"] = oa.get("is_retracted")
        else:
            rec["openalex"] = "MISS" if oa is None else oa.get("_err")
        rows.append(rec)
        time.sleep(0.3)

out = os.path.join(SP, "phase2_doi_verification.json")
json.dump(rows, open(out, "w"), indent=1)
print(f"{'file':28} {'key':34} {'CR':>5} {'OA':>5}  flag")
for r in rows:
    cr, oa = r["crossref"], r["openalex"]
    flag = ""
    if cr == "NO-DOI": flag = "no-doi (manual check)"
    elif isinstance(cr,(int,float)) and cr < 0.6: flag = "TITLE-MISMATCH? " + str(r.get("crossref_title"))[:60]
    elif cr in ("MISS",) and oa in ("MISS",): flag = "UNMATCHED-BOTH"
    elif cr == "MISS" or oa == "MISS": flag = "unmatched-one-index"
    if r.get("openalex_retracted"): flag += " RETRACTED"
    print(f"{r['file'][:28]:28} {r['key'][:34]:34} {str(cr):>5} {str(oa):>5}  {flag}")
print(f"\n{len(rows)} entries; written {out}")
