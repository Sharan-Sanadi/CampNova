import { useCallback, useEffect, useRef, useState } from "react";
import { AlertTriangle, RefreshCw, Terminal } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/common/components/button";
import { Panel } from "@/shared/primitives";
import { runCopilot, type CopilotAnswer, type CopilotCandidate } from "@/data/copilot";
import { CopilotInput } from "./CopilotInput";
import { QuickActions } from "./QuickActions";
import { ReasoningTrace } from "./ReasoningTrace";
import { RecommendationCard } from "./RecommendationCard";
import { BriefingCard } from "./BriefingCard";
import { ActionConfirmation, SuccessState } from "./ActionConfirmation";
import { useSpatial } from "@/experience/spatial/state";

type TurnPhase = "working" | "answered" | "error";

interface Turn {
  key: string;
  query: string;
  phase: TurnPhase;
  stage: number;
  answer: CopilotAnswer | null;
  reserved: boolean;
}

/** Timing for the staged reasoning trace — deterministic, not random. */
const STAGE_MS = 420;

export function CopilotShell({ initialQuery }: { initialQuery?: string } = {}) {
  const [turns, setTurns] = useState<Turn[]>([]);
  const [query, setQuery] = useState("");
  const [confirmFor, setConfirmFor] = useState<{ turnKey: string; candidate: CopilotCandidate } | null>(
    null,
  );
  const [pendingConfirm, setPendingConfirm] = useState(false);
  const timers = useRef<number[]>([]);
  const setIntelligenceState = useSpatial((s) => s.setIntelligenceState);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(
    () => () => {
      timers.current.forEach((t) => window.clearTimeout(t));
    },
    [],
  );

  const busy = turns.some((t) => t.phase === "working");

  const run = useCallback((text: string) => {
    const trimmed = text.trim();
    if (!trimmed) return;
    // Drive the shared Intelligence Core through its reasoning states.
    setIntelligenceState("listening");
    const key = `turn-${Date.now()}`;
    const failing = /\bforce error\b/i.test(trimmed);
    const answer = failing ? null : runCopilot(trimmed);

    setQuery("");
    setTurns((prev) => [
      ...prev,
      { key, query: trimmed, phase: "working", stage: 0, answer, reserved: false },
    ]);

    const total = answer?.stages.length ?? 2;
    for (let i = 1; i <= total; i += 1) {
      timers.current.push(
        window.setTimeout(() => {
          setTurns((prev) => prev.map((t) => (t.key === key ? { ...t, stage: i } : t)));
          setIntelligenceState(i === 1 ? "searching" : i < total ? "thinking" : "action");
        }, STAGE_MS * i),
      );
    }
    timers.current.push(
      window.setTimeout(
        () => {
          setTurns((prev) =>
            prev.map((t) =>
              t.key === key ? { ...t, phase: failing ? "error" : "answered", stage: total } : t,
            ),
          );
          setIntelligenceState(failing ? "idle" : "responding");
          timers.current.push(
            window.setTimeout(() => setIntelligenceState("idle"), 1600),
          );
        },
        STAGE_MS * total + 260,
      ),
    );
  }, [setIntelligenceState]);

  const started = useRef(false);
  useEffect(() => {
    if (started.current) return;
    const seed = initialQuery?.trim();
    if (!seed) return;
    started.current = true;
    run(seed);
  }, [initialQuery, run]);

  useEffect(() => {
    if (turns.length) endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [turns]);

  const confirmReservation = () => {
    if (!confirmFor) return;
    setPendingConfirm(true);
    timers.current.push(
      window.setTimeout(() => {
        setTurns((prev) =>
          prev.map((t) => (t.key === confirmFor.turnKey ? { ...t, reserved: true } : t)),
        );
        setPendingConfirm(false);
        setConfirmFor(null);
        toast.success("Reservation confirmed", {
          description: `${confirmFor.candidate.name} · pending departmental approval`,
        });
      }, 700),
    );
  };

  return (
    <div className="mx-auto flex min-h-[calc(100dvh-9rem)] w-full max-w-3xl flex-col">
      {turns.length === 0 ? (
        <div className="enter-up flex flex-1 flex-col justify-center py-8">
          <p className="text-label text-primary mb-3">CampusOS Copilot</p>
          <h1 className="text-display max-w-2xl">How can CampusOS help?</h1>
          <p className="text-muted-foreground mt-4 max-w-xl text-sm leading-relaxed">
            Ask naturally. CampusOS understands your campus, reasons across resources and bookings,
            and recommends the next best action — with the evidence behind it.
          </p>
          <div className="mt-9">
            <QuickActions onRun={run} />
          </div>
        </div>
      ) : (
        <div className="flex-1 space-y-6 py-2">
          {turns.map((turn) => (
            <section key={turn.key} className="space-y-4" aria-label={`Request: ${turn.query}`}>
              <div className="flex justify-end">
                <p className="bg-primary text-primary-foreground max-w-xl rounded-xl rounded-br-sm px-4 py-2.5 text-sm leading-relaxed">
                  {turn.query}
                </p>
              </div>

              <ReasoningTrace
                answer={turn.answer}
                stage={turn.stage}
                done={turn.phase === "answered"}
              />

              {turn.phase === "error" ? (
                <Panel className="border-destructive/35 p-4 sm:p-5">
                  <p className="flex items-center gap-2 text-sm font-medium">
                    <AlertTriangle className="text-destructive size-4" aria-hidden />
                    CampusOS could not complete this request
                  </p>
                  <p className="text-meta mt-1.5">
                    The campus intelligence service did not respond. Your request was not lost — retry
                    it or narrow the constraints.
                  </p>
                  <Button
                    size="sm"
                    variant="outline"
                    className="mt-4"
                    onClick={() => run(turn.query)}
                  >
                    <RefreshCw className="size-3.5" aria-hidden /> Retry request
                  </Button>
                </Panel>
              ) : null}

              {turn.phase === "answered" && turn.answer ? (
                <div className="enter-up space-y-4">
                  {turn.answer.best && turn.answer.kind !== "briefing" ? (
                    <>
                      {turn.answer.kind === "conflict" ? <BriefingCard answer={turn.answer} /> : null}
                      <RecommendationCard
                        answer={turn.answer}
                        reserved={turn.reserved}
                        onReserve={() =>
                          setConfirmFor({ turnKey: turn.key, candidate: turn.answer!.best! })
                        }
                      />
                      {turn.reserved ? (
                        <SuccessState candidate={turn.answer.best} slot={turn.answer.slot} />
                      ) : null}
                    </>
                  ) : (
                    <BriefingCard answer={turn.answer} />
                  )}

                  {turn.answer.followUps.length ? (
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-label text-muted-foreground/80 inline-flex items-center gap-1.5">
                        <Terminal className="size-3" aria-hidden /> Next
                      </span>
                      {turn.answer.followUps.map((f) => (
                        <button
                          key={f}
                          type="button"
                          onClick={() => run(f)}
                          className="border-border hover:border-border-strong hover:bg-surface-2 text-muted-foreground hover:text-foreground rounded-full border px-3 py-1.5 text-xs transition-colors"
                        >
                          {f}
                        </button>
                      ))}
                    </div>
                  ) : null}
                </div>
              ) : null}
            </section>
          ))}
          <div ref={endRef} />
        </div>
      )}

      <CopilotInput
        value={query}
        onChange={setQuery}
        onSubmit={() => run(query)}
        busy={busy}
        {...(turns.length
          ? {}
          : {
              hint: "Try: “I need a 60-seat lab tomorrow from 2–4 PM with a projector.”",
            })}
      />

      <ActionConfirmation
        candidate={confirmFor?.candidate ?? null}
        slot={turns.find((t) => t.key === confirmFor?.turnKey)?.answer?.slot}
        open={Boolean(confirmFor)}
        pending={pendingConfirm}
        onOpenChange={(v) => {
          if (!v) setConfirmFor(null);
        }}
        onConfirm={confirmReservation}
      />
    </div>
  );
}
