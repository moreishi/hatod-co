/**
 * endOfLine "auto" keeps `lint` green on Windows (CRLF) and Linux (LF):
 * each file keeps its own first-line ending. The repo norm stays LF via
 * .gitattributes (`* text=auto` normalizes to LF on commit) plus the
 * occasional `prettier --write` normalization commit.
 */
export default {
  endOfLine: "auto",
};
