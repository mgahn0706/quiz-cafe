"use client";

import { CSSProperties, KeyboardEvent, PointerEvent, TransitionEvent, useRef, useState } from "react";
import { CabinetLock } from "./components/CabinetLock";
import { LockChallenge } from "./components/LockChallenge";
import { backgroundOffsets, puzzleSections, roomNames } from "./config/cabinets";
import { useGameSession } from "./game/GameSessionContext";

function Mark() {
  return (
    <svg viewBox="0 0 52 52" aria-hidden="true">
      <path d="M9 20h28v12a11 11 0 0 1-11 11h-6A11 11 0 0 1 9 32Z" fill="#fff7e9" stroke="currentColor" strokeWidth="2.6" />
      <path d="M37 24h3a6 6 0 0 1 0 12h-4" fill="none" stroke="currentColor" strokeWidth="2.6" />
      <path d="M16 14c-3-4 3-5 0-9M25 14c-3-4 3-5 0-9" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" />
      <path d="M6 45h39" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" />
    </svg>
  );
}

function WindowCafe() {
  return (
    <svg className="room-svg" viewBox="0 0 1440 900" preserveAspectRatio="xMidYMid slice" role="img" aria-label="A warm café window seat on a rainy afternoon">
      <defs>
        <linearGradient id="w-wall" x1="0" y1="0" x2="0" y2="1"><stop stopColor="#eacbab" /><stop offset="1" stopColor="#d9aa83" /></linearGradient>
        <linearGradient id="w-sky" x1="0" y1="0" x2="0" y2="1"><stop stopColor="#a9c1bd" /><stop offset="1" stopColor="#718f91" /></linearGradient>
        <filter id="w-soft"><feDropShadow dx="0" dy="12" stdDeviation="10" floodColor="#503328" floodOpacity=".2" /></filter>
        <pattern id="w-paper" width="34" height="34" patternUnits="userSpaceOnUse"><circle cx="4" cy="4" r="1.5" fill="#9b674f" opacity=".14" /></pattern>
      </defs>
      <path fill="url(#w-wall)" d="M0 0h1440v900H0z" /><path fill="url(#w-paper)" d="M0 0h1440v900H0z" />
      <path d="M0 665h1440v235H0z" fill="#825941" /><path d="M0 673h1440" stroke="#593d30" strokeWidth="10" />
      <g opacity=".35" stroke="#5c3e31" strokeWidth="3"><path d="M80 674v226M310 674v226M540 674v226M770 674v226M1000 674v226M1230 674v226" /></g>
      <g filter="url(#w-soft)">
        <path d="M560 90h700v505H560z" fill="#f8edd7" stroke="#67483a" strokeWidth="18" />
        <path d="M584 114h652v457H584z" fill="url(#w-sky)" />
        <path d="M910 112v461M582 340h656" stroke="#67483a" strokeWidth="15" />
        <path d="M584 466c90-65 171-31 257-79 83-47 152-34 226 20 54 40 113 23 169-4v168H584Z" fill="#476b61" opacity=".9" />
        <g stroke="#deece6" strokeWidth="6" strokeLinecap="round" opacity=".65"><path d="m650 155-22 56M760 140l-26 72M1020 157l-24 66M1155 190l-22 56M702 365l-20 52M1090 376l-24 60" /></g>
      </g>
      <path d="M530 594h760v40H530z" fill="#5f4033" />
      <g filter="url(#w-soft)"><ellipse cx="875" cy="665" rx="285" ry="40" fill="#55372c" /><path d="M645 642h460v32H645z" fill="#9e6547" /><path d="M710 672h28l-28 205h-40zM1012 672h28l41 205h-40z" fill="#684535" /></g>
      <g filter="url(#w-soft)"><path d="M810 540h112v80a43 43 0 0 1-43 43h-26a43 43 0 0 1-43-43Z" fill="#f8eddb" stroke="#5b3b30" strokeWidth="7" /><path d="M921 557h16a31 31 0 0 1 0 62h-17" fill="none" stroke="#5b3b30" strokeWidth="9" /><ellipse cx="866" cy="541" rx="56" ry="14" fill="#4b3028" /><path className="steam steam-one" d="M840 510c-22-23 17-34-2-62M874 508c-22-23 17-34-2-62" fill="none" stroke="#fff5e6" strokeWidth="8" strokeLinecap="round" /></g>
      <g transform="translate(1110 485)"><path d="M20 46c-53-54 10-108 65-62-3-61 80-75 100-18 46-36 95 16 62 59-35 45-185 70-227 21Z" fill="#66826c" stroke="#405a4c" strokeWidth="6" /><path d="M102 57v119" stroke="#405a4c" strokeWidth="8" /><path d="M46 144h118l-18 96H64Z" fill="#b96350" stroke="#694437" strokeWidth="7" /></g>
      <g fill="#6c4938"><path d="M100 155h305v24H100z" /><path d="M130 179h22v202h-22zM352 179h22v202h-22z" /></g>
      <g filter="url(#w-soft)"><path d="M135 105h74v50h-74z" fill="#d8795c" /><path d="M217 77h62v78h-62z" fill="#e0a84f" /><path d="M287 115h82v40h-82z" fill="#70876b" /><path d="M143 114h40M225 89h40M297 126h56" stroke="#fff1d4" strokeWidth="5" /></g>
      <path d="M225 0v85" stroke="#583b31" strokeWidth="7" /><path d="M135 85h180l-24 82H159Z" fill="#d47a58" stroke="#583b31" strokeWidth="7" /><ellipse cx="225" cy="167" rx="75" ry="17" fill="#ffe3ad" opacity=".55" />
    </svg>
  );
}

function BarCafe() {
  return (
    <svg className="room-svg" viewBox="0 0 1440 900" preserveAspectRatio="xMidYMid slice" role="img" aria-label="A sunny café bar with pastries and hanging lights">
      <defs><linearGradient id="b-wall" y2="1"><stop stopColor="#f2d7af" /><stop offset="1" stopColor="#dbb17f" /></linearGradient><filter id="b-shadow"><feDropShadow dy="12" stdDeviation="9" floodColor="#543225" floodOpacity=".2" /></filter></defs>
      <path fill="url(#b-wall)" d="M0 0h1440v900H0z" /><path fill="#b96d50" d="M0 520h1440v380H0z" />
      <path d="M0 750h1440v150H0z" fill="#6f4937" /><g stroke="#95654a" strokeWidth="5"><path d="m0 900 250-150M260 900l245-150M520 900l245-150M780 900l245-150M1040 900l245-150M1300 900l140-90" /></g>
      <g filter="url(#b-shadow)"><path d="M100 125h610v350H100z" fill="#66473a" /><path d="M125 150h560v300H125z" fill="#365149" /><path d="M150 205h160M150 260h225M150 315h185M440 205h185M440 260h165M440 315h205" stroke="#f1ddba" strokeWidth="8" strokeLinecap="round" opacity=".85" /><g fill="#e6a44e"><circle cx="170" cy="385" r="7" /><circle cx="460" cy="385" r="7" /></g></g>
      <g><path d="M800 180h510v290H800z" fill="#805642" /><path d="M826 205h458v240H826z" fill="#c6d0bd" /><path d="M1055 205v240M826 325h458" stroke="#805642" strokeWidth="12" /><path d="M826 387c90-70 145-30 226-70 75-37 143-18 232 25v103H826Z" fill="#708a70" /></g>
      <g stroke="#674234" strokeWidth="7"><path d="M870 0v120M1090 0v120" /></g><g fill="#a65b47" stroke="#674234" strokeWidth="7"><path d="M810 120h120l-18 75h-84Z" /><path d="M1030 120h120l-18 75h-84Z" /></g><g fill="#ffe0a3" opacity=".5"><ellipse cx="870" cy="196" rx="60" ry="15" /><ellipse cx="1090" cy="196" rx="60" ry="15" /></g>
      <g filter="url(#b-shadow)"><path d="M140 528h1150v65H140z" fill="#704735" /><path d="M174 590h1080v180H174z" fill="#a9654a" /><path d="M225 626h250v108H225zM920 626h278v108H920z" fill="#8e5741" /><path d="M510 626h375v108H510z" fill="#c9855d" /></g>
      <g filter="url(#b-shadow)" transform="translate(270 430)"><path d="M0 35h260l-25 96H25Z" fill="#d9c3a2" stroke="#5f3c30" strokeWidth="7" /><path d="M20 35C40 4 69 4 88 35M95 35c20-31 49-31 68 0M170 35c20-31 49-31 68 0" fill="#e5a34e" stroke="#75452f" strokeWidth="6" /></g>
      <g filter="url(#b-shadow)" transform="translate(870 410)"><path d="M0 25h135v118H0z" fill="#53605a" stroke="#3b302b" strokeWidth="7" /><circle cx="67" cy="63" r="29" fill="#d4b68e" stroke="#3b302b" strokeWidth="6" /><path d="M28 143h79v35H28z" fill="#42342e" /><path d="M110 42h70v16h-70zM173 52v76" stroke="#3b302b" strokeWidth="9" /><path d="M148 128h52" stroke="#3b302b" strokeWidth="8" /></g>
      <g transform="translate(1110 462)"><path d="M0 62h90v66a35 35 0 0 1-35 35H35A35 35 0 0 1 0 128Z" fill="#fff4dd" stroke="#59382e" strokeWidth="6" /><path d="M88 78h15a25 25 0 0 1 0 50H88" fill="none" stroke="#59382e" strokeWidth="8" /><path className="steam steam-two" d="M28 44C8 22 48 15 29-8M59 44c-20-22 20-29 1-52" fill="none" stroke="#fff3db" strokeWidth="7" strokeLinecap="round" /></g>
    </svg>
  );
}

function LibraryCafe() {
  return (
    <svg className="room-svg" viewBox="0 0 1440 900" preserveAspectRatio="xMidYMid slice" role="img" aria-label="A cozy café reading nook with bookshelves and plants">
      <defs><linearGradient id="l-wall" y2="1"><stop stopColor="#cfb994" /><stop offset="1" stopColor="#aa8964" /></linearGradient><filter id="l-shadow"><feDropShadow dy="12" stdDeviation="10" floodColor="#35271f" floodOpacity=".24" /></filter></defs>
      <path fill="url(#l-wall)" d="M0 0h1440v900H0z" /><path d="M0 710h1440v190H0z" fill="#4f3d32" />
      <g filter="url(#l-shadow)"><path d="M90 80h560v610H90z" fill="#604637" /><path d="M120 110h500v550H120z" fill="#8b674c" /><g fill="none" stroke="#5b4034" strokeWidth="18"><path d="M120 270h500M120 440h500M120 610h500M290 110v550M460 110v550" /></g>
        <g fill="#d6805c"><path d="M145 166h28v95h-28zM188 145h37v116h-37zM243 178h27v83h-27zM320 130h32v131h-32z" /></g>
        <g fill="#d5a64e"><path d="M375 165h42v96h-42zM487 139h30v122h-30zM535 177h54v84h-54z" /></g>
        <g fill="#657c67"><path d="M143 320h44v110h-44zM203 345h31v85h-31zM321 310h28v120h-28zM371 334h58v96h-58zM490 300h39v130h-39zM547 347h45v83h-45z" /></g>
        <g fill="#e4cba7"><path d="M145 485h35v115h-35zM195 515h59v85h-59zM320 478h48v122h-48zM392 520h40v80h-40zM488 490h26v110h-26zM535 507h53v93h-53z" /></g>
      </g>
      <path d="M1050 0v102" stroke="#4e392f" strokeWidth="8" /><path d="M934 102h232l-34 102H968Z" fill="#b3664c" stroke="#4e392f" strokeWidth="8" /><ellipse cx="1050" cy="205" rx="90" ry="22" fill="#ffe5ac" opacity=".48" />
      <g filter="url(#l-shadow)"><path d="M755 640c0-99 80-179 179-179h189c99 0 179 80 179 179v109H755Z" fill="#647b6b" stroke="#405447" strokeWidth="10" /><path d="M779 638h499v120H779z" fill="#718a78" /><path d="M824 495c41 26 48 78 29 143M1215 495c-41 26-48 78-29 143" fill="none" stroke="#91a18c" strokeWidth="7" /></g>
      <g filter="url(#l-shadow)"><ellipse cx="1025" cy="704" rx="235" ry="35" fill="#51382e" /><path d="M818 680h414v40H818z" fill="#9c694b" /><path d="M846 716h35l-26 174h-45zM1172 716h35l34 174h-45z" fill="#594036" /></g>
      <g transform="translate(955 557)"><path d="M0 35h95v70a38 38 0 0 1-38 38H38A38 38 0 0 1 0 105Z" fill="#f8ead2" stroke="#51382e" strokeWidth="7" /><path d="M93 52h15a27 27 0 0 1 0 54H94" fill="none" stroke="#51382e" strokeWidth="8" /><path className="steam steam-three" d="M28 19C8-5 46-14 27-38M60 19C40-5 78-14 59-38" fill="none" stroke="#f8ead2" strokeWidth="7" strokeLinecap="round" /></g>
      <g transform="translate(1135 370)"><path d="M90 152c-52-39-66-96-38-144 53 15 77 55 66 105 21-49 62-66 105-52 2 52-32 91-86 100" fill="#526f58" stroke="#38503e" strokeWidth="8" /><path d="M116 126v112" stroke="#38503e" strokeWidth="8" /><path d="M57 204h119l-19 103H76Z" fill="#b96a50" stroke="#523a31" strokeWidth="8" /></g>
      <g transform="translate(745 622) rotate(-7)"><path d="M0 0h160v112H0z" fill="#ead8b8" stroke="#51382e" strokeWidth="7" /><path d="M80 2v107M22 24h40M98 24h40M22 42h33M98 42h38" stroke="#a98568" strokeWidth="5" strokeLinecap="round" /></g>
    </svg>
  );
}

const cafeArtwork = { continuous: WindowCafe, details: [BarCafe, LibraryCafe] };
const ContinuousScene = cafeArtwork.continuous;
const carouselItems = [puzzleSections.length - 1, ...puzzleSections.map((_, index) => index), 0];

function Arrow({ back = false }: { back?: boolean }) {
  return <svg viewBox="0 0 24 24" aria-hidden="true" className={back ? "back" : ""}><path d="M5 12h14M14 6l6 6-6 6" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>;
}

function lockElements(container: HTMLDivElement) {
  return container.querySelectorAll<SVGSVGElement>(".cabinet-lock");
}

function moveLocks(container: HTMLDivElement, angle: number) {
  lockElements(container).forEach((lock, index) => {
    const variation = .84 + (index % 5) * .04;
    lock.getAnimations().forEach((animation) => animation.cancel());
    lock.style.transition = "none";
    lock.style.transform = `translateX(-50%) rotate(${angle * variation}deg)`;
  });
}

function releaseLocks(container: HTMLDivElement, angle: number) {
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
    lockElements(container).forEach((lock) => {
      lock.style.transform = "";
      lock.style.transition = "";
    });
    return;
  }

  const releaseAngle = Math.sign(angle || 1) * Math.max(18, Math.abs(angle));
  lockElements(container).forEach((lock, index) => {
    const variation = .84 + (index % 5) * .04;
    const start = releaseAngle * variation;
    lock.getAnimations().forEach((animation) => animation.cancel());
    lock.style.transform = "translateX(-50%) rotate(0deg)";
    const animation = lock.animate(
      [
        { transform: `translateX(-50%) rotate(${start}deg)` },
        { transform: `translateX(-50%) rotate(${-start * .62}deg)`, offset: .28 },
        { transform: `translateX(-50%) rotate(${start * .32}deg)`, offset: .52 },
        { transform: `translateX(-50%) rotate(${-start * .15}deg)`, offset: .72 },
        { transform: `translateX(-50%) rotate(${start * .05}deg)`, offset: .88 },
        { transform: "translateX(-50%) rotate(0deg)" },
      ],
      { duration: 900 + (index % 3) * 45, delay: (index % 4) * 18, easing: "cubic-bezier(.25,.7,.2,1)" },
    );
    animation.finished.then(() => {
      lock.style.transform = "";
      lock.style.transition = "";
    }).catch(() => undefined);
  });
}

export default function Home() {
  const { isSolved, submitAttempt } = useGameSession();
  const [slide, setSlide] = useState(0);
  const [position, setPosition] = useState(1);
  const [dragX, setDragX] = useState(0);
  const [dragging, setDragging] = useState(false);
  const [jingling, setJingling] = useState(false);
  const [transitioning, setTransitioning] = useState(true);
  const [arrowMotion, setArrowMotion] = useState<"previous" | "next" | null>(null);
  const [message, setMessage] = useState("");
  const [selectedCabinet, setSelectedCabinet] = useState<number | null>(null);
  const gesture = useRef({ x: 0, time: 0, lastX: 0, lastTime: 0, velocity: 0 });
  const didDrag = useRef(false);
  const draggingRef = useRef(false);
  const moving = useRef(false);
  const carouselRef = useRef<HTMLDivElement>(null);
  const lastLockAngle = useRef(0);
  const completedSwipe = useRef(false);
  const jingleTimer = useRef<number | null>(null);

  const triggerJingle = (carousel: HTMLDivElement) => {
    carousel.querySelectorAll<SVGSVGElement>('.scene[aria-hidden="false"] .cabinet-lock').forEach((lock) => {
      lock.getAnimations().forEach((animation) => animation.cancel());
      lock.style.transform = "";
      lock.style.transition = "";
    });
    setJingling(false);
    requestAnimationFrame(() => requestAnimationFrame(() => {
      setJingling(true);
      if (jingleTimer.current) window.clearTimeout(jingleTimer.current);
      jingleTimer.current = window.setTimeout(() => setJingling(false), 1450);
    }));
  };

  const move = (direction: number, jingleOnComplete = true) => {
    if (moving.current) return;
    moving.current = true;
    setTransitioning(true);
    setDragX(0);
    setPosition((current) => current + direction);
    setSlide((current) => (current + direction + puzzleSections.length) % puzzleSections.length);
    completedSwipe.current = jingleOnComplete;
  };
  const clickArrow = (direction: number) => {
    if (moving.current) return;
    setArrowMotion(direction > 0 ? "next" : "previous");
    move(direction, false);
  };
  const pointerDown = (event: PointerEvent<HTMLDivElement>) => {
    if (moving.current) return;
    if (event.pointerType === "mouse" && event.button !== 0) return;
    const now = performance.now();
    gesture.current = { x: event.clientX, time: now, lastX: event.clientX, lastTime: now, velocity: 0 };
    didDrag.current = false;
    draggingRef.current = true;
    setTransitioning(false);
  };
  const pointerMove = (event: PointerEvent<HTMLDivElement>) => {
    if (!draggingRef.current) return;
    const distance = event.clientX - gesture.current.x;
    const now = performance.now();
    const elapsed = Math.max(now - gesture.current.lastTime, 1);
    const instantVelocity = (event.clientX - gesture.current.lastX) / elapsed;
    gesture.current.velocity = gesture.current.velocity * .65 + instantVelocity * .35;
    gesture.current.lastX = event.clientX;
    gesture.current.lastTime = now;
    if (Math.abs(distance) > 6 && !didDrag.current) {
      didDrag.current = true;
      event.currentTarget.setPointerCapture(event.pointerId);
      setDragging(true);
    }
    if (!didDrag.current) return;
    setDragX(distance);
    const angle = Math.max(-30, Math.min(30, -(distance * .075 + gesture.current.velocity * 9)));
    lastLockAngle.current = angle;
    moveLocks(event.currentTarget, angle);
    event.currentTarget.style.setProperty("--background-drag", `${Math.max(-38, Math.min(38, distance * .12))}px`);
  };
  const pointerUp = (event: PointerEvent<HTMLDivElement>) => {
    if (!draggingRef.current) return;
    draggingRef.current = false;
    const distance = event.clientX - gesture.current.x;
    const duration = Math.max(performance.now() - gesture.current.time, 1);
    const velocity = Math.abs(distance) / duration;
    const shouldMove = didDrag.current && (Math.abs(distance) > Math.min(90, event.currentTarget.clientWidth * .16) || velocity > .55);
    setDragging(false);
    setTransitioning(true);
    if (shouldMove) move(distance < 0 ? 1 : -1);
    else setDragX(0);
    if (didDrag.current) releaseLocks(event.currentTarget, lastLockAngle.current);
    event.currentTarget.style.setProperty("--background-drag", "0px");
    window.setTimeout(() => { didDrag.current = false; }, 0);
  };
  const cancelDrag = () => {
    draggingRef.current = false;
    setDragging(false);
    setTransitioning(true);
    setDragX(0);
    if (carouselRef.current && didDrag.current) releaseLocks(carouselRef.current, lastLockAngle.current);
    carouselRef.current?.style.setProperty("--background-drag", "0px");
  };
  const finishTransition = (event: TransitionEvent<HTMLDivElement>) => {
    if (event.target !== event.currentTarget) return;
    moving.current = false;
    setArrowMotion(null);
    const shouldJingle = completedSwipe.current;
    completedSwipe.current = false;
    const carousel = event.currentTarget.parentElement as HTMLDivElement | null;
    if (position === 0 || position === puzzleSections.length + 1) {
      setTransitioning(false);
      setPosition(position === 0 ? puzzleSections.length : 1);
      requestAnimationFrame(() => requestAnimationFrame(() => {
        setTransitioning(true);
        if (shouldJingle && carousel) triggerJingle(carousel);
      }));
    } else if (shouldJingle && carousel) {
      triggerJingle(carousel);
    }
  };
  const handleKeys = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key === "ArrowLeft") clickArrow(-1);
    if (event.key === "ArrowRight") clickArrow(1);
  };
  const chooseCabinet = (cabinet: number) => {
    setSelectedCabinet(cabinet);
  };
  const selectedPuzzle = selectedCabinet === null ? undefined : puzzleSections.flat().find((puzzle) => puzzle.id === selectedCabinet);
  return (
    <main className="experience">
      <header className="floating-header">
        <a className="cafe-brand" href="#" aria-label="Quiz Café home"><Mark /><span>Quiz Café</span></a>
        <div className="room-count"><span>{String(slide + 1).padStart(2, "0")}</span><i />{String(puzzleSections.length).padStart(2, "0")}</div>
        <button type="button" className="menu-button" aria-label="Open menu" onClick={() => setMessage("The café menu is coming soon.")}><span /><span /></button>
      </header>

      <div ref={carouselRef} className={`carousel${dragging ? " is-dragging" : ""}${jingling ? " is-jingling" : ""}${arrowMotion ? ` arrow-motion-${arrowMotion}` : ""}`} style={{ "--background-drag": "0px", "--background-base": `${backgroundOffsets[slide]}px` } as CSSProperties} role="region" aria-roledescription="carousel" aria-label="Numbered café cabinets" tabIndex={0} onKeyDown={handleKeys} onPointerDown={pointerDown} onPointerMove={pointerMove} onPointerUp={pointerUp} onPointerCancel={cancelDrag}>
        <div className="continuous-background" aria-hidden="true"><ContinuousScene /></div>
        <div className={`${transitioning && !dragging ? "carousel-track" : "carousel-track instant"}${arrowMotion ? ` arrow-driven arrow-${arrowMotion}` : ""}`} onTransitionEnd={finishTransition} style={{ transform: `translate3d(calc(-${position * 100}% + ${dragX}px), 0, 0)` }}>
          {carouselItems.map((roomIndex, itemIndex) => {
            const isActive = roomIndex === slide && itemIndex === position;
            return (
            <section className={`scene scene-${roomIndex + 1}`} aria-hidden={!isActive} key={`${roomNames[roomIndex]}-${itemIndex}`}>
              <div className="cabinet-wall">
                <div className="cabinet-plaque"><span>{roomNames[roomIndex]}</span></div>
                <div className={`cabinet-grid cabinets-${puzzleSections[roomIndex].length}`}>
                  {puzzleSections[roomIndex].map((puzzle) => (
                    <button type="button" tabIndex={isActive ? 0 : -1} className={selectedCabinet === puzzle.id ? "cabinet selected" : "cabinet"} onClick={() => { if (!didDrag.current) chooseCabinet(puzzle.id); }} aria-label={`Select cabinet ${puzzle.id}, ${puzzle.lockType.replaceAll("-", " ")} lock`} key={puzzle.id}>
                      <svg viewBox="0 0 100 100" aria-hidden="true">
                        <rect x="4" y="4" width="92" height="92" rx="5" fill="currentColor" stroke="#52362b" strokeWidth="4" />
                        <rect x="12" y="12" width="76" height="76" rx="2" fill="none" stroke="#f4d9b6" strokeOpacity=".28" strokeWidth="3" />
                        <path d="M17 21h66M17 79h66" stroke="#4f3027" strokeOpacity=".28" strokeWidth="2" />
                        <circle cx="76" cy="51" r="5" fill="#f2c879" stroke="#593b2e" strokeWidth="2" />
                      </svg>
                      <span>{puzzle.id}</span>
                      <CabinetLock type={puzzle.lockType} open={isSolved(puzzle.id)} />
                      <i className="cabinet-knob-overlay" aria-hidden="true" />
                    </button>
                  ))}
                </div>
              </div>
            </section>
          )})}
        </div>
      </div>

      <div className="carousel-controls">
        <button type="button" className={arrowMotion === "previous" ? "arrow-control active" : "arrow-control"} onClick={() => clickArrow(-1)} aria-label="Previous café"><Arrow back /></button>
        <div className="dots" role="tablist" aria-label="Choose café room">{roomNames.map((room, index) => <button type="button" role="tab" aria-label={room} aria-selected={index === slide} className={index === slide ? "active" : ""} onClick={() => { if (moving.current || index === slide) return; moving.current = true; setTransitioning(true); setPosition(index + 1); setSlide(index); }} key={room} />)}</div>
        <button type="button" className={arrowMotion === "next" ? "arrow-control active" : "arrow-control"} onClick={() => clickArrow(1)} aria-label="Next café"><Arrow /></button>
      </div>

      <div className={message ? "scene-toast visible" : "scene-toast"} role="status">{message}</div>
      {selectedPuzzle && <LockChallenge puzzle={selectedPuzzle} solved={isSolved(selectedPuzzle.id)} onClose={() => setSelectedCabinet(null)} onSubmit={submitAttempt} />}
    </main>
  );
}
