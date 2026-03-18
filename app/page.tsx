"use client";

import { useState, useRef, useEffect, useMemo } from "react";

// ────────── 상수 ──────────
const PLACES = [
  { index: 0,  name: "일",   fullName: "일의 자리",   multiplier: 1n },
  { index: 1,  name: "십",   fullName: "십의 자리",   multiplier: 10n },
  { index: 2,  name: "백",   fullName: "백의 자리",   multiplier: 100n },
  { index: 3,  name: "천",   fullName: "천의 자리",   multiplier: 1_000n },
  { index: 4,  name: "만",   fullName: "만의 자리",   multiplier: 10_000n },
  { index: 5,  name: "십만", fullName: "십만의 자리", multiplier: 100_000n },
  { index: 6,  name: "백만", fullName: "백만의 자리", multiplier: 1_000_000n },
  { index: 7,  name: "천만", fullName: "천만의 자리", multiplier: 10_000_000n },
  { index: 8,  name: "억",   fullName: "억의 자리",   multiplier: 100_000_000n },
  { index: 9,  name: "십억", fullName: "십억의 자리", multiplier: 1_000_000_000n },
  { index: 10, name: "백억", fullName: "백억의 자리", multiplier: 10_000_000_000n },
  { index: 11, name: "천억", fullName: "천억의 자리", multiplier: 100_000_000_000n },
  { index: 12, name: "조",   fullName: "조의 자리",   multiplier: 1_000_000_000_000n },
  { index: 13, name: "십조", fullName: "십조의 자리", multiplier: 10_000_000_000_000n },
  { index: 14, name: "백조", fullName: "백조의 자리", multiplier: 100_000_000_000_000n },
  { index: 15, name: "천조", fullName: "천조의 자리", multiplier: 1_000_000_000_000_000n },
] as const;

const CARD_COLORS = [
  { bg: "bg-red-400",    hover: "hover:bg-red-500",    active: "bg-red-400" },
  { bg: "bg-orange-400", hover: "hover:bg-orange-500", active: "bg-orange-400" },
  { bg: "bg-amber-400",  hover: "hover:bg-amber-500",  active: "bg-amber-400" },
  { bg: "bg-lime-500",   hover: "hover:bg-lime-600",   active: "bg-lime-500" },
  { bg: "bg-green-500",  hover: "hover:bg-green-600",  active: "bg-green-500" },
  { bg: "bg-teal-500",   hover: "hover:bg-teal-600",   active: "bg-teal-500" },
  { bg: "bg-cyan-500",   hover: "hover:bg-cyan-600",   active: "bg-cyan-500" },
  { bg: "bg-blue-500",   hover: "hover:bg-blue-600",   active: "bg-blue-500" },
  { bg: "bg-indigo-500", hover: "hover:bg-indigo-600", active: "bg-indigo-500" },
  { bg: "bg-purple-500", hover: "hover:bg-purple-600", active: "bg-purple-500" },
];

const KOREAN_DIGITS = ["영", "일", "이", "삼", "사", "오", "육", "칠", "팔", "구"];

// ────────── 유틸리티 ──────────
function formatNumber(n: bigint): string {
  return n.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}

function readKorean(placedCards: Record<number, number>): string {
  const groupNames = ["", "만", "억", "조"];
  const withinNames = ["", "십", "백", "천"];
  const parts: string[] = [];

  for (let g = 3; g >= 0; g--) {
    let groupStr = "";
    let hasNonZero = false;

    for (let w = 3; w >= 0; w--) {
      const idx = g * 4 + w;
      if (idx > 15) continue;
      const digit = placedCards[idx];
      if (digit === undefined || digit === 0) continue;
      hasNonZero = true;
      // 십/백/천/그룹 자리에서 1은 "일" 생략 (예: 십, 백, 천)
      const digitStr = digit === 1 && w > 0 ? "" : KOREAN_DIGITS[digit];
      groupStr += digitStr + withinNames[w];
    }

    if (hasNonZero) parts.push(groupStr + groupNames[g]);
  }

  return parts.join(" ") || "영";
}

// 4자리 단위로 분리 (오른쪽 기준)
function splitIntoGroups(n: bigint): string[] {
  const s = n.toString();
  const groups: string[] = [];
  let i = s.length;
  while (i > 0) {
    groups.unshift(s.slice(Math.max(0, i - 4), i));
    i -= 4;
  }
  return groups;
}

function getTotalValue(placedCards: Record<number, number>): bigint {
  return Object.entries(placedCards).reduce((sum, [idx, digit]) => {
    return sum + BigInt(digit) * PLACES[Number(idx)].multiplier;
  }, 0n);
}

// ────────── 메인 컴포넌트 ──────────
export default function Home() {
  const [selectedPlaces, setSelectedPlaces] = useState<number[]>([0, 1, 2, 3, 4]);
  const [placedCards, setPlacedCards] = useState<Record<number, number>>({});
  const [dupMode, setDupMode] = useState<'all' | 'none'>('all');
  const [autoFilledSlots, setAutoFilledSlots] = useState<Set<number>>(new Set());
  const [isLearningMode, setIsLearningMode] = useState(false);
  const [revealedPlaces, setRevealedPlaces] = useState<Set<number>>(new Set());
  const [activePlaceInfo, setActivePlaceInfo] = useState<number | null>(null);
  const [dragOver, setDragOver] = useState<number | null>(null);
  const draggingDigit = useRef<number | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [containerWidth, setContainerWidth] = useState(960);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const ro = new ResizeObserver((entries) => {
      setContainerWidth(entries[0].contentRect.width);
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // ── computed ──
  // 자동 삽입된 0은 중복 체크에서 제외
  const usedDigits = Object.entries(placedCards)
    .filter(([idx]) => !autoFilledSlots.has(Number(idx)))
    .map(([, d]) => d);
  const sortedPlaces = [...selectedPlaces].sort((a, b) => b - a); // 높은 자리 → 낮은 자리
  const allFilled =
    selectedPlaces.length > 0 &&
    selectedPlaces.every((p) => placedCards[p] !== undefined);
  const allRevealed =
    isLearningMode && selectedPlaces.every((p) => revealedPlaces.has(p));

  // ── 슬롯 크기 동적 계산 ──
  const slotConfig = useMemo(() => {
    const n = sortedPlaces.length;
    if (n === 0) return { size: 56, height: 84, gap: 8, groupGap: 20, fontSize: "1.375rem", labelSize: "0.75rem" };
    const numBoundaries = new Set(sortedPlaces.map((i) => Math.floor(i / 4))).size - 1;
    const gap = 8;
    const groupGap = 20; // 그룹 경계 추가 여백
    const totalFixed = (n - 1) * gap + numBoundaries * groupGap;
    const size = Math.max(24, Math.min(56, Math.floor((containerWidth - totalFixed) / n)));
    const fontSize = `${Math.max(12, Math.round(size * 0.44))}px`;
    const labelSize = `${Math.max(9, Math.round(size * 0.22))}px`;
    const height = Math.round(size * 1.5);
    return { size, height, gap, groupGap, fontSize, labelSize };
  }, [sortedPlaces, containerWidth]);

  // ── 핸들러 ──
  const togglePlace = (idx: number) => {
    if (isLearningMode) return;
    setSelectedPlaces((prev) => {
      const selected = prev.includes(idx);
      let next: number[];
      if (selected) {
        // 이 자리를 해제하면 위의 자리도 모두 해제
        next = prev.filter((p) => p < idx);
      } else {
        // 바로 아래 자리가 선택돼 있어야만 선택 가능
        if (idx > 0 && !prev.includes(idx - 1)) return prev;
        next = [...prev, idx];
      }
      if (next.length === 0) return prev; // 최소 1자리
      setPlacedCards({});
      setAutoFilledSlots(new Set());
      setActivePlaceInfo(null);
      return next;
    });
  };

  const handleDragStart = (e: React.DragEvent, digit: number) => {
    if (isLearningMode) return;
    if (dupMode === 'none' && usedDigits.includes(digit)) return;
    draggingDigit.current = digit;
    e.dataTransfer.effectAllowed = "move";
  };

  const handleDragOver = (e: React.DragEvent, placeIdx: number) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    setDragOver(placeIdx);
  };

  const handleDragLeave = () => setDragOver(null);

  const handleDrop = (e: React.DragEvent, placeIdx: number) => {
    e.preventDefault();
    setDragOver(null);
    if (isLearningMode) return;
    const digit = draggingDigit.current;
    if (digit === null) return;

    if (dupMode === 'none') {
      // 자동 삽입 슬롯은 제외하고 중복 체크
      const usedElsewhere = Object.entries(placedCards).some(
        ([i, d]) => d === digit && Number(i) !== placeIdx && !autoFilledSlots.has(Number(i))
      );
      if (usedElsewhere) return;
    }

    setPlacedCards((prev) => ({ ...prev, [placeIdx]: digit }));
    // 수동으로 배치하면 autoFilled에서 제거
    setAutoFilledSlots((prev) => {
      const next = new Set(prev);
      next.delete(placeIdx);
      return next;
    });
    draggingDigit.current = null;
  };

  const handleSlotClick = (placeIdx: number) => {
    if (isLearningMode) {
      if (placedCards[placeIdx] !== undefined) {
        setRevealedPlaces((prev) => new Set([...prev, placeIdx]));
        setActivePlaceInfo(placeIdx);
      }
    } else {
      if (placedCards[placeIdx] !== undefined) {
        setPlacedCards((prev) => {
          const next = { ...prev };
          delete next[placeIdx];
          return next;
        });
        setAutoFilledSlots((prev) => {
          const next = new Set(prev);
          next.delete(placeIdx);
          return next;
        });
        if (activePlaceInfo === placeIdx) setActivePlaceInfo(null);
      }
    }
  };

  const handleStudy = () => {
    if (!allFilled) return;
    setIsLearningMode(true);
    setRevealedPlaces(new Set());
    setActivePlaceInfo(null);
  };

  const handleReset = () => {
    setSelectedPlaces([0, 1, 2, 3, 4]);
    setPlacedCards({});
    setAutoFilledSlots(new Set());
    setIsLearningMode(false);
    setRevealedPlaces(new Set());
    setActivePlaceInfo(null);
    setDragOver(null);
  };

  const setMode = (mode: 'all' | 'none') => {
    if (isLearningMode) return;
    setDupMode(mode);
    setPlacedCards({});
    setAutoFilledSlots(new Set());
    setActivePlaceInfo(null);
  };

  // 선택된 자릿수 중 limit 미만 자리에 0 자동 삽입
  const fillZerosUpTo = (limit: number) => {
    if (isLearningMode) return;
    const newCards = { ...placedCards };
    const newAutoFilled = new Set(autoFilledSlots);
    selectedPlaces.filter((p) => p < limit).forEach((p) => {
      newCards[p] = 0;
      newAutoFilled.add(p);
    });
    setPlacedCards(newCards);
    setAutoFilledSlots(newAutoFilled);
  };

  // ── 자릿값 정보 ──
  const activeInfo = (() => {
    if (activePlaceInfo === null) return null;
    const digit = placedCards[activePlaceInfo];
    if (digit === undefined) return null;
    const place = PLACES[activePlaceInfo];
    const value = BigInt(digit) * place.multiplier;
    return {
      digit,
      place,
      value,
      korean: readKorean({ [activePlaceInfo]: digit }),
    };
  })();

  const totalValue = allFilled ? getTotalValue(placedCards) : null;

  return (
    <div className="min-h-screen bg-gradient-to-br from-sky-100 via-indigo-50 to-purple-100">
      {/* 헤더 */}
      <header className="bg-gradient-to-r from-blue-500 via-indigo-500 to-purple-600 text-white py-5 px-4 shadow-xl">
        <h1 className="text-3xl font-black text-center tracking-tight drop-shadow">
          🔢 큰 수 자릿값 탐험
        </h1>
        <p className="text-center text-blue-100 text-sm mt-1">
          숫자 카드를 드래그해서 자릿수 칸에 놓아보세요!
        </p>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-6 space-y-5">

        {/* ── 설정 패널 ── */}
        <div className="bg-white rounded-3xl shadow-lg p-5 space-y-5">

          {/* 중복 모드 */}
          <div>
            <h2 className="text-base font-bold text-gray-600 mb-2">⚙️ 중복 설정</h2>
            <div className="flex flex-wrap gap-3">
              {[
                { label: "중복 허용", value: 'all' as const },
                { label: "중복 불허", value: 'none' as const },
              ].map(({ label, value }) => (
                <button
                  key={label}
                  onClick={() => setMode(value)}
                  disabled={isLearningMode}
                  className={`px-5 py-2 rounded-full font-bold text-sm transition-all shadow-sm ${
                    dupMode === value
                      ? "bg-indigo-500 text-white shadow-indigo-200 shadow-md"
                      : "bg-gray-100 text-gray-500 hover:bg-gray-200"
                  } disabled:opacity-50 disabled:cursor-not-allowed`}
                >
                  {label}
                </button>
              ))}
              <div className="w-px bg-gray-200 mx-1" />
              {[
                { label: "천 자리까지 0 삽입", limit: 4 },
                { label: "천만 자리까지 0 삽입", limit: 8 },
              ].map(({ label, limit }) => (
                <button
                  key={label}
                  onClick={() => fillZerosUpTo(limit)}
                  disabled={isLearningMode || selectedPlaces.filter(p => p < limit).length === 0}
                  className="px-5 py-2 rounded-full font-bold text-sm transition-all shadow-sm bg-emerald-100 text-emerald-700 hover:bg-emerald-200 disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          {/* 자릿수 선택 */}
          <div>
            <h2 className="text-base font-bold text-gray-600 mb-2">
              📐 자릿수 선택{" "}
              <span className="font-normal text-gray-400 text-xs">
                (원하는 자리를 눌러 선택하세요)
              </span>
            </h2>
            <div className="flex flex-wrap gap-2">
              {PLACES.map((place) => {
                const selected = selectedPlaces.includes(place.index);
                // 바로 아래 자리가 없거나 선택돼 있어야 클릭 가능
                const unlocked = place.index === 0 || selectedPlaces.includes(place.index - 1);
                const disabled = isLearningMode || (!selected && !unlocked);
                return (
                  <button
                    key={place.index}
                    onClick={() => togglePlace(place.index)}
                    disabled={disabled}
                    title={disabled && !isLearningMode ? `먼저 '${PLACES[place.index - 1].name}' 자리를 선택하세요` : undefined}
                    className={`px-3 py-1.5 rounded-xl font-bold text-sm transition-all ${
                      selected
                        ? "bg-indigo-500 text-white shadow shadow-indigo-200"
                        : unlocked
                          ? "bg-gray-100 text-gray-400 hover:bg-indigo-100 hover:text-indigo-500"
                          : "bg-gray-100 text-gray-300 cursor-not-allowed opacity-40"
                    } disabled:cursor-not-allowed`}
                  >
                    {place.name}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* ── 숫자 카드 팔레트 ── */}
        <div className="bg-white rounded-3xl shadow-lg p-5">
          <h2 className="text-base font-bold text-gray-600 mb-3">
            🃏 숫자 카드{" "}
            {!isLearningMode && (
              <span className="font-normal text-gray-400 text-xs">
                카드를 아래 칸으로 드래그하세요
              </span>
            )}
          </h2>
          <div className="flex flex-wrap gap-3 justify-center">
            {Array.from({ length: 10 }, (_, digit) => {
              const disabled =
                isLearningMode ||
                (dupMode === 'none' && usedDigits.includes(digit));
              const c = CARD_COLORS[digit];
              return (
                <div
                  key={digit}
                  draggable={!disabled}
                  onDragStart={(e) => handleDragStart(e, digit)}
                  onDragEnd={() => { draggingDigit.current = null; }}
                  className={`w-14 h-14 rounded-2xl flex items-center justify-center text-2xl font-black text-white shadow-md select-none transition-all
                    ${disabled
                      ? "bg-gray-200 text-gray-400 cursor-not-allowed opacity-50"
                      : `${c.bg} ${c.hover} cursor-grab active:cursor-grabbing hover:scale-110 hover:shadow-lg`
                    }`}
                >
                  {digit}
                </div>
              );
            })}
          </div>
        </div>

        {/* ── 카드 배치 영역 ── */}
        <div className="bg-white rounded-3xl shadow-lg p-5">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-base font-bold text-gray-600">
              📦 카드 배치 영역
              {!allFilled && !isLearningMode && (
                <span className="font-normal text-gray-400 text-xs ml-2">
                  빈 칸({selectedPlaces.length - Object.keys(placedCards).length}개)을 채워보세요
                </span>
              )}
              {isLearningMode && !allRevealed && (
                <span className="font-normal text-orange-400 text-xs ml-2">
                  카드를 클릭하면 자릿값을 확인할 수 있어요
                </span>
              )}
            </h2>
          </div>

          <div ref={containerRef}>
            <div
              className="flex items-end justify-center"
              style={{ gap: `${slotConfig.gap}px` }}
            >
              {sortedPlaces.map((placeIdx, i) => {
                const place = PLACES[placeIdx];
                const digit = placedCards[placeIdx];
                const isRevealed = revealedPlaces.has(placeIdx);
                const isActive = activePlaceInfo === placeIdx;
                const isDragTarget = dragOver === placeIdx;
                const c = digit !== undefined ? CARD_COLORS[digit] : null;
                const prevIdx = sortedPlaces[i - 1];
                const isGroupBoundary =
                  i > 0 && Math.floor(prevIdx / 4) !== Math.floor(placeIdx / 4);

                return (
                  <div
                    key={placeIdx}
                    className="flex flex-col items-center"
                    style={{
                      gap: "4px",
                      marginLeft: isGroupBoundary ? `${slotConfig.groupGap}px` : undefined,
                    }}
                  >
                    <div
                      onDragOver={(e) => handleDragOver(e, placeIdx)}
                      onDragLeave={handleDragLeave}
                      onDrop={(e) => handleDrop(e, placeIdx)}
                      onClick={() => handleSlotClick(placeIdx)}
                      style={{
                        width: `${slotConfig.size}px`,
                        height: `${slotConfig.height}px`,
                        fontSize: slotConfig.fontSize,
                        borderRadius: `${Math.round(slotConfig.size * 0.25)}px`,
                      }}
                      className={`flex items-center justify-center font-black transition-all select-none
                        ${digit !== undefined
                          ? isLearningMode
                            ? isActive
                              ? `${c!.active} text-white ring-4 ring-yellow-400 scale-110 cursor-pointer shadow-xl`
                              : isRevealed
                                ? `${c!.active} text-white opacity-70 cursor-pointer`
                                : `${c!.active} text-white cursor-pointer hover:scale-110 hover:shadow-lg`
                            : `${c!.active} text-white cursor-pointer hover:scale-110 hover:shadow-lg hover:ring-2 hover:ring-red-300`
                          : isDragTarget
                            ? "border-2 border-indigo-400 bg-indigo-50 scale-105"
                            : "border-2 border-dashed border-gray-300 bg-gray-50 hover:border-indigo-300 hover:bg-indigo-50"
                        }`}
                    >
                      {digit !== undefined ? digit : (
                        <span className="text-gray-300">?</span>
                      )}
                    </div>
                    <span
                      className="font-bold text-gray-500 text-center"
                      style={{ fontSize: slotConfig.labelSize }}
                    >
                      {place.name}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* 완성된 수 표시 */}
          {allFilled && totalValue !== null && (
            <div className="mt-4 pt-4 border-t border-gray-100 flex justify-center items-end" style={{ gap: `${Math.round(slotConfig.groupGap / 2)}px` }}>
              {splitIntoGroups(totalValue).map((group, i) => (
                <span key={i} className="text-3xl font-black text-indigo-600">{group}</span>
              ))}
            </div>
          )}
        </div>

        {/* ── 자릿값 정보 패널 ── */}
        {isLearningMode && activeInfo && (
          <div className="bg-yellow-50 border-2 border-yellow-300 rounded-3xl shadow-lg p-5 pop-in">
            <h3 className="text-base font-bold text-yellow-700 mb-3">
              💡 자릿값 정보 — {activeInfo.place.fullName}
            </h3>
            <div className="text-center space-y-2">
              <p className="text-4xl font-black text-indigo-600">
                {activeInfo.value.toString()}
              </p>
              <p className="text-2xl font-bold text-orange-500">
                ({activeInfo.korean})
              </p>
            </div>
          </div>
        )}

        {/* ── 수 읽기 (모두 확인 후) ── */}
        {allRevealed && totalValue !== null && (
          <div className="bg-green-50 border-2 border-green-300 rounded-3xl shadow-lg p-5 pop-in">
            <h3 className="text-base font-bold text-green-700 mb-3">
              🎉 수 읽기 완성!
            </h3>
            <div className="text-center space-y-2">
              <p className="text-3xl font-black text-indigo-600">
                {totalValue.toString()}
              </p>
              <p className="text-2xl font-bold text-green-600">
                {readKorean(placedCards)}
              </p>
            </div>
          </div>
        )}

        {/* ── 액션 버튼 ── */}
        <div className="flex flex-wrap gap-4 justify-center pb-6">
          <button
            onClick={handleStudy}
            disabled={!allFilled || isLearningMode}
            className={`px-8 py-3 rounded-full font-black text-lg transition-all shadow-md ${
              allFilled && !isLearningMode
                ? "bg-gradient-to-r from-orange-400 to-pink-500 text-white hover:scale-105 hover:shadow-xl"
                : "bg-gray-200 text-gray-400 cursor-not-allowed"
            }`}
          >
            📚 자릿값 공부하기
          </button>
          <button
            onClick={handleReset}
            className="px-8 py-3 rounded-full font-black text-lg bg-gray-500 text-white hover:bg-gray-600 hover:scale-105 shadow-md transition-all"
          >
            🔄 다시하기
          </button>
        </div>

        {/* 사용 안내 */}
        {!isLearningMode && (
          <div className="bg-white/60 rounded-2xl p-4 text-sm text-gray-500 space-y-1">
            <p>✅ <b>자릿수 선택</b>: 원하는 자리를 눌러 활성화/비활성화</p>
            <p>✅ <b>카드 배치</b>: 숫자 카드를 드래그해서 칸에 놓기 (클릭하면 제거)</p>
            <p>✅ <b>학습 모드</b>: 모든 칸을 채우면 "자릿값 공부하기" 버튼 활성화</p>
            <p>✅ <b>자릿값 확인</b>: 학습 모드에서 카드를 클릭하면 자릿값 표시</p>
          </div>
        )}
      </main>
    </div>
  );
}
