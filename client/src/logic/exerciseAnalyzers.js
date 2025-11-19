const keypointNames = [
  "nose",
  "left_eye",
  "right_eye",
  "left_ear",
  "right_ear",
  "left_shoulder",
  "right_shoulder",
  "left_elbow",
  "right_elbow",
  "left_wrist",
  "right_wrist",
  "left_hip",
  "right_hip",
  "left_knee",
  "right_knee",
  "left_ankle",
  "right_ankle",
];

function getKp(keypoints, name) {
  const index = keypointNames.indexOf(name);
  if (index === -1 || !keypoints || keypoints.length <= index) return null;
  const kp = keypoints[index];
  if (kp && (kp.score ?? 1) > 0.3) {
    return kp;
  }
  return null;
}

function calcularAngulo(a, b, c) {
  if (!a || !b || !c) return null;
  const rad =
    Math.atan2(c.y - b.y, c.x - b.x) - Math.atan2(a.y - b.y, a.x - b.x);
  let angulo = Math.abs((rad * 180.0) / Math.PI);
  if (angulo > 180) {
    angulo = 360 - angulo;
  }
  return angulo;
}

export function analizarSentadilla(keypoints, state, onRep, onFeedback) {
  const shoulder = getKp(keypoints, "left_shoulder");
  const hip = getKp(keypoints, "left_hip");
  const knee = getKp(keypoints, "left_knee");
  const ankle = getKp(keypoints, "left_ankle");

  if (!shoulder || !hip || !knee || !ankle) {
    onFeedback("No et veig bé");
    return;
  }

  const anguloRodilla = calcularAngulo(hip, knee, ankle);
  const anguloEspalda = calcularAngulo(shoulder, hip, knee);

  if (anguloRodilla === null || anguloEspalda === null) return;

  const UMBRAL_ARRIBA = 160;
  const UMBRAL_ABAJO = 100;
  const UMBRAL_ESPALDA = 150;

  if (state.value === "down" && anguloEspalda < UMBRAL_ESPALDA) {
    onFeedback("Esquena recta!");
  } else if (state.value === "down") {
    onFeedback("¡Sube!");
  } else if (state.value === "up" && anguloRodilla > UMBRAL_ARRIBA) {
    onFeedback("Baja...");
  }

  if (anguloRodilla < UMBRAL_ABAJO && state.value === "up") {
    state.value = "down";
  }

  if (anguloRodilla > UMBRAL_ARRIBA && state.value === "down") {
    state.value = "up";
    onRep();
    onFeedback("¡Bien!");
  }
}

// Placeholder per a altres exercicis
function analizarFlexiones(keypoints, state, onRep, onFeedback) {
  const shoulder = getKp(keypoints, "left_shoulder");
  const elbow = getKp(keypoints, "left_elbow");
  const wrist = getKp(keypoints, "left_wrist");
  const hip = getKp(keypoints, "left_hip");
  const knee = getKp(keypoints, "left_knee");

  if (!shoulder || !elbow || !wrist || !hip || !knee) {
    onFeedback("No et veig bé, posat de cantó");
    return;
  }

  const anguloCodo = calcularAngulo(shoulder, elbow, wrist);
  const anguloCadera = calcularAngulo(shoulder, hip, knee);

  if (anguloCodo === null || anguloCadera === null) return;

  const UMBRAL_ARRIBA = 150;
  const UMBRAL_ABAJO = 90;
  const UMBRAL_CADERA = 150; // Umbral para mantener la espalda recta

  if (anguloCadera < UMBRAL_CADERA) {
    onFeedback("Esquena recta!");
  } else if (state.value === "down") {
    onFeedback("Puja!");
  } else if (state.value === "up") {
    onFeedback("Baixa!");
  }

  // Transición a 'down'
  if (anguloCodo < UMBRAL_ABAJO && state.value === "up") {
    state.value = "down";
  }

  // Transición a 'up' y contar repetición
  if (anguloCodo > UMBRAL_ARRIBA && state.value === "down") {
    state.value = "up";
    onRep();
    onFeedback("Bé!");
  }
}

function analizarAbdominales(keypoints, state, onRep, onFeedback) {
  const shoulder = getKp(keypoints, "left_shoulder");
  const hip = getKp(keypoints, "left_hip");
  const knee = getKp(keypoints, "left_knee");

  if (!shoulder || !hip || !knee) {
    onFeedback("No et veig bé, posat de cantó");
    return;
  }

  const anguloTronco = calcularAngulo(shoulder, hip, knee);

  if (anguloTronco === null) return;

  const UMBRAL_ARRIBA = 110; // Ángulo más cerrado al subir
  const UMBRAL_ABAJO = 140; // Ángulo más abierto al estar acostado

  if (state.value === "down") {
    onFeedback("Puja el tronc!");
  } else if (state.value === "up") {
    onFeedback("¡Baja controladament!");
  }

  // Transición a 'up' (subiendo)
  if (anguloTronco < UMBRAL_ARRIBA && state.value === "down") {
    state.value = "up";
  }

  // Transición a 'down' (bajando) y contar repetición
  if (anguloTronco > UMBRAL_ABAJO && state.value === "up") {
    state.value = "down";
    onRep();
    onFeedback("Perfecte!");
  }
}

function analizarBurpees(keypoints, state, onRep, onFeedback) {
  const leftShoulder = getKp(keypoints, "left_shoulder");
  const leftHip = getKp(keypoints, "left_hip");
  const leftKnee = getKp(keypoints, "left_knee");
  const leftAnkle = getKp(keypoints, "left_ankle");

  if (!leftShoulder || !leftHip || !leftKnee || !leftAnkle) {
    onFeedback("Posat de cantó, no et veig bé");
    return;
  }

  const rodillaRecta = calcularAngulo(leftHip, leftKnee, leftAnkle) > 160;
  const caderaRecta = calcularAngulo(leftShoulder, leftHip, leftKnee) > 160;
  const dePie = rodillaRecta && caderaRecta;

  // 'isPlank' is a rough estimation. It checks if the person is horizontal.
  const shoulderY = leftShoulder.y;
  const hipY = leftHip.y;
  const ankleY = leftAnkle.y;
  const verticalRange = Math.abs(
    Math.max(shoulderY, hipY, ankleY) - Math.min(shoulderY, hipY, ankleY)
  );
  const horizontalRange = Math.abs(leftShoulder.x - leftAnkle.x);
  const isPlank = verticalRange < horizontalRange / 2.5; // Heuristic

  if (state.value === "up" && !dePie) {
    onFeedback("Al terra!");
  } else if (state.value === "down") {
    onFeedback("Ara de'n peus!");
  }

  // From standing to plank
  if (isPlank && state.value === "up") {
    state.value = "down";
    onFeedback("Som-hi, amunt!");
  }

  // From plank to standing
  if (dePie && state.value === "down") {
    state.value = "up";
    onRep();
    onFeedback("Una més!");
  }
}

function analizarJumpingJacks(keypoints, state, onRep, onFeedback) {
  const leftWrist = getKp(keypoints, "left_wrist");
  const rightWrist = getKp(keypoints, "right_wrist");
  const leftShoulder = getKp(keypoints, "left_shoulder");
  const rightShoulder = getKp(keypoints, "right_shoulder");
  const leftAnkle = getKp(keypoints, "left_ankle");
  const rightAnkle = getKp(keypoints, "right_ankle");

  if (
    !leftWrist ||
    !rightWrist ||
    !leftShoulder ||
    !rightShoulder ||
    !leftAnkle ||
    !rightAnkle
  ) {
    onFeedback("No te veo bien, ponte de frente");
    return;
  }

  const armsUp = leftWrist.y < leftShoulder.y && rightWrist.y < rightShoulder.y;
  const legsApart =
    Math.abs(leftAnkle.x - rightAnkle.x) >
    Math.abs(leftShoulder.x - rightShoulder.x);

  if (state.value === "down") {
    onFeedback("Salta i obre!");
  } else if (state.value === "up") {
    onFeedback("Tanca!");
  }

  // State 'up' is when arms are up and legs are apart
  if (armsUp && legsApart && state.value === "down") {
    state.value = "up";
  }

  // State 'down' is when arms are down and legs are together
  const armsDown =
    leftWrist.y > leftShoulder.y && rightWrist.y > rightShoulder.y;
  if (armsDown && !legsApart && state.value === "up") {
    state.value = "down";
    onRep();
    onFeedback("Genial!");
  }
}

// Add other exercise analysis functions here...

export const exerciseAnalyzers = {
  esquats: analizarSentadilla,
  flexions: analizarFlexiones,
  abdominals: analizarAbdominales,
  burpees: analizarBurpees,
  "jumping jacks": analizarJumpingJacks,
};
