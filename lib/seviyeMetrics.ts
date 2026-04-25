export type CalibrationQuestionType = "+" | "-" | "x" | "÷" | "mm";

export type CalibrationResult = {
  type: CalibrationQuestionType;
  correct: boolean;
  time: number;
};

export function calculateCalibrationMetrics(finalResults: CalibrationResult[], expectedLength: number) {
  if (finalResults.length !== expectedLength || expectedLength === 0) {
    throw new Error("Kalibrasyon sonucu eksik veya fazla.");
  }

  let addSubC = 0;
  let addSubT = 0;
  let mulDivC = 0;
  let mulDivT = 0;
  let mentalC = 0;
  let mentalT = 0;
  let timeT = 0;

  finalResults.forEach((r) => {
    const safeTime = Math.min(30000, Math.max(250, Number.isFinite(r.time) ? r.time : 30000));
    timeT += safeTime;

    if (r.type === "+" || r.type === "-") {
      addSubT++;
      if (r.correct) addSubC++;
    }
    if (r.type === "x" || r.type === "÷") {
      mulDivT++;
      if (r.correct) mulDivC++;
    }
    if (r.type === "mm") {
      mentalT++;
      if (r.correct) mentalC++;
    }
  });

  const correctTotal = finalResults.filter((r) => r.correct).length;
  const addSubScore = addSubT ? Math.round((addSubC / addSubT) * 100) : 0;
  const mulDivScore = mulDivT ? Math.round((mulDivC / mulDivT) * 100) : 0;
  const mentalMathScore = mentalT ? Math.round((mentalC / mentalT) * 100) : 0;
  const accuracy = Math.round((correctTotal / expectedLength) * 100);
  const avgTimeMs = timeT / expectedLength;

  let speedScore = Math.round(100 - (avgTimeMs - 2000) / 100);
  if (speedScore > 100) speedScore = 100;
  if (speedScore < 0) speedScore = 0;

  return {
    accuracy,
    speedScore,
    addSubScore,
    mulDivScore,
    mentalMathScore,
    avgTimeMs: Math.round(avgTimeMs),
  };
}
