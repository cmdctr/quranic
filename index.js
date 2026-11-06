(function() {
    'use strict';

    // ============================================================
    // Font size preference (persisted in localStorage)
    // ============================================================
    const FONT_SCALES = [
        { label: 'صغير جداً', verse: '1.25rem', verseLine: '2.2rem', context: '1.05rem', contextLine: '1.9rem' },
        { label: 'صغير',      verse: '1.45rem', verseLine: '2.55rem', context: '1.2rem', contextLine: '2.15rem' },
        { label: 'وسط',       verse: '1.65rem', verseLine: '2.9rem', context: '1.35rem', contextLine: '2.4rem' },
        { label: 'كبير',      verse: '1.95rem', verseLine: '3.3rem', context: '1.55rem', contextLine: '2.75rem' },
        { label: 'كبير جداً', verse: '2.3rem',  verseLine: '3.8rem', context: '1.8rem', contextLine: '3.1rem' }
    ];
    const DEFAULT_FONT_SCALE_INDEX = 2;
    const FONT_STORAGE_KEY = 'quran-font-scale';

    function getSavedFontScaleIndex() {
        try {
            const saved = localStorage.getItem(FONT_STORAGE_KEY);
            if (saved !== null) {
                const idx = parseInt(saved, 10);
                if (!isNaN(idx) && idx >= 0 && idx < FONT_SCALES.length) return idx;
            }
        } catch (e) { /* ignore */ }
        return DEFAULT_FONT_SCALE_INDEX;
    }

    function applyFontScale(index, persist) {
        const clamped = Math.max(0, Math.min(FONT_SCALES.length - 1, index));
        const scale = FONT_SCALES[clamped];
        const root = document.documentElement;

        root.style.setProperty('--verse-font-size', scale.verse);
        root.style.setProperty('--verse-line-height', scale.verseLine);
        root.style.setProperty('--context-font-size', scale.context);
        root.style.setProperty('--context-line-height', scale.contextLine);

        if (persist) {
            try {
                localStorage.setItem(FONT_STORAGE_KEY, String(clamped));
            } catch (e) { /* ignore */ }
        }

        return clamped;
    }

    let currentFontScaleIndex = applyFontScale(getSavedFontScaleIndex(), false);

    // ============================================================
    // Surah names mapping
    // ============================================================
    const SURAH_NAMES = [
        'الفاتحة', 'البقرة', 'آل عمران', 'النساء', 'المائدة', 'الأنعام', 'الأعراف', 'الأنفال', 'التوبة', 'يونس',
        'هود', 'يوسف', 'الرعد', 'إبراهيم', 'الحجر', 'النحل', 'الإسراء', 'الكهف', 'مريم', 'طه',
        'الأنبياء', 'الحج', 'المؤمنون', 'النور', 'الفرقان', 'الشعراء', 'النمل', 'القصص', 'العنكبوت', 'الروم',
        'لقمان', 'السجدة', 'الأحزاب', 'سبأ', 'فاطر', 'يس', 'الصافات', 'ص', 'الزمر', 'غافر',
        'فصلت', 'الشورى', 'الزخرف', 'الدخان', 'الجاثية', 'الأحقاف', 'محمد', 'الفتح', 'الحجرات', 'ق',
        'الذاريات', 'الطور', 'النجم', 'القمر', 'الرحمن', 'الواقعة', 'الحديد', 'المجادلة', 'الحشر', 'الممتحنة',
        'الصف', 'الجمعة', 'المنافقون', 'التغابن', 'الطلاق', 'التحريم', 'الملك', 'القلم', 'الحاقة', 'المعارج',
        'نوح', 'الجن', 'المزمل', 'المدثر', 'القيامة', 'الإنسان', 'المرسلات', 'النبأ', 'النازعات', 'عبس',
        'التكوير', 'الانفطار', 'المطففين', 'الانشقاق', 'البروج', 'الطارق', 'الأعلى', 'الغاشية', 'الفجر', 'البلد',
        'الشمس', 'الليل', 'الضحى', 'الشرح', 'التين', 'العلق', 'القدر', 'البينة', 'الزلزلة', 'العاديات',
        'القارعة', 'التكاثر', 'العصر', 'الهمزة', 'الفيل', 'قريش', 'الماعون', 'الكوثر', 'الكافرون', 'النصر',
        'المسد', 'الإخلاص', 'الفلق', 'الناس'
    ];

    function getSurahName(num) {
        if (num >= 1 && num <= SURAH_NAMES.length) {
            return `${SURAH_NAMES[num - 1]}`;
        }
        return `${num}`;
    }

    // ============================================================
    // Surah name/number resolution (for the `:` scope syntax)
    // ============================================================
    function resolveSurahNumber(raw) {
        if (!raw) return null;

        let s = raw.trim();
        if (!s) return null;

        s = s.replace(/^(سورة|س)\s*/u, '').trim();
        if (!s) return null;

        const arabicDigitMap = {
            '٠': '0', '١': '1', '٢': '2', '٣': '3', '٤': '4',
            '٥': '5', '٦': '6', '٧': '7', '٨': '8', '٩': '9'
        };
        const normalizedDigits = s.replace(/[٠-٩]/g, d => arabicDigitMap[d] || d);

        if (/^\d+$/.test(normalizedDigits)) {
            const n = parseInt(normalizedDigits, 10);
            if (n >= 1 && n <= SURAH_NAMES.length) return n;
            return null;
        }

        const target = normalizeText(s);

        for (let i = 0; i < SURAH_NAMES.length; i++) {
            if (normalizeText(SURAH_NAMES[i]) === target) {
                return i + 1;
            }
        }

        for (let i = 0; i < SURAH_NAMES.length; i++) {
            if (normalizeText(SURAH_NAMES[i]).startsWith(target)) {
                return i + 1;
            }
        }

        return null;
    }

    // ============================================================
    // Parse the search box into
    //   { query, surahNumber, scopeToken, scopeSpec, fontScale, fontToken }
    // ============================================================
    function parseSearchInput(raw) {
        let text = raw || '';

        let surahNumber = null;
        let scopeToken = null;
        let scopeSpec = null;
        let fontScale = null;
        let fontToken = null;

        let changed = true;
        while (changed) {
            changed = false;

            // Try font specifier:  +<1..5>  at the end
            const fontMatch = text.match(/\s*\+([1-5])(?:[\u0660-\u0669])?\s*$/u);
            if (fontMatch) {
                fontScale = parseInt(fontMatch[1], 10);
                fontToken = fontMatch[0].trim();
                text = text.slice(0, fontMatch.index).trimEnd();
                changed = true;
                continue;
            }

            // Try scope specifier:  :<surahNameOrNumber>  at the end
            const scopeMatch = text.match(/\s*:([^\s]+?)\s*$/u);
            if (scopeMatch) {
                const spec = scopeMatch[1].trim();
                const resolved = resolveSurahNumber(spec);
                if (resolved !== null) {
                    surahNumber = resolved;
                    scopeSpec = spec;
                    scopeToken = scopeMatch[0].trim();
                    text = text.slice(0, scopeMatch.index).trimEnd();
                    changed = true;
                    continue;
                }
            }
        }

        return {
            query: text.trim(),
            surahNumber,
            scopeToken,
            scopeSpec,
            fontScale,
            fontToken
        };
    }

    // ============================================================
    // Normalization
    // ============================================================
    function normalizeText(text) {
        return text
            .replace(/(\u064B[\u06E2\u06ED]?)([\u0627\u0649])/g, '\u064E$2$1')
            .replace(/[\u0627\u0648][\u06DF\u06E0]|[\u0640]/g, '')
            .replace(/\u06E8/g, '\u0646')
            .replace(/\u06E7/g, '\u064A')
            .replace(/[\u0623-\u0626\u0654]/g, '\u0621')
            .replace(/\u064E\u0649\u0670?(?=[^\u0650-\u0652])/g, '\u064E\u0627')
            .replace(/\u0649/g, '\u064A')
            .replace(/\u0648?\u0670|\u0671/g, '\u0627')
    }

    function stripDiacritics(str) {
        return str.replace(/[\u064B-\u0652\u0670\u06D6-\u06ED]/g, '');
    }

    function toArabicDigits(n) {
        return String(n).replace(/\d/g, d => '٠١٢٣٤٥٦٧٨٩'[d]);
    }

    // ============================================================
    // Highlight helper
    // ============================================================
    function highlightText(originalText, searchSkeleton, useSkeleton, normalizedSearch) {
        if (!originalText) return '';

        const skeletonToOrigIndex = [];
        let skeleton = '';

        for (let i = 0; i < originalText.length; i++) {
            const ch = originalText[i];
            const stripped = stripDiacritics(ch);
            if (stripped.length > 0) {
                skeleton += stripped;
                for (let k = 0; k < stripped.length; k++) {
                    skeletonToOrigIndex.push(i);
                }
            }
        }

        if (skeleton.length === 0) return escapeHtml(originalText);

        let querySkeleton;
        if (useSkeleton) {
            querySkeleton = searchSkeleton;
        } else {
            querySkeleton = stripDiacritics(normalizedSearch);
        }

        if (!querySkeleton || querySkeleton.length === 0) {
            return escapeHtml(originalText);
        }

        const matches = [];
        let pos = skeleton.indexOf(querySkeleton);
        while (pos !== -1) {
            matches.push({ start: pos, end: pos + querySkeleton.length });
            pos = skeleton.indexOf(querySkeleton, pos + 1);
        }

        if (matches.length === 0) {
            return escapeHtml(originalText);
        }

        const origRanges = matches.map(m => {
            const origStart = skeletonToOrigIndex[m.start];
            const lastSkelIdx = m.end - 1;
            const origEnd = skeletonToOrigIndex[lastSkelIdx];
            return { start: origStart, end: origEnd };
        });

        origRanges.sort((a, b) => a.start - b.start);
        const merged = [];
        for (const r of origRanges) {
            if (merged.length === 0) {
                merged.push({ ...r });
            } else {
                const last = merged[merged.length - 1];
                if (r.start <= last.end + 1) {
                    last.end = Math.max(last.end, r.end);
                } else {
                    merged.push({ ...r });
                }
            }
        }

        let html = '';
        let cursor = 0;
        for (const r of merged) {
            if (r.start > cursor) {
                html += escapeHtml(originalText.slice(cursor, r.start));
            }
            const matched = originalText.slice(r.start, r.end + 1);
            html += '<mark>' + escapeHtml(matched) + '</mark>';
            cursor = r.end + 1;
        }
        if (cursor < originalText.length) {
            html += escapeHtml(originalText.slice(cursor));
        }

        return html;
    }

    // ============================================================
    // Word extraction from a point (mouse event)
    // ============================================================
    function getWordAtPoint(event) {
        let range = null;
        let node = null;
        let offset = 0;

        if (document.caretPositionFromPoint) {
            const pos = document.caretPositionFromPoint(event.clientX, event.clientY);
            if (!pos) return null;
            node = pos.offsetNode;
            offset = pos.offset;
        } else if (document.caretRangeFromPoint) {
            range = document.caretRangeFromPoint(event.clientX, event.clientY);
            if (!range) return null;
            node = range.startContainer;
            offset = range.startOffset;
        } else {
            return null;
        }

        if (!node || node.nodeType !== Node.TEXT_NODE) return null;

        const text = node.textContent;
        if (!text) return null;

        let start = offset;
        while (start > 0 && !/\s/.test(text[start - 1])) {
            start--;
        }

        let end = offset;
        while (end < text.length && !/\s/.test(text[end])) {
            end++;
        }

        let word = text.slice(start, end);

        word = word.replace(/^[^\u0621-\u064A\u0670-\u06ED\u06D6-\u06ED]+/, '');
        word = word.replace(/[^\u0621-\u064A\u0670-\u06ED\u06D6-\u06ED]+$/, '');

        return word.trim() || null;
    }

    function handleVerseDblClick(event) {
        const word = getWordAtPoint(event);
        if (!word) return;

        event.preventDefault();

        const current = searchInput.value;
        const parsed = parseSearchInput(current);
        const parts = [word];
        if (parsed.scopeToken) parts.push(parsed.scopeToken);
        if (parsed.fontToken) parts.push(parsed.fontToken);

        searchInput.value = parts.join(' ');
        updateClearButton();
        performSearch(searchInput.value);
        searchInput.focus();
    }

    // ============================================================
    // State
    // ============================================================
    const state = {
        searchTerm: '',
        searchSkeleton: '',
        normalizedSearch: '',
        useSkeleton: false,
        surahFilter: null,
        scopeToken: null,
        results: [],
        currentPage: 1,
        perPage: 50,
        totalOccurrences: 0,
        totalVerses: 0,
        totalSurahs: 0,
        originalData: null,
        normalizedData: null,
        isContextView: false,
        // The last query string that produced the currently displayed results.
        // Used to detect when the user is mid-token (e.g. ":" typed) so we can
        // keep the previous results on screen instead of wiping them out.
        lastAppliedQuery: null,
    };

    // ============================================================
    // DOM
    // ============================================================
    const searchInput = document.getElementById('searchInput');
    const clearBtn = document.getElementById('clearBtn');
    const resultsList = document.getElementById('resultsList');
    const paginationDiv = document.getElementById('pagination');
    const paginationWrapper = document.getElementById('paginationWrapper');
    const statsEl = document.getElementById('stats');
    const totalOccurrencesEl = document.getElementById('totalOccurrences');
    const totalVersesEl = document.getElementById('totalVerses');
    const totalSurahsEl = document.getElementById('totalSurahs');
    const scopeBadgeEl = document.getElementById('scopeBadge');
    const resultsView = document.getElementById('resultsView');
    const contextView = document.getElementById('contextView');
    const toastEl = document.getElementById('toast');
    const scrollBtn = document.getElementById('scrollBtn');

    function updateStatsVisibility() {
        if (state.totalVerses > 0) {
            statsEl.classList.remove('hidden');
        } else {
            statsEl.classList.add('hidden');
        }
    }

    function updateScopeBadge() {
        if (state.surahFilter !== null) {
            scopeBadgeEl.textContent = `نطاق: ${getSurahName(state.surahFilter)}`;
            scopeBadgeEl.classList.remove('hidden');
        } else {
            scopeBadgeEl.classList.add('hidden');
        }
    }

    // ============================================================
    // Load data
    // ============================================================
    async function loadData() {
        try {
            const [origRes, normRes] = await Promise.all([
                fetch('corpus/quran-original.txt'),
                fetch('corpus/quran-normalized.txt')
            ]);

            if (!origRes.ok || !normRes.ok) throw new Error('fetch failed');

            const origText = await origRes.text();
            const normText = await normRes.text();

            const parseLines = (txt) => txt.trim().split('\n')
                .filter(l => l.trim())
                .map(line => {
                    const parts = line.split('|');
                    if (parts.length < 3) return null;
                    return {
                        surah: parseInt(parts[0], 10),
                        verse: parseInt(parts[1], 10),
                        text: parts.slice(2).join('|')
                    };
                })
                .filter(Boolean);

            state.originalData = parseLines(origText);
            state.normalizedData = parseLines(normText);

            showEmpty('اكتب كلمة للبحث في القرآن');
        } catch (err) {
            console.error(err);
            showEmpty('⚠️ تعذّر تحميل ملفات النص');
        }
    }

    // ============================================================
    // Search
    // ============================================================
    function scan(text, keyword) {
        if (!text || !keyword) return [];

        const isDiacritic = (code) => (
            (code >= 0x064B && code <= 0x0652) ||
            code === 0x0654
        );

        const matches = [];
        const textLength = text.length;
        const wordLength = keyword.length;
        const wordFirstChar = keyword[0];

        let textIndex = text.indexOf(wordFirstChar);
        while (textIndex !== -1) {
            let textCursor = textIndex;
            let wordCursor = 0;

            while (textCursor < textLength && wordCursor < wordLength) {
                const textChar = text.charCodeAt(textCursor);
                const wordChar = keyword.charCodeAt(wordCursor);

                if (textChar === wordChar) { textCursor++; wordCursor++; }
                else if (isDiacritic(textChar) && !isDiacritic(wordChar)) { textCursor++; }
                else break;
            }

            if (wordCursor === wordLength) {
                matches.push({ start: textIndex, end: textCursor });
            }

            textIndex = text.indexOf(wordFirstChar, textIndex + 1);
        }

        return matches;
    }

    // ------------------------------------------------------------
    // Determine whether the given raw input string is a "token in
    // progress" — i.e. the user is currently typing a `+N` or `:`
    // specifier that has not yet been completed. In that case we
    // keep the previous results on screen.
    //
    // Examples treated as "in progress":
    //   "التوبة :"       (colon typed, no surah spec yet)
    //   "التوبة :الت"    (typing a surah name)
    //   "التوبة :٣"      (typing a surah number)
    //   "التوبة +"       (plus typed, no digit yet)
    //   "التوبة +3"      (valid → NOT in progress, apply immediately)
    //   "التوبة :التوبة +" (font in progress, scope completed)
    // ------------------------------------------------------------
    function isTokenInProgress(rawTerm) {
        const text = (rawTerm || '').trimEnd();
        if (!text) return false;

        // Look at the last whitespace-delimited chunk of the input.
        // If it starts with ':' or '+', it is a specifier token.
        const lastSpace = Math.max(
            text.lastIndexOf(' '),
            text.lastIndexOf('\t'),
            text.lastIndexOf('\n')
        );
        const lastChunk = text.slice(lastSpace + 1);

        if (!lastChunk) return false;

        // Token in progress: begins with ':' or '+' but is not yet a
        // complete/valid specifier.
        if (lastChunk.startsWith(':')) {
            const spec = lastChunk.slice(1).trim();
            // ":": no spec yet → in progress
            if (spec === '') return true;
            // ":foo": if resolvable, it's complete → not in progress
            if (resolveSurahNumber(spec) !== null) return false;
            // Otherwise still typing a surah name/number → in progress
            return true;
        }

        if (lastChunk.startsWith('+')) {
            const digits = lastChunk.slice(1).trim();
            // "+": no digit yet → in progress
            if (digits === '') return true;
            // "+3": valid font scale → complete, not in progress
            if (/^[1-5]$/.test(digits)) return false;
            // "+7", "+33", "+x": invalid → in progress (don't apply)
            return true;
        }

        return false;
    }

    function performSearch(rawTerm) {
        if (!state.normalizedData || !state.originalData) return;

        const parsed = parseSearchInput(rawTerm);
        const trimmed = parsed.query;
        const resolvedSurah = parsed.surahNumber;

        // If the user is mid-token (just typed ":" or "+" etc.), keep
        // whatever results are currently displayed. Only update the
        // font size / scope badge when the token is complete.
        const tokenInProgress = isTokenInProgress(rawTerm);

        if (tokenInProgress) {
            // Apply a completed font token if the parser found one
            // (e.g. "+3" inside the string, but a trailing ":" is in progress).
            if (parsed.fontScale !== null) {
                const newIndex = parsed.fontScale - 1;
                if (newIndex !== currentFontScaleIndex) {
                    currentFontScaleIndex = applyFontScale(newIndex, true);
                    showToast(`حجم الخط: ${FONT_SCALES[currentFontScaleIndex].label}`);
                }
            }
            updateClearButton();
            // Leave the displayed results, stats, pagination, and scope badge untouched.
            return;
        }

        // Token complete (or no token at all): apply normally.

        state.searchTerm = rawTerm;
        state.surahFilter = resolvedSurah;
        state.scopeToken = parsed.scopeToken;

        if (parsed.fontScale !== null) {
            const newIndex = parsed.fontScale - 1;
            if (newIndex !== currentFontScaleIndex) {
                currentFontScaleIndex = applyFontScale(newIndex, true);
                showToast(`حجم الخط: ${FONT_SCALES[currentFontScaleIndex].label}`);
            } else {
                applyFontScale(newIndex, true);
            }
        }

        updateClearButton();
        updateScopeBadge();

        if (trimmed === '') {
            state.results = [];
            state.totalOccurrences = 0;
            state.totalVerses = 0;
            state.totalSurahs = 0;
            state.currentPage = 1;
            state.searchSkeleton = '';
            state.normalizedSearch = '';
            state.useSkeleton = false;
            state.lastAppliedQuery = rawTerm;
            renderStats();
            renderResults();
            showEmpty('اكتب كلمة للبحث في القرآن');
            updateScrollButton();
            return;
        }

        const normalizedSearch = normalizeText(trimmed);
        const searchSkeleton = normalizedSearch;
        const useSkeleton = searchSkeleton.length > 0;

        state.normalizedSearch = normalizedSearch;
        state.searchSkeleton = searchSkeleton;
        state.useSkeleton = useSkeleton;

        const results = [];
        let totalOccurrences = 0;
        const surahSet = new Set();

        const len = state.normalizedData.length;
        const filter = resolvedSurah;

        for (let i = 0; i < len; i++) {
            const normItem = state.normalizedData[i];
            const origItem = state.originalData[i];

            if (filter !== null && origItem.surah !== filter) continue;

            const verseNorm = normItem.text;

            let matchCount = 0;

            if (useSkeleton) {
                const positions = scan(verseNorm, searchSkeleton);
                matchCount = positions.length;
            }

            if (matchCount > 0) {
                totalOccurrences += matchCount;
                surahSet.add(origItem.surah);
                results.push({
                    surah: origItem.surah,
                    verse: origItem.verse,
                    textOriginal: origItem.text,
                    matchCount
                });
            }
        }

        state.results = results;
        state.totalOccurrences = totalOccurrences;
        state.totalVerses = results.length;
        state.totalSurahs = surahSet.size;
        state.currentPage = 1;
        state.lastAppliedQuery = rawTerm;

        renderStats();
        renderResults();
        renderPagination();
        hideContext();
        updateScrollButton();
    }

    function updateClearButton() {
        if (searchInput.value.length > 0) {
            clearBtn.classList.add('visible');
        } else {
            clearBtn.classList.remove('visible');
        }
    }

    function clearSearch() {
        searchInput.value = '';
        updateClearButton();
        // Bypass the token-in-progress check by forcing an empty-query search.
        performSearch('');
        searchInput.focus();
    }

    // ============================================================
    // Rendering
    // ============================================================
    function renderStats() {
        totalOccurrencesEl.textContent = toArabicDigits(state.totalOccurrences);
        totalVersesEl.textContent = toArabicDigits(state.totalVerses);
        totalSurahsEl.textContent = toArabicDigits(state.totalSurahs);
        updateStatsVisibility();
    }

    function showEmpty(msg) {
        resultsList.innerHTML = `<li class="empty">${msg}</li>`;
        paginationDiv.innerHTML = '';
        paginationWrapper.classList.add('hidden');
        resultsView.classList.remove('hidden');
        contextView.classList.add('hidden');
        state.isContextView = false;
        updateStatsVisibility();
        updateScrollButton();
    }

    function renderResults() {
        if (state.results.length === 0) {
            if (state.searchTerm.trim() === '') {
                showEmpty('اكتب كلمة للبحث في القرآن');
            } else if (state.normalizedData) {
                showEmpty('لا توجد نتائج');
            } else {
                showEmpty('جارٍ التحميل...');
            }
            return;
        }

        resultsView.classList.remove('hidden');
        contextView.classList.add('hidden');
        state.isContextView = false;

        const start = (state.currentPage - 1) * state.perPage;
        const pageItems = state.results.slice(start, start + state.perPage);

        resultsList.innerHTML = pageItems.map(item => {
            const surahName = getSurahName(item.surah);
            const ref = `${surahName}:${toArabicDigits(item.verse)}`;
            const highlighted = highlightText(
                item.textOriginal,
                state.searchSkeleton,
                state.useSkeleton,
                state.normalizedSearch
            );
            return `
                <li class="verse" data-surah="${item.surah}" data-verse="${item.verse}">
                    <div class="verse-ref">${ref}</div>
                    <div class="verse-text">${highlighted}</div>
                    <div class="verse-actions">
                        <button class="action" data-action="context" data-surah="${item.surah}" data-verse="${item.verse}">السياق</button>
                        <button class="action" data-action="copy-text" data-surah="${item.surah}" data-verse="${item.verse}">النص</button>
                        <button class="action" data-action="copy-ref" data-surah="${item.surah}" data-verse="${item.verse}">المرجع</button>
                    </div>
                </li>
            `;
        }).join('');

        attachListeners();
        updateScrollButton();
    }

    function renderPagination() {
        const totalPages = Math.ceil(state.results.length / state.perPage);
        if (totalPages <= 1) {
            paginationDiv.innerHTML = '';
            paginationWrapper.classList.add('hidden');
            return;
        }

        paginationWrapper.classList.remove('hidden');

        const pages = [];
        const cur = state.currentPage;

        pages.push(1);
        for (let i = cur - 1; i <= cur + 1; i++) {
            if (i > 1 && i < totalPages) pages.push(i);
        }
        if (totalPages > 1) pages.push(totalPages);

        const unique = [...new Set(pages)].sort((a, b) => a - b);

        let html = `<button class="page-btn nav-btn" data-page="${cur - 1}" ${cur === 1 ? 'disabled' : ''}>‹</button>`;

        let prev = 0;
        unique.forEach(p => {
            if (prev && p - prev > 1) {
                html += `<span class="page-ellipsis">…</span>`;
            }
            html += `<button class="page-btn ${p === cur ? 'active' : ''}" data-page="${p}">${toArabicDigits(p)}</button>`;
            prev = p;
        });

        html += `<button class="page-btn nav-btn" data-page="${cur + 1}" ${cur === totalPages ? 'disabled' : ''}>›</button>`;

        paginationDiv.innerHTML = html;

        paginationDiv.querySelectorAll('.page-btn[data-page]').forEach(btn => {
            btn.addEventListener('click', () => {
                const page = parseInt(btn.dataset.page, 10);
                if (!isNaN(page) && page >= 1 && page <= totalPages && page !== cur) {
                    state.currentPage = page;
                    renderResults();
                    renderPagination();
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                }
            });
        });
    }

    function attachListeners() {
        document.querySelectorAll('.verse').forEach(card => {
            const surah = parseInt(card.dataset.surah, 10);
            const verse = parseInt(card.dataset.verse, 10);

            card.querySelector('[data-action="copy-text"]')?.addEventListener('click', () => {
                copyTextWithRef(surah, verse);
            });

            card.querySelector('[data-action="copy-ref"]')?.addEventListener('click', () => {
                copyRefOnly(surah, verse);
            });

            card.querySelector('[data-action="context"]')?.addEventListener('click', () => {
                showContext(surah, verse);
            });

            const verseTextEl = card.querySelector('.verse-text');
            if (verseTextEl) {
                verseTextEl.addEventListener('dblclick', handleVerseDblClick);
            }
        });
    }

    // ============================================================
    // Context view
    // ============================================================
    function showContext(surah, verse) {
        if (!state.originalData) return;

        const surahVerses = state.originalData.filter(v => v.surah === surah);
        if (surahVerses.length === 0) return;

        const surahName = getSurahName(surah);

        contextView.innerHTML = `
            <div class="context">
                <div class="context-header">
                    <h2>${surahName}</h2>
                    <button class="back" id="backBtn">← عودة</button>
                </div>
                <div class="context-verses">
                    ${surahVerses.map(v => {
                        const hl = v.verse === verse ? 'highlight' : '';
                        const highlighted = highlightText(
                            v.text,
                            state.searchSkeleton,
                            state.useSkeleton,
                            state.normalizedSearch
                        );
                        return `<div class="context-verse ${hl}">
                            <span class="num">${toArabicDigits(v.verse)}</span>
                            <span class="txt">${highlighted}</span>
                        </div>`;
                    }).join('')}
                </div>
            </div>
        `;

        resultsView.classList.add('hidden');
        contextView.classList.remove('hidden');
        state.isContextView = true;

        paginationWrapper.classList.add('hidden');
        scrollBtn.classList.remove('visible');
        updateStatsVisibility();

        document.getElementById('backBtn').addEventListener('click', hideContext);

        contextView.querySelectorAll('.context-verse .txt').forEach(el => {
            el.addEventListener('dblclick', handleVerseDblClick);
        });

        requestAnimationFrame(() => {
            const hl = contextView.querySelector('.highlight');
            if (hl) hl.scrollIntoView({ block: 'center', behavior: 'smooth' });
        });
    }

    function hideContext() {
        contextView.classList.add('hidden');
        contextView.innerHTML = '';
        resultsView.classList.remove('hidden');
        state.isContextView = false;
        renderPagination();
        updateStatsVisibility();
        updateScrollButton();
    }

    // ============================================================
    // Copy
    // ============================================================
    function showToast(msg) {
        toastEl.textContent = msg;
        toastEl.classList.add('show');
        setTimeout(() => toastEl.classList.remove('show'), 1600);
    }

    function copyTextWithRef(surah, verse) {
        const orig = state.originalData.find(v => v.surah === surah && v.verse === verse);
        if (!orig) return;
        const surahName = getSurahName(surah);
        const text = `${orig.text}\n\n— ${surahName}:${toArabicDigits(verse)}`;
        navigator.clipboard.writeText(text)
            .then(() => showToast('تم النسخ'))
            .catch(() => showToast('تعذّر النسخ'));
    }

    function copyRefOnly(surah, verse) {
        const surahName = getSurahName(surah);
        const ref = `${surahName}:${toArabicDigits(verse)}`;
        navigator.clipboard.writeText(ref)
            .then(() => showToast('تم النسخ'))
            .catch(() => showToast('تعذّر النسخ'));
    }

    // ============================================================
    // Utils
    // ============================================================
    function escapeHtml(text) {
        const d = document.createElement('div');
        d.textContent = text;
        return d.innerHTML;
    }

    // ============================================================
    // Floating scroll button
    // ============================================================
    const SCROLL_THRESHOLD = 300;
    const BOTTOM_THRESHOLD = 200;

    function isAtBottom() {
        return (window.innerHeight + window.scrollY) >= (document.documentElement.scrollHeight - BOTTOM_THRESHOLD);
    }

    function isAtTop() {
        return window.scrollY <= SCROLL_THRESHOLD;
    }

    function updateScrollButton() {
        if (state.isContextView) {
            scrollBtn.classList.remove('visible');
            return;
        }

        const scrollable = document.documentElement.scrollHeight > window.innerHeight + 200;
        if (!scrollable) {
            scrollBtn.classList.remove('visible');
            return;
        }

        scrollBtn.classList.add('visible');

        if (isAtBottom() && !isAtTop()) {
            scrollBtn.classList.add('at-bottom');
            scrollBtn.setAttribute('title', 'العودة إلى الأعلى');
        } else {
            scrollBtn.classList.remove('at-bottom');
            scrollBtn.setAttribute('title', 'التمرير إلى الأسفل');
        }
    }

    scrollBtn.addEventListener('click', () => {
        if (isAtBottom() && !isAtTop()) {
            window.scrollTo({ top: 0, behavior: 'smooth' });
        } else {
            window.scrollTo({
                top: document.documentElement.scrollHeight,
                behavior: 'smooth'
            });
        }
    });

    let scrollTicking = false;
    window.addEventListener('scroll', () => {
        if (!scrollTicking) {
            window.requestAnimationFrame(() => {
                updateScrollButton();
                scrollTicking = false;
            });
            scrollTicking = true;
        }
    }, { passive: true });

    window.addEventListener('resize', updateScrollButton);

    // ============================================================
    // Init
    // ============================================================
    let debounceTimer;
    searchInput.addEventListener('input', () => {
        clearTimeout(debounceTimer);
        updateClearButton();
        debounceTimer = setTimeout(() => performSearch(searchInput.value), 90);
    });

    clearBtn.addEventListener('click', clearSearch);

    searchInput.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            clearSearch();
        }
    });

    showEmpty('جارٍ التحميل...');
    loadData();

})();
