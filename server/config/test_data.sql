-- Dades de prova per a la base de dades
-- Inserir usuaris de prova
INSERT INTO users (username, password, email, wins, looses, score, best_score) VALUES
('jugador1', '$2b$10$abcdefghijklmnopqrstuv', 'jugador1@test.com', 5, 2, 1000, 85.50),
('jugador2', '$2b$10$abcdefghijklmnopqrstuv', 'jugador2@test.com', 3, 4, 750, 78.25),
('jugador3', '$2b$10$abcdefghijklmnopqrstuv', 'jugador3@test.com', 7, 1, 1500, 92.75),
('jugador4', '$2b$10$abcdefghijklmnopqrstuv', 'jugador4@test.com', 2, 5, 500, 65.00);

-- Inserir exercicis de prova
INSERT INTO exercises (name, description, difficulty, tren) VALUES
('Flexions', 'Exercici de push-ups per enfortir pit i braços', 'medium', 'superior'),
('Abdominals', 'Exercici per enfortir els abdominals', 'medium', 'superior'),
('Esquats', 'Exercici de squats per cames', 'easy', 'inferior'),
('Burpees', 'Exercici complet de cardio i força', 'hard', 'superior'),
('Jumping Jacks', 'Exercici de cardio', 'easy', 'inferior');

-- Inserir rutines de prova
INSERT INTO routines (id, room_code, is_public, exercise_text, status, num_participants, duration) VALUES
(1, 'SALA001', true, 'Rutina de cardio', 'waiting', 4, 45),
(2, 'SALA002', false, 'Rutina de força', 'in-progress', 2, 30),
(3, 'SALA003', true, 'Rutina mixta', 'finished', 6, 60);

-- Relacionar rutines amb exercicis
INSERT INTO routine_exercises (routine_id, exercise_id, set_duration_seconds, rest_duration_seconds) VALUES
(1, 1, 30, 15),
(1, 2, 45, 20),
(2, 3, 60, 30),
(3, 4, 40, 20);

-- Inserir performances de prova
INSERT INTO performances (user_id, routine_id, exercise_id, reps, score, won) VALUES
(1, 1, 1, 20, 85.5, true),
(2, 1, 1, 15, 75.0, false),
(3, 2, 3, 25, 92.5, true),
(4, 3, 4, 30, 88.0, true);

-- Inserir resultats globals de prova
INSERT INTO resultats_globals (user_id, repeticions_totals, data_record) VALUES
(1, 150, NOW()),
(2, 120, NOW()),
(3, 200, NOW()),
(4, 175, NOW());