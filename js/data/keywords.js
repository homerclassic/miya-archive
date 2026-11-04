/**
 * Stop words and the frequent-word index behind the "Quick search" feature (click a word to search it).
 */

import { state } from '../core/state.js';

const STOP_WORDS = new Set(`the and for that this with you your are was but not have has had its it's they them their from what when who how why can all out one get got just like about would there will been were than then into over very also more some any too our his her she him did does don't i'm that's you're dont cant im thats youre isnt wasnt its theyre ive let lets only even much make made want know see say said back going still really them these those which while where because could should being here now off own same such yet rt`.split(' '));

export const WORD_REGEX = /[\p{L}\p{N}_]+(?:['’][\p{L}\p{N}_]+)*/gu;

export function buildKeywordIndex() {
    const m = new Map();
    for (const t of state.tweets) {
        if (t.so && t.o)
            continue;
        const seen = new Set();
        for (const w of t.lc.replace(/https?:\/\/\S+/g, ' ').replace(/[@#]\w+/g, ' ').match(WORD_REGEX) || []) {
            if (w.length < 3 || STOP_WORDS.has(w) || /^\d+$/.test(w) || seen.has(w))
                continue;
            seen.add(w);
            m.set(w, (m.get(w) || 0) + 1);
        }
    }
    return m;
}
